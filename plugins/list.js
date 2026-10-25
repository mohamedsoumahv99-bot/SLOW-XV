import config from '../config.js';
import commandHandler from '../lib/commandHandler.js';
import path from 'path';
import fs from 'fs';
import { sendStyledMenu } from '../lib/sendStyledMenu.js';
import { buildCommandInfo } from '../lib/menuFormatter.js';

export default {
    command: 'menu',
    aliases: ['help', 'commands', 'h', 'list'],
    category: 'general',
    description: 'Show all commands',
    usage: '.menu [command]',
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const prefix = (config.prefixes && config.prefixes[0]) || config.prefix || '.';
        const imagePath = path.join(process.cwd(), 'assets', 'menu-catbox.jpg');

        if (args.length) {
            const searchTerm = args[0].toLowerCase();
            let command = commandHandler.commands.get(searchTerm);
            if (!command && commandHandler.aliases.has(searchTerm)) {
                const canonicalName = commandHandler.aliases.get(searchTerm);
                command = commandHandler.commands.get(canonicalName);
            }
            if (!command) {
                return sock.sendMessage(chatId, {
                    text: '❌ Command "' + args[0] + '" not found.\n\nUse ' + prefix + 'menu to see all commands.',
                    ...channelInfo
                }, { quoted: message });
            }
            const text = buildCommandInfo(command, prefix);
            if (fs.existsSync(imagePath)) {
                return sock.sendMessage(chatId, {
                    image: { url: imagePath },
                    caption: text,
                    ...channelInfo
                }, { quoted: message });
            }
            return sock.sendMessage(chatId, { text, ...channelInfo }, { quoted: message });
        }

        return sendStyledMenu(sock, { chatId });
    }
};
