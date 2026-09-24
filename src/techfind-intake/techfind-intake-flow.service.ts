import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Conversation } from '../conversation/conversation.entity';
import { DemoSimulationService } from '../demo-engine/demo-simulation.service';
import { IndustryFlowService } from '../industry-flow/industry-flow.service';
import type { IndustryFlowRecord } from '../industry-flow/industry-flow.types';
import { isLikelyPersonName } from '../enquiry-flow/is-person-name';
import {
  matchNumberedOption,
  type NumberedOption,
} from '../enquiry-flow/match-numbered-option';
import { LeadProfileService } from '../lead/lead-profile.service';
import { LeadScoringService } from '../lead/lead-scoring.service';
import { ConversationState } from '../state-machine/conversation-state.enum';
import { ConversationStateMachineService } from '../state-machine/conversation-state-machine.service';
import { isHumanHandoffState } from '../state-machine/human-handoff';
import { matchHandoverCommand } from '../state-machine/match-handover-command';
import { matchResetCommand } from '../state-machine/match-reset-command';
import * as plaaggCopy from './plaagg-copy';
import { PLAAGG_FINISH_OPTIONS } from './plaagg-finish-options';
import {
  PLAAGG_INDUSTRY_OPTIONS,
  type PlaaggIndustryId,
} from './plaagg-industry-options';
import * as copy from './techfind-intake-copy';
import type { TechfindIntakePayload } from './techfind-intake-payload';
import { TECHFIND_INTAKE_STEPS } from './techfind-intake-steps';
import { TechfindIntakeSession } from './techfind-intake-session.entity';
import { TechfindIntakeSessionService } from './techfind-intake-session.service';
import {
  TECHFIND_MENU_OPTIONS,
  type TechfindMenuOptionId,
} from './techfind-menu-options';

export type TechfindIntakeReply = {
  replyText: string;
  silent?: boolean;
};

const MENU_OPTIONS: readonly NumberedOption[] = TECHFIND_MENU_OPTIONS;
const FINISH_OPTIONS: readonly NumberedOption[] = PLAAGG_FINISH_OPTIONS;

@Injectable()
export class TechfindIntakeFlowService {
  private readonly logger = new Logger(TechfindIntakeFlowService.name);

  constructor(
    private readonly sessions: TechfindIntakeSessionService,
    private readonly stateMachine: ConversationStateMachineService,
    private readonly leadProfiles: LeadProfileService,
    private readonly scoring: LeadScoringService,
    private readonly demos: DemoSimulationService,
    private readonly industryFlows: IndustryFlowService,
    private readonly config: ConfigService,
  ) {}

  async handleInbound(
    conversation: Conversation,
    userText: string | null,
  ): Promise<TechfindIntakeReply> {
    const text = userText?.trim() ?? '';

    if (matchResetCommand(text)) {
      if (isHumanHandoffState(conversation.currentState)) {
        const resumed = await this.stateMachine.resumeAutomation(
          conversation.id,
          'techfind_demo',
        );
        conversation.currentState = resumed.currentState;
      }
      await this.demos.closeOpen(conversation.id);
      await this.sessions.closeOpen(conversation.id);
      return this.start(conversation, { forceNew: true });
    }

    if (matchHandoverCommand(text)) {
      return this.handover(conversation);
    }

    if (isHumanHandoffState(conversation.currentState)) {
      return { replyText: '', silent: true };
    }

    const active = await this.sessions.findActive(conversation.id);
    if (active) {
      return this.continueSession(conversation, active, text);
    }

    const latest = await this.sessions.findLatest(conversation.id);
    if (latest?.completedAt) {
      return { replyText: copy.ALREADY_FILED };
    }

    return this.start(conversation);
  }

  private async start(
    conversation: Conversation,
    options: { forceNew?: boolean } = {},
  ): Promise<TechfindIntakeReply> {
    void options;
    await this.ensureGreetingState(conversation);
    await this.sessions.start(
      conversation.id,
      TECHFIND_INTAKE_STEPS.AWAITING_MENU,
      {},
    );
    return { replyText: copy.TECHFIND_INTAKE_GREETING };
  }

  private async ensureGreetingState(conversation: Conversation): Promise<void> {
    if (conversation.currentState === ConversationState.NEW) {
      await this.stateMachine.transition(
        conversation.id,
        ConversationState.TECHFIND_GREETING,
      );
    }
  }

  private async continueSession(
    conversation: Conversation,
    session: TechfindIntakeSession,
    text: string,
  ): Promise<TechfindIntakeReply> {
    switch (session.currentStep) {
      case TECHFIND_INTAKE_STEPS.AWAITING_MENU:
        return this.captureMenu(session, text);
      case TECHFIND_INTAKE_STEPS.AWAITING_NAME:
        return this.captureName(session, text);
      case TECHFIND_INTAKE_STEPS.AWAITING_BUSINESS:
        return this.captureBusiness(session, text);
      case TECHFIND_INTAKE_STEPS.AWAITING_QUALIFICATION:
        return this.captureQualification(conversation, session, text);
      case TECHFIND_INTAKE_STEPS.AWAITING_PLAAGG_INDUSTRY:
        return this.capturePlaaggIndustry(conversation, session, text);
      case TECHFIND_INTAKE_STEPS.AWAITING_PLAAGG_OTHER:
        return this.capturePlaaggOther(conversation, session, text);
      case TECHFIND_INTAKE_STEPS.AWAITING_PLAAGG_DEMO:
        return this.continuePlaaggDemo(conversation, session, text);
      case TECHFIND_INTAKE_STEPS.AWAITING_PLAAGG_FINISH:
        return this.capturePlaaggFinish(conversation, session, text);
      default:
        return { replyText: copy.TECHFIND_INTAKE_GREETING };
    }
  }

  private async captureMenu(
    session: TechfindIntakeSession,
    text: string,
  ): Promise<TechfindIntakeReply> {
    const matched = matchNumberedOption(text, MENU_OPTIONS);
    if (!matched) {
      return { replyText: copy.REASK_MENU };
    }
    await this.sessions.save(session, {
      step: TECHFIND_INTAKE_STEPS.AWAITING_NAME,
      payload: {
        ...session.payload,
        serviceId: matched.id as TechfindMenuOptionId,
      },
    });
    return { replyText: copy.ASK_NAME };
  }

  private async captureName(
    session: TechfindIntakeSession,
    text: string,
  ): Promise<TechfindIntakeReply> {
    if (!text || !isLikelyPersonName(text)) {
      return { replyText: copy.REASK_NAME };
    }
    await this.sessions.save(session, {
      step: TECHFIND_INTAKE_STEPS.AWAITING_BUSINESS,
      payload: { ...session.payload, contactName: text.trim() },
    });
    return { replyText: copy.ASK_BUSINESS };
  }

  private async captureBusiness(
    session: TechfindIntakeSession,
    text: string,
  ): Promise<TechfindIntakeReply> {
    const businessName = text.trim();
    if (businessName.length < 2) {
      return { replyText: copy.REASK_BUSINESS };
    }
    const serviceId = session.payload.serviceId ?? 'website';
    const question =
      copy.QUALIFICATION_BY_SERVICE[serviceId] ??
      copy.QUALIFICATION_BY_SERVICE.website;
    await this.sessions.save(session, {
      step: TECHFIND_INTAKE_STEPS.AWAITING_QUALIFICATION,
      payload: { ...session.payload, businessName },
    });
    return { replyText: question };
  }

  private async captureQualification(
    conversation: Conversation,
    session: TechfindIntakeSession,
    text: string,
  ): Promise<TechfindIntakeReply> {
    const details = text.trim();
    if (details.length < 3) {
      return { replyText: copy.REASK_QUALIFICATION };
    }
    const payload: TechfindIntakePayload = {
      ...session.payload,
      qualificationDetails: details,
    };
    await this.persistLead(conversation, payload);

    const serviceId = payload.serviceId ?? 'website';

    if (serviceId === 'plaagg') {
      await this.advanceLeadScored(conversation);
      await this.sessions.save(session, {
        step: TECHFIND_INTAKE_STEPS.AWAITING_PLAAGG_INDUSTRY,
        payload,
      });
      const menu = await this.plaaggMenuOptions(conversation.tenantId);
      return {
        replyText: `${copy.LEAD_SAVED}\n\n${plaaggCopy.plaaggIndustryMenu(menu)}`,
      };
    }

    await this.sessions.markComplete(session);

    if (serviceId === 'speak_to_team') {
      await this.stateMachine.enterHumanHandoff(conversation.id);
    }

    await this.advanceLeadPipeline(conversation);

    return { replyText: this.followUpForService(serviceId) };
  }

  private async capturePlaaggIndustry(
    conversation: Conversation,
    session: TechfindIntakeSession,
    text: string,
  ): Promise<TechfindIntakeReply> {
    const menu = await this.plaaggMenuOptions(conversation.tenantId);
    const matched = matchNumberedOption(text, menu);
    if (!matched) {
      return { replyText: plaaggCopy.reaskPlaaggIndustry(menu) };
    }
    const industryId = matched.id as PlaaggIndustryId;
    const flow = await this.industryFlows.findByPlaaggMenuId(
      conversation.tenantId,
      industryId,
    );
    const payload: TechfindIntakePayload = {
      ...session.payload,
      plaaggIndustryId: industryId,
      plaaggIndustryLabel: flow?.menuLabel ?? matched.label,
    };
    if (industryId === 'other') {
      await this.sessions.save(session, {
        step: TECHFIND_INTAKE_STEPS.AWAITING_PLAAGG_OTHER,
        payload,
      });
      return { replyText: plaaggCopy.ASK_OTHER_INDUSTRY };
    }
    return this.startPlaaggDemo(conversation, session, payload);
  }

  private async capturePlaaggOther(
    conversation: Conversation,
    session: TechfindIntakeSession,
    text: string,
  ): Promise<TechfindIntakeReply> {
    const label = text.trim();
    if (label.length < 2) {
      return { replyText: plaaggCopy.REASK_OTHER_INDUSTRY };
    }
    const payload: TechfindIntakePayload = {
      ...session.payload,
      plaaggOtherLabel: label,
      plaaggIndustryLabel: label,
    };
    return this.startPlaaggDemo(conversation, session, payload);
  }

  private async startPlaaggDemo(
    conversation: Conversation,
    session: TechfindIntakeSession,
    payload: TechfindIntakePayload,
  ): Promise<TechfindIntakeReply> {
    const industryId = payload.plaaggIndustryId ?? 'other';
    const flow = await this.industryFlows.findByPlaaggMenuId(
      conversation.tenantId,
      industryId,
    );
    const demoMode = flow?.demoMode ?? 'generic';

    await this.demos.closeOpen(conversation.id);
    await this.walkToDemoRunning(conversation, demoMode);

    const { result } = await this.demos.start(conversation.id, demoMode, {
      initialPayload: { plaaggExplore: true },
      tenantId: conversation.tenantId,
    });

    await this.sessions.save(session, {
      step: TECHFIND_INTAKE_STEPS.AWAITING_PLAAGG_DEMO,
      payload: {
        ...payload,
        plaaggDemoMode: demoMode,
      },
    });

    return { replyText: result.replyText };
  }

  private async continuePlaaggDemo(
    conversation: Conversation,
    session: TechfindIntakeSession,
    text: string,
  ): Promise<TechfindIntakeReply> {
    let simulation = await this.demos.findActive(conversation.id);
    if (!simulation && session.payload.plaaggDemoMode) {
      const started = await this.demos.start(
        conversation.id,
        session.payload.plaaggDemoMode,
        {
          initialPayload: { plaaggExplore: true },
          tenantId: conversation.tenantId,
        },
      );
      simulation = started.simulation;
      if (session.currentStep !== TECHFIND_INTAKE_STEPS.AWAITING_PLAAGG_DEMO) {
        return { replyText: started.result.replyText };
      }
    }
    if (!simulation) {
      return { replyText: plaaggCopy.REASK_PLAAGG_INDUSTRY };
    }

    const { result } = await this.demos.handleInput(simulation, text, {
      tenantId: conversation.tenantId,
    });

    if (!result.isComplete) {
      return { replyText: result.replyText };
    }

    await this.advanceToValueReveal(conversation);

    const summaryLine =
      result.replyText.split('\n').find((line) => line.trim().length > 0) ??
      'Simulated customer journey completed';

    const industryId = session.payload.plaaggIndustryId ?? 'generic';
    const flow = await this.industryFlows.findByPlaaggMenuId(
      conversation.tenantId,
      industryId,
    );
    const industryLabel =
      session.payload.plaaggOtherLabel?.trim() ||
      session.payload.plaaggIndustryLabel ||
      flow?.menuLabel ||
      industryId;

    const insight = this.buildInsight(session, flow, industryLabel, summaryLine);

    await this.sessions.save(session, {
      step: TECHFIND_INTAKE_STEPS.AWAITING_PLAAGG_FINISH,
      payload: {
        ...session.payload,
        plaaggLastDemoSummary: summaryLine,
      },
    });

    const replyText = [
      result.replyText,
      plaaggCopy.plaaggBusinessReceives(insight),
      plaaggCopy.PLAAGG_FINISH_MENU,
    ].join('\n\n');

    return { replyText };
  }

  private async capturePlaaggFinish(
    conversation: Conversation,
    session: TechfindIntakeSession,
    text: string,
  ): Promise<TechfindIntakeReply> {
    const matched = matchNumberedOption(text, FINISH_OPTIONS);
    if (!matched) {
      return { replyText: plaaggCopy.PLAAGG_FINISH_MENU };
    }

    const industryId = session.payload.plaaggIndustryId ?? 'generic';
    const flow = await this.industryFlows.findByPlaaggMenuId(
      conversation.tenantId,
      industryId,
    );

    switch (matched.id) {
      case 'book_demo':
        await this.stateMachine.transition(
          conversation.id,
          ConversationState.MEETING_BOOKED,
        );
        await this.sessions.markComplete(session);
        return { replyText: plaaggCopy.PLAAGG_BOOK_DEMO_REPLY };
      case 'speak_to_techfind':
        await this.stateMachine.enterHumanHandoff(conversation.id);
        await this.sessions.markComplete(session);
        return { replyText: copy.HUMAN_HANDOVER_ACK };
      case 'try_another':
        await this.demos.closeOpen(conversation.id);
        await this.sessions.save(session, {
          step: TECHFIND_INTAKE_STEPS.AWAITING_PLAAGG_INDUSTRY,
          payload: {
            ...session.payload,
            plaaggDemoMode: undefined,
            plaaggLastDemoSummary: undefined,
          },
        });
        return {
          replyText: plaaggCopy.plaaggTryAnother(
            await this.plaaggMenuOptions(conversation.tenantId),
          ),
        };
      case 'recommended_plan':
        if (!flow) {
          return { replyText: plaaggCopy.PLAAGG_FINISH_MENU };
        }
        return {
          replyText: plaaggCopy.plaaggRecommendedPlanReply(
            flow.definition.recommendedPlan,
          ),
        };
      default:
        return { replyText: plaaggCopy.PLAAGG_FINISH_MENU };
    }
  }

  private async walkToDemoRunning(
    conversation: Conversation,
    demoMode: string,
  ): Promise<void> {
    const from = conversation.currentState;
    if (
      from === ConversationState.TECHFIND_GREETING ||
      from === ConversationState.MEETING_OFFERED ||
      from === ConversationState.VALUE_REVEAL ||
      from === ConversationState.LEAD_SCORED
    ) {
      await this.stateMachine.transition(
        conversation.id,
        ConversationState.DEMO_SELECTED,
        { demoMode },
      );
    }
    await this.stateMachine.transition(conversation.id, ConversationState.DEMO_RUNNING, {
      demoMode,
    });
  }

  private async advanceToValueReveal(conversation: Conversation): Promise<void> {
    const current = conversation.currentState;
    if (current === ConversationState.DEMO_RUNNING) {
      await this.stateMachine.transition(
        conversation.id,
        ConversationState.DEMO_TRANSACTION,
      );
    }
    await this.stateMachine.transition(
      conversation.id,
      ConversationState.VALUE_REVEAL,
    );
    await this.stateMachine.transition(
      conversation.id,
      ConversationState.MEETING_OFFERED,
    );
  }

  private async advanceLeadScored(conversation: Conversation): Promise<void> {
    if (conversation.currentState === ConversationState.TECHFIND_GREETING) {
      await this.stateMachine.transition(
        conversation.id,
        ConversationState.BUSINESS_QUALIFICATION,
      );
    }
    await this.stateMachine.transition(
      conversation.id,
      ConversationState.LEAD_SCORED,
    );
    await this.stateMachine.transition(
      conversation.id,
      ConversationState.MEETING_OFFERED,
    );
  }

  private async advanceLeadPipeline(conversation: Conversation): Promise<void> {
    if (conversation.currentState === ConversationState.TECHFIND_GREETING) {
      await this.stateMachine.transition(
        conversation.id,
        ConversationState.BUSINESS_QUALIFICATION,
      );
    }
    if (conversation.currentState === ConversationState.BUSINESS_QUALIFICATION) {
      await this.stateMachine.transition(
        conversation.id,
        ConversationState.LEAD_SCORED,
      );
      await this.stateMachine.transition(
        conversation.id,
        ConversationState.MEETING_OFFERED,
      );
    }
  }

  private async persistLead(
    conversation: Conversation,
    payload: TechfindIntakePayload,
  ): Promise<void> {
    const profile = await this.leadProfiles.findOrCreate(conversation.id);
    profile.contactName = payload.contactName?.trim() ?? null;
    profile.businessName = payload.businessName?.trim() ?? null;
    profile.serviceRequired = payload.serviceId ?? null;
    profile.painPoint = payload.qualificationDetails?.trim() ?? null;
    profile.conversationSummary = this.buildSummary(payload);

    const scored = this.scoring.score(profile);
    profile.leadScore = scored.leadScore;
    profile.nextAction = scored.nextAction;

    await this.leadProfiles.save(profile);
    this.logger.log(
      `Techfind intake lead saved conversation=${conversation.id} service=${profile.serviceRequired} score=${profile.leadScore}`,
    );
  }

  private buildSummary(payload: TechfindIntakePayload): string {
    const lines = [
      payload.serviceId ? `Service: ${payload.serviceId}` : null,
      payload.contactName ? `Contact: ${payload.contactName}` : null,
      payload.businessName ? `Business: ${payload.businessName}` : null,
      payload.qualificationDetails
        ? `Details: ${payload.qualificationDetails}`
        : null,
      payload.plaaggIndustryLabel
        ? `PLAAGG industry: ${payload.plaaggIndustryLabel}`
        : null,
    ].filter(Boolean);
    return lines.join('\n');
  }

  private followUpForService(serviceId: TechfindMenuOptionId): string {
    switch (serviceId) {
      case 'website':
        return copy.websiteFollowUp(this.websiteUrl());
      case 'crm':
        return copy.CRM_FOLLOW_UP;
      case 'whatsapp_automation':
        return copy.WHATSAPP_AUTOMATION_FOLLOW_UP;
      case 'ai_training':
        return copy.AI_TRAINING_FOLLOW_UP;
      case 'existing_client':
        return copy.EXISTING_CLIENT_FOLLOW_UP;
      case 'speak_to_team':
        return copy.SPEAK_TO_TEAM_FOLLOW_UP;
      default:
        return copy.CRM_FOLLOW_UP;
    }
  }

  private websiteUrl(): string {
    const configured = this.config.get<string>('TECHFIND_WEBSITE_URL')?.trim();
    return configured || 'https://techfindconsulting.africa';
  }

  private async plaaggMenuOptions(
    tenantId: string,
  ): Promise<readonly NumberedOption[]> {
    const options = await this.industryFlows.listActivePlaaggMenu(tenantId);
    return options.length > 0 ? options : PLAAGG_INDUSTRY_OPTIONS;
  }

  private buildInsight(
    session: TechfindIntakeSession,
    flow: IndustryFlowRecord | null,
    industryLabel: string,
    summaryLine: string,
  ) {
    const insights = flow?.definition.plaaggInsights;
    return {
      industryLabel,
      contactName: session.payload.contactName ?? 'Prospect',
      businessName: session.payload.businessName ?? 'Business',
      capturedDetail: summaryLine.slice(0, 120),
      pipelineStage:
        insights?.pipelineStage ?? 'New WhatsApp lead (simulated)',
      followUp: insights?.followUp ?? 'Review enquiry and respond',
      assignee: insights?.assignee ?? 'Simulated: Unassigned queue',
      dashboardInsight:
        insights?.dashboardInsight ?? 'Demo analytics only — not live data.',
    };
  }

  private async handover(conversation: Conversation): Promise<TechfindIntakeReply> {
    await this.demos.closeOpen(conversation.id);
    await this.sessions.closeOpen(conversation.id);
    await this.stateMachine.enterHumanHandoff(conversation.id);
    return { replyText: copy.HUMAN_HANDOVER_ACK };
  }
}
