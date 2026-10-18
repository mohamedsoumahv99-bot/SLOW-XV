import { beforeEach, describe, expect, it, vi } from 'vitest';

const stores = vi.hoisted(() => ({
    isWelcomeOn: vi.fn(),
    getWelcome: vi.fn(),
    isGoodByeOn: vi.fn(),
    getGoodbye: vi.fn()
}));

vi.mock('../../lib/index.js', () => ({
    isWelcomeOn: stores.isWelcomeOn,
    getWelcome: stores.getWelcome,
    isGoodByeOn: stores.isGoodByeOn,
    getGoodbye: stores.getGoodbye,
    addWelcome: vi.fn(),
    delWelcome: vi.fn(),
    addGoodbye: vi.fn(),
    delGoodBye: vi.fn()
}));

import { handleJoinEvent } from '../../plugins/welcome.js';
import goodbyePlugin from '../../plugins/goodbye.js';

describe('group join and leave events', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        stores.isWelcomeOn.mockResolvedValue(true);
        stores.getWelcome.mockResolvedValue(null);
        stores.isGoodByeOn.mockResolvedValue(true);
        stores.getGoodbye.mockResolvedValue(null);
    });

    it('sends the welcome card with a member photo and a linked mention', async () => {
        const participant = '224123456789@s.whatsapp.net';
        const sock = {
            groupMetadata: vi.fn().mockResolvedValue({
                subject: 'SLOW-XV Fam',
                participants: [{ id: participant }, { id: '224987654321@s.whatsapp.net' }]
            }),
            profilePictureUrl: vi.fn().mockResolvedValue('https://example.com/member.jpg'),
            sendMessage: vi.fn().mockResolvedValue({})
        };

        await handleJoinEvent(sock, 'group@g.us', [participant]);

        const [, message] = sock.sendMessage.mock.calls[0];
        expect(message.image.url).toBe('https://example.com/member.jpg');
        expect(message.caption).toContain('*〔 NEW MEMBER 〕*');
        expect(message.caption).toContain('*▢ USER :* @224123456789');
        expect(message.caption).toContain('*▢ GROUP :* SLOW-XV Fam');
        expect(message.mentions).toEqual([participant]);
        expect(message.contextInfo.forwardedNewsletterMessageInfo).toBeDefined();
    });

    it('sends the goodbye card as text if the member photo is unavailable', async () => {
        const participant = '224123456789@s.whatsapp.net';
        const sock = {
            groupMetadata: vi.fn().mockResolvedValue({
                subject: 'SLOW-XV Fam',
                participants: [{ id: participant }, { id: '224987654321@s.whatsapp.net' }]
            }),
            profilePictureUrl: vi.fn().mockRejectedValue(new Error('not available')),
            sendMessage: vi.fn().mockResolvedValue({})
        };

        await goodbyePlugin.handleLeaveEvent(sock, 'group@g.us', [participant]);

        const [, message] = sock.sendMessage.mock.calls[0];
        expect(message.text).toContain('*〔 LAST MEMBER 〕*');
        expect(message.text).toContain('*▢ Members :* 1');
        expect(message.mentions).toEqual([participant]);
        expect(message.contextInfo.forwardedNewsletterMessageInfo).toBeDefined();
    });
});
