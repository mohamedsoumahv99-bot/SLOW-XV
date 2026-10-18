import { handleGoodbye } from '../lib/welcome.js';
import { isGoodByeOn, getGoodbye } from '../lib/index.js';
import { channelInfo } from '../lib/messageConfig.js';
import { formatGroupDate, formatGroupEventMessage, getGroupMemberCount, normalizeParticipantId } from '../lib/groupMessageFormatter.js';
async function handleLeaveEvent(sock, id, participants) {
    const isGoodbyeEnabled = await isGoodByeOn(id);
    if (!isGoodbyeEnabled) return;
    const storedMessage = await getGoodbye(id);
    const customMessage = storedMessage
        && storedMessage !== 'Goodbye {user} 👋'
        && !storedMessage.startsWith('╔═⚔️ GOODBYE')
        ? storedMessage
        : null;
    const groupMetadata = await sock.groupMetadata(id).catch((error) => {
        console.error('Could not fetch group metadata for goodbye:', error.message);
        return { subject: id.split('@')[0], participants: [] };
    });
    const groupName = groupMetadata.subject || id.split('@')[0];
    const groupParticipants = groupMetadata.participants || [];
    const changedParticipants = Array.isArray(participants) ? participants : [participants];
    const memberCount = getGroupMemberCount(groupParticipants, changedParticipants, 'remove');

    for (const participant of changedParticipants) {
        const participantString = normalizeParticipantId(participant);
        if (!participantString) continue;
        try {
            const finalMessage = formatGroupEventMessage({
                type: 'goodbye',
                participantId: participantString,
                groupName,
                members: memberCount,
                date: formatGroupDate(),
                customMessage
            });

            try {
                const profilePicUrl = await sock.profilePictureUrl(participantString, 'image');
                if (profilePicUrl) {
                    await sock.sendMessage(id, {
                        image: { url: profilePicUrl },
                        caption: finalMessage,
                        mentions: [participantString],
                        ...channelInfo
                    });
                    continue;
                }
            }
            catch (photoError) {
                console.log('Goodbye photo unavailable; sending the message as text:', photoError.message);
            }
            await sock.sendMessage(id, {
                text: finalMessage,
                mentions: [participantString],
                ...channelInfo
            });
        }
        catch (error) {
            console.error('Error sending goodbye message:', error);
            const fallbackMessage = formatGroupEventMessage({
                type: 'goodbye',
                participantId: participantString,
                groupName,
                members: memberCount,
                date: formatGroupDate(),
                customMessage
            });
            await sock.sendMessage(id, {
                text: fallbackMessage,
                mentions: [participantString]
            });
        }
    }
}
export default {
    command: 'goodbye',
    aliases: ['bye', 'leave'],
    category: 'admin',
    description: 'Configure goodbye messages for leaving members',
    usage: '.goodbye <on|off|set message>',
    groupOnly: true,
    adminOnly: true,
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const matchText = args.join(' ');
        await handleGoodbye(sock, chatId, message, matchText);
    },
    handleLeaveEvent
};
