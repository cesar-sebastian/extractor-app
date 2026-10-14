# Support message extractor

Paste a support message. The app returns one object: summary, category, urgency, request, order number, confidence, and a list of uncertainties. If the text does not contain a field, that field is null. If the model output does not match the schema, the row is stored as failed and the app does not invent a result.

The input is pasted text, not a file. A document would push this into retrieval, and a support message fits in the prompt. A clarification is one follow-up on the same message, not a free chat.

The model does not send email, update an order, or call any other system.

## Run

Docker Compose is the path to review. It builds the app image (Node 24) and starts Postgres 16. No API key is required.

```bash
cp .env.example .env
docker compose up --build
```

Open http://localhost:3000.

| | |
|---|---|
| Email | `demo@applica.local` |
| Password | `demo-pass-123` |

The container migrates as the database superuser `applica`, seeds the demo user as the restricted role `applica_app`, then starts `node server.js`. `LLM_PROVIDER` defaults to `mock`.

`AUTH_SECRET` is read from `.env` at start. It is not baked into the image. `.env` is not committed.

To call Anthropic instead of the mock, set `LLM_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` in `.env`, then recreate the app container. Without the key, an Anthropic configuration refuses to boot.

### Local scripts

`npm run dev`, `npm run eval`, and `npm run retain` need Node 22 or newer on the host. The default image is Node 24 because Node 22 left maintenance in April 2026. Stop the Compose app first if you want `npm run dev` on port 3000. Postgres can stay up: the published port is 5432, and `.env.example` points at `localhost`.

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

## What a request does

1. `buildPrompt` wraps the user text in a delimiter and escapes `&`, `<`, and `>`. Escaping stops the user from closing the block. An instruction written inside the block can still be read. The model has no tools, and category, urgency, and confidence have to match a closed enum, so the damage is a mislabeled object rather than a side effect. That reduces injection. It does not make it impossible.
2. `invokeModel` calls the provider with a 10 second timeout and at most one retry inside that budget.
3. `toExtraction` checks the object against the Zod schema. Zod is the source of the types.

Only then is a row inserted. The handler does not talk to the model itself.

`MockProvider` and `AnthropicProvider` implement the same `ModelProvider` interface. `crearProveedor` picks one from the environment. The mock is a fixed answer, not a second extractor: it returns order `123` only when the prompt contains the whole phrase `orden 123`. Anything else is low confidence and nulls. That is what runs without a key, and what the fixtures assert.

A clarification is a second row. `POST /api/extracciones/:id/aclaraciones` loads the parent for the session user, sends the original text plus the clarification, and stores `parentId`. It does not edit the first JSON. The id in the URL is checked against the session. A missing row and another user's row are the same 404.

Low confidence is an explicit sentence on the result, not only a color.

## Decisions

The output is a closed object because a free-form summary cannot be evaluated and cannot be refused field by field. Category, urgency, and confidence are enums. The order number has to appear in the text.

The prompt version is `extract-v3`. The instruction text lives in `build-prompt.ts`. `PROMPT_VERSION` may be set in the environment; if it is absent, the row still stores `extract-v3`.

Haiku 5.5 (`claude-haiku-5-5`) does not accept temperature. The code does not send it. Stable fields come from the schema, not from sampling. The summary is prose and is allowed to move.

The session is a JWT in an `HttpOnly` cookie (`session`), `SameSite=Lax`, `Secure` in production, valid for 8 hours. The payload is `sub`, `iat`, and `exp`. The signature is not enough: the user is loaded from the database. There is no open registration.

Passwords use async `scrypt`. Five failed logins for one email in 15 minutes return 429, including unknown emails, so the limit does not reveal whether the account exists. The counter is in memory. It does not stop one password tried across many emails.

Extraction is limited to 10 calls per user per hour, in memory, taken before the model runs. A timeout still spends a slot, because the attempt may have been billed. Two processes would each allow 10. The map is not shared and does not evict idle users.

Input is capped at 4,000 characters, output at 512 tokens. The JSON body is rejected above 16 KB before it is parsed.

## Cost

List price for Claude Haiku 5.5, prompts at or under 100,000 tokens, checked on 13 October 2026: **USD 0.10 per million input tokens** and **USD 0.50 per million output tokens**. Above 100,000 tokens the list price is 0.50 and 2.50. This prompt does not get there: 4,000 characters is a few thousand tokens. This is list price, not an invoice. The row stores the token counts, so a real cost comes from the table.

A measured call on that date used about 850 input tokens and 170 output tokens.

```text
(850 / 1_000_000) * 0.10 + (170 / 1_000_000) * 0.50 = USD 0.00017
```

| Calls | USD at that measurement |
|---|---|
| 1 | 0.00017 |
| 1,000 | 0.17 |
| 10,000 | 1.70 |
| 100,000 | 17 |

Haiku 4.5 is a different model and a different price (USD 1 and USD 5 per million). This app asks for `claude-haiku-5-5`.

Scaling the container does not lower the model bill. More parallel calls raise it. The cap is the per-user limit and the single task, not an unbounded autoscaler.

## Data, logs, retention

The message is stored so the person can open the result and clarify it. It is the sensitive part of a row. It is not written to the log.

What is not stored: the API key, a plaintext password, or the raw model text when the schema fails. A failed row keeps the field name that broke (`error_schema`), not the model's prose. Passwords are stored as `scrypt` hashes.

Audit is the row itself. It answers who asked, which prompt version, which model, when, how many tokens, and, through `parentId`, whether this was a clarification of an earlier row. After the wipe, that record remains. The message does not.

Each model call logs one JSON line to stdout: `userId`, `extractionId`, `promptVersion`, `modelId`, `tokensEntrada`, `tokensSalida`, `duracionMs`, `status`. The logger is not exported. The message and the summary are not fields of that object. If the provider times out, there is no row, `extractionId` is null, and the token counts are 0.

`npm run retain` nulls `texto_entrada` and `salida` on rows older than 30 days. The row stays: id, user, status, prompt version, model, tokens, duration, and time. `error_schema` stays too; it is the field name that failed, not the message. There is no AWS cron. On a VPS this would be the host cron, using the same `DATABASE_URL`.

Queries always filter by the session user id. The body cannot choose whose rows to read.

## Evals

```bash
npm run eval
```

Five fixtures, mock only, no database and no API key. They compare enums, nulls, and the order number. They do not compare the summary. Run them when `PROMPT_VERSION` or `LLM_MODEL` changes. A case that goes from null to an invented order number is a regression, even if the summary reads better.

`npm run eval -- --real` calls Anthropic and requires `ANTHROPIC_API_KEY`. That is not the review path. On a vague message the real model may flip urgency between runs; the fixture requires low confidence and nulls, and leaves urgency free. The injection fixture fails only if the model obeys with a confidence that is not low. Empty text and text over 4,000 characters are rejected by the same check as the HTTP route, and the model is not called.

A wrong answer in production is not a retrain. The person sees the low-confidence warning and sends a clarification. That creates another row, linked with `parentId`. If the case is worth keeping, a fixture is added by hand.

## Infrastructure

`infra/main.tf` is a design. It has not been applied. There is no remote state and no drawn VPC. It names Secrets Manager entries for the API key, the database URLs, and `AUTH_SECRET`, without putting the values in the file. It describes one Fargate task and a small private RDS Postgres 16. Compose is what runs. A VPS would run this same Compose. Applying the file would be a later step, with a state bucket in an account that is not a personal one.

The API key lives in the process environment. Locally that is `.env`, which is not committed. In the AWS design the task reads it from Secrets Manager at start. It is not a build arg and not a file in the image. Rotation is: store the new secret version, force a new deploy of the service, then revoke the old key at the provider. Until that deploy finishes, the previous version is still the one the running task has. The key is not edited by hand inside the container.

Config that is a decision (model id, prompt version, character cap, rate limit, timeout) is in the repo. Secrets are not.

The model call lasts seconds and holds a connection. A Lambda would fight the timeout and a cold start, and a burst of concurrent calls is a burst in the bill. One Fargate task is a ceiling. The bottleneck is the provider quota and the price per token, not CPU. Adding machines does not make a call cheaper.

## Not built

**Streaming.** The result is one object. Streaming tokens would show broken JSON. Token streaming fits a chat, where the person reads prose. The pending state on the button covers the wait.

**Tools.** There is no order system to query. A tool that "looks up the order" would give the model a side effect. That is the thing a prompt injection must not be able to fire. The model has no tools.

**Queues.** The person is looking at the screen, and the work fits inside the HTTP timeout. A queue is for a job that should not block the request. That would be a `pendiente` row in the Postgres that already exists, plus a worker. Kafka is a replicated log for many producers or several consumers. This app has one user and a short text. A broker would be another thing that can fail while the person is still waiting for the JSON.

**RAG.** The message fits in the prompt. Retrieval is the next piece when a manual or a catalog does not fit in the window. A vector store here would not change the result.

**Multi-tenant.** There is one demo user. If there were organizations, every extraction query would take `userId` or `orgId` from the session, never from the body. The body can lie. Putting a tenant id in the prompt does not isolate data. The model is not a permission boundary.
