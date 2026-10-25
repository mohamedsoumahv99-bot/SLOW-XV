import { describe, expect, it, vi } from 'vitest';
import config from '../../config.js';
import { sendStyledMenu } from '../../lib/sendStyledMenu.js';

function makeChannelMenuPost() {
    return {
        key: {
            remoteJid: config.newsletterJid,
            id: 'channel-menu-269',
            server_id: '269',
            fromMe: false
        },
        message: {
            imageMessage: {
                caption: [
                    '╭─〔 *SLOW-XV* 🤖〕➤',
                    '👑 Owner : vArnox',
                    'Commands : 269',
                    '╭─〔 SYSTEM STATS 〕➤',
                    ...Array.from({ length: 269 }, (_, index) => '│ 🝓 *COMMAND-' + (index + 1) + '*')
                ].join('\n')
            }
        },
        messageTimestamp: 1761000000
    };
}

describe('SLOW-XV menu delivery', () => {
    it('sends exactly one native image-and-caption channel forward', async () => {
        const channelMenu = makeChannelMenuPost();
        const sock = {
            store: { messages: { [config.newsletterJid]: [channelMenu] } },
            sendMessage: vi.fn().mockResolvedValue({ key: { id: 'forwarded-menu' } })
        };

        await expect(sendStyledMenu(sock, {
            chatId: 'chat@s.whatsapp.net'
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

    it('skips newer unrelated channel posts and forwards the newest matching illustrated menu once', async () => {
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

        await sendStyledMenu(sock, { chatId: 'chat@s.whatsapp.net' });

        expect(sock.sendMessage).toHaveBeenCalledOnce();
        expect(sock.sendMessage.mock.calls[0][1].forward).toBe(menuPost);
    });

    it('does not send local or duplicate fallbacks when the source post is unsafe', async () => {
        const unsafeMenu = makeChannelMenuPost();
        unsafeMenu.message.imageMessage.caption += '\n│ *ᴋɪᴄᴋᴀʟʟ* · *sᴘᴀᴍɢʀᴏᴜᴘ*';
        const sock = {
            store: { messages: { [config.newsletterJid]: [unsafeMenu] } },
            sendMessage: vi.fn()
        };

        await expect(sendStyledMenu(sock, {
            chatId: 'chat@s.whatsapp.net'
        })).resolves.toBe(false);
        expect(sock.sendMessage).not.toHaveBeenCalled();
    });

    it('stays silent instead of sending an error or fallback when no channel menu exists', async () => {
        const sock = {
            store: { messages: {} },
            sendMessage: vi.fn()
        };

        await expect(sendStyledMenu(sock, {
            chatId: 'chat@s.whatsapp.net'
        })).resolves.toBe(false);
        expect(sock.sendMessage).not.toHaveBeenCalled();
    });

    it('does not turn a failed forward into a second error message', async () => {
        const channelMenu = makeChannelMenuPost();
        const sock = {
            store: { messages: { [config.newsletterJid]: [channelMenu] } },
            sendMessage: vi.fn().mockRejectedValue(new Error('network unavailable'))
        };
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await expect(sendStyledMenu(sock, {
            chatId: 'chat@s.whatsapp.net'
        })).resolves.toBe(false);
        expect(sock.sendMessage).toHaveBeenCalledOnce();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });
});
