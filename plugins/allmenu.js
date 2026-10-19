import config from '../config.js';
import commandHandler from '../lib/commandHandler.js';
import { sendStyledMenu } from '../lib/sendStyledMenu.js';
import {
    buildStyledMenu,
    getBotMode,
    getMessageLatency,
    getMenuUser,
    getMenuSenderJid,
    getMenuSenderNumber
} from '../lib/menuFormatter.js';

export default {
    command: 'allmenu',
    aliases: ['fullmenu', 'allcommands'],
    category: 'general',
    description: 'Show every command grouped by category',
    usage: '.allmenu',
    async handler(sock, message, _args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const senderJid = getMenuSenderJid(message);
        const prefix = (config.prefixes && config.prefixes[0]) || config.prefix || '.';
        const text = buildStyledMenu({
            categories: commandHandler.categories,
            commandCount: commandHandler.commands.size,
            owner: config.botOwner,
            prefix,
            mode: await getBotMode(sock),
            user: getMenuUser(message),
            senderNum: getMenuSenderNumber(message),
            uptimeSeconds: process.uptime(),
            latencyMs: getMessageLatency(message),
            version: config.version
        });
        await sendStyledMenu(sock, {
            chatId,
            message,
            text,
            mentions: senderJid ? [senderJid] : []
        });
    }
};
