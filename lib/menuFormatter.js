import config from '../config.js';
import { isDisallowedMenuCommand } from './menuSafety.js';

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
const CATEGORY_LABELS = {
    owner: '👑OWNER',
    ai: '🧠 AI',
    download: '📥 DOWNLOAD',
    general: '☑️ GENERAL',
    utility: '📦 UTILITY',
    menu: '📜MENU',
    admin: '📬ADMIN',
    stickers: '🎁 STICKERS',
    tools: '🛠️ TOOLS',
    group: '👥 GROUP',
    images: '🖼️ IMAGES',
    games: '🎮 GAMES',
    search: '🔎 SEARCH',
    fun: '📌 FUN',
    stalk: '🕵🏽‍♂️ STALK',
    info: 'ℹ️ INFO',
    quotes: '🎨 QUOTES',
    music: '🎼 MUSIC',
    upload: '☁️ UPLOAD'
};
const SMALL_CAPS = Object.freeze({
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ',
    i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ',
    q: 'ǫ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'ˣ',
    y: 'ʏ', z: 'ᴢ'
});
const tick = String.fromCharCode(96);

function toSmallCaps(value) {
    return Array.from(String(value), character => SMALL_CAPS[character.toLowerCase()] || character).join('');
}

function getVisibleCategoryEntries(categories) {
    return Array.from(categories || [])
        .map(([name, commands]) => [
            String(name),
            Array.from(new Set(commands || []))
                .map(String)
                .filter(command => !isDisallowedMenuCommand(command))
        ])
        .filter(([, commands]) => commands.length > 0);
}

function getDisplayedCommandCount(commandCount, categoryEntries, allCategoryEntries) {
    const visibleCount = categoryEntries.reduce((sum, [, commands]) => sum + commands.length, 0);
    const suppliedCount = Number(commandCount);
    const allEntriesCount = allCategoryEntries
        .reduce((sum, [, commands]) => sum + commands.length, 0);

    return Number.isFinite(suppliedCount)
        ? Math.max(0, suppliedCount - Math.max(0, allEntriesCount - visibleCount))
        : visibleCount;
}

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

export function getMenuSenderJid(message) {
    const key = (message && message.key) || {};
    const senderJid = key.participant || key.remoteJid || '';
    return senderJid.endsWith('@s.whatsapp.net') || senderJid.endsWith('@lid') ? senderJid : '';
}

export function getMenuSenderNumber(message) {
    const senderJid = getMenuSenderJid(message);
    return senderJid ? senderJid.split('@')[0].split(':')[0] : '';
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
    version = config.version,
    senderNum = ''
}) {
    const allCategoryEntries = Array.from(categories || [])
        .map(([name, commands]) => [String(name), Array.from(new Set(commands || [])).map(String)])
        .filter(([, commands]) => commands.length > 0);
    const categoryEntries = getVisibleCategoryEntries(allCategoryEntries);
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
    const total = getDisplayedCommandCount(commandCount, categoryEntries, allCategoryEntries);
    const platformName = platform === 'linux' ? 'Linux' : String(platform || 'Unknown');
    const displayOwner = owner && owner !== 'SLOW-XV' ? owner : 'vArnox';
    const mentionNumber = String(senderNum || '').replace(/^@/, '').trim();
    const lines = [
        '╭─〔 *SLOW-XV* 🤖〕➤',
        '╭┤ ' + tick + '👑 𝖮𝗐𝗇𝖾𝗋' + tick + '     : ' + displayOwner,
        '│◯ ' + tick + '⚙️ 𝖬𝗈𝖽𝖾' + tick + '      : ' + String(mode || 'PRIVATE').toUpperCase(),
        '│◯ ' + tick + '🏷️ 𝖯𝗋𝖾𝖿𝗂𝗑' + tick + '    : ' + (prefix || '.'),
        '│◯ ' + tick + '📚 𝖢𝗈𝗆𝗆𝖺𝗇𝖽𝗌' + tick + '  : ' + total,
        '╰━━━━━━━━━━━━━━━━━━➤',
        '',
        '╭─〔 SYSTEM STATS 〕➤',
        '│◯ ' + tick + '⏱️ 𝖴𝗉𝗍𝗂𝗆𝖾' + tick + '    : ' + formatUptime(uptimeSeconds),
        '│◯ ' + tick + '🚀 𝖫𝖺𝗍𝖾𝗇𝖼𝗒' + tick + '  : ' + Math.max(0, Math.round(Number(latencyMs) || 0)) + ' ms',
        '│◯ ' + tick + '💻 𝖯𝗅𝖺𝗍𝖿𝗈𝗋𝗆' + tick + '  : ' + platformName,
        '│◯ ' + tick + '🤖 𝖵𝖾𝗋𝗌𝗂𝗈𝗇' + tick + '   : ' + (version || '1.0.0'),
        '╰━━━━━━━━━━━━━━━━━━➤',
        '',
        mentionNumber
            ? '*ʜᴇʟʟᴏ @' + mentionNumber + ' ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴛʜᴇ ʙᴇsᴛ ʙᴏᴛ, SLOW-XV*'
            : '*ʜᴇʟʟᴏ ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴛʜᴇ ʙᴇsᴛ ʙᴏᴛ, SLOW-XV*',
        ''
    ];

    for (const [category, commands] of categoryEntries) {
        const label = CATEGORY_LABELS[category.toLowerCase()] || '📁 ' + category.toUpperCase();
        lines.push('╭─❮ *' + label + '*❯');
        for (const command of commands) {
            lines.push('│ 🝓 *' + toSmallCaps(command) + '*');
        }
        lines.push(BOX_FOOTER, '');
    }

    lines.push('> ©' + new Date().getFullYear() + ' sʟᴏᴡ xᴠ🤖 ᴄᴏᴘʏʀɪɢʜᴛ Ⴆყ ᴠᴀʀɴᴏx ƚᴇᴄʜ');
    return lines.join('\n');
}

export function buildCompactStyledMenu({
    categories,
    commandCount,
    owner = config.botOwner,
    prefix = config.prefix,
    mode = config.commandMode,
    senderNum = ''
}) {
    const allEntries = Array.from(categories || [])
        .map(([name, commands]) => [String(name), Array.from(new Set(commands || [])).map(String)])
        .filter(([, commands]) => commands.length > 0);
    const entries = getVisibleCategoryEntries(allEntries);
    const total = getDisplayedCommandCount(commandCount, entries, allEntries);
    const mentionNumber = String(senderNum || '').replace(/^@/, '').trim();
    const displayOwner = owner && owner !== 'SLOW-XV' ? owner : 'vArnox';
    const lines = [
        '╭─〔 *SLOW-XV MENU* 🤖〕➤',
        mentionNumber
            ? 'ʜᴇʏ @' + mentionNumber + ', ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ SLOW-XV🎉'
            : 'ʜᴇʏ, ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ SLOW-XV🎉',
        '│◯ 👑 Owner: ' + displayOwner,
        '│◯ ⚙️ Mode: ' + String(mode || 'PRIVATE').toUpperCase(),
        '│◯ 🏷️ Prefix: ' + (prefix || '.'),
        '│◯ 📚 Commands: ' + total,
        '╰━━━━━━━━━━━━━━━━━━➤',
        '',
        '╭─❮ *CATEGORIES* ❯'
    ];
    for (const [category, commands] of entries) {
        const label = CATEGORY_LABELS[category.toLowerCase()] || category.toUpperCase();
        const line = '│ ' + label + ' · ' + commands.length;
        if (lines.join('\n').length + line.length + 100 > 900) break;
        lines.push(line);
    }
    lines.push('', '╰━➤ Full command list: ' + (prefix || '.') + 'allmenu');
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
