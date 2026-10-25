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
    it('forwards the validated image post from the configured newsletter', async () => {
        const message = {
            key: { remoteJid: 'group@g.us', participant: '22412345678@s.whatsapp.net' }
        };
        const sock = {
            store: { messages: { [config.newsletterJid]: [safePost] } },
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

    it('does not substitute an unvalidated post or a local/text-only menu', async () => {
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
        const payload = sock.sendMessage.mock.calls[0][1];
        expect(payload.forward).toBeUndefined();
        expect(payload.image).toBeUndefined();
        expect(payload.text).toContain('Aucun post PURGE MENU sûr avec image');
    });
});
