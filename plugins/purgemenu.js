import config from '../config.js';
import { forwardLatestNewsletterPost } from '../lib/menuNewsletter.js';
import { isSafePurgeMenuPost } from '../lib/menuSafety.js';

export default {
    command: 'purgemenu',
    category: 'group',
    description: 'Show safe group-reporting and case-management commands',
    usage: '.purgemenu',
    groupOnly: true,
    cooldown: 5000,
    async handler(sock, message, _args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const quoted = message?.key ? { quoted: message } : {};

        try {
            const forwarded = await forwardLatestNewsletterPost(sock, {
                chatId,
                newsletterJid: config.newsletterJid,
                quotedMessage: message,
                isValidPost: isSafePurgeMenuPost
            });
            if (forwarded) return true;
        } catch (error) {
            console.warn(`Could not forward a safe purge menu from the channel: ${error.message}`);
        }

        return sock.sendMessage(chatId, {
            text: '⚠️ Aucun post PURGE MENU sûr avec image n’a été trouvé dans la chaîne configurée. Publie d’abord le menu sûr illustré dans la chaîne, puis réessaie.'
        }, quoted);
    }
};
