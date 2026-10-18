import { handleWelcome } from '../lib/welcome.js';
import { isWelcomeOn, getWelcome } from '../lib/index.js';
import { channelInfo } from '../lib/messageConfig.js';
import { formatGroupDate, formatGroupEventMessage, getGroupMemberCount, normalizeParticipantId } from '../lib/groupMessageFormatter.js';
export default {
    command: 'welcome',
    aliases: ['setwelcome'],
    category: 'admin',
    description: 'Configure welcome message for the group',
    usage: '.welcome [on/off/message]',
    groupOnly: true,
    adminOnly: true,
    async handler(sock, message, args, context) {
        const { chatId } = context;
        const matchText = args.join(' ');
        await handleWelcome(sock, chatId, message, matchText);
    }
};
async function handleJoinEvent(sock, id, participants) {
    const isWelcomeEnabled = await isWelcomeOn(id);
    if (!isWelcomeEnabled) return;

    const storedMessage = await getWelcome(id);
    const customMessage = typeof storedMessage === 'string'
        && storedMessage.length > 0
        && storedMessage !== 'Welcome {user} to {group}! 🎉'
        && !storedMessage.startsWith('╔═⚔️ WELCOME')
        ? storedMessage
        : null;
    const groupMetadata = await sock.groupMetadata(id).catch((error) => {
        console.error('Could not fetch group metadata for welcome:', error.message);
        return { subject: id.split('@')[0], participants: [] };
    });
    const groupName = groupMetadata.subject || id.split('@')[0];
    const groupDesc = groupMetadata.desc || '';
    const groupParticipants = groupMetadata.participants || [];
    const changedParticipants = Array.isArray(participants) ? participants : [participants];
    const memberCount = getGroupMemberCount(groupParticipants, changedParticipants, 'add');

    for (const participant of changedParticipants) {
        const participantString = normalizeParticipantId(participant);
        if (!participantString) continue;
        try {
            const finalMessage = formatGroupEventMessage({
                type: 'welcome',
                participantId: participantString,
                groupName,
                description: groupDesc,
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
                console.log('Welcome photo unavailable; sending the message as text:', photoError.message);
            }
            await sock.sendMessage(id, {
                text: finalMessage,
                mentions: [participantString],
                ...channelInfo
            });
        }
        catch (error) {
            console.error('Error sending welcome message:', error);
            const fallbackMessage = formatGroupEventMessage({
                type: 'welcome',
                participantId: participantString,
                groupName,
                description: groupDesc,
                members: memberCount,
                date: formatGroupDate(),
                customMessage
            });
            await sock.sendMessage(id, {
                text: fallbackMessage,
                mentions: [participantString],
                ...channelInfo
            });
        }
    }
}
export { handleJoinEvent };
