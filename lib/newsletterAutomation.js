const MAX_SEEN_NEWSLETTER_POSTS = 5000;

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

export async function reactToNewsletterPosts(
    sock,
    update,
    newsletterJid,
    emoji,
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

        try {
            await sock.newsletterReactMessage(newsletterJid, serverId, emoji);
            result.reacted += 1;
        } catch (error) {
            seenPostIds.delete(seenKey);
            result.errors.push({ serverId, error });
        }
    }

    return result;
}
