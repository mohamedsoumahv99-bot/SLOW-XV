import isAdmin from '../lib/isAdmin.js';
import {
    getSenderId,
    isValidGroupId,
    readGroupPurgeState,
    updatePurgeCase
} from '../lib/purgeCases.js';

function formatCase(record) {
    const evidence = record.evidence?.length
        ? record.evidence.map((item, index) => `${index + 1}. ${item.url}`).join('\n')
        : 'Aucune';
    return [
        `📁 *Dossier #${record.id}* — ${record.status === 'closed' ? 'fermé' : 'ouvert'}`,
        `Signalé par : @${String(record.reporterId).split('@')[0]}`,
        `Date : ${new Date(record.createdAt).toLocaleString('fr-FR')}`,
        `Description : ${record.description}`,
        `Preuves :\n${evidence}`
    ].join('\n');
}

export default {
    command: 'purgecase',
    category: 'group',
    description: 'List, inspect, or close moderation reports (group admins only)',
    usage: '.purgecase [id|close id]',
    groupOnly: true,
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        if (!isValidGroupId(chatId)) return;
        const senderId = getSenderId(message, context);
        const permission = await isAdmin(sock, chatId, senderId);
        if (!permission.isSenderAdmin && !context.senderIsOwnerOrSudo) {
            return sock.sendMessage(chatId, {
                text: '⛔ Seuls les administrateurs du groupe peuvent consulter ou fermer les dossiers.'
            }, { quoted: message });
        }

        if (args[0]?.toLowerCase() === 'close') {
            const caseId = Number(args[1]);
            if (!Number.isSafeInteger(caseId) || caseId < 1) {
                return sock.sendMessage(chatId, {
                    text: 'Indique un numéro de dossier valide. Exemple : .purgecase close 2'
                }, { quoted: message });
            }
            const updated = await updatePurgeCase(sock, chatId, caseId, (record) => {
                if (record.status === 'closed') return { alreadyClosed: true };
                record.status = 'closed';
                record.closedAt = new Date().toISOString();
                record.closedBy = senderId;
                return { closed: true };
            });
            if (!updated) {
                return sock.sendMessage(chatId, { text: `Dossier #${caseId} introuvable.` }, { quoted: message });
            }
            return sock.sendMessage(chatId, {
                text: updated.alreadyClosed
                    ? `Le dossier #${caseId} est déjà fermé.`
                    : `✅ Le dossier #${caseId} a été fermé.`
            }, { quoted: message });
        }

        const state = await readGroupPurgeState(sock, chatId);
        if (!state.cases.length) {
            return sock.sendMessage(chatId, {
                text: 'Aucun signalement n’a été enregistré dans ce groupe.'
            }, { quoted: message });
        }

        if (args[0]) {
            const caseId = Number(args[0]);
            if (!Number.isSafeInteger(caseId) || caseId < 1) {
                return sock.sendMessage(chatId, {
                    text: 'Indique un numéro de dossier valide.'
                }, { quoted: message });
            }
            const record = state.cases.find((entry) => entry.id === caseId);
            if (!record) {
                return sock.sendMessage(chatId, { text: `Dossier #${caseId} introuvable.` }, { quoted: message });
            }
            return sock.sendMessage(chatId, {
                text: formatCase(record),
                mentions: [record.reporterId]
            }, { quoted: message });
        }

        const latest = [...state.cases].reverse().slice(0, 10);
        const lines = latest.map((record) =>
            `#${record.id} · ${record.status === 'closed' ? 'fermé' : 'ouvert'} · ${record.description.slice(0, 100)}`
        );
        return sock.sendMessage(chatId, {
            text: `📁 *Dossiers de modération récents*\n\n${lines.join('\n')}\n\nConsulter : .purgecase <id>\nFermer : .purgecase close <id>`
        }, { quoted: message });
    }
};
