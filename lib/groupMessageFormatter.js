import config from '../config.js';

export function normalizeParticipantId(value) {
    const id = typeof value === 'string' ? value : (value?.id || value?.jid || '');
    return String(id).replace(/:\d+(?=@)/, '');
}

export function getGroupMemberCount(groupParticipants, eventParticipants, action) {
    const current = Array.isArray(groupParticipants) ? groupParticipants : [];
    const changed = Array.isArray(eventParticipants) ? eventParticipants : [eventParticipants];
    const currentIds = new Set(current.map(normalizeParticipantId).filter(Boolean));
    const changedIds = new Set(changed.map(normalizeParticipantId).filter(Boolean));
    let count = currentIds.size;

    if (action === 'add') {
        for (const id of changedIds) {
            if (!currentIds.has(id)) count += 1;
        }
    }
    else if (action === 'remove') {
        for (const id of changedIds) {
            if (currentIds.has(id)) count -= 1;
        }
    }

    return Math.max(0, count);
}

export function formatGroupDate(date = new Date(), timeZone = config.timeZone || 'UTC') {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

export function formatGroupEventMessage({
    type,
    participantId,
    groupName,
    description = '',
    members,
    date = formatGroupDate(),
    customMessage
}) {
    const jid = normalizeParticipantId(participantId);
    const senderNum = jid.split('@')[0].split(':')[0] || jid;
    if (customMessage) {
        return customMessage
            .replace(/{user}/g, `@${senderNum}`)
            .replace(/{group}/g, groupName || 'Group')
            .replace(/{description}/g, description)
            .replace(/{date}/g, date)
            .replace(/{members?}/g, String(members));
    }

    if (type === 'goodbye') {
        return `*SLOW-XV*\n   *〔 LAST MEMBER 〕*\n*▢  👋GOODBYE 👋*\n*▢ USER :* @${senderNum}\n*▢ GROUP :* ${groupName || 'Group'}\n*▢ DATE :* ${date}\n*▢ Members :* ${members}\n*╰───────────────────⊷*\n\n> powered by vArnox_Tech`;
    }
    return `*SLOW-XV*\n   *〔 NEW MEMBER 〕*\n*▢  WELCOME* 🎉🎊\n*▢ USER :* @${senderNum}\n*▢ GROUP :* ${groupName || 'Group'}\n*▢ DATE :* ${date}\n*▢ Members :* ${members}\n*╰───────────────────⊷*\n\n> powered by vArnox_Tech`;
}
