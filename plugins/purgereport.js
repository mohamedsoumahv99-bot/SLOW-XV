import {
    cleanShortText,
    createPurgeCase,
    getSenderId,
    isValidGroupId
} from '../lib/purgeCases.js';

export default {
    command: 'purgereport',
    category: 'group',
    description: 'Create a moderation report for the current group',
    usage: '.purgereport <description>',
    groupOnly: true,
    cooldown: 10000,
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        if (!isValidGroupId(chatId)) return;
        const description = cleanShortText(args.join(' '), 1000);
        if (!description) {
            return sock.sendMessage(chatId, {
                text: 'Décris le problème à signaler.\nExemple : .purgereport Un message suspect a été envoyé.'
            }, { quoted: message });
        }

        const record = await createPurgeCase(sock, chatId, {
            reporterId: getSenderId(message, context),
            description
        });
        return sock.sendMessage(chatId, {
            text: `✅ Signalement enregistré sous le dossier #${record.id}. Les administrateurs peuvent le consulter avec .purgecase ${record.id}.`
        }, { quoted: message });
    }
};
