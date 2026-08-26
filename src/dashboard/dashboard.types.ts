import { ConversationState } from '../state-machine/conversation-state.enum';
import { type LeadScore } from '../lead/lead-profile.entity';

export type DashboardToday = {
  whatsappConversations: number;
  newProspects: number;
  simulationsStarted: number;
  simulationsCompleted: number;
  qualifiedLeads: number;
  hotLeads: number;
  meetingsBooked: number;
  humanHandoffs: number;
};

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  conversionFromPrevious: number | null;
};

export type DashboardFunnel = {
  stages: FunnelStage[];
};

export type ConversationListItem = {
  id: string;
  customerPhone: string;
  businessName: string | null;
  industry: string | null;
  leadScore: LeadScore | null;
  currentState: ConversationState;
  demoMode: string | null;
  assignedSalesperson: string | null;
  nextAction: string | null;
  createdAt: Date;
};

export type ConversationListResult = {
  items: ConversationListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type ConversationListFilters = {
  leadScore?: LeadScore;
  demoMode?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
};

export type ConversationMessageView = {
  id: string;
  direction: 'in' | 'out';
  text: string | null;
  createdAt: Date;
};

export type ConversationDetail = {
  id: string;
  customerPhone: string;
  currentState: ConversationState;
  demoMode: string | null;
  assignedSalesperson: string | null;
  nextAction: string | null;
  createdAt: Date;
  lead: {
    businessName: string | null;
    industry: string | null;
    leadScore: LeadScore | null;
    painPoint: string | null;
    dailyEnquiryVolume: number | null;
    currentProcess: string | null;
    staffCount: number | null;
    existingSystem: string | null;
    conversationSummary: string | null;
    requestedFeatures: string[];
  } | null;
  messages: ConversationMessageView[];
};

export type DemoAnalyticsRow = {
  demoMode: string;
  started: number;
  completed: number;
  leads: number;
  meetings: number;
};
