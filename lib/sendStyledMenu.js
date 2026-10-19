import fs from 'node:fs';
import path from 'node:path';
import { getChannelInfo } from './messageConfig.js';

const MENU_IMAGE_PATH = path.join(process.cwd(), 'assets', 'menu-catbox.jpg');
const MENU_IMAGE_CAPTION = '📜 *SLOW-XV Command Menu*\nThe complete command list follows in the next message.';

function getMenuChannelOptions(channelInfo = {}) {
    const defaultContextInfo = getChannelInfo().contextInfo || {};
    const suppliedContextInfo = channelInfo.contextInfo || {};

    return {
        ...channelInfo,
        contextInfo: {
            ...defaultContextInfo,
            ...suppliedContextInfo,
            forwardedNewsletterMessageInfo: {
                ...(defaultContextInfo.forwardedNewsletterMessageInfo || {}),
                ...(suppliedContextInfo.forwardedNewsletterMessageInfo || {})
            }
        }
    };
}

export async function sendStyledMenu(sock, {
    chatId,
    message,
    text,
    mentions = [],
    channelInfo = {}
}) {
    const channelOptions = getMenuChannelOptions(channelInfo);
    const quoted = { quoted: message };

    if (fs.existsSync(MENU_IMAGE_PATH)) {
        await sock.sendMessage(chatId, {
            ...channelOptions,
            image: fs.readFileSync(MENU_IMAGE_PATH),
            caption: MENU_IMAGE_CAPTION
        }, quoted);
    }

    return sock.sendMessage(chatId, {
        ...channelOptions,
        text,
        mentions
    }, quoted);
}
