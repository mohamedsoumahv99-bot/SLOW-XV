import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@whiskeysockets/baileys', async importOriginal => {
    const actual = await importOriginal();
    return {
        ...actual,
        prepareWAMessageMedia: vi.fn(async () => ({
            imageMessage: { url: 'https://example.invalid/menu-image' }
        }))
    };
});

import { proto, prepareWAMessageMedia } from '@whiskeysockets/baileys';
import repoPlugin from '../../plugins/repo.js';

describe('.repo command delivery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('image bytes'));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('relays the pairing response with its image and public link button', async () => {
        const sock = {
            user: { id: 'bot@s.whatsapp.net' },
            waUploadToServer: vi.fn(),
            relayMessage: vi.fn(async () => ({ key: { id: 'sent-repo-message' } })),
            sendMessage: vi.fn()
        };
        const message = {
            key: {
                remoteJid: '22412345678@s.whatsapp.net',
                participant: '22412345678@s.whatsapp.net'
            }
        };

        await repoPlugin.handler(sock, message, [], { chatId: message.key.remoteJid });

        expect(prepareWAMessageMedia).toHaveBeenCalledTimes(1);
        expect(sock.relayMessage).toHaveBeenCalledTimes(1);
        expect(sock.sendMessage).not.toHaveBeenCalled();

        const generatedMessage = sock.relayMessage.mock.calls[0][1];
        expect(proto.Message.encode(proto.Message.fromObject(generatedMessage)).finish().length)
            .toBeGreaterThan(0);
        const interactive = generatedMessage
            .viewOnceMessage.message.interactiveMessage;
        expect(interactive.header.hasMediaAttachment).toBe(true);
        expect(interactive.body.text).toContain('@22412345678');
        expect(interactive.body.text).toContain('Aucun mot de passe partagé');
        expect(interactive.contextInfo.mentionedJid).toEqual([
            '22412345678@s.whatsapp.net'
        ]);

        const buttons = interactive.nativeFlowMessage.buttons;
        expect(buttons.map(button => button.name)).toEqual(['cta_url']);
        expect(JSON.parse(buttons[0].buttonParamsJson).url)
            .toBe('https://slow-xv-pair.up.railway.app/');
    });

    it('falls back to a visible reply if WhatsApp relay rejects the interactive message', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const sock = {
            waUploadToServer: vi.fn(),
            relayMessage: vi.fn(async () => {
                throw new Error('relay unavailable');
            }),
            sendMessage: vi.fn(async () => ({ key: { id: 'fallback-reply' } }))
        };
        const message = { key: { remoteJid: '22412345678@s.whatsapp.net' } };

        await repoPlugin.handler(sock, message, [], { chatId: message.key.remoteJid });

        expect(sock.relayMessage).toHaveBeenCalledTimes(1);
        expect(sock.sendMessage).toHaveBeenCalledTimes(1);
        const fallback = sock.sendMessage.mock.calls[0][1];
        expect(fallback.image).toBeInstanceOf(Buffer);
        expect(fallback.caption).toContain('Aucun mot de passe partagé');
    });
});
