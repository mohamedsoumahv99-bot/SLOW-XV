import { describe, expect, it, vi } from 'vitest';
import { generateWAMessageContent, proto } from '@whiskeysockets/baileys';
import {
    createNewsletterForwardPayload,
    forwardLatestNewsletterPost,
    getLatestNewsletterPost
} from '../../lib/menuNewsletter.js';

const newsletterJid = '120363424782348922@newsletter';
const channelPost = {
    key: {
        remoteJid: newsletterJid,
        id: 'channel-post-42',
        server_id: '42',
        fromMe: false
    },
    message: { conversation: 'Latest official channel post' },
    messageTimestamp: 1761000000
};

describe('full menu newsletter attachment', () => {
    it('selects the newest stored post from the configured channel only', async () => {
        const olderPost = {
            ...channelPost,
            key: { ...channelPost.key, id: 'channel-post-41', server_id: '41' }
        };
        const sock = {
            store: {
                messages: {
                    [newsletterJid]: [olderPost, channelPost],
                    'another@newsletter': [channelPost]
                }
            },
            newsletterFetchMessages: vi.fn()
        };

        await expect(getLatestNewsletterPost(sock, newsletterJid)).resolves.toBe(channelPost);
        expect(sock.newsletterFetchMessages).not.toHaveBeenCalled();
    });

    it('decodes a fetched newsletter post if the session store has none', async () => {
        const encodedPost = proto.Message.encode({
            conversation: 'Fetched official channel post'
        }).finish();
        const sock = {
            store: { messages: {} },
            newsletterFetchMessages: vi.fn().mockResolvedValue({
                tag: 'iq',
                attrs: {},
                content: [{
                    tag: 'message_updates',
                    attrs: {},
                    content: [{
                        tag: 'message',
                        attrs: {
                            server_id: '77',
                            message_id: 'fetched-77',
                            t: '1761000000'
                        },
                        content: [{
                            tag: 'plaintext',
                            attrs: {},
                            content: encodedPost
                        }]
                    }]
                }]
            })
        };

        const result = await getLatestNewsletterPost(sock, newsletterJid);

        expect(sock.newsletterFetchMessages).toHaveBeenCalledWith(newsletterJid, 25, 0, 0);
        expect(result.key).toMatchObject({
            remoteJid: newsletterJid,
            id: 'fetched-77',
            server_id: '77'
        });
        expect(result.message.conversation).toBe('Fetched official channel post');
    });

    it('searches fetched channel history for the newest post that passes the menu validator', async () => {
        const acceptedPost = {
            ...channelPost,
            key: { ...channelPost.key, id: 'channel-menu-41', server_id: '41' },
            message: { imageMessage: { caption: 'SLOW-XV SYSTEM STATS Commands: 200' } }
        };
        const newerNews = {
            ...channelPost,
            key: { ...channelPost.key, id: 'channel-news-42', server_id: '42' }
        };
        const sock = {
            store: { messages: {} },
            newsletterFetchMessages: vi.fn().mockResolvedValue({
                messages: [acceptedPost, newerNews]
            })
        };

        await expect(getLatestNewsletterPost(
            sock,
            newsletterJid,
            post => post.message?.imageMessage?.caption?.includes('SYSTEM STATS')
        )).resolves.toBe(acceptedPost);

        expect(sock.newsletterFetchMessages).toHaveBeenCalledWith(newsletterJid, 25, 0, 0);
    });

    it('creates an actual forwarded channel message with its source metadata', async () => {
        const payload = createNewsletterForwardPayload(channelPost, newsletterJid, 'SLOW-XV');
        const generated = await generateWAMessageContent(payload, {
            jid: 'chat@s.whatsapp.net'
        });
        const forwardedText = generated.extendedTextMessage;

        expect(forwardedText.text).toBe('Latest official channel post');
        expect(forwardedText.contextInfo.forwardingScore).toBe(1);
        expect(forwardedText.contextInfo.isForwarded).toBe(true);
        expect(forwardedText.contextInfo.forwardedNewsletterMessageInfo).toEqual({
            newsletterJid,
            newsletterName: 'SLOW-XV',
            serverMessageId: 42
        });
    });

    it('sends the channel post as a reply to the full menu image', async () => {
        const menuMessage = {
            key: { remoteJid: 'chat@s.whatsapp.net', id: 'menu-image' },
            message: { imageMessage: { caption: 'SLOW-XV menu' } }
        };
        const sock = {
            store: { messages: { [newsletterJid]: [channelPost] } },
            sendMessage: vi.fn().mockResolvedValue(undefined)
        };

        await expect(forwardLatestNewsletterPost(sock, {
            chatId: 'chat@s.whatsapp.net',
            newsletterJid,
            quotedMessage: menuMessage
        })).resolves.toBe(true);

        expect(sock.sendMessage).toHaveBeenCalledOnce();
        const [chatId, payload, options] = sock.sendMessage.mock.calls[0];
        expect(chatId).toBe('chat@s.whatsapp.net');
        expect(payload.forward).toBe(channelPost);
        expect(payload.force).toBe(true);
        expect(payload.contextInfo.forwardedNewsletterMessageInfo.serverMessageId).toBe(42);
        expect(options).toEqual({ quoted: menuMessage });
    });

    it('does not send a fabricated forward when no newsletter post is available', async () => {
        const sock = { store: { messages: {} }, sendMessage: vi.fn() };
        await expect(forwardLatestNewsletterPost(sock, {
            chatId: 'chat@s.whatsapp.net',
            newsletterJid
        })).resolves.toBe(false);
        expect(sock.sendMessage).not.toHaveBeenCalled();
    });
});
