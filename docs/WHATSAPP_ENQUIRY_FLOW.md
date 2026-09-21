# WhatsApp enquiry flow

Divine Budget WhatsApp intake only. The Techfind demo orchestrator is a
different tenant flow and is unchanged.

This is an **enquiry** conversation. It never books a date, never confirms
availability, and never takes payment (no M-Pesa, no KCB, no deposit).

## In scope

- Welcome the customer and ask what they need
- Capture name, phone, event type, preferred date, location, guest count,
  required services (including more than one), budget range, extra details
- Save the enquiry in Divine Budget and notify the team
- Confirm that the team will review and respond
- Human handover from any step (`agent`, `talk to the team`, …)
- Track source (`WHATSAPP`), status (`ASSIGNED` until staff moves it), and
  assigned team member (staff assign in the ops app)
- Recognise previously contacted people (bot history and Divine Budget
  customer / open enquiry / upcoming event)

## Out of scope

- Booking
- Availability confirmation
- M-Pesa, KCB, or any payment processing

## Conversation

1. Welcome — event type, with *agent* as a standing handover
2. Preferred date
3. Services (one or many: `1, 2` or `sound and lighting`)
4. Guest count
5. Venue / location
6. Budget range (or *skip*)
7. Additional details (or *skip*)
8. Name and phone — skipped when we already know them
9. Playback and confirm
10. File in Divine Budget; reply with the `REQ-…` reference

`reset` starts a new enquiry on the same chat. After a successful file,
further messages hold on that reference until they reset.

Returning customers:

- Open enquiry or upcoming event → offer wait vs new enquiry
- Known name/phone only → “Welcome back” and skip name/phone
- Lookup failure → treat as new; intake still works

Handover files whatever has been captured so far with `wantsCallback: true`.
If there is no name yet, the bot asks for one first.

## Activation

The seeded tenant only uses this flow when:

```
TENANT_FLOW=enquiry_intake
DIVINE_BUDGET_BASE_URL=https://<ops-app>
DIVINE_BUDGET_API_KEY=<SERVICE_API_KEY from the ops app>
```

Leave `TENANT_FLOW` unset to keep the Techfind demo. Do not enable
`enquiry_intake` until the tests below pass against the environments you
are about to use.

## Tests to run before going live

Bot (this repo):

```
pnpm test -- enquiry-flow divine-budget match-numbered-option match-handover parse-event-date
```

Ops app (`dennisknightt-divine-budget-ops`):

```
npx vitest run tests/integration/whatsapp-enquiry.test.ts tests/integration/whatsapp-contact.test.ts
```

Covered before activation: the full capture path, multi-service, handover,
idempotent retries vs a genuine second enquiry, returning-contact lookup,
source/status/assignee, budget/details in notes, and that filing creates
only an Enquiry — never an Event, reservation, or payment.
