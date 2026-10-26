import path from 'node:path';
import config from '../config.js';
import { getMenuSenderJid, getMenuSenderNumber } from '../lib/menuFormatter.js';
import { forwardLatestNewsletterPost } from '../lib/menuNewsletter.js';
import { isSafePurgeMenuPost } from '../lib/menuSafety.js';

function buildPurgeMenu(senderNumber) {
    const greeting = senderNumber
        ? `*ʜᴇʟʟᴏ @${senderNumber} ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ sʟᴏᴡ-xv ɢʀᴏᴜᴘ sᴀғᴇᴛʏ 🤖*`
        : '*ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ sʟᴏᴡ-xv ɢʀᴏᴜᴘ sᴀғᴇᴛʏ 🤖*';

    return [
        '╭─〔 *SLOW-XV* 🤖〕➤',
        '╰━━━━━━━━━━━━━━━━━━➤',
        '',
        greeting,
        '',
        '╭─〔 *PURGE MENU* 🤖〕➤',
        '│◯ *ᴘᴜʀɢᴇʀᴇᴘᴏʀᴛ*',
        '│◯ *ᴘᴜʀɢᴇᴄᴀsᴇ*',
        '│◯ *ᴘᴜʀɢᴇᴇᴠɪᴅᴇɴᴄᴇ*',
        '╰━━━━━━━━━━━━━━━━━',
        '╭─〔 *PURGE-INFO*📢〕➤',
        '│🝓 *ᴘᴜʀɢᴇɪɴғᴏ*',
        '│🝓 *ᴀᴅᴅɪɴғᴏᴘᴜʀɢᴇ*',
        '│🝓 *ᴘᴜʀɢᴇsᴇᴀʀᴄʜ*',
        '╰━━━━━━━━━━━━━━━━━➤',
        '',
        '> ᴄʀᴇᴀᴛᴇᴅ ʙყ ʋᴀɾɳσx.ƚҽƈԋ🎉'
    ].join('\n');
}

export default {
    command: 'purgemenu',
    category: 'group',
    description: 'Show safe group-reporting and case-management commands',
    usage: '.purgemenu',
    groupOnly: true,
    cooldown: 5000,
    async handler(sock, message, _args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const senderJid = getMenuSenderJid(message);
        const caption = buildPurgeMenu(getMenuSenderNumber(message));
        const quoted = message?.key ? { quoted: message } : {};
        const imagePath = path.join(process.cwd(), 'assets', 'menu-catbox.jpg');

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

        try {
            return await sock.sendMessage(chatId, {
                image: { url: imagePath },
                caption,
                mentions: senderJid ? [senderJid] : []
            }, quoted);
        } catch (error) {
            console.warn(`Could not send the purge menu image; refusing a text-only fallback: ${error.message}`);
            return sock.sendMessage(chatId, {
                text: '⚠️ Le menu illustré est temporairement indisponible. Aucun menu texte de remplacement n’a été envoyé.',
                mentions: senderJid ? [senderJid] : []
            }, quoted);
        }
    }
};
