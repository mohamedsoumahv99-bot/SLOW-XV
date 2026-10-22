import { describe, expect, it, vi } from 'vitest';
import config from '../../config.js';
import { SessionManager } from '../../lib/sessionManager.js';
import { NEWSLETTER_CONSENT_VERSION } from '../../lib/newsletterAutomation.js';

describe('newsletter connection sequence', () => {
    it('follows and subscribes to all three channels before reacting to their posts', async () => {
        const order = [];
        let finishFollow;
        const followPending = new Promise((resolve) => {
            finishFollow = resolve;
        });
        const additionalJids = [
            '120363000000000001@newsletter',
            '120363000000000002@newsletter'
        ];
        const inviteToJid = Object.fromEntries(
            config.newsletterInviteCodes.map((code, index) => [code, additionalJids[index]])
        );
        const socket = {
            newsletterMetadata: vi.fn(async (_type, code) => {
                order.push(`resolve:${code}`);
                return { id: inviteToJid[code] };
            }),
            newsletterFollow: vi.fn((jid) => {
                order.push(`follow:${jid}`);
                return jid === config.newsletterJid ? followPending : Promise.resolve();
            }),
            subscribeNewsletterUpdates: vi.fn(async (jid) => {
                order.push(`subscribe:${jid}`);
            })
        };
        const record = {
            sessionId: 'user_224123456789',
            status: 'connected',
            socket,
            newsletterConsentVersion: NEWSLETTER_CONSENT_VERSION,
            newsletterReady: false,
            newsletterSetupComplete: false,
            newsletterJids: new Set([config.newsletterJid]),
            newsletterReadyJids: new Set(),
            newsletterPendingUpdates: [],
            newsletterQueue: Promise.resolve(),
            newsletterReactionIds: new Set()
        };
        const manager = new SessionManager();
        manager.reactToOfficialNewsletter = vi.fn(async (_record, _socket, update) => {
            order.push(`react:${update.messages[0].key.remoteJid}`);
        });

        const setup = manager.enableOfficialNewsletter(record, socket);
        await vi.waitFor(() => expect(record.newsletterJids.size).toBe(3));
        const channelJids = [config.newsletterJid, ...additionalJids];
        manager.queueNewsletterUpdate(record, socket, {
            type: 'notify',
            messages: channelJids.map((jid, index) => ({
                key: { remoteJid: jid, server_id: `post-${index}` }
            }))
        });

        expect(socket.newsletterFollow).toHaveBeenCalledWith(config.newsletterJid);
        expect(manager.reactToOfficialNewsletter).not.toHaveBeenCalled();

        finishFollow();
        await setup;
        await record.newsletterQueue;

        expect(socket.newsletterFollow).toHaveBeenCalledTimes(3);
        expect(socket.subscribeNewsletterUpdates).toHaveBeenCalledTimes(3);
        expect(manager.reactToOfficialNewsletter.mock.calls.map(([, , update]) => update.messages[0].key.remoteJid))
            .toEqual(channelJids);
        expect(record.newsletterReady).toBe(true);
    });

    it('does not react when the channel follow or live subscription fails', async () => {
        const socket = {
            newsletterFollow: vi.fn().mockRejectedValue(new Error('follow failed')),
            subscribeNewsletterUpdates: vi.fn().mockResolvedValue(undefined)
        };
        const record = {
            sessionId: 'user_224123456789',
            status: 'connected',
            socket,
            newsletterReady: false,
            newsletterSetupComplete: false,
            newsletterJids: new Set([config.newsletterJid]),
            newsletterReadyJids: new Set(),
            newsletterPendingUpdates: [{ type: 'notify', messages: [] }],
            newsletterQueue: Promise.resolve(),
            newsletterReactionIds: new Set()
        };
        const manager = new SessionManager();
        manager.reactToOfficialNewsletter = vi.fn();

        const ready = await manager.enableOfficialNewsletter(record, socket);

        expect(ready).toBe(false);
        expect(record.newsletterReady).toBe(false);
        expect(record.newsletterPendingUpdates).toHaveLength(0);
        expect(manager.reactToOfficialNewsletter).not.toHaveBeenCalled();
    });

    it('keeps legacy consent limited to the existing channel', async () => {
        const socket = {
            newsletterMetadata: vi.fn(),
            newsletterFollow: vi.fn().mockResolvedValue(undefined),
            subscribeNewsletterUpdates: vi.fn().mockResolvedValue(undefined)
        };
        const record = {
            sessionId: 'user_224123456789',
            status: 'connected',
            socket,
            newsletterConsentVersion: NEWSLETTER_CONSENT_VERSION - 1,
            newsletterReady: false,
            newsletterReadyJids: new Set(),
            newsletterJids: new Set([config.newsletterJid]),
            newsletterSetupComplete: false,
            newsletterPendingUpdates: [],
            newsletterQueue: Promise.resolve(),
            newsletterReactionIds: new Set()
        };
        const manager = new SessionManager();

        await expect(manager.enableOfficialNewsletter(record, socket)).resolves.toBe(true);

        expect(socket.newsletterMetadata).not.toHaveBeenCalled();
        expect(socket.newsletterFollow).toHaveBeenCalledTimes(1);
        expect(socket.newsletterFollow).toHaveBeenCalledWith(config.newsletterJid);
    });

    it('enables the additional channel follows when a connected user accepts the updated consent', async () => {
        const manager = new SessionManager();
        const record = {
            sessionId: 'user_12025550123',
            phoneNumber: '12025550123',
            status: 'connected',
            socket: {},
            newsletterConsentVersion: NEWSLETTER_CONSENT_VERSION - 1,
            reactionEmojis: ['🔥'],
            lastError: null
        };
        manager.sessions.set(record.sessionId, record);
        vi.spyOn(manager, 'writeMetadata').mockImplementation(() => {});
        const enableNewsletter = vi.spyOn(manager, 'enableOfficialNewsletter').mockResolvedValue(true);

        const result = await manager.pair(`+${record.phoneNumber}`, {
            reactionEmojis: ['❤️'],
            newsletterConsentVersion: NEWSLETTER_CONSENT_VERSION
        });

        expect(result.reused).toBe(true);
        expect(record.newsletterConsentVersion).toBe(NEWSLETTER_CONSENT_VERSION);
        expect(record.reactionEmojis).toEqual(['❤️']);
        expect(enableNewsletter).toHaveBeenCalledWith(record, record.socket);
    });
});
