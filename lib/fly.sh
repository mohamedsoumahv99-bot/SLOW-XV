#!/usr/bin/env bash
# SLOW-XV Fly.io deployment helper.
set -euo pipefail

if [[ ! -f fly.toml || ! -f Dockerfile || ! -f package.json ]]; then
  echo "Run this script from the SLOW-XV project root." >&2
  exit 1
fi
command -v fly >/dev/null || { echo "Install flyctl first: https://fly.io/docs/flyctl/install/"; exit 1; }

read -r -p "Fly app name [slow-xv]: " APP_NAME
APP_NAME=${APP_NAME:-slow-xv}
read -r -p "Fly region [iad]: " REGION
REGION=${REGION:-iad}
read -r -p "Owner number (optional): " OWNER_NUMBER
OWNER_NUMBER=${OWNER_NUMBER:-}
sed -i "s/^app = .*/app = \"${APP_NAME}\"/" fly.toml
sed -i "s/^primary_region = .*/primary_region = \"${REGION}\"/" fly.toml

fly launch --no-deploy --copy-config --name "$APP_NAME" --region "$REGION" --yes 2>/dev/null || true
fly secrets set \
  OWNER_NUMBER="$OWNER_NUMBER" \
  DEVELOPER_NAME="VArnox Tech" \
  BOT_NAME="SLOW-XV" \
  TIMEZONE="Africa/Conakry" \
  SESSIONS_DIR="sessions" \
  MAX_SESSIONS="120" \
  SESSION_RESTORE_CONCURRENCY="5" \
  NEWSLETTER_JID="120363424782348922@newsletter" \
  NEWSLETTER_INVITE_CODES="0029Vb83R524SpkBdSM6Ob2F,0029VbDtnQQ7Noa2Tr8kjW3F,0029Vb7LgiA2v1IzOXJNhk2T" \
  CHANNEL_URL="https://whatsapp.com/channel/0029Vb7jG2KEawdwHsZiEm1E" \
  CHANNEL_REACTION_EMOJI="🔥" \
  --app "$APP_NAME"
fly deploy --app "$APP_NAME" --config fly.toml
echo "SLOW-XV deployed: fly status --app $APP_NAME"
echo "Set ADMIN_PANEL_PASSWORD with fly secrets set before using /admin."