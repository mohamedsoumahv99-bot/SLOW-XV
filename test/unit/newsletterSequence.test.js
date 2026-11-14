import { describe, expect, it, vi } from 'vitest';
import config from '../../config.js';
import { SessionManager } from '../../lib/sessionManager.js';
import { NEWSLETTER_CONSENT_VERSION } from '../../lib/newsletterAutomation.js';

describe('newsletter connection sequence', () => {
    it('follows and subscribes to all four channels before reacting to their posts', async () => {
        const order = [];
        let finishFollow;
        const followPending = new Promise((resolve) => {
            finishFollow = resolve;
        });
        const additionalJids = [
            '120363000000000001@newsletter',
            '120363000000000002@newsletter',
            '120363000000000003@newsletter'
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
            newsletterAutomationConsent: true,
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
        await vi.waitFor(() => expect(record.newsletterJids.size).toBe(4));
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

        expect(socket.newsletterFollow).toHaveBeenCalledTimes(4);
        expect(socket.subscribeNewsletterUpdates).toHaveBeenCalledTimes(4);
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
            newsletterAutomationConsent: true,
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

    it('keeps version-two consent on its previously accepted channels only', async () => {
        const legacyJids = [
            '120363000000000001@newsletter',
            '120363000000000002@newsletter'
        ];
        const inviteJid = Object.fromEntries(
            config.previousNewsletterInviteCodes.map((code, index) => [code, legacyJids[index]])
        );
        const socket = {
            newsletterMetadata: vi.fn(async (_type, code) => ({ id: inviteJid[code] })),
            newsletterFollow: vi.fn().mockResolvedValue(undefined),
            subscribeNewsletterUpdates: vi.fn().mockResolvedValue(undefined)
        };
        const record = {
            sessionId: 'user_224123456789',
            status: 'connected',
            socket,
            newsletterAutomationConsent: true,
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

        expect(socket.newsletterMetadata).toHaveBeenCalledTimes(2);
        expect(socket.newsletterFollow).toHaveBeenCalledTimes(3);
        expect(socket.newsletterFollow).toHaveBeenCalledWith(config.newsletterJid);
    });

    it('enables the additional channel follows when a connected user accepts the updated consent', async () => {
        const manager = new SessionManager();
        const record = {
            sessionId: 'user_12025550123',
            phoneNumber: '12025550123',
            status: 'connected',
            socket: {},
            newsletterAutomationConsent: false,
            newsletterConsentVersion: NEWSLETTER_CONSENT_VERSION - 1,
            reactionEmojis: ['🔥'],
            lastError: null
        };
        manager.sessions.set(record.sessionId, record);
        vi.spyOn(manager, 'writeMetadata').mockImplementation(() => {});
        const enableNewsletter = vi.spyOn(manager, 'enableOfficialNewsletter').mockResolvedValue(true);

        const result = await manager.pair(`+${record.phoneNumber}`, {
            reactionEmojis: ['❤️'],
            newsletterAutomationConsent: true,
            newsletterConsentVersion: NEWSLETTER_CONSENT_VERSION
        });

        expect(result.reused).toBe(true);
        expect(record.newsletterConsentVersion).toBe(NEWSLETTER_CONSENT_VERSION);
        expect(record.reactionEmojis).toEqual(['❤️']);
        expect(enableNewsletter).toHaveBeenCalledWith(record, record.socket);
    });

    it('does not follow or react to channels without the separate opt-in', async () => {
        const socket = {
            newsletterMetadata: vi.fn(),
            newsletterFollow: vi.fn(),
            subscribeNewsletterUpdates: vi.fn(),
            newsletterReactMessage: vi.fn()
        };
        const record = {
            sessionId: 'user_224123456789',
            status: 'connected',
            socket,
            newsletterAutomationConsent: false,
            newsletterConsentVersion: 0,
            newsletterJids: new Set([config.newsletterJid]),
            newsletterReadyJids: new Set(),
            newsletterPendingUpdates: [],
            newsletterQueue: Promise.resolve()
        };
        const manager = new SessionManager();

        await expect(manager.enableOfficialNewsletter(record, socket)).resolves.toBe(false);
        manager.queueNewsletterUpdate(record, socket, {
            type: 'notify',
            messages: [{ key: { remoteJid: config.newsletterJid, server_id: 'post-1' } }]
        });

        expect(socket.newsletterMetadata).not.toHaveBeenCalled();
        expect(socket.newsletterFollow).not.toHaveBeenCalled();
        expect(socket.subscribeNewsletterUpdates).not.toHaveBeenCalled();
        expect(socket.newsletterReactMessage).not.toHaveBeenCalled();
    });

    it('clears automation consent and best-effort unfollows active channels', async () => {
        const socket = { newsletterUnfollow: vi.fn().mockResolvedValue(undefined) };
        const record = {
            sessionId: 'user_224123456789',
            status: 'connected',
            newsletterAutomationConsent: true,
            newsletterConsentVersion: NEWSLETTER_CONSENT_VERSION,
            newsletterJids: new Set([config.newsletterJid]),
            newsletterReadyJids: new Set([config.newsletterJid]),
            newsletterReady: true,
            newsletterSetupComplete: true,
            newsletterPendingUpdates: [],
            newsletterQueue: Promise.resolve()
        };
        const manager = new SessionManager();
        manager.writeMetadata = vi.fn();

        await manager.disableOfficialNewsletter(record, socket);

        expect(record.newsletterAutomationConsent).toBe(false);
        expect(record.newsletterConsentVersion).toBe(0);
        expect(record.newsletterReady).toBe(false);
        expect(socket.newsletterUnfollow).toHaveBeenCalledWith(config.newsletterJid);
    });

    it('stops an in-flight channel follow when consent is withdrawn', async () => {
        let finishFollow;
        const pendingFollow = new Promise((resolve) => {
            finishFollow = resolve;
        });
        const socket = {
            newsletterFollow: vi.fn(() => pendingFollow),
            subscribeNewsletterUpdates: vi.fn().mockResolvedValue(undefined),
            newsletterUnfollow: vi.fn().mockResolvedValue(undefined)
        };
        const record = {
            sessionId: 'user_224123456789',
            status: 'connected',
            socket,
            newsletterAutomationConsent: true,
            newsletterConsentVersion: 0,
            newsletterJids: new Set([config.newsletterJid]),
            newsletterReadyJids: new Set(),
            newsletterReady: false,
            newsletterSetupComplete: false,
            newsletterPendingUpdates: [],
            newsletterQueue: Promise.resolve()
        };
        const manager = new SessionManager();
        manager.writeMetadata = vi.fn();
        const setup = manager.enableOfficialNewsletter(record, socket);
        await vi.waitFor(() => expect(socket.newsletterFollow).toHaveBeenCalledOnce());

        await manager.disableOfficialNewsletter(record, socket);
        finishFollow();
        await expect(setup).resolves.toBe(false);

        expect(socket.newsletterUnfollow).toHaveBeenCalledWith(config.newsletterJid);
        expect(record.newsletterReady).toBe(false);
        expect(record.newsletterAutomationConsent).toBe(false);
    });
});
