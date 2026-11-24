# n8n workflows

Three workflows live in `workflows/` as exported JSON. They contain no secrets:
signing keys are read at runtime from the container env (`$env.LENDLOOP_*_SECRET`,
set in `n8n/.env`), and the only credential (Mailpit SMTP) is referenced by name.

| Workflow                           | Trigger                                      | What it does                                                                                                                                                                                                                              |
| ---------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LendLoop: Request notification** | Webhook `POST /webhook/lendloop/loan-events` | Verifies Convex's HMAC signature (401 if invalid or older than 5 min), skips eventIds it already emailed, emails the one recipient, then reports `sent`/`failed` back to Convex. Answers 502 on email failure so Convex's outbox retries. |
| **LendLoop: Overdue reminders**    | Daily 09:00 UTC                              | Fetches overdue loans from Convex (signed GET), emails each borrower, writes each outcome back with Convex's `reminder:<loanId>:<date>` idempotency key.                                                                                  |
| **LendLoop: Error handler**        | Error Trigger                                | Set as the error workflow of the other two. Emails the admin (Mailpit) and records the failure in Convex.                                                                                                                                 |

Every HTTP and email node retries 3 times (3 s apart). Anything still failing ends
in the error handler, so no run fails silently.

## Setup

1. Start the stack: `npm run infra:up` (n8n on http://localhost:5678, Mailpit on http://localhost:8025).
2. Import the workflows:
   ```bash
   docker compose -f n8n/docker-compose.yml exec n8n n8n import:workflow --separate --input=/home/node/workflows
   ```
3. In n8n, create the SMTP credential: **Credentials → Create → SMTP**, name it `Mailpit SMTP`,
   host `mailpit`, port `1025`, SSL/TLS **off**, no user or password. Open each workflow and
   make sure every email node uses it.
4. n8n assigns new workflow IDs on import, so relink the error workflow: open each of the
   two main workflows → **Settings** → set **Error workflow** to "LendLoop: Error handler".
5. Publish (activate) **Request notification** and **Overdue reminders**.
6. Point Convex at the webhook (production URL, through your tunnel):
   ```bash
   npx convex env set N8N_NOTIFY_WEBHOOK_URL "https://<your-tunnel-domain>/webhook/lendloop/loan-events"
   ```

## Re-exporting after edits

```bash
docker compose -f n8n/docker-compose.yml exec n8n n8n export:workflow --all --separate --output=/home/node/workflows
```

Then check the diff for anything secret-looking before committing.
