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
- mounts a 1 GB persistent disk for sessions and settings; and
- asks for `WEB_PAIR_PASSWORD` as a private Render environment variable.

Create the service from the GitHub repository as a Render Blueprint, then enter
a strong password when prompted. The current Blueprint uses Render's
`1c-2g` paid plan to leave memory headroom for concurrent WhatsApp sessions.
Render's persistent disk is also billed separately. Never commit pairing
credentials, `.env` files, or API keys.

## Configuration

See `.env.example`. Important settings:

| Variable | Purpose |
| --- | --- |
| `WEB_PAIR_PASSWORD` | Required password for the dashboard and management API |
| `OWNER_NUMBER` | Optional bot owner number, without `+` |
| `PORT` | HTTP port (Render sets `10000`) |
| `SESSIONS_DIR` | Isolated WhatsApp auth/session root |
| `DATA_DIR` | Persistent settings and counters |
| `TEMP_DIR` | Temporary media and compiler files |
| `MAX_SESSIONS` | Concurrent session safety limit |

Optional external service keys are read from environment variables; none are
committed in the source.

## Checks

```bash
npm ci
npm test
npm run lint
npm audit --omit=dev
```

Pairing with a real phone still requires completing the displayed code inside
WhatsApp. The automated tests do not use or store a real WhatsApp account.
