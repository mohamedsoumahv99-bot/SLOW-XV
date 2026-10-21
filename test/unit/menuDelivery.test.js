import { describe, expect, it, vi } from 'vitest';
import config from '../../config.js';
import { sendStyledMenu } from '../../lib/sendStyledMenu.js';

function makeFullMenu() {
    return [
        '╭─〔 *SLOW-XV* 🤖〕➤',
        '│◯ 📚 Commands : 269',
        '╭─❮ *👑 OWNER* ❯',
        ...Array.from({ length: 269 }, (_, index) => '│ 🝓 *COMMAND-' + (index + 1) + '*')
    ].join('\n');
}

function makeChannelMenuPost() {
    return {
        key: {
            remoteJid: config.newsletterJid,
            id: 'channel-menu-269',
            server_id: '269',
            fromMe: false
        },
        message: {
            imageMessage: { caption: makeFullMenu() }
        },
        messageTimestamp: 1761000000
    };
}

describe('SLOW-XV menu delivery', () => {
    it('forwards the original channel menu as one image-and-text message with its native channel button', async () => {
        const channelMenu = makeChannelMenuPost();
        const sock = {
            store: { messages: { [config.newsletterJid]: [channelMenu] } },
            sendMessage: vi.fn().mockResolvedValue({ key: { id: 'forwarded-menu' } })
        };
        const message = { key: { remoteJid: 'chat@s.whatsapp.net' } };

        await expect(sendStyledMenu(sock, {
            chatId: 'chat@s.whatsapp.net',
            message,
            text: makeFullMenu()
        })).resolves.toBe(true);

        expect(sock.sendMessage).toHaveBeenCalledOnce();
        const [chatId, payload, options] = sock.sendMessage.mock.calls[0];
        expect(chatId).toBe('chat@s.whatsapp.net');
        expect(payload.forward).toBe(channelMenu);
        expect(payload.force).toBe(true);
        expect(payload.contextInfo.forwardedNewsletterMessageInfo).toEqual({
            newsletterJid: config.newsletterJid,
            newsletterName: config.botName,
            serverMessageId: 269
        });
        expect(payload.image).toBeUndefined();
        expect(payload.text).toBeUndefined();
        expect(payload.caption).toBeUndefined();
        expect(options).toEqual({});
    });

    it('falls back to the complete readable 269-command menu when no channel post is available', async () => {
        const sock = {
            store: { messages: {} },
            sendMessage: vi.fn().mockResolvedValue({ key: { id: 'text-menu' } })
        };
        const message = { key: { remoteJid: 'chat@s.whatsapp.net' } };
        const fullMenu = makeFullMenu();

        await sendStyledMenu(sock, {
            chatId: 'chat@s.whatsapp.net',
            message,
            text: fullMenu,
            mentions: ['22412345678@s.whatsapp.net']
        });

        expect(sock.sendMessage).toHaveBeenCalledOnce();
        const [chatId, payload, options] = sock.sendMessage.mock.calls[0];
        expect(chatId).toBe('chat@s.whatsapp.net');
        expect(payload.text).toContain('Commands : 269');
        expect(payload.text).toContain('COMMAND-269');
        expect(payload.text).toContain(config.channelLink);
        expect(payload.image).toBeUndefined();
        expect(payload.mentions).toEqual(['22412345678@s.whatsapp.net']);
        expect(options).toEqual({ quoted: message });
    });
});
