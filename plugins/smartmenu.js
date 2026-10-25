import { sendStyledMenu } from '../lib/sendStyledMenu.js';

export default {
    command: 'smenu',
    aliases: ['shelp', 'smart', 'help2'],
    category: 'general',
    description: 'Interactive smart menu with live status',
    usage: '.smenu',
    isPrefixless: true,
    async handler(sock, message, _args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        return sendStyledMenu(sock, { chatId });
    }
};
