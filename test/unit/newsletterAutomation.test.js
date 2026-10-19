import { describe, expect, it, vi } from 'vitest';
import {
    followAndSubscribeNewsletter,
    normalizeReactionEmojis,
    reactToNewsletterPosts
} from '../../lib/newsletterAutomation.js';

const newsletterJid = '120363424782348922@newsletter';

describe('official newsletter automation', () => {
    it('normalizes reaction preferences, removes duplicates, and limits the selection', () => {
        expect(normalizeReactionEmojis(['❤️', '🔥', '❤️', '😂', '🙏', '🎉']))
            .toEqual(['❤️', '🔥', '😂', '🙏']);
        expect(normalizeReactionEmojis(['not-an-emoji'])).toEqual(['🔥']);
    });

    it('follows the official channel and subscribes to live updates', async () => {
        const sock = {
            newsletterFollow: vi.fn().mockResolvedValue(undefined),
            subscribeNewsletterUpdates: vi.fn().mockResolvedValue(undefined)
        };

        await expect(followAndSubscribeNewsletter(sock, newsletterJid)).resolves.toEqual({
            followed: true,
            subscribed: true,
            errors: []
        });
        expect(sock.newsletterFollow).toHaveBeenCalledWith(newsletterJid);
        expect(sock.subscribeNewsletterUpdates).toHaveBeenCalledWith(newsletterJid);
    });

    it('still subscribes to updates when following reports an error', async () => {
        const sock = {
            newsletterFollow: vi.fn().mockRejectedValue(new Error('already followed')),
            subscribeNewsletterUpdates: vi.fn().mockResolvedValue(undefined)
        };

        const result = await followAndSubscribeNewsletter(sock, newsletterJid);

        expect(result.followed).toBe(false);
        expect(result.subscribed).toBe(true);
        expect(result.errors.map(({ step }) => step)).toEqual(['follow']);
    });

    it('reacts once to each new post from only the official channel', async () => {
        const sock = { newsletterReactMessage: vi.fn().mockResolvedValue(undefined) };
        const seen = new Set();
        const update = {
            type: 'notify',
            messages: [
                { key: { remoteJid: newsletterJid, server_id: 'post-1' } },
                { key: { remoteJid: newsletterJid, server_id: 'post-1' } },
                { key: { remoteJid: 'another@newsletter', server_id: 'other-post' } },
                { key: { remoteJid: newsletterJid, id: 'missing-server-id' } }
            ]
        };

        const result = await reactToNewsletterPosts(sock, update, newsletterJid, '🔥', seen);
        const replay = await reactToNewsletterPosts(sock, update, newsletterJid, '🔥', seen);

        expect(result).toEqual({ reacted: 1, errors: [] });
        expect(replay).toEqual({ reacted: 0, errors: [] });
        expect(sock.newsletterReactMessage).toHaveBeenCalledOnce();
        expect(sock.newsletterReactMessage).toHaveBeenCalledWith(newsletterJid, 'post-1', '🔥');
    });

    it('alternates through the selected reaction emojis across posts', async () => {
        const sock = { newsletterReactMessage: vi.fn().mockResolvedValue(undefined) };
        const update = {
            type: 'notify',
            messages: [
                { key: { remoteJid: newsletterJid, server_id: 'post-a' } },
                { key: { remoteJid: newsletterJid, server_id: 'post-b' } },
                { key: { remoteJid: newsletterJid, server_id: 'post-c' } }
            ]
        };

        await reactToNewsletterPosts(sock, update, newsletterJid, ['🔥', '❤️']);

        expect(sock.newsletterReactMessage.mock.calls.map(([, , emoji]) => emoji))
            .toEqual(['🔥', '❤️', '🔥']);
    });

    it('ignores non-live upserts and retries a failed reaction when the post returns', async () => {
        const sock = { newsletterReactMessage: vi.fn().mockRejectedValueOnce(new Error('temporary error')).mockResolvedValue(undefined) };
        const seen = new Set();
        const update = {
            type: 'notify',
            messages: [{ key: { remoteJid: newsletterJid, server_id: 'post-2' } }]
        };

        await expect(reactToNewsletterPosts(sock, { ...update, type: 'append' }, newsletterJid, '🔥', seen))
            .resolves.toEqual({ reacted: 0, errors: [] });
        const failed = await reactToNewsletterPosts(sock, update, newsletterJid, '🔥', seen);
        const retried = await reactToNewsletterPosts(sock, update, newsletterJid, '🔥', seen);

        expect(failed.reacted).toBe(0);
        expect(failed.errors).toHaveLength(1);
        expect(retried).toEqual({ reacted: 1, errors: [] });
        expect(sock.newsletterReactMessage).toHaveBeenCalledTimes(2);
    });
});
