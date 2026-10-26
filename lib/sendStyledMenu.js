import fs from 'fs';
import path from 'path';
import config from '../config.js';
import { forwardLatestNewsletterPost } from './menuNewsletter.js';
import { isPrimaryMenuPost } from './menuSafety.js';

const MENU_IMAGE_PATH = path.join(process.cwd(), 'assets', 'menu-catbox.jpg');

export async function sendStyledMenu(sock, {
    chatId,
    message,
    text,
    mentions = [],
    channelInfo = {}
}) {
    let forwarded;
    try {
        // One native forward contains the original image, caption, and channel attribution.
        forwarded = await forwardLatestNewsletterPost(sock, {
            chatId,
            newsletterJid: config.newsletterJid,
            isValidPost: isPrimaryMenuPost
        });
    }
    catch (error) {
        console.warn('Could not forward the SLOW-XV menu post:', error.message);
        // A failed send can have reached WhatsApp; do not retry with a second message.
        return false;
    }
    if (forwarded) return true;

    if (typeof sock?.sendMessage !== 'function') return false;

    // Keep the fallback to one image message; never split a menu across multiple replies.
    const menuText = String(text || '╭─〔 *SLOW-XV* 🤖〕➤');
    const quoted = message?.key ? { quoted: message } : {};
    const mentionInfo = mentions.length ? { mentions } : {};
    const payload = fs.existsSync(MENU_IMAGE_PATH)
        ? {
            image: { url: MENU_IMAGE_PATH },
            caption: menuText,
            ...mentionInfo,
            ...channelInfo
        }
        : {
            text: menuText,
            ...mentionInfo,
            ...channelInfo
        };

    try {
        await sock.sendMessage(chatId, payload, quoted);
        return true;
    }
    catch (error) {
        console.warn('Could not send the SLOW-XV menu image:', error.message);
        return false;
    }
}
