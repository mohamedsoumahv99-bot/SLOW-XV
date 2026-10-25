import isAdmin from '../lib/isAdmin.js';
import { getSenderId, isValidGroupId, readGroupPurgeState } from '../lib/purgeCases.js';

export default {
    command: 'purgesearch',
    category: 'group',
    description: 'Search moderation cases in this group (group admins only)',
    usage: '.purgesearch <term>',
    groupOnly: true,
    cooldown: 5000,
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        if (!isValidGroupId(chatId)) return;
        const senderId = getSenderId(message, context);
        const permission = await isAdmin(sock, chatId, senderId);
        if (!permission.isSenderAdmin && !context.senderIsOwnerOrSudo) {
            return sock.sendMessage(chatId, {
                text: '⛔ Seuls les administrateurs du groupe peuvent rechercher dans les dossiers.'
            }, { quoted: message });
        }

        const term = args.join(' ').trim().slice(0, 80).toLocaleLowerCase();
        if (!term) {
            return sock.sendMessage(chatId, {
                text: 'Indique un mot à rechercher. Exemple : .purgesearch lien'
            }, { quoted: message });
        }

        const state = await readGroupPurgeState(sock, chatId);
        const results = state.cases.filter((record) =>
            `${record.id} ${record.description} ${record.status} ${(record.evidence || []).map((item) => item.url).join(' ')}`
                .toLocaleLowerCase()
                .includes(term)
        ).slice(-10).reverse();

        if (!results.length) {
            return sock.sendMessage(chatId, { text: 'Aucun dossier correspondant.' }, { quoted: message });
        }
        return sock.sendMessage(chatId, {
            text: `🔎 *Résultats (${results.length})*\n\n${results.map((record) =>
                `#${record.id} · ${record.status} · ${record.description.slice(0, 100)}`
            ).join('\n')}\n\nConsulter : .purgecase <id>`,
        }, { quoted: message });
    }
};
