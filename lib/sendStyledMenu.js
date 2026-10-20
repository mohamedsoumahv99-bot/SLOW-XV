import { getChannelInfo } from './messageConfig.js';
import { renderMenuImage } from './menuImage.js';

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
    const mentionNumber = mentions
        .map(jid => String(jid).split('@')[0].split(':')[0])
        .find(number => /^\d+$/.test(number));
    const caption = [
        mentionNumber ? `👋 @${mentionNumber}` : '',
        '📜 *SLOW-XV — Menu complet*',
        'Toutes les commandes sont visibles dans l’image ci-jointe.'
    ].filter(Boolean).join('\n');

    try {
        const image = await renderMenuImage(menuText);
        return await sock.sendMessage(chatId, {
            ...channelOptions,
            image,
            caption,
            mentions
        }, quoted);
    }
    catch (error) {
        console.error('Menu image rendering failed; sending the complete text menu:', error.message);
        return sock.sendMessage(chatId, {
            ...channelOptions,
            text: menuText,
            mentions
        }, quoted);
    }
}
