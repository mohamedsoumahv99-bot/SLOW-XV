import fs from 'node:fs';
import path from 'node:path';
import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys';
import config from '../config.js';
import { getChannelInfo } from '../lib/messageConfig.js';
import { getMenuSenderJid, getMenuSenderNumber } from '../lib/menuFormatter.js';

const PAIR_URL = 'https://slow-xv-pair.up.railway.app/';
const PAIR_IMAGE_PATH = path.join(process.cwd(), 'assets', 'menu-catbox.jpg');

function getPairMessage(senderNum, password) {
    return [
        '❮ *PAIR WEB REPO*❯',
        'ʜᴇʏ @' + senderNum + ', ᴡᴇʟᴄᴏᴍᴇ🎉 ᴛᴏ ᴛʜᴇ SLOW-XV🤖 ᴡᴇʙ ᴘᴀɪʀ. ᴄʟɪᴄᴋ ᴛʜᴇ ғᴏʟʟᴏᴡɪɴɢ ʟɪɴᴋ ᴛᴏ ᴄᴏɴɴᴇᴄᴛ ᴛᴏ ᴛʜᴇ ʙᴏᴛ🤖',
        '',
        ' *ᴡᴇʙ ʟɪɴᴋ*: *' + PAIR_URL + '*',
        '╰━➤ *PASSWORD*: ' + password,
        '',
        '*ᴇɴᴛᴇʀ ᴛʜᴇ ᴘᴀssᴡᴏʀᴅ ʙʏ ᴄʟɪᴄᴋɪɴɢ ᴏɴ ᴛʜᴇ ᴡᴇʙsɪᴛᴇ, ᴛʜᴇɴ ᴇɴᴛᴇʀ ʏᴏᴜʀ ᴄʜᴀᴛ sᴀᴘᴏ ɴɪᴍʙᴇʀ.*'
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
        const password = process.env.WEB_PAIR_PASSWORD;
        if (!password) {
            return sock.sendMessage(chatId, {
                text: '❌ WEB_PAIR_PASSWORD is not configured on the server.',
                ...getChannelInfo()
            }, { quoted: message });
        }

        const senderJid = getMenuSenderJid(message);
        const senderNum = getMenuSenderNumber(message) || 'user';
        const buttons = [
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🌐 WEB LINK',
                    url: PAIR_URL,
                    merchant_url: PAIR_URL
                })
            },
            {
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: '🔑 COPY PASSWORD',
                    copy_code: password
                })
            }
        ];

        const header = { title: 'SLOW-XV WEB PAIR', hasMediaAttachment: false };
        if (fs.existsSync(PAIR_IMAGE_PATH)) {
            const media = await prepareWAMessageMedia({ image: fs.readFileSync(PAIR_IMAGE_PATH) }, {
                upload: sock.waUploadToServer
            });
            header.hasMediaAttachment = true;
            header.imageMessage = media.imageMessage;
        }

        const channelContext = getChannelInfo().contextInfo || {};
        const interactiveMessage = {
            header,
            body: { text: getPairMessage(senderNum, password) },
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

        return sock.relayMessage(chatId, generated.message, { messageId: generated.key.id });
    }
};
