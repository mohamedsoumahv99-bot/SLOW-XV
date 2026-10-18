import { describe, expect, it, vi } from 'vitest';
import { SessionManager } from '../../lib/sessionManager.js';

describe('newsletter connection sequence', () => {
    it('waits for bot connection, channel follow, and update subscription before reacting', async () => {
        const order = [];
        let finishFollow;
        const followPending = new Promise((resolve) => {
            finishFollow = resolve;
        });
        const socket = {
            newsletterFollow: vi.fn(() => {
                order.push('follow');
                return followPending;
            }),
            subscribeNewsletterUpdates: vi.fn(async () => {
                order.push('subscribe');
            })
        };
        const record = {
            sessionId: 'user_224123456789',
            status: 'connected',
            socket,
            newsletterReady: false,
            newsletterPendingUpdates: [],
            newsletterQueue: Promise.resolve(),
            newsletterReactionIds: new Set()
        };
        const manager = new SessionManager();
        manager.reactToOfficialNewsletter = vi.fn(async () => {
            order.push('react');
        });

        const setup = manager.enableOfficialNewsletter(record, socket);
        manager.queueNewsletterUpdate(record, socket, { type: 'notify', messages: [] });

        expect(order).toEqual(['follow']);
        expect(manager.reactToOfficialNewsletter).not.toHaveBeenCalled();

        finishFollow();
        await setup;
        await record.newsletterQueue;

        expect(order).toEqual(['follow', 'subscribe', 'react']);
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
});
