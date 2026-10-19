import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendStyledMenu } from '../../lib/sendStyledMenu.js';

describe('SLOW-XV menu delivery', () => {
    afterEach(() => vi.restoreAllMocks());

    it('sends the banner and full menu with channel-forward metadata', async () => {
        const image = Buffer.from('menu image');
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        vi.spyOn(fs, 'readFileSync').mockReturnValue(image);
        const sock = { sendMessage: vi.fn().mockResolvedValue(undefined) };
        const message = { key: { remoteJid: 'chat@g.us' } };

        await sendStyledMenu(sock, {
            chatId: 'chat@g.us',
            message,
            text: 'Complete menu text',
            mentions: ['22412345678@s.whatsapp.net']
        });

        expect(sock.sendMessage).toHaveBeenCalledTimes(2);
        const banner = sock.sendMessage.mock.calls[0][1];
        const menu = sock.sendMessage.mock.calls[1][1];
        expect(banner.image).toBe(image);
        expect(banner.caption).toContain('SLOW-XV');
        expect(banner.contextInfo.isForwarded).toBe(true);
        expect(banner.contextInfo.forwardedNewsletterMessageInfo).toEqual(
            expect.objectContaining({ serverMessageId: -1 })
        );
        expect(menu.text).toBe('Complete menu text');
        expect(menu.mentions).toEqual(['22412345678@s.whatsapp.net']);
        expect(menu.contextInfo.isForwarded).toBe(true);
    });

    it('still sends the complete forwarded menu if the image is missing', async () => {
        vi.spyOn(fs, 'existsSync').mockReturnValue(false);
        const sock = { sendMessage: vi.fn().mockResolvedValue(undefined) };

        await sendStyledMenu(sock, {
            chatId: 'chat@g.us',
            message: { key: { remoteJid: 'chat@g.us' } },
            text: 'Complete menu text'
        });

        expect(sock.sendMessage).toHaveBeenCalledTimes(1);
        expect(sock.sendMessage.mock.calls[0][1].text).toBe('Complete menu text');
        expect(sock.sendMessage.mock.calls[0][1].contextInfo.isForwarded).toBe(true);
    });
});
