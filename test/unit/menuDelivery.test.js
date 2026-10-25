import { describe, expect, it, vi } from 'vitest';
import config from '../../config.js';
import { sendStyledMenu } from '../../lib/sendStyledMenu.js';

function makeFullMenu() {
    return [
        '╭─〔 *SLOW-XV* 🤖〕➤',
        '│◯ 📚 Commands : 269',
        '╭─❮ *👑 OWNER* ❯',
        '╭─〔 SYSTEM STATS 〕➤',
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

    it('skips a newer news post and forwards the newest matching illustrated menu', async () => {
        const menuPost = makeChannelMenuPost();
        const newsPost = {
            ...menuPost,
            key: { ...menuPost.key, id: 'channel-news-270', server_id: '270' },
            message: { conversation: 'Breaking news from SLOW-XV' }
        };
        const sock = {
            store: { messages: { [config.newsletterJid]: [menuPost, newsPost] } },
            sendMessage: vi.fn().mockResolvedValue({ key: { id: 'forwarded-menu' } })
        };

        await sendStyledMenu(sock, {
            chatId: 'chat@s.whatsapp.net',
            message: { key: { remoteJid: 'chat@s.whatsapp.net' } },
            text: makeFullMenu()
        });

        expect(sock.sendMessage).toHaveBeenCalledOnce();
        expect(sock.sendMessage.mock.calls[0][1].forward).toBe(menuPost);
    });

    it('does not forward a menu post that advertises bulk group actions', async () => {
        const unsafeMenu = makeChannelMenuPost();
        unsafeMenu.message.imageMessage.caption += '\n│ *ᴋɪᴄᴋᴀʟʟ* · *sᴘᴀᴍɢʀᴏᴜᴘ*';
        const sock = {
            store: { messages: { [config.newsletterJid]: [unsafeMenu] } },
            sendMessage: vi.fn().mockResolvedValue({ key: { id: 'warning' } })
        };

        await sendStyledMenu(sock, {
            chatId: 'chat@s.whatsapp.net',
            message: { key: { remoteJid: 'chat@s.whatsapp.net' } },
            text: makeFullMenu()
        });

        expect(sock.sendMessage).toHaveBeenCalledTimes(2);
        const payload = sock.sendMessage.mock.calls[0][1];
        expect(payload.forward).toBeUndefined();
        expect(payload.image.url).toContain('assets/menu-catbox.jpg');
        expect(payload.caption).not.toContain('Aucun post de menu SLOW-XV valide');
        expect(sock.sendMessage.mock.calls[1][1].text).toContain('COMMAND-269');
    });

    it('shows the generated menu with the SLOW-XV image when no channel post is available', async () => {
        const sock = {
            store: { messages: {} },
            sendMessage: vi.fn().mockResolvedValue({ key: { id: 'image-menu' } })
        };
        const message = { key: { remoteJid: 'chat@s.whatsapp.net' } };
        const fullMenu = makeFullMenu();

        await sendStyledMenu(sock, {
            chatId: 'chat@s.whatsapp.net',
            message,
            text: fullMenu,
            mentions: ['22412345678@s.whatsapp.net']
        });

        expect(sock.sendMessage).toHaveBeenCalledTimes(2);
        const [chatId, payload, options] = sock.sendMessage.mock.calls[0];
        expect(chatId).toBe('chat@s.whatsapp.net');
        expect(payload.image.url).toContain('assets/menu-catbox.jpg');
        expect(payload.caption.length).toBeLessThanOrEqual(950);
        expect(payload.caption).toContain('Commands : 269');
        expect(payload.caption).not.toContain('Aucun post de menu SLOW-XV valide');
        expect(options).toEqual({ quoted: message });
    });

    it('sends the remainder of a long fallback menu after the image caption', async () => {
        const sock = {
            store: { messages: {} },
            sendMessage: vi.fn().mockResolvedValue({ key: { id: 'menu-part' } })
        };

        await sendStyledMenu(sock, {
            chatId: 'chat@s.whatsapp.net',
            message: { key: { remoteJid: 'chat@s.whatsapp.net' } },
            text: makeFullMenu()
        });

        expect(sock.sendMessage).toHaveBeenCalledTimes(2);
        expect(sock.sendMessage.mock.calls[0][1].image.url).toContain('assets/menu-catbox.jpg');
        expect(sock.sendMessage.mock.calls[1][1].text).toContain('COMMAND-269');
        expect(sock.sendMessage.mock.calls[1][1].text).not.toContain('Aucun post de menu');
    });

    it('keeps delivery exceptions out of the chat instead of replying with an error', async () => {
        const sock = {
            store: { messages: {} },
            sendMessage: vi.fn().mockRejectedValue(new Error('network unavailable'))
        };
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await expect(sendStyledMenu(sock, {
            chatId: 'chat@s.whatsapp.net',
            message: { key: { remoteJid: 'chat@s.whatsapp.net' } },
            text: 'SLOW-XV menu'
        })).resolves.toBe(false);
        expect(sock.sendMessage).toHaveBeenCalledOnce();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });
});
