import {
    getSenderId,
    isValidGroupId,
    updatePurgeCase
} from '../lib/purgeCases.js';

const MAX_EVIDENCE_PER_CASE = 10;

export default {
    command: 'purgeevidence',
    category: 'group',
    description: 'Attach a public HTTPS evidence link to your own moderation report',
    usage: '.purgeevidence <case id> <https link>',
    groupOnly: true,
    cooldown: 5000,
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        if (!isValidGroupId(chatId)) return;
        const senderId = getSenderId(message, context);
        const caseId = Number(args[0]);
        if (!Number.isSafeInteger(caseId) || caseId < 1) {
            return sock.sendMessage(chatId, {
                text: 'Indique un numéro de dossier et un lien HTTPS.\nExemple : .purgeevidence 2 https://example.com/evidence.jpg'
            }, { quoted: message });
        }

        let evidenceUrl;
        try {
            const parsed = new URL(args[1] || '');
            if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
                throw new Error('invalid URL');
            }
            evidenceUrl = parsed.toString().slice(0, 2048);
        } catch {
            return sock.sendMessage(chatId, {
                text: 'Le lien de preuve doit être une URL HTTPS valide.'
            }, { quoted: message });
        }

        const result = await updatePurgeCase(sock, chatId, caseId, (record) => {
            if (record.reporterId !== senderId) return { forbidden: true };
            if (record.status === 'closed') return { closed: true };
            if (record.evidence.length >= MAX_EVIDENCE_PER_CASE) return { limitReached: true };
            record.evidence.push({ url: evidenceUrl, addedAt: new Date().toISOString() });
            return { added: true };
        });
        if (!result) {
            return sock.sendMessage(chatId, { text: `Dossier #${caseId} introuvable.` }, { quoted: message });
        }
        if (result.forbidden) {
            return sock.sendMessage(chatId, {
                text: '⛔ Tu peux uniquement ajouter une preuve à ton propre signalement.'
            }, { quoted: message });
        }
        if (result.closed) {
            return sock.sendMessage(chatId, {
                text: `Le dossier #${caseId} est fermé ; aucune preuve ne peut y être ajoutée.`
            }, { quoted: message });
        }
        if (result.limitReached) {
            return sock.sendMessage(chatId, {
                text: `Ce dossier contient déjà ${MAX_EVIDENCE_PER_CASE} liens de preuve.`
            }, { quoted: message });
        }
        return sock.sendMessage(chatId, {
            text: `✅ Le lien de preuve a été ajouté au dossier #${caseId}.`
        }, { quoted: message });
    }
};
