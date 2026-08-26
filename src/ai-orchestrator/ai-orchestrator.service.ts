import { Injectable, Logger } from '@nestjs/common';
import { Conversation } from '../conversation/conversation.entity';
import { ConversationService } from '../conversation/conversation.service';
import { TECHFIND_GREETING } from '../conversation-engine/techfind-copy';
import { DemoSimulationService } from '../demo-engine/demo-simulation.service';
import { UnknownDemoModeError } from '../demo-engine/unknown-demo-mode.error';
import { ConversationSummaryService } from '../lead/conversation-summary.service';
import { LeadProfile } from '../lead/lead-profile.entity';
import { LeadProfileService } from '../lead/lead-profile.service';
import { LeadScoringService } from '../lead/lead-scoring.service';
import { QualificationFlowService } from '../lead/qualification-flow.service';
import {
  QUALIFICATION_INTRO,
  QUALIFICATION_QUESTIONS,
  QUALIFICATION_REASK_NUMBER,
} from '../lead/qualification-questions';
import { ConversationNotFoundError } from '../state-machine/invalid-state-transition.error';
import { ConversationState } from '../state-machine/conversation-state.enum';
import { ConversationStateMachineService } from '../state-machine/conversation-state-machine.service';
import { matchResetCommand } from '../state-machine/match-reset-command';
import {
  matchNoCommand,
  matchYesCommand,
} from '../state-machine/match-yes-command';
import { IndustryClassifierService } from './industry-classifier.service';
import { isLiveDemoMode } from './industry-modes';
import {
  AI_CLASSIFY_FAILED,
  CLASSIFY_PROMPT,
  MEETING_OFFERED_COPY,
  MEETING_OFFERED_HOLD,
  noLiveDemoMessage,
  ORCHESTRATOR_FALLBACK,
  RESET_NEXT_BUSINESS,
  VALUE_REVEAL_DECLINED,
  VALUE_REVEAL_OFFER,
} from './orchestrator-copy';

export type OrchestratorResult = {
  conversation: Conversation;
  replyText: string;
};

@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);

  constructor(
    private readonly conversations: ConversationService,
    private readonly stateMachine: ConversationStateMachineService,
    private readonly demos: DemoSimulationService,
    private readonly classifier: IndustryClassifierService,
    private readonly leadProfiles: LeadProfileService,
    private readonly qualification: QualificationFlowService,
    private readonly scoring: LeadScoringService,
    private readonly summaries: ConversationSummaryService,
  ) {}

  async handleInboundMessage(
    conversationId: string,
    text: string | null,
  ): Promise<OrchestratorResult> {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    const trimmed = text?.trim() ?? '';

    if (matchResetCommand(trimmed)) {
      const reset = await this.resetToDiscovery(conversation);
      return { conversation: reset, replyText: RESET_NEXT_BUSINESS };
    }

    switch (conversation.currentState) {
      case ConversationState.NEW:
      case ConversationState.TECHFIND_GREETING:
        return this.enterDiscovery(conversation);
      case ConversationState.INDUSTRY_DISCOVERY:
        return this.classifyAndStart(conversation, trimmed);
      case ConversationState.DEMO_SELECTED:
      case ConversationState.DEMO_RUNNING:
      case ConversationState.DEMO_TRANSACTION:
        return this.continueDemo(conversation, trimmed);
      case ConversationState.VALUE_REVEAL:
        return this.handleValueReveal(conversation, trimmed);
      case ConversationState.BUSINESS_QUALIFICATION:
        return this.handleQualification(conversation, trimmed);
      case ConversationState.LEAD_SCORED:
      case ConversationState.MEETING_OFFERED:
        return { conversation, replyText: MEETING_OFFERED_HOLD };
      default:
        return { conversation, replyText: ORCHESTRATOR_FALLBACK };
    }
  }

  private async enterDiscovery(
    conversation: Conversation,
  ): Promise<OrchestratorResult> {
    let current = conversation;
    if (current.currentState === ConversationState.NEW) {
      current = await this.stateMachine.transition(
        current.id,
        ConversationState.TECHFIND_GREETING,
      );
    }
    if (current.currentState === ConversationState.TECHFIND_GREETING) {
      current = await this.stateMachine.transition(
        current.id,
        ConversationState.INDUSTRY_DISCOVERY,
      );
    }
    return { conversation: current, replyText: TECHFIND_GREETING };
  }

  private async resetToDiscovery(
    conversation: Conversation,
  ): Promise<Conversation> {
    await this.demos.closeOpen(conversation.id);
    const greeted = await this.stateMachine.transition(
      conversation.id,
      ConversationState.TECHFIND_GREETING,
      { reset: true },
    );
    return this.stateMachine.transition(
      greeted.id,
      ConversationState.INDUSTRY_DISCOVERY,
    );
  }

  private async classifyAndStart(
    conversation: Conversation,
    text: string,
  ): Promise<OrchestratorResult> {
    if (!text) {
      return { conversation, replyText: CLASSIFY_PROMPT };
    }

    let mode: string;
    try {
      const classified = await this.classifier.classify(text, {
        conversationId: conversation.id,
        tenantId: conversation.tenantId,
      });
      mode = classified.mode;
      this.logger.log(
        `Industry classified mode=${mode} confidence=${classified.confidence} conversation=${conversation.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Industry classification failed conversation=${conversation.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { conversation, replyText: AI_CLASSIFY_FAILED };
    }

    if (!isLiveDemoMode(mode)) {
      return { conversation, replyText: noLiveDemoMessage(mode) };
    }

    try {
      const running = await this.walkToDemoRunning(conversation, mode);
      const { result } = await this.demos.start(running.id, mode);
      return { conversation: running, replyText: result.replyText };
    } catch (error) {
      if (error instanceof UnknownDemoModeError) {
        return { conversation, replyText: noLiveDemoMessage(mode) };
      }
      throw error;
    }
  }

  private async continueDemo(
    conversation: Conversation,
    text: string,
  ): Promise<OrchestratorResult> {
    const simulation = await this.demos.findActive(conversation.id);
    if (!simulation && conversation.demoMode) {
      const started = await this.demos.start(
        conversation.id,
        conversation.demoMode,
      );
      if (conversation.currentState === ConversationState.DEMO_SELECTED) {
        const running = await this.stateMachine.transition(
          conversation.id,
          ConversationState.DEMO_RUNNING,
          { demoMode: conversation.demoMode },
        );
        return { conversation: running, replyText: started.result.replyText };
      }
      return { conversation, replyText: started.result.replyText };
    }
    if (!simulation) {
      this.logger.warn(
        `No active demo simulation for conversation ${conversation.id}`,
      );
      return { conversation, replyText: ORCHESTRATOR_FALLBACK };
    }

    const { result } = await this.demos.handleInput(simulation, text, {
      tenantId: conversation.tenantId,
    });

    let updated = conversation;
    if (result.isComplete) {
      updated = await this.advanceToValueReveal(conversation);
      return {
        conversation: updated,
        replyText: `${result.replyText}\n\n${VALUE_REVEAL_OFFER}`,
      };
    }
    return { conversation: updated, replyText: result.replyText };
  }

  private async walkToDemoRunning(
    conversation: Conversation,
    demoMode: string,
  ): Promise<Conversation> {
    let current = conversation;
    if (current.currentState === ConversationState.INDUSTRY_DISCOVERY) {
      current = await this.stateMachine.transition(
        current.id,
        ConversationState.DEMO_SELECTED,
        { demoMode },
      );
    }
    if (current.currentState === ConversationState.DEMO_SELECTED) {
      current = await this.stateMachine.transition(
        current.id,
        ConversationState.DEMO_RUNNING,
        { demoMode },
      );
    }
    return current;
  }

  private async advanceToValueReveal(
    conversation: Conversation,
  ): Promise<Conversation> {
    let current = conversation;
    if (current.currentState === ConversationState.DEMO_RUNNING) {
      current = await this.stateMachine.transition(
        current.id,
        ConversationState.DEMO_TRANSACTION,
      );
    }
    if (current.currentState === ConversationState.DEMO_TRANSACTION) {
      current = await this.stateMachine.transition(
        current.id,
        ConversationState.VALUE_REVEAL,
      );
    }
    return current;
  }

  private async handleValueReveal(
    conversation: Conversation,
    text: string,
  ): Promise<OrchestratorResult> {
    if (matchYesCommand(text)) {
      return this.startQualification(conversation);
    }
    if (matchNoCommand(text)) {
      return { conversation, replyText: VALUE_REVEAL_DECLINED };
    }
    return { conversation, replyText: VALUE_REVEAL_OFFER };
  }

  private async startQualification(
    conversation: Conversation,
  ): Promise<OrchestratorResult> {
    const profile = await this.leadProfiles.findOrCreate(conversation.id);
    const qualified = await this.stateMachine.transition(
      conversation.id,
      ConversationState.BUSINESS_QUALIFICATION,
    );
    const question = this.qualification.nextQuestion(profile);
    if (!question) {
      return this.finishQualification(qualified, profile);
    }
    return {
      conversation: qualified,
      replyText: `${QUALIFICATION_INTRO}\n\n${question}`,
    };
  }

  private async handleQualification(
    conversation: Conversation,
    text: string,
  ): Promise<OrchestratorResult> {
    const profile = await this.leadProfiles.findOrCreate(conversation.id);
    const field = this.qualification.nextUnansweredField(profile);
    if (!field) {
      return this.finishQualification(conversation, profile);
    }

    const recorded = await this.qualification.recordAnswer(
      profile,
      field,
      text,
      { tenantId: conversation.tenantId },
    );
    if (!recorded.recorded) {
      return {
        conversation,
        replyText: `${QUALIFICATION_REASK_NUMBER}\n\n${QUALIFICATION_QUESTIONS[field]}`,
      };
    }

    const next = this.qualification.nextQuestion(recorded.profile);
    if (!next) {
      return this.finishQualification(conversation, recorded.profile);
    }
    return { conversation, replyText: next };
  }

  private async finishQualification(
    conversation: Conversation,
    profile: LeadProfile,
  ): Promise<OrchestratorResult> {
    const scored = this.scoring.score(profile);
    profile.leadScore = scored.leadScore;
    profile.nextAction = scored.nextAction;
    try {
      profile.conversationSummary = await this.summaries.summarize(
        conversation.id,
      );
    } catch (error) {
      this.logger.error(
        `Conversation summary failed conversation=${conversation.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      profile.conversationSummary = profile.conversationSummary ?? null;
    }
    await this.leadProfiles.save(profile);

    let current = conversation;
    if (current.currentState === ConversationState.BUSINESS_QUALIFICATION) {
      current = await this.stateMachine.transition(
        current.id,
        ConversationState.LEAD_SCORED,
      );
    }
    if (current.currentState === ConversationState.LEAD_SCORED) {
      current = await this.stateMachine.transition(
        current.id,
        ConversationState.MEETING_OFFERED,
      );
    }
    return { conversation: current, replyText: MEETING_OFFERED_COPY };
  }
}
