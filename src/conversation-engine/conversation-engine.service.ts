import { Injectable, Logger } from '@nestjs/common';
import { Conversation } from '../conversation/conversation.entity';
import { DemoSimulationService } from '../demo-engine/demo-simulation.service';
import { ConversationState } from '../state-machine/conversation-state.enum';
import { ConversationStateMachineService } from '../state-machine/conversation-state-machine.service';
import { matchResetCommand } from '../state-machine/match-reset-command';
import { matchDemoMode, type GuidedDemoMode } from './match-demo-mode';
import { TECHFIND_FALLBACK, TECHFIND_GREETING } from './techfind-copy';

const DEMO_INPUT_STATES: ReadonlySet<ConversationState> = new Set([
  ConversationState.DEMO_SELECTED,
  ConversationState.DEMO_RUNNING,
  ConversationState.DEMO_TRANSACTION,
]);

@Injectable()
export class ConversationEngineService {
  private readonly logger = new Logger(ConversationEngineService.name);

  constructor(
    private readonly stateMachine: ConversationStateMachineService,
    private readonly demos: DemoSimulationService,
  ) {}

  async handle(
    conversation: Conversation,
    userText: string | null,
  ): Promise<{ conversation: Conversation; replies: string[] }> {
    const text = userText?.trim() ?? '';

    if (
      matchResetCommand(text) ||
      conversation.currentState === ConversationState.NEW
    ) {
      const greeted = await this.enterGreeting(conversation, {
        reset: matchResetCommand(text),
      });
      const mode = matchDemoMode(text);
      if (conversation.currentState === ConversationState.NEW && mode) {
        return this.startDemo(greeted, mode);
      }
      return { conversation: greeted, replies: [TECHFIND_GREETING] };
    }

    const demoMode = matchDemoMode(text);
    if (demoMode && !DEMO_INPUT_STATES.has(conversation.currentState)) {
      return this.startDemo(conversation, demoMode);
    }

    if (DEMO_INPUT_STATES.has(conversation.currentState) && text) {
      return this.continueDemo(conversation, text);
    }

    return { conversation, replies: [TECHFIND_FALLBACK] };
  }

  private async enterGreeting(
    conversation: Conversation,
    options: { reset: boolean },
  ): Promise<Conversation> {
    await this.demos.closeOpen(conversation.id);
    if (conversation.currentState === ConversationState.TECHFIND_GREETING) {
      if (options.reset) {
        return this.stateMachine.transition(
          conversation.id,
          ConversationState.TECHFIND_GREETING,
          { reset: true },
        );
      }
      return conversation;
    }
    return this.stateMachine.transition(
      conversation.id,
      ConversationState.TECHFIND_GREETING,
      options.reset ? { reset: true } : undefined,
    );
  }

  private async startDemo(
    conversation: Conversation,
    demoMode: GuidedDemoMode,
  ): Promise<{ conversation: Conversation; replies: string[] }> {
    await this.demos.closeOpen(conversation.id);
    const walked = await this.walkToDemoRunning(conversation, demoMode);
    const { result } = await this.demos.start(walked.id, demoMode);
    return { conversation: walked, replies: [result.replyText] };
  }

  private async continueDemo(
    conversation: Conversation,
    userText: string,
  ): Promise<{ conversation: Conversation; replies: string[] }> {
    const simulation = await this.demos.findActive(conversation.id);
    if (!simulation) {
      this.logger.warn(
        `No active demo simulation for conversation ${conversation.id}`,
      );
      return { conversation, replies: [TECHFIND_FALLBACK] };
    }

    const { result } = await this.demos.handleInput(simulation, userText);
    let updated = conversation;
    if (result.isComplete) {
      updated = await this.advanceToValueReveal(conversation);
    }
    return { conversation: updated, replies: [result.replyText] };
  }

  private async walkToDemoRunning(
    conversation: Conversation,
    demoMode: GuidedDemoMode,
  ): Promise<Conversation> {
    let current = conversation;

    if (
      current.currentState !== ConversationState.NEW &&
      current.currentState !== ConversationState.TECHFIND_GREETING
    ) {
      current = await this.stateMachine.transition(
        current.id,
        ConversationState.TECHFIND_GREETING,
        { reset: true },
      );
    }

    if (current.currentState === ConversationState.NEW) {
      current = await this.stateMachine.transition(
        current.id,
        ConversationState.TECHFIND_GREETING,
      );
    }

    const rest: ConversationState[] = [
      ConversationState.INDUSTRY_DISCOVERY,
      ConversationState.DEMO_SELECTED,
      ConversationState.DEMO_RUNNING,
    ];
    for (const step of rest) {
      if (current.currentState === step) {
        continue;
      }
      current = await this.stateMachine.transition(current.id, step, {
        demoMode,
      });
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
}
