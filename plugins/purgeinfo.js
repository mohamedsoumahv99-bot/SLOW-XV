import { readGroupPurgeState, isValidGroupId } from '../lib/purgeCases.js';

export default {
    command: 'purgeinfo',
    category: 'group',
    description: 'Show this group’s moderation information',
    usage: '.purgeinfo',
    groupOnly: true,
    async handler(sock, message, _args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        if (!isValidGroupId(chatId)) return;

        const state = await readGroupPurgeState(sock, chatId);
        const info = state.info || 'Aucun message d’information n’a été configuré pour ce groupe.';
        const updatedAt = state.infoUpdatedAt
            ? `\n\n_Mis à jour le ${new Date(state.infoUpdatedAt).toLocaleString('fr-FR')}_`
            : '';
        return sock.sendMessage(chatId, {
            text: `📢 *Informations de modération du groupe*\n\n${info}${updatedAt}`
        }, { quoted: message });
    }
};
