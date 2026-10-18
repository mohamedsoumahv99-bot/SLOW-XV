import config from '../config.js';
/*****************************************************************************
 *                                                                           *
 *                     Developed By Qasim Ali                                *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/GlobalTechInfo                         *
 *  ▶️  YouTube  : https://youtube.com/@GlobalTechInfo                       *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07     *
 *                                                                           *
 *    © 2026 GlobalTechInfo. All rights reserved.                            *
 *                                                                           *
 *    Description: This file is part of the MEGA-MD Project.                 *
 *                 Unauthorized copying or distribution is prohibited.       *
 *                                                                           *
 *****************************************************************************/
import commandHandler from '../lib/commandHandler.js';
import path from 'path';
import fs from 'fs';
import { buildStyledMenu, getBotMode, getMessageLatency, getMenuUser } from '../lib/menuFormatter.js';
function formatTime() {
    const now = new Date();
    const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: config.timeZone || 'UTC'
    };
    return now.toLocaleTimeString('en-US', options);
}
const menuStyles = [
    {
        render({ info, categories, prefix }) {
            return buildStyledMenu({
                categories,
                commandCount: info.total,
                owner: info.owner,
                prefix,
                mode: info.mode,
                user: info.user,
                uptimeSeconds: info.uptimeSeconds,
                latencyMs: info.latencyMs,
                version: info.version
            });
        }
    },
    {
        render({ _title, info, categories, prefix }) {
            let t = `◈╭─❍「 *MEGA MENU* 」❍\n`;
            t += `◈├• 🌟 *Bot: ${info.bot}*\n`;
            t += `◈├• ⚙️ *Prefix: ${info.prefix}*\n`;
            t += `◈├• 🍫 *Plugins: ${info.total}*\n`;
            t += `◈├• 💎 *Version: ${info.version}*\n`;
            t += `◈├• ⏰ *Time: ${info.time}*\n`;
            for (const [cat, cmds] of categories) {
                t += `◈├─❍「 *${cat.toUpperCase()}* 」❍\n`;
                for (const c of cmds)
                    t += `◈├• ${prefix}${c}\n`;
            }
            t += `◈╰──★─☆──♪♪─❍`;
            return t;
        }
    },
    {
        render({ _title, info, categories, prefix }) {
            let t = `┏━━━━ *MEGA MENU* ━━━┓\n`;
            t += `┃• *Bot : ${info.bot}*\n`;
            t += `┃• *Prefixes : ${info.prefix}*\n`;
            t += `┃• *Plugins : ${info.total}*\n`;
            t += `┃• *Version : ${info.version}*\n`;
            t += `┃• *Time : ${info.time}*\n`;
            for (const [cat, cmds] of categories) {
                t += `┃━━━━ *${cat.toUpperCase()}* ━━◆\n`;
                for (const c of cmds)
                    t += `┃ ▸ ${prefix}${c}\n`;
            }
            t += `┗━━━━━━━━━━━━━━━┛`;
            return t;
        }
    },
    {
        render({ _title, info, categories, prefix }) {
            let t = `✦═══ *MEGA MENU* ═══✦\n`;
            t += `║➩ *Bot: ${info.bot}*\n`;
            t += `║➩ *Prefixes: ${info.prefix}*\n`;
            t += `║➩ *Plugins: ${info.total}*\n`;
            t += `║➩ *Version: ${info.version}*\n`;
            t += `║➩ *Time: ${info.time}*\n`;
            for (const [cat, cmds] of categories) {
                t += `║══ *${cat.toUpperCase()}* ══✧\n`;
                for (const c of cmds)
                    t += `║ ✦ ${prefix}${c}\n`;
            }
            t += `✦══════════════✦`;
            return t;
        }
    },
    {
        render({ _title, info, categories, prefix }) {
            let t = `❀━━━ *MEGA MENU* ━━━❀\n`;
            t += `┃☞ *Bot: ${info.bot}*\n`;
            t += `┃☞ *Prefixes: ${info.prefix}*\n`;
            t += `┃☞ *Plugins: ${info.total}*\n`;
            t += `┃☞ *Version: ${info.version}*\n`;
            t += `┃☞ *Time: ${info.time}*\n`;
            for (const [cat, cmds] of categories) {
                t += `┃━━━〔 *${cat.toUpperCase()}* 〕━❀\n`;
                for (const c of cmds)
                    t += `┃☞ ${prefix}${c}\n`;
            }
            t += `❀━━━━━━━━━━━━━━❀`;
            return t;
        }
    },
    {
        render({ _title, info, categories, prefix }) {
            let t = `◆━━━ *MEGA MENU* ━━━◆\n`;
            t += `┃ ¤ *Bot: ${info.bot}*\n`;
            t += `┃ ¤ *Prefixes: ${info.prefix}*\n`;
            t += `┃ ¤ *Plugins: ${info.total}*\n`;
            t += `┃ ¤ *Version: ${info.version}*\n`;
            t += `┃ ¤ *Time: ${info.time}*\n`;
            for (const [cat, cmds] of categories) {
                t += `┃━━ *${cat.toUpperCase()}* ━━◆◆\n`;
                for (const c of cmds)
                    t += `┃ ¤ ${prefix}${c}\n`;
            }
            t += `◆━━━━━━━━━━━━━━━━◆`;
            return t;
        }
    },
    {
        render({ _title, info, categories, prefix }) {
            let t = `╭───⬣ *MEGA MENU* ──⬣\n`;
            t += ` | ● *Bot: ${info.bot}*\n`;
            t += ` | ● *Prefixes: ${info.prefix}*\n`;
            t += ` | ● *Plugins: ${info.total}*\n`;
            t += ` | ● *Version: ${info.version}*\n`;
            t += ` | ● *Time: ${info.time}*\n`;
            for (const [cat, cmds] of categories) {
                t += ` |───⬣ *${cat.toUpperCase()}* ──⬣\n`;
                for (const c of cmds)
                    t += ` | ● ${prefix}${c}\n`;
            }
            t += `╰──────────⬣`;
            return t;
        }
    }
];
const pick = (arr) => arr[0];
export default {
    command: 'menu',
    aliases: ['help', 'commands', 'h', 'list'],
    category: 'general',
    description: 'Show all commands',
    usage: '.menu [command]',
    async handler(sock, message, args, context) {
        const { chatId, channelInfo } = context;
        const prefix = config.prefixes[0];
        const imagePath = path.join(process.cwd(), 'assets/menu-catbox.jpg');
        if (args.length) {
            const searchTerm = args[0].toLowerCase();
            let cmd = commandHandler.commands.get(searchTerm);
            if (!cmd && commandHandler.aliases.has(searchTerm)) {
                const mainCommand = commandHandler.aliases.get(searchTerm);
                cmd = commandHandler.commands.get(mainCommand);
            }
            if (!cmd) {
                return sock.sendMessage(chatId, {
                    text: `❌ Command "${args[0]}" not found.\n\nUse ${prefix}menu to see all commands.`,
                    ...channelInfo
                }, { quoted: message });
            }
            const text = `╭━━━━━━━━━━━━━━⬣
┃ 𓆩 *𝗖ᴏᴍᴍᴀɴᴅ 𝗜ɴғᴏ* 𓆪
┃
┃ ⸸ *𝗖ᴏᴍᴍᴀɴᴅ:* ${prefix}${cmd.command}
┃ 🝐 *𝗗ᴇsᴄ:* ${cmd.description || 'No description'}
┃ ⸸ *𝗨sᴀɢᴇ:* ${cmd.usage || `${prefix}${cmd.command}`}
┃ 🝐 *𝗖ᴀᴛᴇɢᴏʀʏ:* ${cmd.category || 'misc'}
┃ ⸸ *𝗔ʟɪᴀsᴇs:* ${cmd.aliases?.length ? cmd.aliases.map((a) => prefix + a).join(', ') : 'None'}
┃
╰━━━━━━━━━━━━━━⬣`;
            if (fs.existsSync(imagePath)) {
                return sock.sendMessage(chatId, {
                    image: { url: imagePath },
                    caption: text,
                    ...channelInfo
                }, { quoted: message });
            }
            return sock.sendMessage(chatId, { text, ...channelInfo }, { quoted: message });
        }
        const style = pick(menuStyles);
        const text = style.render({
            title: config.botName,
            prefix,
            info: {
                bot: config.botName,
                prefix: config.prefixes.join(', '),
                total: commandHandler.commands.size,
                version: config.version || '1.0.0',
                time: formatTime(),
                owner: config.botOwner,
                mode: await getBotMode(sock),
                user: getMenuUser(message),
                uptimeSeconds: process.uptime(),
                latencyMs: getMessageLatency(message)
            },
            categories: commandHandler.categories
        });
        if (fs.existsSync(imagePath)) {
            await sock.sendMessage(chatId, {
                image: { url: imagePath },
                caption: text,
                ...channelInfo
            }, { quoted: message });
        }
        else {
            await sock.sendMessage(chatId, { text, ...channelInfo }, { quoted: message });
        }
    }
};
/*****************************************************************************
 *                                                                           *
 *                     Developed By Qasim Ali                                *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/GlobalTechInfo                         *
 *  ▶️  YouTube  : https://youtube.com/@GlobalTechInfo                       *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07     *
 *                                                                           *
 *    © 2026 GlobalTechInfo. All rights reserved.                            *
 *                                                                           *
 *    Description: This file is part of the MEGA-MD Project.                 *
 *                 Unauthorized copying or distribution is prohibited.       *
 *                                                                           *
 *****************************************************************************/
