import 'dotenv/config';
import path from 'node:path';
const _prefixes = process.env.PREFIXES ? process.env.PREFIXES.split(',') : ['.', '!', '/', '#'];
export function resolveMaxSessions(value) {
    const requested = Number(value);
    if (!Number.isFinite(requested)) return 20;
    return Math.min(Math.max(Math.floor(requested), 1), 20);
}

export function resolvePersistentPath(override, volumeMountPath, localPath) {
    if (override) return override;
    return volumeMountPath ? path.join(volumeMountPath, localPath) : localPath;
}

const config = {
    // Bot Identity
    botName: process.env.BOT_NAME || 'SLOW-XV',
    botOwner: process.env.BOT_OWNER || 'SLOW-XV',
    ownerNumber: process.env.OWNER_NUMBER || '',
    developerName: process.env.DEVELOPER_NAME || 'VArnox Tech',
    author: process.env.AUTHOR || 'VArnox Tech',
    packname: process.env.PACKNAME || 'SLOW-XV',
    description: process.env.DESCRIPTION || 'Professional multi-session WhatsApp automation',
    version: process.env.BOT_VERSION || '1.0.0',
    // Bot Config
    prefixes: _prefixes,
    prefix: _prefixes[0],
    commandMode: process.env.COMMAND_MODE || 'public',
    timeZone: process.env.TIMEZONE || 'Africa/Conakry',
    // Links
    newsletterJid: process.env.NEWSLETTER_JID || '120363424782348922@newsletter',
    channelLink: process.env.CHANNEL_URL || process.env.CHANNEL_LINK || 'https://whatsapp.com/channel/0029Vb7jG2KEawdwHsZiEm1E',
    channelInviteCode: process.env.CHANNEL_INVITE_CODE || '0029Vb7jG2KEawdwHsZiEm1E',
    updateZipUrl: process.env.UPDATE_URL || '',
    ytChannel: process.env.YT_CHANNEL || '',
    // Session
    sessionId: process.env.SESSION_ID || '',
    pairingNumber: process.env.PAIRING_NUMBER || '',
    sessionsDir: resolvePersistentPath(process.env.SESSIONS_DIR, process.env.RAILWAY_VOLUME_MOUNT_PATH, 'sessions'),
    dataDir: resolvePersistentPath(process.env.DATA_DIR, process.env.RAILWAY_VOLUME_MOUNT_PATH, 'data'),
    tempDir: process.env.TEMP_DIR || 'temp',
    pairingTimeoutMs: Number(process.env.PAIRING_TIMEOUT_MS) || 10 * 60 * 1000,
    reconnectBaseDelayMs: Number(process.env.RECONNECT_BASE_DELAY_MS) || 2000,
    reconnectMaxDelayMs: Number(process.env.RECONNECT_MAX_DELAY_MS) || 60000,
    maxSessions: resolveMaxSessions(process.env.MAX_SESSIONS),
    // Performance
    port: Number(process.env.PORT) || 5000,
    maxStoreMessages: Number(process.env.MAX_STORE_MESSAGES) || 20,
    tempCleanupInterval: Number(process.env.CLEANUP_INTERVAL) || 1 * 60 * 60 * 1000,
    storeWriteInterval: Number(process.env.STORE_WRITE_INTERVAL) || 10000,
    // API Keys
    giphyApiKey: process.env.GIPHY_API_KEY || '',
    removeBgKey: process.env.REMOVEBG_KEY || '',
    freeimageApiKey: process.env.FREEIMAGE_API_KEY || '',
    tenorApiKey: process.env.TENOR_API_KEY || '',
    // Warn system
    warnCount: 3,
    // External APIs
    APIs: {
        xteam: 'https://api.xteam.xyz',
        dzx: 'https://api.dhamzxploit.my.id',
        lol: 'https://api.lolhuman.xyz',
        violetics: 'https://violetics.pw',
        neoxr: 'https://api.neoxr.my.id',
        zenzapis: 'https://zenzapis.xyz',
        akuari: 'https://api.akuari.my.id',
        akuari2: 'https://apimu.my.id',
        nrtm: 'https://fg-nrtm.ddns.net',
        fgmods: 'https://api-fgmods.ddns.net'
    },
    APIKeys: {
        'https://api.xteam.xyz': process.env.API_XTEAM_KEY || '',
        'https://api.lolhuman.xyz': process.env.API_LOLHUMAN_KEY || '',
        'https://api.neoxr.my.id': process.env.NEOXR_KEY || '',
        'https://violetics.pw': process.env.VIOLETICS_KEY || '',
        'https://zenzapis.xyz': process.env.ZENZAPIS_KEY || '',
        'https://api-fgmods.ddns.net': process.env.FGMODS_KEY || ''
    }
};
export default config;
