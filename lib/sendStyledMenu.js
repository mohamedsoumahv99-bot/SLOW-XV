import config from '../config.js';
import { forwardLatestNewsletterPost } from './menuNewsletter.js';

export async function sendStyledMenu(sock, {
    chatId,
    message,
    text,
    mentions = []
}) {
    // Forward the original channel post as-is: WhatsApp keeps its SLOW-XV
    // cover, readable menu caption, and native "Voir la chaîne" button together.
    const forwarded = await forwardLatestNewsletterPost(sock, {
        chatId,
        newsletterJid: config.newsletterJid
    });
    if (forwarded) return true;

    // Keep every generated command readable if the channel post is unavailable.
    const menuText = String(text ?? '').trimEnd();
    const fallbackText = [
        menuText,
        '📣 Chaîne officielle : ' + config.channelLink
    ].filter(Boolean).join('\n\n');
    const quoted = message?.key ? { quoted: message } : {};
    return sock.sendMessage(chatId, {
        text: fallbackText,
        mentions
    }, quoted);
}
