import fs from 'fs';
import path from 'path';
import config from '../config.js';
import commandHandler from '../lib/commandHandler.js';
import { channelInfo } from '../lib/messageConfig.js';
import { buildStyledMenu, getBotMode, getMessageLatency, getMenuUser } from '../lib/menuFormatter.js';

export default {
    command: 'allmenu',
    aliases: ['fullmenu', 'allcommands'],
    category: 'general',
    description: 'Show every command grouped by category',
    usage: '.allmenu',
    async handler(sock, message, _args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const prefix = (config.prefixes && config.prefixes[0]) || config.prefix || '.';
        const text = buildStyledMenu({
            categories: commandHandler.categories,
            commandCount: commandHandler.commands.size,
            owner: config.botOwner,
            prefix,
            mode: await getBotMode(sock),
            user: getMenuUser(message),
            uptimeSeconds: process.uptime(),
            latencyMs: getMessageLatency(message),
            version: config.version
        });
        const imagePath = path.join(process.cwd(), 'assets', 'menu-catbox.jpg');
        if (fs.existsSync(imagePath)) {
            await sock.sendMessage(chatId, { image: { url: imagePath }, caption: text, ...channelInfo }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text, ...channelInfo }, { quoted: message });
        }
    }
};
