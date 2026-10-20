import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendStyledMenu } from '../../lib/sendStyledMenu.js';

describe('SLOW-XV menu delivery', () => {
    afterEach(() => vi.restoreAllMocks());

    it('attaches the beginning of a long menu to the image and preserves the remainder', async () => {
        const image = Buffer.from('menu image');
        const fullMenu = 'Complete menu header\n' + 'command entry\n'.repeat(100);
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        vi.spyOn(fs, 'readFileSync').mockReturnValue(image);
        const sock = { sendMessage: vi.fn().mockResolvedValue(undefined) };
        const message = { key: { remoteJid: 'chat@g.us' } };
        const mentions = ['22412345678@s.whatsapp.net'];

        await sendStyledMenu(sock, {
            chatId: 'chat@g.us', message, text: fullMenu, mentions
        });

        expect(sock.sendMessage).toHaveBeenCalledTimes(2);
        const imageMenu = sock.sendMessage.mock.calls[0][1];
        const continuation = sock.sendMessage.mock.calls[1][1];
        expect(imageMenu.image).toBe(image);
        expect(imageMenu.caption.length).toBeLessThanOrEqual(1024);
        expect(imageMenu.caption).toBe(fullMenu.slice(0, imageMenu.caption.length));
        expect(imageMenu.contextInfo.isForwarded).toBe(true);
        expect(imageMenu.contextInfo.forwardedNewsletterMessageInfo).toEqual(
            expect.objectContaining({ serverMessageId: -1 })
        );
        expect(imageMenu.mentions).toEqual(mentions);
        expect(imageMenu.caption + continuation.text).toBe(fullMenu);
        expect(continuation.mentions).toEqual(mentions);
        expect(continuation.contextInfo.isForwarded).toBe(true);
    });

    it('keeps a short menu and the image together in one message', async () => {
        const image = Buffer.from('menu image');
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        vi.spyOn(fs, 'readFileSync').mockReturnValue(image);
        const sock = { sendMessage: vi.fn().mockResolvedValue(undefined) };

        await sendStyledMenu(sock, {
            chatId: 'chat@g.us',
            message: { key: { remoteJid: 'chat@g.us' } },
            text: 'Complete menu text'
        });

        expect(sock.sendMessage).toHaveBeenCalledTimes(1);
        const imageMenu = sock.sendMessage.mock.calls[0][1];
        expect(imageMenu.image).toBe(image);
        expect(imageMenu.caption).toBe('Complete menu text');
        expect(imageMenu.contextInfo.isForwarded).toBe(true);
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
