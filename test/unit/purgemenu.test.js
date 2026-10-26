import { describe, expect, it, vi } from 'vitest';
import config from '../../config.js';
import purgeMenuPlugin from '../../plugins/purgemenu.js';

const safePost = {
    key: {
        remoteJid: config.newsletterJid,
        id: 'safe-purge-menu',
        server_id: '42',
        fromMe: false
    },
    message: {
        imageMessage: {
            caption: [
                'SLOW-XV',
                'PURGE MENU',
                'purgereport purgecase purgeevidence',
                'PURGE-INFO',
                'purgeinfo addinfopurge purgesearch'
            ].join('\n')
        }
    }
};

describe('.purgemenu delivery', () => {
    it('forwards the newest validated image post from the configured newsletter', async () => {
        const message = {
            key: { remoteJid: 'group@g.us', participant: '22412345678@s.whatsapp.net' }
        };
        const unrelatedPost = {
            ...safePost,
            key: { ...safePost.key, id: 'latest-news', server_id: '43' },
            message: { imageMessage: { caption: 'SLOW-XV channel update' } }
        };
        const sock = {
            store: { messages: { [config.newsletterJid]: [safePost, unrelatedPost] } },
            sendMessage: vi.fn().mockResolvedValue(undefined)
        };

        await purgeMenuPlugin.handler(sock, message, [], { chatId: 'group@g.us' });

        expect(sock.sendMessage).toHaveBeenCalledOnce();
        const [chatId, payload, options] = sock.sendMessage.mock.calls[0];
        expect(chatId).toBe('group@g.us');
        expect(payload.forward).toBe(safePost);
        expect(payload.contextInfo.forwardedNewsletterMessageInfo.newsletterJid)
            .toBe(config.newsletterJid);
        expect(options).toEqual({ quoted: message });
    });

    it('does not forward unrelated news and falls back to the branded image menu', async () => {
        const unrelatedPost = {
            ...safePost,
            key: { ...safePost.key, id: 'news', server_id: '43' },
            message: { conversation: 'Breaking SLOW-XV news' }
        };
        const message = { key: { remoteJid: 'group@g.us' } };
        const sock = {
            store: { messages: { [config.newsletterJid]: [unrelatedPost] } },
            sendMessage: vi.fn().mockResolvedValue(undefined)
        };

        await purgeMenuPlugin.handler(sock, message, [], { chatId: 'group@g.us' });

        expect(sock.sendMessage).toHaveBeenCalledOnce();
        const [chatId, payload, options] = sock.sendMessage.mock.calls[0];
        expect(chatId).toBe('group@g.us');
        expect(payload.forward).toBeUndefined();
        expect(payload.image.url).toContain('assets/menu-catbox.jpg');
        expect(payload.caption).toContain('╭─〔 *SLOW-XV* 🤖〕➤');
        expect(payload.caption).toContain('PURGE-INFO');
        expect(payload.caption).not.toMatch(/kickall|kickpurge|spamgroup/i);
        expect(payload.mentions).toEqual([]);
        expect(options).toEqual({ quoted: message });
    });

    it('does not send the full menu as plain text if image delivery fails', async () => {
        const message = { key: { remoteJid: 'group@g.us' } };
        const sock = {
            store: { messages: {} },
            sendMessage: vi.fn()
                .mockRejectedValueOnce(new Error('image unavailable'))
                .mockResolvedValueOnce(undefined)
        };

        await purgeMenuPlugin.handler(sock, message, [], { chatId: 'group@g.us' });

        expect(sock.sendMessage).toHaveBeenCalledTimes(2);
        expect(sock.sendMessage.mock.calls[1][1].text).toContain('menu illustré');
        expect(sock.sendMessage.mock.calls[1][1].text).not.toContain('PURGE MENU');
    });
});
