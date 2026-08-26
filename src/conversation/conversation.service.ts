import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { ConversationState } from '../state-machine/conversation-state.enum';

export type RecordInboundInput = {
  tenantId: string;
  phoneNumber: string;
  text: string | null;
  raw: unknown;
};

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messages: Repository<Message>,
  ) {}

  async findOrCreate(
    tenantId: string,
    prospectPhone: string,
  ): Promise<Conversation> {
    const existing = await this.conversations.findOne({
      where: { tenantId, prospectPhone },
    });
    if (existing) {
      return existing;
    }

    try {
      return await this.conversations.save(
        this.conversations.create({
          tenantId,
          prospectPhone,
          currentState: ConversationState.NEW,
          demoMode: null,
        }),
      );
    } catch (error) {
      const raced = await this.conversations.findOne({
        where: { tenantId, prospectPhone },
      });
      if (raced) {
        return raced;
      }
      throw error;
    }
  }

  async recordInbound(
    inbound: RecordInboundInput,
  ): Promise<{ conversation: Conversation; message: Message }> {
    const conversation = await this.findOrCreate(
      inbound.tenantId,
      inbound.phoneNumber,
    );

    const message = await this.messages.save(
      this.messages.create({
        conversationId: conversation.id,
        direction: 'in',
        text: inbound.text,
        rawPayload: inbound.raw,
      }),
    );

    return { conversation, message };
  }

  async listMessages(conversationId: string): Promise<Message[]> {
    return this.messages.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  async findById(id: string): Promise<Conversation | null> {
    return this.conversations.findOne({ where: { id } });
  }

  async recordOutbound(input: {
    conversationId: string;
    text: string;
    rawPayload: unknown;
  }): Promise<Message> {
    return this.messages.save(
      this.messages.create({
        conversationId: input.conversationId,
        direction: 'out',
        text: input.text,
        rawPayload: input.rawPayload,
      }),
    );
  }
}
