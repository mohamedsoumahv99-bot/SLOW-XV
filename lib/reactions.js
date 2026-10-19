import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import fs from 'fs';
import { dataFile } from './paths.js';
import store from './lightweight_store.js';
const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
const USER_GROUP_DATA = dataFile('userGroupData.json');
export const COMMAND_REACTION_MAP = Object.freeze({
    // OWNER
    "addreply": "💬",
    "anticall": "📵",
    "antidelete": "👁️‍🗨️",
    "archivechat": "📦",
    "autoreact": "❤️",
    "autoread": "👀",
    "autoreply": "🤖",
    "autostatus": "🟢",
    "autotyping": "⌨️",
    "broadcast": "📢",
    "broadcastdm": "📨",
    "clear": "🧹",
    "clearchat": "🗑️",
    "clearsession": "♻️",
    "cleartmp": "🧼",
    "cmdreact": "⚡",
    "delcmd": "❌",
    "delplugin": "🗑️",
    "delreply": "🗑️",
    "gcleave": "🚪",
    "getfile": "📁",
    "inspect": "🔍",
    "gitinfo": "ℹ️",
    "addplugin": "➕",
    "joingroup": "🔗",
    "listcmd": "📜",
    "listrent": "📋",
    "listreplies": "💬",
    "maintenance": "🛠️",
    "manage": "⚙️",
    "mention": "🫂",
    "mode": "🔀",
    "pinchat": "📌",
    "pmblocker": "🚫",
    "gitpull": "⬇️",
    "reload": "🔄",
    "rentbot": "💸",
    "setbio": "📝",
    "setcmd": "✏️",
    "setpp": "🖼️",
    "settings": "⚙️",
    "star": "⭐",
    "stealth": "👻",
    "stoprent": "🛑",
    "sudo": "👑",
    "sysinfo": "💻",
    "update": "🚀",
    // AI
    "gpt": "🧠",
    "llama": "🦙",
    "mistral": "🌬️",
    "dalle": "🎨",
    "flux": "✨",
    "diffusion": "🖌️",
    "sora": "🎬",
    // DOWNLOAD
    "alamy": "🖼️",
    "apkdl": "📱",
    "facebook": "📘",
    "getty": "📸",
    "gimage": "🌄",
    "gitclone": "📥",
    "gitclone2": "📥",
    "instagram": "📷",
    "istock": "🖼️",
    "mediafire": "☁️",
    "mega": "☁️",
    "sharechat": "💬",
    "snack": "🍿",
    "snapchat": "👻",
    "spotify": "🎵",
    "dlstatus": "📊",
    "terabox": "📦",
    "tiktok": "🎶",
    "twitter": "🐦",
    "video": "🎥",
    "vidsplay": "▶️",
    // GENERAL
    "alive": "💓",
    "allmenu": "📚",
    "channelid": "🆔",
    "echo": "🔊",
    "getpp": "👤",
    "menu": "📖",
    "pair": "🔗",
    "ping": "🏓",
    "pingweb": "🌐",
    "find": "🔎",
    "smenu": "📋",
    "perf": "⚡",
    "uptime": "⏱️",
    "viewonce": "👁️",
    // UTILITY
    "analyze": "📊",
    "calc": "🧮",
    "cipher": "🔐",
    "crun": "💻",
    "distance": "📏",
    "dna": "🧬",
    "rle": "🔤",
    "schedule": "⏰",
    "schedulecancel": "❌",
    "schedulelist": "📋",
    "siminfo": "📱",
    "speedtest": "🚀",
    "sudoku": "🔢",
    "units": "⚖️",
    "urldecode": "🔗",
    "wordcloud": "☁️",
    // MENU
    "animes": "🎌",
    "audiofx": "🎧",
    "notes": "📝",
    "privacy": "🔒",
    "images": "🖼️",
    "stext": "✍️",
    "ephoto": "🖌️",
    // ADMIN
    "antibadword": "🤬",
    "antilink": "🚫",
    "antispam": "🚫",
    "antitag": "🏷️",
    "ban": "🔨",
    "chatbot": "🤖",
    "delete": "🗑️",
    "demote": "⬇️",
    "disappear": "👻",
    "add": "➕",
    "gcset": "⚙️",
    "goodbye": "👋",
    "hidetag": "🙈",
    "kick": "👢",
    "mute": "🔇",
    "promote": "⬆️",
    "resetlink": "🔄",
    "setgdesc": "📝",
    "setgname": "✏️",
    "setgpp": "🖼️",
    "tag": "📢",
    "tagall": "📣",
    "tagnotadmin": "👥",
    "unban": "🔓",
    "unmute": "🔊",
    "warn": "⚠️",
    "welcome": "👋",
    // STICKERS
    "attp": "✨",
    "emojimix": "😂",
    "gif": "🎞️",
    "igs": "📸",
    "igsc": "📸",
    "quoted": "💬",
    "s2img": "🖼️",
    "sticker": "🎭",
    "sticker2": "🎭",
    "crop": "✂️",
    "stickers": "🎭",
    "tgstk": "✈️",
    "take": "🏷️",
    // TOOLS
    "base64": "🔐",
    "bfdecode": "🧠",
    "brainfuck": "🤯",
    "excard": "💳",
    "fetch": "🌐",
    "flip": "🔄",
    "forwarded": "➡️",
    "grayscale": "⚫",
    "blur": "🌫️",
    "invert": "🔄",
    "qrcode": "🔳",
    "qmaker": "🔳",
    "readmore": "📖",
    "readqr": "📷",
    "removebg": "✂️",
    "length": "📏",
    "reverse": "⏪",
    "sepia": "🟤",
    "sharpen": "🔪",
    "getpage": "📄",
    "screenshot": "📸",
    "tinyurl": "🔗",
    "smallcaps": "🔤",
    "tourl": "🌐",
    "translate": "🌍",
    "tts": "🗣️",
    "url": "🔗",
    "vnote": "🎙️",
    // GROUP
    "character": "🎭",
    "compliment": "😊",
    "gcmtdata": "📊",
    "groupinfo": "ℹ️",
    "insult": "😡",
    "invitelink": "🔗",
    "joinrequests": "📥",
    "poll": "📊",
    "rank": "🏆",
    "ship": "💕",
    "simp": "😍",
    "staff": "👮",
    "stupid": "🤪",
    "warnings": "⚠️",
    "wasted": "💀",
    // IMAGES
    "coding": "💻",
    "cyberimg": "🤖",
    "game": "🎮",
    "islamic": "🕌",
    "mountain": "⛰️",
    "pies": "🥧",
    "tech": "🖥️",
    // GAMES
    "dado": "🎲",
    "dare": "😈",
    "hangman": "🪢",
    "math": "🧮",
    "tictactoe": "❌",
    "trivia": "❓",
    "truth": "🤥",
    // SEARCH
    "define": "📖",
    "element": "⚗️",
    "whoisip": "🌐",
    "wattpad": "📚",
    "wiki": "🌐",
    // FUN
    "8ball": "🎱",
    "fact": "💡",
    "flirt": "😘",
    "hack": "💀",
    "joke": "😂",
    "joke2": "🤣",
    "meme": "🤣",
    "teddy": "🧸",
    "why": "🤔",
    // STALK
    "genshin": "🎮",
    "github": "🐙",
    "npmstalk": "📦",
    "pinstalk": "📌",
    "tgstalk": "✈️",
    "thrstalk": "🧵",
    "ttstalk": "🎶",
    "xstalk": "🐦",
    // INFO
    "script": "📜",
    "imdb": "🎬",
    "itunes": "🎵",
    "medicine": "💊",
    "momo": "📱",
    "movie": "🎬",
    "news": "📰",
    "owner": "👑",
    "pokedex": "👾",
    "quran": "📖",
    "shazam": "🎧",
    "string": "🔤",
    "trends": "📈",
    "weather": "⛅",
    "whois": "🔍",
    // QUOTES
    "goodnight": "🌙",
    "quote": "💬",
    "quote2": "🗣️",
    "roseday": "🌹",
    "shayari": "❤️",
    "wyr": "🤔",
    // MUSIC
    "lyrics": "📝",
    "play": "▶️",
    "ringtone": "🔔",
    "scloud": "☁️",
    "song": "🎵",
    "ytsearch": "🔍",
    // UPLOAD
    "aupload": "📤",
    "catbox": "📦",
    "freeimage": "🖼️",
    "litterbox": "🗑️",
    "pixhost": "🖼️",
    "pomf": "📁",
    "quax": "📤",
    "tmpfiles": "📁",
    "uguu": "📤",
    "xoat": "📤",
});

export function getCommandReactionEmoji(commandName) {
    const command = String(commandName || '').toLowerCase();
    return COMMAND_REACTION_MAP[command] || '⏳';
}

async function loadCommandReactState() {
    try {
        if (HAS_DB) {
            const data = await store.getSetting('global', 'userGroupData');
            return data?.commandReactionEnabled !== false;
        }
        if (fs.existsSync(USER_GROUP_DATA)) {
            const data = JSON.parse(fs.readFileSync(USER_GROUP_DATA, 'utf-8').toString());
            return data.commandReactionEnabled !== false;
        }
    }
    catch { }
    return true;
}

let COMMAND_REACT_ENABLED = true;
const COMMAND_REACT_STATE_READY = loadCommandReactState().then(state => {
    COMMAND_REACT_ENABLED = state !== false;
});

async function addCommandReaction(sock, message, commandName = '') {
    await COMMAND_REACT_STATE_READY;
    if (!COMMAND_REACT_ENABLED) return;
    if (!message?.key?.id) return;
    await sock.sendMessage(message.key.remoteJid, {
        react: { text: getCommandReactionEmoji(commandName), key: message.key }
    });
}

async function setCommandReactState(state) {
    const enabled = Boolean(state);
    COMMAND_REACT_ENABLED = enabled;
    try {
        if (HAS_DB) {
            const data = await store.getSetting('global', 'userGroupData') || {};
            data.autoReaction = enabled;
            data.commandReactionEnabled = enabled;
            await store.saveSetting('global', 'userGroupData', data);
        }
        else {
            let data = {};
            if (fs.existsSync(USER_GROUP_DATA)) {
                data = JSON.parse(fs.readFileSync(USER_GROUP_DATA, 'utf-8').toString());
            }
            data.autoReaction = enabled;
            data.commandReactionEnabled = enabled;
            fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
        }
    }
    catch (error) {
        console.error('Error saving command react state:', error);
    }
}

export { addCommandReaction, setCommandReactState, loadCommandReactState };
