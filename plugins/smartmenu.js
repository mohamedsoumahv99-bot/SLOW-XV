import config from '../config.js';
import CommandHandler from '../lib/commandHandler.js';
import {
    buildStyledMenu,
    getBotMode,
    getMessageLatency,
    getMenuUser,
    getMenuSenderJid,
    getMenuSenderNumber
} from '../lib/menuFormatter.js';

export default {
    command: 'smenu',
    aliases: ['shelp', 'smart', 'help2'],
    category: 'general',
    description: 'Interactive smart menu with live status',
    usage: '.smenu',
    isPrefixless: true,
    async handler(sock, message, _args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        try {
            const senderJid = getMenuSenderJid(message);
            const prefix = (config.prefixes && config.prefixes[0]) || config.prefix || '.';
            const menuText = buildStyledMenu({
                categories: CommandHandler.categories,
                commandCount: CommandHandler.commands.size,
                owner: config.botOwner,
                prefix,
                mode: await getBotMode(sock),
                user: getMenuUser(message),
                senderNum: getMenuSenderNumber(message),
                uptimeSeconds: process.uptime(),
                latencyMs: getMessageLatency(message),
                version: config.version
            });
            const contextInfo = {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: config.newsletterJid,
                    newsletterName: config.botName,
                    serverMessageId: -1
                }
            };
            const messageOptions = {
                text: menuText,
                mentions: senderJid ? [senderJid] : [],
                contextInfo
            };
            await sock.sendMessage(chatId, messageOptions, { quoted: message });
        }
        catch (error) {
            console.error('Menu Error:', error);
            await sock.sendMessage(chatId, {
                text: '❌ *Menu Error*\n\n' + error.message
            }, { quoted: message });
        }
    }
};
