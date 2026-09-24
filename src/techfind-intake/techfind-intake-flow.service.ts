import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Conversation } from '../conversation/conversation.entity';
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

@Injectable()
export class TechfindIntakeFlowService {
  private readonly logger = new Logger(TechfindIntakeFlowService.name);

  constructor(
    private readonly sessions: TechfindIntakeSessionService,
    private readonly stateMachine: ConversationStateMachineService,
    private readonly leadProfiles: LeadProfileService,
    private readonly scoring: LeadScoringService,
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
      payload: { ...session.payload, serviceId: matched.id as TechfindMenuOptionId },
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
    await this.sessions.markComplete(session);

    const serviceId = payload.serviceId ?? 'website';
    const followUp = this.followUpForService(serviceId);

    if (serviceId === 'speak_to_team') {
      await this.stateMachine.enterHumanHandoff(conversation.id);
    }

    let current = conversation;
    if (current.currentState === ConversationState.TECHFIND_GREETING) {
      current = await this.stateMachine.transition(
        conversation.id,
        ConversationState.BUSINESS_QUALIFICATION,
      );
    }
    if (current.currentState === ConversationState.BUSINESS_QUALIFICATION) {
      await this.stateMachine.transition(
        conversation.id,
        ConversationState.LEAD_SCORED,
      );
      await this.stateMachine.transition(
        conversation.id,
        ConversationState.MEETING_OFFERED,
      );
    }

    return { replyText: followUp };
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
      case 'plaagg':
        return copy.PLAAGG_PHASE2_HOLD;
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

  private async handover(conversation: Conversation): Promise<TechfindIntakeReply> {
    await this.sessions.closeOpen(conversation.id);
    await this.stateMachine.enterHumanHandoff(conversation.id);
    return { replyText: copy.HUMAN_HANDOVER_ACK };
  }
}
