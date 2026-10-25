import fs from 'fs';
import path from 'path';
import config from '../config.js';
import { forwardLatestNewsletterPost } from './menuNewsletter.js';
import { isPrimaryMenuPost } from './menuSafety.js';

const MENU_IMAGE_PATH = path.join(process.cwd(), 'assets', 'menu-catbox.jpg');
const MAX_IMAGE_CAPTION_LENGTH = 950;

function splitMenuCaption(text) {
    if (text.length <= MAX_IMAGE_CAPTION_LENGTH) {
        return { caption: text, continuation: '' };
    }

    const lineBreak = text.lastIndexOf('\n', MAX_IMAGE_CAPTION_LENGTH);
    const splitAt = lineBreak > 0 ? lineBreak : MAX_IMAGE_CAPTION_LENGTH;
    return {
        caption: text.slice(0, splitAt),
        continuation: text.slice(splitAt).replace(/^\n/, '')
    };
}

export async function sendStyledMenu(sock, {
    chatId,
    message,
    text,
    mentions = [],
    channelInfo = {}
}) {
    try {
        // Prefer the real illustrated channel post so WhatsApp shows its native channel attribution.
        const forwarded = await forwardLatestNewsletterPost(sock, {
            chatId,
            newsletterJid: config.newsletterJid,
            isValidPost: isPrimaryMenuPost
        });
        if (forwarded) return true;
    }
    catch (error) {
        console.warn('Could not forward the SLOW-XV menu post:', error.message);
    }

    if (typeof sock?.sendMessage !== 'function') return false;

    const menuText = String(text || '╭─〔 *SLOW-XV* 🤖〕➤');
    const hasMenuImage = fs.existsSync(MENU_IMAGE_PATH);
    const { caption, continuation } = splitMenuCaption(menuText);
    const quoted = message?.key ? { quoted: message } : {};
    const mentionInfo = mentions.length ? { mentions } : {};
    const fallbackPayload = hasMenuImage
        ? {
            image: { url: MENU_IMAGE_PATH },
            caption,
            ...mentionInfo,
            ...channelInfo
        }
        : {
            text: menuText,
            ...mentionInfo,
            ...channelInfo
        };

    try {
        await sock.sendMessage(chatId, fallbackPayload, quoted);
        if (hasMenuImage && continuation) {
            await sock.sendMessage(chatId, {
                text: continuation,
                ...channelInfo
            });
        }
        return true;
    }
    catch (error) {
        // Keep internal delivery failures out of the user's chat.
        console.warn('Could not send the local SLOW-XV menu fallback:', error.message);
        return false;
    }
}
