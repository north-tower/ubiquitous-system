import { HmgFlowService } from './hmg-flow.service';
import { HmgSessionService } from './hmg-session.service';
import { ConversationStateMachineService } from '../state-machine/conversation-state-machine.service';
import type { Conversation } from '../conversation/conversation.entity';
import {
  hmgAuditButtons,
  hmgBooksButtons,
  hmgMeetingButtons,
  hmgMenuButtons,
  hmgTaxButtons,
} from './hmg-interactive';
import { WHATSAPP_REPLY_BUTTON_TITLE_MAX } from '../outbound/whatsapp-reply-buttons';
import { HMG_STEPS } from './hmg-steps';

describe('HmgFlowService', () => {
  const sessions = {
    closeOpen: jest.fn(),
    start: jest.fn(),
    findActive: jest.fn(),
    findLatest: jest.fn(),
    save: jest.fn(),
    markSubmitted: jest.fn(),
  } as unknown as jest.Mocked<HmgSessionService>;

  const stateMachine = {
    resumeAutomation: jest.fn(),
    enterHumanHandoff: jest.fn(),
  } as unknown as jest.Mocked<ConversationStateMachineService>;

  const conversation = {
    id: 'conv-1',
    currentState: 'NEW',
    prospectPhone: '254799229340',
  } as Conversation;

  const service = new HmgFlowService(sessions, stateMachine);

  beforeEach(() => {
    jest.resetAllMocks();
    sessions.closeOpen.mockResolvedValue(undefined);
    sessions.start.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_TOPIC,
      payload: {},
    } as never);
    sessions.findActive.mockResolvedValue(null);
    sessions.findLatest.mockResolvedValue(null);
    sessions.save.mockImplementation(async (session, next) => ({
      ...session,
      currentStep: next.step,
      payload: next.payload,
    }));
    sessions.markSubmitted.mockImplementation(async (session) => session);
  });

  function active(step: string, payload: Record<string, string> = {}) {
    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: step,
      payload,
    } as never);
  }

  it('opens with three menu buttons', async () => {
    const reply = await service.handleInbound(conversation, 'Hello there');
    expect(reply.replyText).toContain('HMG Group Africa');
    expect(reply.replyText).not.toContain('1  Tax');
    expect(reply.replyButtons?.text).not.toContain('Books & people');
    expect(reply.replyButtons?.fallbackText).toContain('1  Tax');
    expect(reply.replyButtons?.fallbackText).toContain('Reply with a number.');
    expect(reply.replyButtons?.buttons.map((button) => button.title)).toEqual([
      'Tax',
      'Books & people',
      'Audit & other',
    ]);
    expect(sessions.start).toHaveBeenCalledWith(
      'conv-1',
      HMG_STEPS.AWAITING_TOPIC,
      {},
    );
  });

  it('keeps every HMG button title within the WhatsApp cap of 3', () => {
    for (const message of [
      hmgMenuButtons(),
      hmgTaxButtons(),
      hmgBooksButtons(),
      hmgAuditButtons(),
      hmgMeetingButtons(),
    ]) {
      expect(message.buttons.length).toBeLessThanOrEqual(3);
      expect(message.buttons.length).toBeGreaterThan(0);
      for (const button of message.buttons) {
        expect(button.title.length).toBeLessThanOrEqual(
          WHATSAPP_REPLY_BUTTON_TITLE_MAX,
        );
      }
    }
  });

  it('opens the tax submenu from the Tax button or 1', async () => {
    active(HMG_STEPS.AWAITING_TOPIC);
    const reply = await service.handleInbound(conversation, 'tax');
    expect(reply.replyText).toContain('Which one?');
    expect(reply.replyButtons?.buttons.map((button) => button.id)).toEqual([
      'tax_kra',
      'tax_health',
    ]);
    expect(sessions.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ step: HMG_STEPS.AWAITING_TAX }),
    );
  });

  it('saves Tax & KRA from reply 1 on the tax step and asks how to meet', async () => {
    active(HMG_STEPS.AWAITING_TAX);
    const reply = await service.handleInbound(conversation, '1');
    expect(reply.replyText).toContain('How would you like to meet?');
    expect(reply.replyButtons?.buttons.map((button) => button.title)).toEqual([
      'Call me',
      'Video call',
      'In person',
    ]);
    expect(sessions.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_MEETING,
        payload: expect.objectContaining({ serviceId: 'tax_kra' }),
      }),
    );
  });

  it('saves tax health check from reply 5', async () => {
    active(HMG_STEPS.AWAITING_TAX);
    await service.handleInbound(conversation, '5');
    expect(sessions.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_MEETING,
        payload: expect.objectContaining({ serviceId: 'tax_health' }),
      }),
    );
  });

  it('repeats the tax step when the reply is not 1 or 5', async () => {
    active(HMG_STEPS.AWAITING_TAX);
    const reply = await service.handleInbound(conversation, '2');
    expect(reply.replyButtons?.buttons.map((button) => button.id)).toEqual([
      'tax_kra',
      'tax_health',
    ]);
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('opens books from 2 and saves payroll from 4', async () => {
    active(HMG_STEPS.AWAITING_TOPIC);
    const submenu = await service.handleInbound(conversation, '2');
    expect(submenu.replyButtons?.buttons.map((button) => button.id)).toEqual([
      'accounting',
      'payroll',
    ]);

    active(HMG_STEPS.AWAITING_BOOKS);
    await service.handleInbound(conversation, '4');
    expect(sessions.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_MEETING,
        payload: expect.objectContaining({ serviceId: 'payroll' }),
      }),
    );
  });

  it('saves accounting from the button id', async () => {
    active(HMG_STEPS.AWAITING_BOOKS);
    await service.handleInbound(conversation, 'accounting');
    expect(sessions.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        payload: expect.objectContaining({ serviceId: 'accounting' }),
      }),
    );
  });

  it('sends audit to the meeting step and something else to a free-text prompt', async () => {
    active(HMG_STEPS.AWAITING_AUDIT);
    const audit = await service.handleInbound(conversation, '3');
    expect(audit.replyText).toContain('How would you like to meet?');

    active(HMG_STEPS.AWAITING_AUDIT);
    const other = await service.handleInbound(conversation, '6');
    expect(other.replyText).toBe(
      'Tell us briefly what you need, and we will get back to you.',
    );
    expect(other.replyButtons).toBeUndefined();
    expect(sessions.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ step: HMG_STEPS.AWAITING_OTHER }),
    );
  });

  it('ends something else after the free text, without asking for a name', async () => {
    active(HMG_STEPS.AWAITING_OTHER, { serviceId: 'something_else' });
    const reply = await service.handleInbound(
      conversation,
      'Need help with a grant audit',
    );
    expect(reply.replyText).toContain('Something else');
    expect(reply.replyText).toContain('We will get back to you soon.');
    expect(reply.replyText).toContain(
      'Details will be covered on your discovery call.',
    );
    expect(reply.replyText).not.toContain('Thank you,');
    expect(sessions.markSubmitted).toHaveBeenCalled();
    expect(sessions.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        payload: expect.objectContaining({
          brief: 'Need help with a grant audit',
          contactPhone: '254799229340',
          serviceId: 'something_else',
        }),
      }),
    );
  });

  it('accepts a service name on the main menu and skips the submenu', async () => {
    active(HMG_STEPS.AWAITING_TOPIC);
    const reply = await service.handleInbound(conversation, 'payroll');
    expect(reply.replyText).toContain('How would you like to meet?');
    expect(sessions.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_MEETING,
        payload: expect.objectContaining({ serviceId: 'payroll' }),
      }),
    );
  });

  it('resends the menu for anything that is not a choice', async () => {
    active(HMG_STEPS.AWAITING_TOPIC);
    const reply = await service.handleInbound(conversation, '5');
    expect(reply.replyButtons?.buttons).toHaveLength(3);
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('asks for a name after a meeting choice and confirms the request', async () => {
    active(HMG_STEPS.AWAITING_MEETING, { serviceId: 'payroll' });
    const namePrompt = await service.handleInbound(conversation, 'Call me');
    expect(namePrompt.replyText).toBe("Last step. What's your name?");
    expect(sessions.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_NAME,
        payload: expect.objectContaining({ meetingId: 'call_me' }),
      }),
    );

    active(HMG_STEPS.AWAITING_NAME, {
      serviceId: 'payroll',
      meetingId: 'call_me',
    });
    const done = await service.handleInbound(conversation, 'Amina');
    expect(done.replyText).toContain('Thank you, Amina.');
    expect(done.replyText).toContain('Payroll');
    expect(done.replyText).toContain('We will call you shortly.');
    expect(sessions.markSubmitted).toHaveBeenCalled();
  });

  it('promises a booking link for video and in person', async () => {
    active(HMG_STEPS.AWAITING_NAME, {
      serviceId: 'tax_kra',
      meetingId: 'video_call',
    });
    const video = await service.handleInbound(conversation, 'Jane');
    expect(video.replyText).toContain('We will send a booking link shortly.');

    active(HMG_STEPS.AWAITING_NAME, {
      serviceId: 'audit',
      meetingId: 'in_person',
    });
    const office = await service.handleInbound(conversation, 'Jane');
    expect(office.replyText).toContain('We will send a booking link shortly.');
  });

  it('repeats the meeting step when the reply is not a format', async () => {
    active(HMG_STEPS.AWAITING_MEETING, { serviceId: 'audit' });
    const reply = await service.handleInbound(conversation, 'tomorrow');
    expect(reply.replyButtons?.buttons).toHaveLength(3);
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('restarts from hi, hello, menu, or start at any step', async () => {
    active(HMG_STEPS.AWAITING_NAME, {
      serviceId: 'payroll',
      meetingId: 'call_me',
    });
    const reply = await service.handleInbound(conversation, 'menu');
    expect(reply.replyText).toContain('What would you like to discuss?');
    expect(sessions.closeOpen).toHaveBeenCalledWith('conv-1');
    expect(sessions.markSubmitted).not.toHaveBeenCalled();
  });

  it('points a finished chat back to menu until they restart', async () => {
    sessions.findLatest.mockResolvedValue({
      reference: 'HMG-ABC123',
    } as never);
    const reply = await service.handleInbound(conversation, 'thanks');
    expect(reply.replyText).toContain('HMG-ABC123');
    expect(reply.replyText).toContain('menu');

    const restarted = await service.handleInbound(conversation, 'hello');
    expect(restarted.replyText).toContain('What would you like to discuss?');
  });
});
