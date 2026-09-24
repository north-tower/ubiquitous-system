export type IndustryFlowEngineKind = 'script' | 'salon' | 'solar';

export type IndustryFlowStep = {
  id: string;
  prompt: string;
  reask: string;
  minLength?: number;
};

export type IndustryFlowPlaaggInsights = {
  pipelineStage: string;
  followUp: string;
  assignee: string;
  dashboardInsight: string;
};

export type IndustryFlowRecommendedPlan = {
  name: string;
  summary: string;
  modules: string[];
};

export type IndustryFlowDefinitionBody = {
  intro?: string;
  aliases?: string[];
  steps?: IndustryFlowStep[];
  customerSummaryTemplate?: string[];
  plaaggInsights: IndustryFlowPlaaggInsights;
  recommendedPlan: IndustryFlowRecommendedPlan;
};

export type IndustryFlowRecord = {
  id: string;
  tenantId: string;
  demoMode: string;
  menuLabel: string;
  plaaggMenuId: string;
  sortOrder: number;
  isActive: boolean;
  engineKind: IndustryFlowEngineKind;
  definition: IndustryFlowDefinitionBody;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertIndustryFlowInput = {
  demoMode: string;
  menuLabel: string;
  plaaggMenuId: string;
  sortOrder?: number;
  isActive?: boolean;
  engineKind: IndustryFlowEngineKind;
  definition: IndustryFlowDefinitionBody;
};
