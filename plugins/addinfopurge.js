import isAdmin from '../lib/isAdmin.js';
import {
    cleanShortText,
    isValidGroupId,
    updateGroupPurgeState,
    getSenderId
} from '../lib/purgeCases.js';

export default {
    command: 'addinfopurge',
    category: 'group',
    description: 'Set this group’s moderation information (group admins only)',
    usage: '.addinfopurge <message>',
    groupOnly: true,
    cooldown: 5000,
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        if (!isValidGroupId(chatId)) return;
        const senderId = getSenderId(message, context);
        const permission = await isAdmin(sock, chatId, senderId);
        if (!permission.isSenderAdmin && !context.senderIsOwnerOrSudo) {
            return sock.sendMessage(chatId, {
                text: '⛔ Seuls les administrateurs du groupe peuvent modifier ces informations.'
            }, { quoted: message });
        }

        const info = cleanShortText(args.join(' '), 1000);
        if (!info) {
            return sock.sendMessage(chatId, {
                text: 'Indique le message à enregistrer.\nExemple : .addinfopurge Merci de signaler les problèmes aux administrateurs.'
            }, { quoted: message });
        }

        await updateGroupPurgeState(sock, chatId, (state) => {
            state.info = info;
            state.infoUpdatedAt = new Date().toISOString();
            state.infoUpdatedBy = senderId;
        });
        return sock.sendMessage(chatId, {
            text: '✅ Les informations de modération de ce groupe ont été enregistrées.'
        }, { quoted: message });
    }
};
