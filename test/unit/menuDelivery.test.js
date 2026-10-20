import { describe, expect, it, vi } from 'vitest';
import { sendStyledMenu } from '../../lib/sendStyledMenu.js';
import { createMenuImageSvg, renderMenuImage } from '../../lib/menuImage.js';

describe('SLOW-XV menu delivery', () => {
    it('keeps the first and last entries in the rendered image, including XML characters', () => {
        const fullMenu = [
            'SLOW-XV FULL MENU',
            ...Array.from({ length: 280 }, (_, index) => `command-${index + 1}`),
            'last <command> & final'
        ].join('\n');
        const svg = createMenuImageSvg(fullMenu);

        expect(svg).toContain('SLOW-XV FULL MENU');
        expect(svg).toContain('command-1');
        expect(svg).toContain('command-280');
        expect(svg).toContain('last &lt;command&gt; &amp; final');
        expect(svg.match(/<text /g)).toHaveLength(282);
    });

    it('sends a long menu with its full content in one image message', async () => {
        const fullMenu = `Complete menu header\n${'command entry\n'.repeat(120)}`;
        const image = await renderMenuImage(fullMenu);
        expect(Buffer.isBuffer(image)).toBe(true);
        expect(image.length).toBeGreaterThan(0);
        const sock = { sendMessage: async () => ({ key: { id: 'menu-message' } }) };
        const sendMessage = vi.spyOn(sock, 'sendMessage');
        const message = { key: { remoteJid: 'chat@g.us' } };
        const mentions = ['22412345678@s.whatsapp.net'];

        await sendStyledMenu(sock, {
            chatId: 'chat@g.us',
            message,
            text: fullMenu,
            mentions
        });

        expect(sendMessage).toHaveBeenCalledTimes(1);
        const sent = sendMessage.mock.calls[0][1];
        expect(Buffer.isBuffer(sent.image)).toBe(true);
        expect(sent.image.length).toBeGreaterThan(0);
        expect(sent.caption).toContain('@22412345678');
        expect(sent.caption).toContain('Menu complet');
        expect(sent.caption.length).toBeLessThanOrEqual(1024);
        expect(sent.mentions).toEqual(mentions);
        expect(sendMessage.mock.calls[0][2]).toEqual({ quoted: message });
    });

    it('sends a short menu as the same single image-card format', async () => {
        const sock = { sendMessage: async () => ({ key: { id: 'menu-message' } }) };
        const sendMessage = vi.spyOn(sock, 'sendMessage');

        await sendStyledMenu(sock, {
            chatId: 'chat@s.whatsapp.net',
            message: { key: { remoteJid: 'chat@s.whatsapp.net' } },
            text: 'Complete menu text'
        });

        expect(sendMessage).toHaveBeenCalledTimes(1);
        expect(sendMessage.mock.calls[0][1].image).toBeInstanceOf(Buffer);
        expect(sendMessage.mock.calls[0][1].caption).toContain('Menu complet');
    });
});
