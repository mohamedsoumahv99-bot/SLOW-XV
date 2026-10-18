import { describe, expect, it } from 'vitest';
import {
    formatGroupDate,
    formatGroupEventMessage,
    getGroupMemberCount,
    normalizeParticipantId
} from '../../lib/groupMessageFormatter.js';

describe('group message formatting', () => {
    it('normalizes participant device suffixes', () => {
        expect(normalizeParticipantId('224123456789:4@s.whatsapp.net'))
            .toBe('224123456789@s.whatsapp.net');
    });

    it('calculates member counts whether metadata is current or stale', () => {
        const participants = [
            { id: '224111@s.whatsapp.net' },
            { id: '224222@s.whatsapp.net' },
            { id: '224333@s.whatsapp.net' }
        ];
        expect(getGroupMemberCount(participants, ['224333@s.whatsapp.net'], 'add')).toBe(3);
        expect(getGroupMemberCount(participants, ['224444@s.whatsapp.net'], 'add')).toBe(4);
        expect(getGroupMemberCount(participants, ['224333@s.whatsapp.net'], 'remove')).toBe(2);
        expect(getGroupMemberCount(participants, ['224444@s.whatsapp.net'], 'remove')).toBe(3);
    });

    it('formats dates in the configured timezone', () => {
        expect(formatGroupDate(new Date('2026-10-18T12:34:56.000Z'), 'Africa/Conakry'))
            .toBe('2026-10-18 12:34:56');
    });

    it('formats SLOW-XV welcome and goodbye messages with mentions and group details', () => {
        const values = {
            participantId: '224123456789@s.whatsapp.net',
            groupName: 'SLOW-XV Fam',
            members: 54,
            date: '2026-10-18 12:34:56'
        };
        const welcome = formatGroupEventMessage({ type: 'welcome', ...values });
        const goodbye = formatGroupEventMessage({ type: 'goodbye', ...values });

        expect(welcome).toContain('*〔 NEW MEMBER 〕*');
        expect(welcome).toContain('*▢ USER :* @224123456789');
        expect(welcome).toContain('*▢ GROUP :* SLOW-XV Fam');
        expect(welcome).toContain('*▢ DATE :* 2026-10-18 12:34:56');
        expect(welcome).toContain('*▢ Members :* 54');
        expect(goodbye).toContain('*〔 LAST MEMBER 〕*');
        expect(goodbye).toContain('*▢  👋GOODBYE 👋*');
        expect(goodbye).toContain('powered by vArnox_Tech');
    });

    it('supports dynamic placeholders in custom group messages', () => {
        expect(formatGroupEventMessage({
            type: 'welcome',
            participantId: '224123456789@s.whatsapp.net',
            groupName: 'SLOW-XV Fam',
            description: 'A helpful group',
            members: 54,
            date: '2026-10-18 12:34:56',
            customMessage: '{user} joined {group} on {date}; {members} members. {description}'
        })).toBe('@224123456789 joined SLOW-XV Fam on 2026-10-18 12:34:56; 54 members. A helpful group');
    });
});
