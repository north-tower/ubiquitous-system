import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiClientModule } from '../ai-orchestrator/ai-client.module';
import { ConversationModule } from '../conversation/conversation.module';
import { ConversationSummaryService } from './conversation-summary.service';
import { LeadProfile } from './lead-profile.entity';
import { LeadProfileService } from './lead-profile.service';
import { LeadScoringService } from './lead-scoring.service';
import { QualificationFlowService } from './qualification-flow.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeadProfile]),
    ConversationModule,
    AiClientModule,
  ],
  providers: [
    LeadProfileService,
    QualificationFlowService,
    LeadScoringService,
    ConversationSummaryService,
  ],
  exports: [
    LeadProfileService,
    QualificationFlowService,
    LeadScoringService,
    ConversationSummaryService,
  ],
})
export class LeadModule {}
