import config from '../config.js';

const BOX_FOOTER = '╰─────────────────────────';
const MENU_CATEGORIES = [
    'owner',
    'ai',
    'download',
    'general',
    'utility',
    'menu',
    'admin',
    'stickers',
    'tools',
    'group',
    'images',
    'games',
    'search',
    'fun',
    'stalk',
    'info',
    'quotes',
    'music',
    'upload'
];
const tick = String.fromCharCode(96);

export function formatUptime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const units = [
        ['day', Math.floor(total / 86400)],
        ['hour', Math.floor((total % 86400) / 3600)],
        ['minute', Math.floor((total % 3600) / 60)],
        ['second', total % 60]
    ];
    const parts = units
        .filter(([, value]) => value > 0)
        .map(([unit, value]) => value + ' ' + unit + (value === 1 ? '' : 's'));
    return parts.length ? parts.join(', ') : '0 seconds';
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
    const categoryOrder = new Map(MENU_CATEGORIES.map((name, index) => [name, index]));
    categoryEntries.sort((a, b) => {
        const aOrder = categoryOrder.has(a[0].toLowerCase())
            ? categoryOrder.get(a[0].toLowerCase())
            : MENU_CATEGORIES.length;
        const bOrder = categoryOrder.has(b[0].toLowerCase())
            ? categoryOrder.get(b[0].toLowerCase())
            : MENU_CATEGORIES.length;
        return aOrder - bOrder;
    });
    const total = Number.isFinite(Number(commandCount))
        ? Number(commandCount)
        : categoryEntries.reduce((sum, [, commands]) => sum + commands.length, 0);
    const platformName = platform === 'linux' ? 'Linux' : String(platform || 'Unknown');
    const displayOwner = owner && owner !== 'SLOW-XV' ? owner : 'vArnox';
    const lines = [
        '╭─〔 *SLOW-XV* 🤖〕➤',
        '╭┤ ' + tick + '👑 Owner' + tick + '     : ' + displayOwner,
        '│◯ ' + tick + '⚙️ Mode' + tick + '      : ' + String(mode || 'PRIVATE').toUpperCase(),
        '│◯ ' + tick + '🏷️ Prefix' + tick + '    : ' + (prefix || '.'),
        '│◯ ' + tick + '📚 Commands' + tick + '  : ' + total,
        '╰━━━━━━━━━━━━━━━━━━➤',
        '',
        '╭─〔 SYSTEM STATS 〕➤',
        '│◯ ⏱️ Uptime    : ' + formatUptime(uptimeSeconds),
        '│◯ 🚀 Latency   : ' + Math.max(0, Math.round(Number(latencyMs) || 0)) + ' ms',
        '│◯ 💻 Platform  : ' + platformName,
        '│◯ 🤖 Version   : ' + (version || '1.0.0'),
        '╰━━━━━━━━━━━━━━━━━━➤',
        ''
    ];

    for (const [category, commands] of categoryEntries) {
        lines.push('╭─❮ ⸸ 𝗖ᴏᴍᴍᴀɴᴅs · ' + category.toUpperCase() + ' ⸸ ❯');
        for (const command of commands) {
            lines.push('│ 🝓 ' + tick + (prefix || '.') + command + tick);
        }
        lines.push(BOX_FOOTER, '');
    }

    lines.push('> 𝗦ʟᴏᴡ xv🤖by vArnox_tech');
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
