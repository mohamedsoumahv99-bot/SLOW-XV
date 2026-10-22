const MAX_SEEN_NEWSLETTER_POSTS = 5000;
export const MAX_REACTION_EMOJIS = 4;
export const NEWSLETTER_CONSENT_VERSION = 2;
export const REACTION_EMOJI_OPTIONS = Object.freeze(['🔥', '❤️', '👍', '😂', '😮', '🙏', '🎉', '💯']);

export function getReactionEmojiOptions(fallback = '🔥') {
    return fallback && !REACTION_EMOJI_OPTIONS.includes(fallback)
        ? [fallback, ...REACTION_EMOJI_OPTIONS]
        : [...REACTION_EMOJI_OPTIONS];
}

export function normalizeReactionEmojis(value, fallback = '🔥') {
    const options = new Set(getReactionEmojiOptions(fallback));
    const candidates = Array.isArray(value) ? value : [value];
    const selected = [...new Set(candidates.filter((emoji) => options.has(emoji)))].slice(0, MAX_REACTION_EMOJIS);
    return selected.length ? selected : [fallback || '🔥'];
}

export async function followAndSubscribeNewsletter(sock, newsletterJid) {
    const result = { followed: false, subscribed: false, errors: [] };
    if (!String(newsletterJid || '').endsWith('@newsletter')) {
        throw new Error('NEWSLETTER_JID must be a WhatsApp newsletter JID.');
    }

    try {
        if (typeof sock.newsletterFollow !== 'function') {
            throw new Error('Baileys newsletterFollow is unavailable.');
        }
        await sock.newsletterFollow(newsletterJid);
        result.followed = true;
    } catch (error) {
        result.errors.push({ step: 'follow', error });
    }

    try {
        if (typeof sock.subscribeNewsletterUpdates !== 'function') {
            throw new Error('Baileys subscribeNewsletterUpdates is unavailable.');
        }
        await sock.subscribeNewsletterUpdates(newsletterJid);
        result.subscribed = true;
    } catch (error) {
        result.errors.push({ step: 'subscribe', error });
    }

    return result;
}

export function normalizeNewsletterInviteCode(value) {
    const input = String(value || '').replace(/\s+/g, '').trim();
    if (!input) return '';

    let code = input;
    if (/^https?:\/\//i.test(input)) {
        try {
            const url = new URL(input);
            if (!['whatsapp.com', 'www.whatsapp.com'].includes(url.hostname.toLowerCase())) return '';
            const match = url.pathname.match(/^\/channel\/([A-Za-z0-9_-]+)\/?$/i);
            if (!match) return '';
            code = match[1];
        } catch {
            return '';
        }
    } else if (input.includes('/') || input.includes('?') || input.includes('#')) {
        return '';
    }

    return /^[A-Za-z0-9_-]{16,64}$/.test(code) ? code : '';
}

export async function resolveNewsletterJids(sock, primaryJid, inviteCodes = []) {
    const newsletterJids = new Set();
    const errors = [];

    if (String(primaryJid || '').endsWith('@newsletter')) {
        newsletterJids.add(primaryJid);
    } else if (primaryJid) {
        errors.push({ inviteCode: '', error: new Error('NEWSLETTER_JID must be a WhatsApp newsletter JID.') });
    }

    for (const inviteCode of inviteCodes) {
        const code = normalizeNewsletterInviteCode(inviteCode);
        if (!code) {
            errors.push({ inviteCode: String(inviteCode || ''), error: new Error('Invalid WhatsApp channel invite link.') });
            continue;
        }

        try {
            if (typeof sock.newsletterMetadata !== 'function') {
                throw new Error('Baileys newsletterMetadata is unavailable.');
            }
            const metadata = await sock.newsletterMetadata('invite', code);
            if (!String(metadata?.id || '').endsWith('@newsletter')) {
                throw new Error('WhatsApp did not return a valid newsletter JID for this invite link.');
            }
            newsletterJids.add(metadata.id);
        } catch (error) {
            errors.push({ inviteCode: code, error });
        }
    }

    return { newsletterJids: [...newsletterJids], errors };
}

export async function reactToNewsletterPosts(
    sock,
    update,
    newsletterJid,
    emojis,
    seenPostIds = new Set()
) {
    const result = { reacted: 0, errors: [] };
    if (update?.type !== 'notify' || !Array.isArray(update.messages)) return result;
    if (typeof sock.newsletterReactMessage !== 'function') {
        result.errors.push({ error: new Error('Baileys newsletterReactMessage is unavailable.') });
        return result;
    }

    for (const message of update.messages) {
        const key = message?.key;
        const serverId = key?.server_id;
        if (key?.remoteJid !== newsletterJid || !serverId) continue;

        const seenKey = `${newsletterJid}:${serverId}`;
        if (seenPostIds.has(seenKey)) continue;
        seenPostIds.add(seenKey);
        if (seenPostIds.size > MAX_SEEN_NEWSLETTER_POSTS) {
            seenPostIds.delete(seenPostIds.values().next().value);
        }

        const reactionFallback = Array.isArray(emojis) ? emojis[0] : emojis;
        const reactionEmojis = normalizeReactionEmojis(emojis, reactionFallback || '🔥');
        const reactionEmoji = reactionEmojis[(seenPostIds.size - 1) % reactionEmojis.length];
        try {
            await sock.newsletterReactMessage(newsletterJid, serverId, reactionEmoji);
            result.reacted += 1;
        } catch (error) {
            seenPostIds.delete(seenKey);
            result.errors.push({ serverId, error });
        }
    }

    return result;
}
