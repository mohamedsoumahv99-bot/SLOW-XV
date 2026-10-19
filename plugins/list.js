import config from '../config.js';
import commandHandler from '../lib/commandHandler.js';
import path from 'path';
import fs from 'fs';
import {
    buildCommandInfo,
    buildStyledMenu,
    getBotMode,
    getMessageLatency,
    getMenuUser,
    getMenuSenderJid,
    getMenuSenderNumber
} from '../lib/menuFormatter.js';

async function makeMenu(message, sock, prefix) {
    return buildStyledMenu({
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
}

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
        const senderJid = getMenuSenderJid(message);

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

        const text = await makeMenu(message, sock, prefix);
        await sock.sendMessage(chatId, {
            text,
            ...channelInfo,
            mentions: senderJid ? [senderJid] : []
        }, { quoted: message });
    }
};
