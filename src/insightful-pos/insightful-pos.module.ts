import { Module } from '@nestjs/common';
import { InsightfulPosClient } from './insightful-pos.client';

@Module({
  providers: [InsightfulPosClient],
  exports: [InsightfulPosClient],
})
export class InsightfulPosModule {}
