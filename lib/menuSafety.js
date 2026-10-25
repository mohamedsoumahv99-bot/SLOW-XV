const SMALL_CAPS_TO_ASCII = Object.freeze({
    ᴀ: 'a', ʙ: 'b', ᴄ: 'c', ᴅ: 'd', ᴇ: 'e', ғ: 'f', ɢ: 'g', ʜ: 'h',
    ɪ: 'i', ᴊ: 'j', ᴋ: 'k', ʟ: 'l', ᴍ: 'm', ɴ: 'n', ᴏ: 'o', ᴘ: 'p',
    ǫ: 'q', ʀ: 'r', ꜱ: 's', ᴛ: 't', ᴜ: 'u', ᴠ: 'v', ᴡ: 'w', ˣ: 'x',
    ʏ: 'y', ᴢ: 'z'
});

const BULK_GROUP_ACTION_PATTERN =
    /(?:^|[^a-z0-9])(?:kickall\d*|kickpurge|spamgroup)(?=$|[^a-z0-9])/i;

function unwrapNewsletterMessage(message) {
    let content = message?.message || {};

    for (let depth = 0; depth < 4; depth += 1) {
        const wrapped = content.ephemeralMessage?.message
            || content.viewOnceMessage?.message
            || content.viewOnceMessageV2?.message
            || content.documentWithCaptionMessage?.message;
        if (!wrapped) break;
        content = wrapped;
    }

    return content;
}

export function getNewsletterPostText(message) {
    const content = unwrapNewsletterMessage(message);
    return content.conversation
        || content.extendedTextMessage?.text
        || content.imageMessage?.caption
        || content.videoMessage?.caption
        || content.documentMessage?.caption
        || '';
}

export function normalizeNewsletterMenuText(value) {
    return Array.from(String(value || '').toLowerCase())
        .map(character => SMALL_CAPS_TO_ASCII[character] || character)
        .join('')
        .normalize('NFKD');
}

export function isDisallowedMenuCommand(command) {
    const normalized = normalizeNewsletterMenuText(command)
        .trim()
        .replace(/^[.!/]+/, '');
    return /^(?:kickall\d*|kickpurge|spamgroup)$/i.test(normalized);
}

export function containsDisallowedMenuCommand(value) {
    return BULK_GROUP_ACTION_PATTERN.test(normalizeNewsletterMenuText(value));
}

export function isPrimaryMenuPost(message) {
    const content = unwrapNewsletterMessage(message);
    const text = normalizeNewsletterMenuText(getNewsletterPostText(message));

    return Boolean(content.imageMessage)
        && text.includes('slow-xv')
        && /\bowner\b/.test(text)
        && text.includes('system stats')
        && /\bcommands?\b\s*[:：]/.test(text)
        && !containsDisallowedMenuCommand(text);
}

export function isSafePurgeMenuPost(message) {
    const content = unwrapNewsletterMessage(message);
    const text = normalizeNewsletterMenuText(getNewsletterPostText(message));
    const requiredCommands = [
        'purgereport',
        'purgecase',
        'purgeevidence',
        'purgeinfo',
        'addinfopurge',
        'purgesearch'
    ];

    return Boolean(content.imageMessage)
        && text.includes('slow-xv')
        && text.includes('purge menu')
        && text.includes('purge-info')
        && requiredCommands.every(command => text.includes(command))
        && !containsDisallowedMenuCommand(text)
        && !/\b(?:destroy|destroying|spam)\b.{0,80}\b(?:groups?|members?)\b/i.test(text);
}
