import config from '../config.js';

const FOOTER = '╰─❮ 𓆩 𝗦ʟᴏᴡ-XV 𓆪 ❯';

export function formatUptime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainingSeconds = total % 60;
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    parts.push(`${remainingSeconds}s`);
    return parts.join(' ');
}

export function getMessageLatency(message, now = Date.now()) {
    const rawTimestamp = message?.messageTimestamp;
    const timestamp = typeof rawTimestamp?.toNumber === 'function'
        ? rawTimestamp.toNumber()
        : Number(rawTimestamp);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return 0;
    const timestampMs = timestamp > 1e12 ? timestamp : timestamp * 1000;
    return Math.max(0, Math.round(now - timestampMs));
}

export async function getBotMode(sock) {
    try {
        const mode = await sock?.sessionStore?.getBotMode?.();
        return String(mode || config.commandMode || 'private').toUpperCase();
    }
    catch {
        return String(config.commandMode || 'private').toUpperCase();
    }
}

export function getMenuUser(message) {
    const senderId = message?.key?.participant || message?.key?.remoteJid || '';
    return message?.pushName || senderId.split('@')[0].split(':')[0] || 'Unknown';
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
            [...new Set(commands || [])].map(String).sort((a, b) => a.localeCompare(b))
        ])
        .filter(([, commands]) => commands.length > 0)
        .sort(([a], [b]) => a.localeCompare(b));

    const count = Number.isFinite(Number(commandCount))
        ? Number(commandCount)
        : categoryEntries.reduce((total, [, commands]) => total + commands.length, 0);
    const platformLabel = platform === 'linux' ? 'Linux' : platform;
    const lines = [
        '╭─❮ 𓆩 𝗦ʟᴏᴡ-XV 𓆪 ❯',
        `│ 𓆩 \`𝗢ᴡɴᴇʀ\`    ➪ ${owner || 'vArnox'}`,
        `│ ⸸ \`𝗣ʀᴇғɪx\`   ➪ [ ${prefix || '.'} ]`,
        `│ 🝐 \`𝗠ᴏᴅᴇ\`     ➪ ${String(mode || 'PRIVATE').toUpperCase()}`,
        `│ ⸸ \`𝗨ᴘᴛɪᴍᴇ\`   ➪ ${formatUptime(uptimeSeconds)}`,
        `│ 🝐 \`𝗖ᴏᴍᴍᴀɴᴅs\` ➪ ${count}`,
        `│ 𓆩 \`𝗨sᴇʀ\`     ➪ 『 ${user || 'Unknown'} 』`,
        '╰─────────────────────────',
        '',
        '╭─❮ 🝐 𝗦ʏsᴛᴇᴍ 𝗦ᴛᴀᴛs 🝐 ❯',
        `│ ⸸ \`𝗟ᴀᴛᴇɴᴄʏ\`  ➪ ${Math.max(0, Math.round(Number(latencyMs) || 0))} ms`,
        `│ 🝐 \`𝗣ʟᴀᴛғᴏʀᴍ\` ➪ ${platformLabel}`,
        `│ ⸸ \`𝗩ᴇʀsɪᴏɴ\`  ➪ ${version || '1.0.0'}`,
        '╰─────────────────────────',
        '',
        '╭─❮ 🝐 𝗖ᴀᴛᴇɢᴏ𝗿ɪᴇs 🝐 ❯'
    ];

    for (const [category, commands] of categoryEntries) {
        lines.push(`│ ⸸ ${category.toUpperCase()} · ${commands.length} commands`);
    }
    lines.push('╰─────────────────────────', '');

    for (const [category, commands] of categoryEntries) {
        lines.push(`╭─❮ ⸸ 𝗖ᴏᴍᴍᴀɴᴅs · ${category.toUpperCase()} ⸸ ❯`);
        for (const command of commands) {
            lines.push(`│ 🝓 \`${prefix || '.'}${command}\``);
        }
        lines.push('╰─────────────────────────', '');
    }

    lines.push(FOOTER);
    return lines.join('\n');
}
