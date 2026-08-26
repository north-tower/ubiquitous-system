import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpenAI } from 'openai';
import { AIUsageEvent } from './ai-usage-event.entity';
import { EntityExtractionService } from './entity-extraction.service';
import { IndustryClassifierService } from './industry-classifier.service';
import { OpenAiClientService } from './openai-client.service';
import { OPENAI_SDK } from './openai.constants';

@Module({
  imports: [TypeOrmModule.forFeature([AIUsageEvent])],
  providers: [
    {
      provide: OPENAI_SDK,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new OpenAI({ apiKey: config.get<string>('OPENAI_API_KEY') ?? '' }),
    },
    OpenAiClientService,
    IndustryClassifierService,
    EntityExtractionService,
  ],
  exports: [
    OpenAiClientService,
    IndustryClassifierService,
    EntityExtractionService,
  ],
})
export class AiClientModule {}
