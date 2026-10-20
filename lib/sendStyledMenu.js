import fs from 'node:fs';
import path from 'node:path';
import { getChannelInfo } from './messageConfig.js';

const MENU_IMAGE_PATH = path.join(process.cwd(), 'assets', 'menu-catbox.jpg');
const MENU_CAPTION_MAX_LENGTH = 1024;
const EMPTY_MENU_CAPTION = '📜 *SLOW-XV Command Menu*';

function splitMenuForCaption(text) {
    if (text.length <= MENU_CAPTION_MAX_LENGTH) {
        return { caption: text, remainder: '' };
    }

    let splitAt = text.lastIndexOf('\n', MENU_CAPTION_MAX_LENGTH);
    if (splitAt <= 0) splitAt = MENU_CAPTION_MAX_LENGTH;
    return {
        caption: text.slice(0, splitAt),
        remainder: text.slice(splitAt)
    };
}

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
    const menuText = String(text ?? '');

    if (!fs.existsSync(MENU_IMAGE_PATH)) {
        return sock.sendMessage(chatId, {
            ...channelOptions,
            text: menuText,
            mentions
        }, quoted);
    }

    const { caption, remainder } = splitMenuForCaption(menuText);
    const imageResult = await sock.sendMessage(chatId, {
        ...channelOptions,
        image: fs.readFileSync(MENU_IMAGE_PATH),
        caption: caption || EMPTY_MENU_CAPTION,
        mentions
    }, quoted);

    if (!remainder) return imageResult;

    return sock.sendMessage(chatId, {
        ...channelOptions,
        text: remainder,
        mentions
    }, quoted);
}
