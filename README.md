# SLOW-XV

Multi-session WhatsApp automation. Each linked account has its own credentials,
message store, settings, and reconnect lifecycle.

## Web Pair and privacy

Open `/` to request a WhatsApp pairing code. The public page does not list
connected accounts or expose phone numbers or session status. Re-enter the same
international phone number to request a fresh code if the previous one expired
or the account was logged out.

Accepting the SLOW-XV terms and privacy policy is required to request a code.
Following the listed WhatsApp channels and reacting to new posts is a separate,
optional consent. It is disabled unless the user explicitly selects it. Users
can withdraw that consent by submitting the same number again with the optional
setting turned off. Reaction preferences allow up to four emojis.

The admin-only panel is at `/admin`. It requires `ADMIN_PANEL_PASSWORD` with at
least 20 bytes, stored only as a deployment environment secret. It is not a
shared password for Web Pair users. The panel shows full phone numbers and
session status to the administrator and can remove local session credentials
and data. Removing a session locally does not remotely unlink the WhatsApp
device; that must be done separately in WhatsApp under **Linked devices**.

The legal pages are `/terms` and `/privacy`. They describe session storage and
the separate optional channel-automation consent. Review them for your
jurisdiction and service before operating the bot.

## Session storage and capacity

Each session is stored in its own directory under `SESSIONS_DIR`, including
WhatsApp authentication files, metadata, and a per-account store. On Railway,
mount a persistent volume and make `SESSIONS_DIR` resolve beneath that volume
(the default uses `RAILWAY_VOLUME_MOUNT_PATH`). Without persistent storage,
sessions can be lost on restart or redeploy.

`MAX_SESSIONS` defaults to 120 and is capped at 120. Stopped and logged-out
records count toward this limit until an administrator removes them. At startup,
`SESSION_RESTORE_CONCURRENCY` (default 5, maximum 20) limits how many saved
sessions initialize together. A configured ceiling is not a guarantee that a
particular Railway plan can keep 120 accounts online simultaneously; RAM, CPU,
network limits, WhatsApp behavior, and volume/replica configuration determine
real capacity. Load-test gradually on the target plan and keep a single Railway
replica when using one attached volume.

## Local setup

```bash
npm ci
cp .env.example .env
# Set a new private ADMIN_PANEL_PASSWORD in .env for local admin access.
npm start
```

Open `http://localhost:5000`. Never commit `.env`, WhatsApp credentials, or
admin secrets.

## Railway

`railway.json` uses the repository Dockerfile, starts with `npm start`, and
checks `/health`. If the Railway service is linked to GitHub auto-deploy, a push
to its watched branch triggers the deployment. This repository change does not
connect to or verify Railway.

For persistent sessions, attach a Railway volume at `/data` before pairing.
Set or verify these Railway Variables:

- `SESSIONS_DIR=/data/sessions`
- `DATA_DIR=/data/data`
- `MAX_SESSIONS=120`
- `SESSION_RESTORE_CONCURRENCY=5`
- `ADMIN_PANEL_PASSWORD` — create a new private secret of at least 20 bytes.
- `NEWSLETTER_INVITE_CODES` — include all approved official channel invite
  codes; the new SLOW-XV channel is included in the repository default.

Do not use a single volume across multiple replicas or concurrent deployments.
The deployment can restart linked sessions, but WhatsApp may require a new
pairing after logout or device removal.

## Other deployment templates

`render.yaml`, `fly.toml`, and the helper scripts use the same session limit,
restore concurrency, admin-secret name, and channel invite configuration.
Render Free has ephemeral storage and resource limits, so it is not suitable
for guaranteeing persistent 120-session operation.

## Environment

See `.env.example`. Important variables:

| Variable | Purpose |
| --- | --- |
| `ADMIN_PANEL_PASSWORD` | Admin-only password; at least 20 bytes; keep it in deployment secrets |
| `SESSIONS_DIR` | Root directory for isolated WhatsApp session data |
| `DATA_DIR` | Bot data directory |
| `MAX_SESSIONS` | Saved-session ceiling, from 1 to 120; defaults to 120 |
| `SESSION_RESTORE_CONCURRENCY` | Concurrent startup restores, from 1 to 20 |
| `NEWSLETTER_JID` | Existing official SLOW-XV channel JID |
| `NEWSLETTER_INVITE_CODES` | Additional channel links/codes resolved by WhatsApp at runtime |
| `CHANNEL_URL` | Primary channel link displayed on Web Pair |
| `CHANNEL_REACTION_EMOJI` | Default emoji preselected for optional automation |

## Checks

```bash
npm ci
npm test
npm run lint
npm audit --omit=dev
```

Automated tests do not pair a real phone or validate the available Railway
resources. A real pairing still requires approval inside WhatsApp.
