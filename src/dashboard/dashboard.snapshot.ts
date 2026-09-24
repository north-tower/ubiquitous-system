import { Conversation } from '../conversation/conversation.entity';
import { Message } from '../conversation/message.entity';
import { DemoSimulation } from '../demo-engine/demo-simulation.entity';
import { EnquirySession } from '../enquiry-flow/enquiry-session.entity';
import { LeadProfile } from '../lead/lead-profile.entity';

export type DashboardSnapshot = {
  conversations: Conversation[];
  simulations: DemoSimulation[];
  enquirySessions: EnquirySession[];
  leads: LeadProfile[];
  recentMessages: Array<Pick<Message, 'conversationId' | 'createdAt'>>;
};

export type ConversationBundle = {
  conversation: Conversation;
  messages: Message[];
  lead: LeadProfile | null;
};
