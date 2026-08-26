import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Conversation } from '../src/conversation/conversation.entity';
import { Message } from '../src/conversation/message.entity';
import { Tenant } from '../src/tenant/tenant.entity';

const TEST_PHONE_NUMBER_ID = 'phase1-test-phone-number-id';
const TEST_PROSPECT_PHONE = '254711111111';

const sampleWebhook = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'WABA_ID_1',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '254700000000',
              phone_number_id: TEST_PHONE_NUMBER_ID,
            },
            contacts: [
              { profile: { name: 'Jane Doe' }, wa_id: TEST_PROSPECT_PHONE },
            ],
            messages: [
              {
                from: TEST_PROSPECT_PHONE,
                id: 'wamid.PHASE1_TEST',
                timestamp: '1700000000',
                type: 'text',
                text: { body: 'hello from phase 1' },
              },
            ],
          },
        },
      ],
    },
  ],
};

describe('WhatsApp webhook (e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('creates a Conversation and inbound Message from a Meta webhook POST', async () => {
    const tenants = dataSource.getRepository(Tenant);
    const conversations = dataSource.getRepository(Conversation);
    const messages = dataSource.getRepository(Message);

    let tenant = await tenants.findOne({
      where: { whatsappPhoneNumberId: TEST_PHONE_NUMBER_ID },
    });
    if (!tenant) {
      tenant = await tenants.save(
        tenants.create({
          name: 'Techfind Consulting',
          whatsappPhoneNumberId: TEST_PHONE_NUMBER_ID,
          whatsappBusinessAccountId: null,
        }),
      );
    }

    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send(sampleWebhook)
      .expect(200)
      .expect({ received: true });

    const conversation = await conversations.findOne({
      where: { tenantId: tenant.id, prospectPhone: TEST_PROSPECT_PHONE },
    });
    expect(conversation).not.toBeNull();
    if (!conversation) {
      return;
    }
    expect(conversation.currentState).toBe('NEW');

    const inbound = await messages.find({
      where: { conversationId: conversation.id },
    });
    expect(inbound).toHaveLength(1);
    expect(inbound[0].direction).toBe('in');
    expect(inbound[0].text).toBe('hello from phase 1');

    await messages.delete({ conversationId: conversation.id });
    await conversations.delete({ id: conversation.id });
    await tenants.delete({ id: tenant.id });
  });
});
