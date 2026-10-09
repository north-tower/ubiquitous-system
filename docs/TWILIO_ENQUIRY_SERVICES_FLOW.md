# Services step — WhatsApp Flow (multi-select)

When `TWILIO_ENQUIRY_SERVICES_FLOW_CONTENT_SID` is set, the enquiry bot sends that **Content template** instead of the single-select list (`TWILIO_ENQUIRY_SERVICES_CONTENT_SID`).

Inbound Flow submissions are read from Twilio webhook fields **`InteractiveData`** or **`FlowData`**. Option ids must match `SERVICE_OPTIONS` in `src/enquiry-flow/enquiry-options.ts`:

| `id` (use in Flow) | Label |
| --- | --- |
| `sound_pa` | Sound & PA |
| `lighting` | Lighting |
| `dj` | DJ |
| `full` | Full package |
| `other` | Something else |

Typed replies still work: `1, 2`, `sound and lighting`, etc.

## Option A — `twilio/flows` (Content Template Builder)

1. Twilio Console → **Messaging** → **Content Template Builder** → Create → type **`twilio/flows`**.
2. One screen with a **`MULTI_SELECT`** component:
   - Label: e.g. “What should we handle?”
   - Options JSON (ids exactly as in the table above).
3. Add a **Footer** submit button.
4. Copy the template **Content SID** (`HX…`) → `TWILIO_ENQUIRY_SERVICES_FLOW_CONTENT_SID`.

For static `twilio/flows` templates (no `{{1}}` in the builder), the API sends **no** `ContentVariables`. If Twilio returns error **21656**, remove any stray variables from the send path or ensure the template has no unused placeholders.

For `whatsapp/flows` with `flow_token: "{{1}}"`, set `TWILIO_ENQUIRY_SERVICES_FLOW_SEND_FLOW_TOKEN=true` so the app sends a unique token in variable `1`.

## Option B — `whatsapp/flows` (Meta Flow + Content API)

1. Meta **WhatsApp Manager** → **Flows** → create a Flow with a **Checkbox group** / multi-select; option payloads = ids above.
2. Publish the Flow; note **Flow ID** and **first screen id**.
3. Create a **`whatsapp/flows`** Content template via [Twilio Content API](https://www.twilio.com/docs/content/whatsapp-flows) with `flow_id`, `flow_first_page_id`, and `flow_token: "{{1}}"`.
4. Put the resulting Content SID in `TWILIO_ENQUIRY_SERVICES_FLOW_CONTENT_SID`.

## Docker / deploy

Ensure both variables are passed into the API container (see `docker-compose.yml`):

- `TWILIO_ENQUIRY_SERVICES_FLOW_CONTENT_SID` — multi-select Flow (preferred)
- `TWILIO_ENQUIRY_SERVICES_CONTENT_SID` — list fallback if Flow SID is empty

Restart the API after changing env.

## Verify

1. Run enquiry flow to the services step → message should show **Open flow** / survey button, not only a numbered text list.
2. Select multiple services → submit → bot should ask for guest count with combined services on the summary.

Tests: `pnpm test -- parse-services-flow-response parse-twilio resolve-enquiry-twilio-content-send`
