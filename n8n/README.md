# n8n workflows

Three workflows live in `workflows/` as exported JSON. They contain no secrets: settings
and signing keys are read at runtime from n8n Variables (`$vars.*`, on n8n Cloud) or, when
those aren't set, from the container env (`$env.*`, set in `n8n/.env`). The only credential
(SMTP) is referenced by name.

| Workflow                           | Trigger                                      | What it does                                                                                                                                                                                                                              |
| ---------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LendLoop: Request notification** | Webhook `POST /webhook/lendloop/loan-events` | Verifies Convex's HMAC signature (401 if invalid or older than 5 min), skips eventIds it already emailed, emails the one recipient, then reports `sent`/`failed` back to Convex. Answers 502 on email failure so Convex's outbox retries. |
| **LendLoop: Overdue reminders**    | Daily 09:00 UTC                              | Fetches overdue loans from Convex (signed GET), emails each borrower, writes each outcome back with Convex's `reminder:<loanId>:<date>` idempotency key.                                                                                  |
| **LendLoop: Error handler**        | Error Trigger                                | Set as the error workflow of the other two. Emails the admin and records the failure in Convex.                                                                                                                                           |

Every HTTP and email node retries 3 times (3 s apart). Anything still failing ends
in the error handler, so no run fails silently.

## On n8n Cloud

n8n Cloud blocks `$env` and can't reach Mailpit on your machine, so settings come from n8n
Variables and email goes to a Mailtrap sandbox. Convex calls n8n Cloud directly, so no tunnel
is needed.

1. **Variables.** Open **Overview → Variables** and add these. Variables may need a paid plan.

   | Key                        | Value                                            |
   | -------------------------- | ------------------------------------------------ |
   | `CONVEX_SITE_URL`          | `https://<your-deployment>.convex.site`          |
   | `LENDLOOP_OUTBOUND_SECRET` | Same value as in Convex (from `n8n/.env`)        |
   | `LENDLOOP_INBOUND_SECRET`  | Same value as in Convex (from `n8n/.env`)        |
   | `LENDLOOP_APP_URL`         | Where the app runs, e.g. `http://localhost:3000` |
   | `LENDLOOP_ALERT_EMAIL`     | Where error alerts go                            |

   Anyone with access to the n8n instance can read Variables.

2. **Email.** In Mailtrap, open **Sandboxes → My Sandbox → SMTP**. In n8n, create an **SMTP**
   credential with that host, port, username and password (SSL/TLS off for port 2525).
   The sandbox catches every email and delivers nothing, like Mailpit.
3. **Import.** For each file in `workflows/`, create a workflow → **⋯ → Import from File**.
4. **Credential.** Select the SMTP credential on every email node: Send notification email,
   Send reminder email and Email admin.
5. **Error workflow.** n8n assigns new workflow IDs on import, so open each of the two main
   workflows → **Settings** → set **Error workflow** to "LendLoop: Error handler".
6. **Publish** Request notification and Overdue reminders.
7. Point Convex at the webhook:
   ```bash
   npx convex env set N8N_NOTIFY_WEBHOOK_URL "https://<your-instance>.app.n8n.cloud/webhook/lendloop/loan-events"
   ```
8. Check it: an unsigned call should get 401, which means the workflow ran and read its secret.
   ```bash
   curl -i -X POST "https://<your-instance>.app.n8n.cloud/webhook/lendloop/loan-events" -H 'Content-Type: application/json' -d '{}'
   ```

## Self-hosted (Docker)

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

On n8n Cloud, open each workflow → **⋯ → Download** and save it over the file in `workflows/`.
Self-hosted:

```bash
docker compose -f n8n/docker-compose.yml exec n8n n8n export:workflow --all --separate --output=/home/node/workflows
```

Then check the diff for anything secret-looking before committing.
