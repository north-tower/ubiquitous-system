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

For static `twilio/flows` templates (no `{{1}}` in the builder), the API sends **no** `ContentVariables` on the first attempt.

For `whatsapp/flows` with `flow_token: "{{1}}"`, set `TWILIO_ENQUIRY_SERVICES_FLOW_SEND_FLOW_TOKEN=true` so the app sends a unique token in variable `1` on every send (recommended if Twilio shows a **Variables** sample for the template).

**Submit for WhatsApp approval** — `twilio/flows` must be approved before Meta publishes the Flow to your WABA. While status is *Not Submitted*, sends often fail.

### 21656 with `services_flow` and `contentVariablesJson: null`

Twilio requires the number of **ContentVariables** to match placeholders registered on the template. If the template (or its `variables` block) expects `{{1}}` but the API sends none, you get 21656 even with a static-looking body in the console.

1. Set `TWILIO_ENQUIRY_SERVICES_FLOW_SEND_FLOW_TOKEN=true` and restart the API.
2. Or remove unused variables / broken `{{}}` placeholders in Content Template Builder and re-save.
3. Confirm the `HX…` SID is in the **same** Twilio account as `TWILIO_ACCOUNT_SID`.
4. Submit the template for WhatsApp approval and wait until approved.

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

## Debugging Twilio 21656

Set `TWILIO_CONTENT_SEND_DEBUG=true` and restart the API. On each content send you should see:

- `Twilio content attempt` — `sidSource` should be `services_flow` when the Flow SID is loaded; `outboundVarCount` should be `0` for static `twilio/flows` templates.
- On failure, `trace=…` and `twilioRequest=…` (whether `contentVariablesJson` was null).

If `sidSource=services_list` but you expected Flow, the container does not have `TWILIO_ENQUIRY_SERVICES_FLOW_CONTENT_SID` (rebuild/restart after env changes).

For **list fallback** (`TWILIO_ENQUIRY_SERVICES_CONTENT_SID`): either put `{{1}}` in the list body (dynamic prompt from the bot), or use a static body and set `TWILIO_ENQUIRY_SERVICES_LIST_SEND_BODY_VARIABLE=false`. The API also retries once **without** variables after 21656 on the services list path.

Tests: `pnpm test -- parse-services-flow-response parse-twilio resolve-enquiry-twilio-content-send`
