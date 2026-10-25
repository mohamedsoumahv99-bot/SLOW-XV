import config from '../config.js';
import { forwardLatestNewsletterPost } from './menuNewsletter.js';
import { isPrimaryMenuPost } from './menuSafety.js';

export async function sendStyledMenu(sock, {
    chatId,
    message
}) {
    // Only forward a real, illustrated SLOW-XV menu post, never unrelated news.
    const forwarded = await forwardLatestNewsletterPost(sock, {
        chatId,
        newsletterJid: config.newsletterJid,
        isValidPost: isPrimaryMenuPost
    });
    if (forwarded) return true;

    const quoted = message?.key ? { quoted: message } : {};
    return sock.sendMessage(chatId, {
        text: '⚠️ Aucun post de menu SLOW-XV valide avec image n’a été trouvé dans la chaîne configurée. Publie d’abord le menu illustré dans la chaîne, puis réessaie.'
    }, quoted);
}
