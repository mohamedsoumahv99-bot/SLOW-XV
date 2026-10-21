import {
    getBinaryNodeChild,
    proto
} from '@whiskeysockets/baileys';
import config from '../config.js';

const NEWSLETTER_FETCH_TIMEOUT_MS = 8000;

function isForwardableNewsletterPost(message, newsletterJid) {
    return message?.key?.remoteJid === newsletterJid
        && String(message.key.server_id || '').length > 0
        && message.message
        && Object.keys(message.message).length > 0;
}

function getStoredNewsletterPost(sock, newsletterJid) {
    const messages = sock?.store?.messages?.[newsletterJid];
    if (!Array.isArray(messages)) return null;

    for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (isForwardableNewsletterPost(messages[index], newsletterJid)) {
            return messages[index];
        }
    }
    return null;
}

function findNewsletterMessageNodes(node, results = []) {
    if (!node || typeof node !== 'object') return results;

    if (node.tag === 'message' && getBinaryNodeChild(node, 'plaintext')) {
        results.push(node);
    }
    if (Array.isArray(node.content)) {
        for (const child of node.content) {
            findNewsletterMessageNodes(child, results);
        }
    }
    return results;
}

function decodeNewsletterMessageNode(node, newsletterJid) {
    const plaintext = getBinaryNodeChild(node, 'plaintext')?.content;
    if (!Buffer.isBuffer(plaintext) && !(plaintext instanceof Uint8Array) && typeof plaintext !== 'string') {
        return null;
    }

    const contentBuffer = typeof plaintext === 'string'
        ? Buffer.from(plaintext, 'binary')
        : Buffer.from(plaintext);
    const message = proto.Message.decode(contentBuffer).toJSON();
    const attrs = node.attrs || {};
    const serverId = attrs.server_id || attrs.message_id;
    const messageId = attrs.message_id || serverId;
    if (!serverId || !messageId || !Object.keys(message).length) return null;

    return {
        key: {
            remoteJid: newsletterJid,
            id: String(messageId),
            server_id: String(serverId),
            fromMe: false
        },
        message,
        messageTimestamp: Number(attrs.t) || Math.floor(Date.now() / 1000)
    };
}

function raceWithTimeout(promise, timeoutMs) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Newsletter fetch timed out.')), timeoutMs);
        timer.unref?.();
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function getLatestNewsletterPost(sock, newsletterJid = config.newsletterJid) {
    const storedPost = getStoredNewsletterPost(sock, newsletterJid);
    if (storedPost) return storedPost;
    if (typeof sock?.newsletterFetchMessages !== 'function') return null;

    try {
        const response = await raceWithTimeout(
            Promise.resolve().then(() => sock.newsletterFetchMessages(newsletterJid, 1, 0, 0)),
            NEWSLETTER_FETCH_TIMEOUT_MS
        );

        if (Array.isArray(response?.messages)) {
            const post = [...response.messages].reverse()
                .find(message => isForwardableNewsletterPost(message, newsletterJid));
            if (post) return post;
        }
        if (Array.isArray(response)) {
            const post = [...response].reverse()
                .find(message => isForwardableNewsletterPost(message, newsletterJid));
            if (post) return post;
        }

        const decodedPosts = findNewsletterMessageNodes(response)
            .map(node => {
                try {
                    return decodeNewsletterMessageNode(node, newsletterJid);
                }
                catch (error) {
                    console.warn('Could not decode a fetched newsletter post:', error.message);
                    return null;
                }
            })
            .filter(Boolean);

        return decodedPosts.at(-1) || null;
    }
    catch (error) {
        console.warn('Could not fetch the latest newsletter post for the menu:', error.message);
        return null;
    }
}

export function createNewsletterForwardPayload(
    sourceMessage,
    newsletterJid = config.newsletterJid,
    newsletterName = config.botName
) {
    const serverMessageId = Number.parseInt(sourceMessage?.key?.server_id, 10);
    const forwardedNewsletterMessageInfo = {
        newsletterJid,
        newsletterName,
        ...(Number.isSafeInteger(serverMessageId)
            ? { serverMessageId }
            : {})
    };

    return {
        forward: sourceMessage,
        force: true,
        contextInfo: { forwardedNewsletterMessageInfo }
    };
}

export async function forwardLatestNewsletterPost(
    sock,
    {
        chatId,
        newsletterJid = config.newsletterJid,
        quotedMessage
    }
) {
    const sourceMessage = await getLatestNewsletterPost(sock, newsletterJid);
    if (!sourceMessage || typeof sock?.sendMessage !== 'function') return false;

    const quotedOptions = quotedMessage?.key
        ? { quoted: quotedMessage }
        : {};
    await sock.sendMessage(
        chatId,
        createNewsletterForwardPayload(sourceMessage, newsletterJid, config.botName),
        quotedOptions
    );
    return true;
}
