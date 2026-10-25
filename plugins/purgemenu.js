import path from 'node:path';
import config from '../config.js';
import { getMenuSenderJid, getMenuSenderNumber } from '../lib/menuFormatter.js';
import { createNewsletterForwardPayload, getLatestNewsletterPost } from '../lib/menuNewsletter.js';

function getNewsletterText(message) {
    const content = message?.message || {};
    return content.conversation
        || content.extendedTextMessage?.text
        || content.imageMessage?.caption
        || content.videoMessage?.caption
        || '';
}

function isSafePurgeMenuPost(message) {
    const text = getNewsletterText(message);
    const requiredCommands = [
        'purgereport',
        'purgecase',
        'purgeevidence',
        'purgeinfo',
        'addinfopurge',
        'purgesearch'
    ];
    if (!requiredCommands.every((command) => text.toLowerCase().includes(command))) return false;
    return !/(?:^|\W)(?:kickall\d*|kickpurge|spamgroup)(?:$|\W)/i.test(text);
}

function buildPurgeMenu(senderNumber, prefix) {
    const hello = senderNumber
        ? `*ʜᴇʟʟᴏ @${senderNumber} ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ sʟᴏᴡ-xv ɢʀᴏᴜᴘ sᴀғᴇᴛʏ ᴛᴏᴏʟs 🤖*`
        : '*ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ sʟᴏᴡ-xv ɢʀᴏᴜᴘ sᴀғᴇᴛʏ ᴛᴏᴏʟs 🤖*';

    return [
        '╭─〔 *SLOW-XV* 🤖〕➤',
        '╰━━━━━━━━━━━━━━━━━━➤',
        '',
        hello,
        '',
        '╭─〔 *PURGE MENU* 🤖〕➤',
        `│◯ *ᴘᴜʀɢᴇʀᴇᴘᴏʀᴛ* — ${prefix}purgereport <description>`,
        `│◯ *ᴘᴜʀɢᴇᴄᴀsᴇ* — ${prefix}purgecase [id|close id]`,
        `│◯ *ᴘᴜʀɢᴇᴇᴠɪᴅᴇɴᴄᴇ* — ${prefix}purgeevidence <id> <https link>`,
        '╰━━━━━━━━━━━━━━━━━➤',
        '',
        '╭─〔 *PURGE-INFO* 📢〕➤',
        `│🝓 *ᴘᴜʀɢᴇɪɴғᴏ* — ${prefix}purgeinfo`,
        `│🝓 *ᴀᴅᴅɪɴғᴏᴘᴜʀɢᴇ* — ${prefix}addinfopurge <message>`,
        `│🝓 *ᴘᴜʀɢᴇsᴇᴀʀᴄʜ* — ${prefix}purgesearch <term>`,
        '╰━━━━━━━━━━━━━━━━━➤',
        '',
        '> ᴄʀᴇᴀᴛᴇᴅ ʙყ ʋᴀɾɳσx.ƚҽƈԋ🎉',
        config.channelLink
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
        const prefix = config.prefixes?.[0] || config.prefix || '.';
        const caption = buildPurgeMenu(getMenuSenderNumber(message), prefix);
        const quoted = message?.key ? { quoted: message } : {};
        const imagePath = path.join(process.cwd(), 'assets', 'menu-catbox.jpg');

        try {
            const channelPost = await getLatestNewsletterPost(sock, config.newsletterJid);
            if (isSafePurgeMenuPost(channelPost)) {
                return await sock.sendMessage(
                    chatId,
                    createNewsletterForwardPayload(channelPost, config.newsletterJid, config.botName),
                    quoted
                );
            }
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
            console.warn(`Could not send the purge menu image; sending text instead: ${error.message}`);
            return sock.sendMessage(chatId, {
                text: caption,
                mentions: senderJid ? [senderJid] : []
            }, quoted);
        }
    }
};
