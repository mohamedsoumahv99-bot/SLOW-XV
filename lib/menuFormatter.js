import config from '../config.js';

const BOX_FOOTER = '╰─────────────────────────';
const tick = String.fromCharCode(96);

export function formatUptime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainingSeconds = total % 60;
    const parts = [];
    if (days) parts.push(days + 'd');
    if (hours) parts.push(hours + 'h');
    if (minutes) parts.push(minutes + 'm');
    parts.push(remainingSeconds + 's');
    return parts.join(' ');
}

export function getMessageLatency(message, now = Date.now()) {
    const rawTimestamp = message && message.messageTimestamp;
    const timestamp = rawTimestamp && typeof rawTimestamp.toNumber === 'function'
        ? rawTimestamp.toNumber()
        : Number(rawTimestamp);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return 0;
    const timestampMs = timestamp > 1e12 ? timestamp : timestamp * 1000;
    return Math.max(0, Math.round(now - timestampMs));
}

export async function getBotMode(sock) {
    try {
        const mode = await (sock && sock.sessionStore && sock.sessionStore.getBotMode
            ? sock.sessionStore.getBotMode()
            : undefined);
        return String(mode || config.commandMode || 'private').toUpperCase();
    }
    catch {
        return String(config.commandMode || 'private').toUpperCase();
    }
}

export function getMenuUser(message) {
    const key = (message && message.key) || {};
    const senderId = key.participant || key.remoteJid || '';
    const pushName = message && message.pushName;
    return pushName || senderId.split('@')[0].split(':')[0] || 'Unknown';
}

export function buildStyledMenu({
    categories,
    commandCount,
    owner = config.botOwner,
    prefix = config.prefix,
    mode = config.commandMode,
    user = 'Unknown',
    uptimeSeconds = process.uptime(),
    latencyMs = 0,
    platform = process.platform,
    version = config.version
}) {
    const categoryEntries = Array.from(categories || [])
        .map(([name, commands]) => [
            String(name),
            Array.from(new Set(commands || [])).map(String)
        ])
        .filter(([, commands]) => commands.length > 0);
    const total = Number.isFinite(Number(commandCount))
        ? Number(commandCount)
        : categoryEntries.reduce((sum, [, commands]) => sum + commands.length, 0);
    const platformName = platform === 'linux' ? 'Linux' : String(platform || 'Unknown');
    const lines = [
        '╭─❮ 𓆩 𝗦ʟᴏᴡ-XV 𓆪 ❯',
        '│ 𓆩 ' + tick + '𝗢ᴡɴᴇʀ' + tick + '    ➪ ' + (owner || 'vArnox'),
        '│ ⸸ ' + tick + '𝗣ʀᴇғɪx' + tick + '   ➪ [ ' + (prefix || '.') + ' ]',
        '│ 🝐 ' + tick + '𝗠ᴏᴅᴇ' + tick + '     ➪ ' + String(mode || 'PRIVATE').toUpperCase(),
        '│ 🝐 ' + tick + '𝗖ᴏᴍᴍᴀɴᴅs' + tick + ' ➪ ' + total,
        '│ 𓆩 ' + tick + '𝗨sᴇʀ' + tick + '     ➪ 『 ' + (user || 'Unknown') + ' 』',
        BOX_FOOTER,
        '',
        '╭─❮ 🝐 𝗦ʏsᴛᴇᴍ 𝗦ᴛᴀᴛs 🝐 ❯',
        '│ ⸸ ' + tick + '𝗨ᴘᴛɪᴍᴇ' + tick + '   ➪ ' + formatUptime(uptimeSeconds),
        '│ 🝐 ' + tick + '𝗟ᴀᴛᴇɴᴄʏ' + tick + '  ➪ ' + Math.max(0, Math.round(Number(latencyMs) || 0)) + ' ms',
        '│ ⸸ ' + tick + '𝗣ʟᴀᴛғᴏʀᴍ' + tick + ' ➪ ' + platformName,
        '│ 🝐 ' + tick + '𝗩ᴇʀsɪᴏɴ' + tick + '  ➪ ' + (version || '1.0.0'),
        BOX_FOOTER,
        '',
        '╭─❮ 🝐 𝗖ᴀᴛᴇɢᴏ𝗿ɪᴇs 🝐 ❯'
    ];

    for (const [category, commands] of categoryEntries) {
        lines.push('│ ⸸ ' + category.toUpperCase() + ' · ' + commands.length + ' commands');
    }
    lines.push(BOX_FOOTER, '');

    for (const [category, commands] of categoryEntries) {
        lines.push('╭─❮ ⸸ 𝗖ᴏᴍᴍᴀɴᴅs · ' + category.toUpperCase() + ' ⸸ ❯');
        for (const command of commands) {
            lines.push('│ 🝓 ' + tick + (prefix || '.') + command + tick);
        }
        lines.push(BOX_FOOTER, '');
    }

    lines.push('╰─❮ 𓆩 𝗦ʟᴏᴡ-XV 𓆪 ❯');
    return lines.join('\n');
}

export function buildCommandInfo(command, prefix = config.prefixes && config.prefixes[0] || config.prefix || '.') {
    const name = command.command || command.name || 'unknown';
    const aliases = command.aliases && command.aliases.length
        ? command.aliases.map(alias => prefix + alias).join(', ')
        : 'None';
    return [
        '╭─❮ ⸸ 𝗖ᴏᴍᴍᴀɴᴅ 𝗜ɴғᴏ ⸸ ❯',
        '│ 🝓 ' + tick + '𝗖ᴏᴍᴍᴀɴᴅ' + tick + ' ➪ ' + tick + prefix + name + tick,
        '│ ⸸ ' + tick + '𝗗ᴇsᴄ' + tick + ' ➪ ' + (command.description || 'No description'),
        '│ 🝐 ' + tick + '𝗨sᴀɢᴇ' + tick + ' ➪ ' + (command.usage || prefix + name),
        '│ ⸸ ' + tick + '𝗖ᴀᴛᴇɢᴏʀʏ' + tick + ' ➪ ' + (command.category || 'misc'),
        '│ 🝐 ' + tick + '𝗔ʟɪᴀsᴇs' + tick + ' ➪ ' + aliases,
        BOX_FOOTER
    ].join('\n');
}
