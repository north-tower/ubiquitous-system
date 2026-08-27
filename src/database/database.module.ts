import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Phase1InitSchema20260826000000 } from './migrations/20260826000000-Phase1InitSchema';
import { Phase1Conversations20260826010000 } from './migrations/20260826010000-Phase1Conversations';
import { Phase2StateMachine20260826020000 } from './migrations/20260826020000-Phase2StateMachine';
import { Phase3DemoSimulations20260826030000 } from './migrations/20260826030000-Phase3DemoSimulations';
import { Phase4AiUsageEvents20260826040000 } from './migrations/20260826040000-Phase4AiUsageEvents';
import { Phase5LeadProfiles20260826050000 } from './migrations/20260826050000-Phase5LeadProfiles';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('DATABASE_URL'),
        ssl: usePostgresSsl(config) ? { rejectUnauthorized: false } : false,
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: config.get<string>('TYPEORM_MIGRATIONS_RUN') !== 'false',
        migrations: [
          Phase1InitSchema20260826000000,
          Phase1Conversations20260826010000,
          Phase2StateMachine20260826020000,
          Phase3DemoSimulations20260826030000,
          Phase4AiUsageEvents20260826040000,
          Phase5LeadProfiles20260826050000,
        ],
        logging: config.get<string>('TYPEORM_LOGGING') === 'true',
      }),
    }),
  ],
})
export class DatabaseModule {}

function usePostgresSsl(config: ConfigService): boolean {
  const flag = config.get<string>('DATABASE_SSL')?.trim().toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;
  const url = config.get<string>('DATABASE_URL') ?? '';
  return /sslmode=require/i.test(url);
}
