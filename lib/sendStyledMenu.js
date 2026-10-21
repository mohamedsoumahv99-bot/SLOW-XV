import config from '../config.js';
import { forwardLatestNewsletterPost } from './menuNewsletter.js';
import { loadMenuCoverImage, renderMenuImage } from './menuImage.js';

function getMenuChannelOptions(channelInfo = {}) {
    const options = { ...channelInfo };
    const contextInfo = { ...(channelInfo.contextInfo || {}) };

    // The menu image is not itself a newsletter forward. The real channel post
    // is sent separately below, with its actual server message ID.
    delete contextInfo.forwardedNewsletterMessageInfo;
    delete contextInfo.forwardingScore;
    delete contextInfo.isForwarded;

    if (Object.keys(contextInfo).length) {
        options.contextInfo = contextInfo;
    }
    else {
        delete options.contextInfo;
    }
    return options;
}

export async function sendStyledMenu(sock, {
    chatId,
    message,
    text,
    mentions = [],
    channelInfo = {},
    coverImage: suppliedCoverImage
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
        'Toutes les commandes sont visibles dans l’image ci-jointe.',
        `📣 Chaîne officielle : ${config.channelLink}`
    ].filter(Boolean).join('\n');

    let coverImage = suppliedCoverImage;
    if (coverImage === undefined) {
        try {
            coverImage = await loadMenuCoverImage();
        }
        catch (error) {
            console.error('Could not load the requested menu cover; keeping the full menu image:', error.message);
        }
    }

    let menuMessage;
    try {
        const image = await renderMenuImage(menuText, { coverImage });
        menuMessage = await sock.sendMessage(chatId, {
            ...channelOptions,
            image,
            caption,
            mentions
        }, quoted);
    }
    catch (error) {
        console.error('Menu image rendering failed; sending the complete text menu:', error.message);
        menuMessage = await sock.sendMessage(chatId, {
            ...channelOptions,
            text: menuText,
            mentions
        }, quoted);
    }

    try {
        await forwardLatestNewsletterPost(sock, {
            chatId,
            newsletterJid: config.newsletterJid,
            quotedMessage: menuMessage
        });
    }
    catch (error) {
        console.error('Could not forward the latest official channel post with the menu:', error.message);
    }

    return menuMessage;
}
