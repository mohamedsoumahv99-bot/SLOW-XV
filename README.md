# SLOW-XV

Multi-session WhatsApp automation with a password-protected Web Pair dashboard.
Each connected WhatsApp account gets its own credentials, message store,
settings, and reconnect lifecycle.

## Web Pair

Open `/`, sign in with the shared `WEB_PAIR_PASSWORD` of at least 12 characters
(all Web Pair users use the same password; there are no individual accounts),
enter a WhatsApp number in international format, select one to four reaction
emojis, and accept the terms before pairing. Then enter the pairing code in WhatsApp under
**Linked devices → Link a device → Link with phone number**.

Submitting the same number again while pairing shows the active pairing code
again. If it has expired or WhatsApp logged the account out, submitting the
number starts a fresh pairing attempt.

The dashboard and session-management API require sign-in. The session cookie is
HTTP-only, secure in production, and expires after eight hours. `/health` is
public for Render's health checker and only returns readiness and session
counts; it does not expose phone numbers or pairing codes. The dashboard shows
only the first three digits of each phone number. Session identifiers are
opaque, and the Web Pair dashboard and API do not expose a way to stop or
disconnect an existing WhatsApp session.

The web dashboard requires users to accept the SLOW-XV terms before pairing.
After a WhatsApp account connects, it follows the official SLOW-XV channel,
subscribes to live updates, then rotates through the selected emojis for new
posts. Each session's emoji choices are saved with its settings. A
persistent disk is required to keep those credentials through a Render redeploy.

## Run locally

```bash
npm ci
cp .env.example .env
# Set a private, non-empty WEB_PAIR_PASSWORD in .env
npm start
```

Open `http://localhost:5000`. For local testing, set `WEB_PAIR_PASSWORD` in
`.env`; never commit `.env` or WhatsApp session files.

## Railway deployment

`railway.json` builds with the repository's root `Dockerfile`, starts with
`npm start`, and waits for `/health` before routing traffic. The Dockerfile
installs the native build tools and media utilities required by the project.

Before pairing the first WhatsApp account:

1. Deploy the `main` branch from GitHub.
2. Attach a Railway volume to the service and mount it at `/data`.
3. Keep the service to one replica; Railway volumes are not shared across
   replicas or simultaneous deployments.
4. Set `WEB_PAIR_PASSWORD` to a private password of at least 12 characters and
   set `MAX_SESSIONS=20`. Add optional API keys only in Railway's Variables.

Railway automatically provides `RAILWAY_VOLUME_MOUNT_PATH` for an attached
volume. The app stores WhatsApp credentials under the volume's `sessions`
directory and bot settings under its `data` directory. Attach the volume before
pairing accounts; otherwise credentials written to the container filesystem
will not move to the volume automatically.

The app retries transient WhatsApp connection failures and restores up to 20
saved sessions after a restart. Stopped, logged-out, and unfinished pairing
records stay saved but are not automatically reconnected. On a paid Railway
plan, choose the **Always** restart policy in service settings for automatic
restarts after exits. Railway Free/trial does not offer that policy and limits
failure restarts to 10.

Persistent storage and automatic retries reduce interruptions, but cannot
guarantee that WhatsApp will never disconnect a linked device. WhatsApp may
invalidate a session or require a new pairing, for example after a logout or
device removal. Railway outages and resource limits can also interrupt service.

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
| `MAX_SESSIONS` | Hard cap for saved session records (maximum 20; stopped records count) |
| `NEWSLETTER_JID` | Official SLOW-XV WhatsApp channel JID to follow and monitor |
| `CHANNEL_URL` | Official channel link shown before pairing |
| `CHANNEL_REACTION_EMOJI` | Default emoji preselected in Web Pair; each session can choose up to four emojis |

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
