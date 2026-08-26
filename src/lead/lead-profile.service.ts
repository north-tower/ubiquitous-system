import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadProfile } from './lead-profile.entity';

@Injectable()
export class LeadProfileService {
  constructor(
    @InjectRepository(LeadProfile)
    private readonly profiles: Repository<LeadProfile>,
  ) {}

  async findByConversationId(
    conversationId: string,
  ): Promise<LeadProfile | null> {
    return this.profiles.findOne({ where: { conversationId } });
  }

  async findOrCreate(conversationId: string): Promise<LeadProfile> {
    const existing = await this.findByConversationId(conversationId);
    if (existing) {
      return existing;
    }
    try {
      return await this.profiles.save(
        this.profiles.create({
          conversationId,
          requestedFeatures: [],
        }),
      );
    } catch {
      const raced = await this.findByConversationId(conversationId);
      if (raced) {
        return raced;
      }
      throw new Error(
        `Could not create lead profile for conversation ${conversationId}`,
      );
    }
  }

  async save(profile: LeadProfile): Promise<LeadProfile> {
    return this.profiles.save(profile);
  }
}
