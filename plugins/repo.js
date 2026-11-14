import fs from 'node:fs';
import path from 'node:path';
import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys';
import config from '../config.js';
import { getChannelInfo } from '../lib/messageConfig.js';
import { getMenuSenderJid, getMenuSenderNumber } from '../lib/menuFormatter.js';

const PAIR_URL = 'https://slow-xv-pair.up.railway.app/';
const PAIR_IMAGE_PATH = path.join(process.cwd(), 'assets', 'menu-catbox.jpg');

function getPairMessage(senderNum) {
    const greeting = /^\d+$/.test(senderNum)
        ? `ʜᴇʏ @${senderNum}, ᴡᴇʟᴄᴏᴍᴇ🎉 ᴛᴏ ᴛʜᴇ SLOW-XV🤖 ᴡᴇʙ ᴘᴀɪʀ.`
        : 'ᴡᴇʟᴄᴏᴍᴇ🎉 ᴛᴏ ᴛʜᴇ SLOW-XV🤖 ᴡᴇʙ ᴘᴀɪʀ.';
    return [
        '❮ *PAIR WEB REPO*❯',
        `${greeting} ᴜsᴇ ᴛʜᴇ ʟɪɴᴋ ʙᴇʟᴏᴡ ᴛᴏ ᴅᴇᴍᴀɴᴅᴇʀ ᴜɴ ᴄᴏᴅᴇ ᴅᴇ ᴄᴏɴɴᴇxɪᴏɴ.`,
        '',
        ` *ᴡᴇʙ ʟɪɴᴋ*: *${PAIR_URL}*`,
        '',
        '*Aucun mot de passe partagé n’est nécessaire pour demander un code.*'
    ].join('\n');
}

export default {
    command: 'repo',
    aliases: ['webpair', 'pairweb'],
    category: 'general',
    description: 'Open the SLOW-XV web pairing page',
    usage: '.repo',
    async handler(sock, message, _args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const senderJid = getMenuSenderJid(message);
        const senderNum = getMenuSenderNumber(message);
        const buttons = [
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🌐 WEB LINK',
                    url: PAIR_URL,
                    merchant_url: PAIR_URL
                })
            }
        ];

        const header = { title: 'SLOW-XV WEB PAIR', hasMediaAttachment: false };
        let fallbackImage;
        if (fs.existsSync(PAIR_IMAGE_PATH)) {
            fallbackImage = fs.readFileSync(PAIR_IMAGE_PATH);
            if (typeof sock.waUploadToServer === 'function') {
                try {
                    const media = await prepareWAMessageMedia({ image: fallbackImage }, {
                        upload: sock.waUploadToServer
                    });
                    header.hasMediaAttachment = true;
                    header.imageMessage = media.imageMessage;
                }
                catch (error) {
                    console.error('Repo image upload failed; continuing without the image:', error.message);
                }
            }
        }

        const channelContext = getChannelInfo().contextInfo || {};
        const interactiveMessage = {
            header,
            body: { text: getPairMessage(senderNum) },
            footer: { text: config.botName },
            nativeFlowMessage: { buttons },
            contextInfo: {
                ...channelContext,
                mentionedJid: senderJid ? [senderJid] : []
            }
        };
        const generated = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage
                }
            }
        }, { userJid: sock.user?.id });

        if (typeof sock.relayMessage === 'function') {
            try {
                return await sock.relayMessage(chatId, generated.message, { messageId: generated.key.id });
            }
            catch (error) {
                console.error('Repo interactive delivery failed; sending a text fallback:', error.message);
            }
        }

        const fallbackMessage = getPairMessage(senderNum);
        return sock.sendMessage(chatId, {
            ...getChannelInfo(),
            ...(fallbackImage ? { image: fallbackImage, caption: fallbackMessage } : { text: fallbackMessage })
        }, { quoted: message });
    }
};
