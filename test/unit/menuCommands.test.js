import { describe, expect, it, vi } from 'vitest';
import config from '../../config.js';
import listMenu from '../../plugins/list.js';
import allMenu from '../../plugins/allmenu.js';
import smartMenu from '../../plugins/smartmenu.js';

const channelMenu = {
    key: {
        remoteJid: config.newsletterJid,
        id: 'channel-menu-268',
        server_id: '268',
        fromMe: false
    },
    message: {
        imageMessage: {
            caption: [
                '╭─〔 *SLOW-XV* 🤖〕➤',
                '👑 Owner : vArnox',
                'Commands : 268',
                '╭─〔 SYSTEM STATS 〕➤'
            ].join('\n')
        }
    },
    messageTimestamp: 1761000000
};

const menuCommands = [
    ['.menu', listMenu],
    ['.allmenu', allMenu],
    ['.smenu', smartMenu]
];

describe('main menu commands', () => {
    it.each(menuCommands)('%s sends one identical native channel forward', async (_name, plugin) => {
        const sock = {
            store: { messages: { [config.newsletterJid]: [channelMenu] } },
            sendMessage: vi.fn().mockResolvedValue({ key: { id: 'forwarded-menu' } })
        };
        const message = { key: { remoteJid: 'chat@s.whatsapp.net' } };

        await expect(plugin.handler(sock, message, [], {
            chatId: 'chat@s.whatsapp.net'
        })).resolves.toBe(true);

        expect(sock.sendMessage).toHaveBeenCalledOnce();
        expect(sock.sendMessage.mock.calls[0][1].forward).toBe(channelMenu);
    });

    it.each(menuCommands)('%s does not emit a split fallback when no channel post exists', async (_name, plugin) => {
        const sock = {
            store: { messages: {} },
            sendMessage: vi.fn()
        };
        const message = { key: { remoteJid: 'chat@s.whatsapp.net' } };

        await expect(plugin.handler(sock, message, [], {
            chatId: 'chat@s.whatsapp.net'
        })).resolves.toBe(false);

        expect(sock.sendMessage).not.toHaveBeenCalled();
    });
});
