# Support message extractor

Paste a support message. The app returns one object: summary, category, urgency, request, order number, confidence, and uncertainties. A field the text does not contain is null. If the model output fails the schema, the row is stored as `failed`.

A clarification is one follow-up on the same message. It writes a second row.

## Run

```bash
cp .env.example .env
docker compose up --build
```

Open http://localhost:3000.

Demo user: `demo@extractor.local` / `demo-pass-123`

The image is Node 24. Postgres is 16. `LLM_PROVIDER` defaults to `mock`, so no API key is required. On start the container migrates as `extractor`, seeds the demo user as `extractor_app`, and starts the server.

`AUTH_SECRET` is read from `.env`. The image build does not receive it.

For Anthropic, set `LLM_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` in `.env`, then recreate the app container. Without the key, that configuration refuses to boot.

## What a request does

1. `buildPrompt` wraps the text in `<user_message>` and escapes `&`, `<`, and `>`. The user cannot close the block. An instruction inside the block can still be read. The model has no tools. Category, urgency, and confidence are closed enums, so the damage is a mislabeled object.
2. `invokeModel` calls the provider with a 10 second timeout and at most one retry inside that budget.
3. `toExtraction` checks the object with Zod. Zod is the source of the types.

The row is inserted after those three steps. `createProvider` picks `MockProvider` or `AnthropicProvider` from the environment. The mock returns order `123` only when the prompt contains the whole phrase `order 123`. Anything else is low confidence and nulls.

`POST /api/extractions/:id/clarifications` loads the parent for the session user, sends the original text plus the clarification, and stores `parentId`. The first JSON stays as it was. A missing row and another user's row are the same 404. If the stored text was wiped, the route returns 409 `missing_text`.

Low confidence is a sentence on the result, plus a color.

## Decisions

Category, urgency, and confidence are enums. The order number has to appear in the text. The prompt version is `extract-v4`, in `build-prompt.ts`. `PROMPT_VERSION` overrides it when set.

The model is `claude-haiku-5-5`. Haiku 5.5 rejects temperature, so the call does not send it.

The session is a JWT in the `HttpOnly` cookie `session`, `SameSite=Lax`, `Secure` in production, for 8 hours. The payload is `sub`, `iat`, and `exp`. Each request loads the user from the database. There is no signup.

Passwords use async `scrypt`. Five failures for one email in 15 minutes return 429. Unknown emails count too. The counter is in memory, per process. One password tried across many emails is outside that limit.

Extractions are limited to 10 per user per hour, in memory, taken before the model runs. A timeout spends the slot. Two processes each allow 10. Idle users stay in the map until the process restarts.

Input is capped at 4,000 characters and output at 512 tokens. A JSON body over 16 KB is rejected before it is parsed.

## Cost

Claude Haiku 5.5 list price, prompts at or under 100,000 tokens, checked 13 October 2026: USD 0.10 per million input tokens and USD 0.50 per million output tokens. Above 100,000 tokens the list price is 0.50 and 2.50. Four thousand characters stays under that line. These are list prices. The row stores the token counts.

A measured call that day used about 850 input tokens and 170 output tokens.

```text
(850 / 1_000_000) * 0.10 + (170 / 1_000_000) * 0.50 = USD 0.00017
```

| Calls | USD |
|---|---|
| 1 | 0.00017 |
| 1,000 | 0.17 |
| 10,000 | 1.70 |
| 100,000 | 17 |

Haiku 4.5 is priced at USD 1 and USD 5 per million. This app calls `claude-haiku-5-5`.

More parallel calls raise the bill. The caps in this design are 10 calls per user per hour and one task.

## Data, logs, retention

The message is stored so the result can be opened and clarified. It is the sensitive part of the row. Logs do not include it.

Also absent from storage: the API key, a plaintext password, and the raw model text when the schema fails. A failed row keeps `error_schema`, the field name that broke. Passwords are `scrypt` hashes.

The row is the audit record: who asked, which prompt version, which model, when, how many tokens, and `parentId` when the row is a clarification. After the wipe, that record remains.

Each model call logs one JSON line: `userId`, `extractionId`, `promptVersion`, `modelId`, `inputTokens`, `outputTokens`, `durationMs`, `status`. On timeout there is no row, `extractionId` is null, and the token counts are 0.

`npm run retain` nulls `input_text` and `output` on rows older than 30 days. The rest of the row stays, including `error_schema`. There is no AWS cron. On a VPS this is the host cron, with the same `DATABASE_URL`.

Every query filters by the session user id.

## Evals

```bash
npm run eval
```

Five fixtures, mock only, no database and no API key. They check enums, nulls, and the order number. The summary is left out. Run them again when `PROMPT_VERSION` or `LLM_MODEL` changes. A case that goes from null to an invented order number is a regression.

`npm run eval -- --real` calls Anthropic and needs `ANTHROPIC_API_KEY`. On a vague message the real model may change urgency between runs. That fixture requires low confidence and nulls, and leaves urgency free. The injection fixture fails only if the model obeys with a confidence other than low. Empty text and text over 4,000 characters are rejected by the same check as the HTTP route, and the model is not called.

A wrong answer is handled with a clarification. That creates another row, linked with `parentId`. If the case should be kept, a fixture is added by hand.

## Infrastructure

`infra/main.tf` is a design. It has not been applied. There is no remote state and no VPC in the file. It names Secrets Manager entries for the API key, the database URLs, and `AUTH_SECRET`. The values are not in the file. It describes one Fargate task and a small private RDS Postgres 16. What runs is Compose. A VPS would run this same Compose. Applying the file needs a state bucket in an account that is not a personal one.

The API key is in the process environment: `.env` locally, Secrets Manager in the AWS design. Rotation is a new secret version, a new deploy, then revoke the old key at the provider. Until that deploy finishes, the running task still has the previous value.

The model call lasts seconds and holds the connection. One Fargate task is the ceiling here. The constraint is the provider quota and the price per token. Lambda would be fighting the timeout and a cold start, and a burst of concurrent calls is a burst in the bill.

## Not built

**Streaming.** The result is one object. The button stays pending while the call runs.

**Tools.** There is no order system to query. The model has no tools, so an injected instruction cannot fire one.

**Queues.** The person is waiting, and the work fits in the HTTP timeout. A longer job would be a `pending` row in this Postgres, plus a worker. Kafka is a log for many producers or several consumers.

**RAG.** The message fits in the prompt. Retrieval is the next piece when a manual or a catalog does not fit in the window.

**Multi-tenant.** There is one demo user. With organizations, every extraction query would take `userId` or `orgId` from the session. The body can name any tenant it wants. Isolation is that query filter.
