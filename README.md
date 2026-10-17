# SLOW-XV

Multi-session WhatsApp automation with a password-protected Web Pair dashboard.
Each connected WhatsApp account gets its own credentials, message store,
settings, and reconnect lifecycle.

## Web Pair

Open `/`, sign in with a unique `WEB_PAIR_PASSWORD` of at least 12 characters,
enter a WhatsApp number in
international format, then enter the pairing code in WhatsApp under
**Linked devices → Link a device → Link with phone number**.

The dashboard and session-management API require sign-in. The session cookie is
HTTP-only, secure in production, and expires after eight hours. `/health` is
public for Render's health checker and only returns readiness and session
counts; it does not expose phone numbers or pairing codes.

The web dashboard supports creating, listing, and stopping sessions. Session
credentials and per-session bot settings are stored separately. A persistent
disk is required to keep those credentials through a Render redeploy.

## Run locally

```bash
npm ci
cp .env.example .env
# Set a private, non-empty WEB_PAIR_PASSWORD in .env
npm start
```

Open `http://localhost:5000`. For local testing, set `WEB_PAIR_PASSWORD` in
`.env`; never commit `.env` or WhatsApp session files.

## Render deployment

The root `render.yaml` is a Blueprint for a Docker web service. It:

- builds from the repository's `Dockerfile` using Node.js 22;
- installs the native compiler and media tools required by the bot;
- listens on Render's port `10000`;
- waits for startup before `/health` reports ready;
- caps the configured session count at 20; and
- asks for `WEB_PAIR_PASSWORD` as a private Render environment variable.

The Blueprint uses Render's Free plan. Free services have 0.1 CPU / 512 MB RAM,
can spin down after 15 minutes without inbound traffic, and have no persistent
disk. WhatsApp session credentials and settings are stored on the ephemeral
filesystem and can be lost when the service sleeps, restarts, or redeploys;
you may need to pair the accounts again. The limit of 20 is an enforced ceiling,
not a guarantee that Free resources can run 20 sessions reliably. For persistent,
always-on multi-session use, choose a paid plan with a persistent disk instead.

Create the service from the GitHub repository as a Render Blueprint, then enter
a strong password of at least 12 characters when prompted. Optional third-party
API keys can be added under the service's Render environment settings. Never
commit pairing credentials, `.env` files, or API keys.

## Configuration

See `.env.example`. Important settings:

| Variable | Purpose |
| --- | --- |
| `WEB_PAIR_PASSWORD` | Required password for the dashboard and management API |
| `OWNER_NUMBER` | Optional bot owner number, without `+` |
| `PORT` | HTTP port (Render sets `10000`) |
| `SESSIONS_DIR` | Isolated WhatsApp auth/session root |
| `DATA_DIR` | Settings and counters (ephemeral on Render Free) |
| `TEMP_DIR` | Temporary media and compiler files |
| `MAX_SESSIONS` | Hard cap for concurrent sessions (maximum 20) |

Optional external service keys are read from environment variables; none are
committed in the source. `.env.example` lists the supported key names.

## Checks

```bash
npm ci
npm test
npm run lint
npm audit --omit=dev
```

Pairing with a real phone still requires completing the displayed code inside
WhatsApp. The automated tests do not use or store a real WhatsApp account.
