import { Module } from '@nestjs/common';
import { DivineBudgetClient } from './divine-budget.client';

@Module({
  providers: [DivineBudgetClient],
  exports: [DivineBudgetClient],
})
export class DivineBudgetModule {}
