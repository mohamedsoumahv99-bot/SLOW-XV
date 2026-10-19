import { describe, expect, it } from 'vitest';
import {
    buildCommandInfo,
    buildStyledMenu,
    formatUptime,
    getMessageLatency,
    getMenuSenderJid,
    getMenuSenderNumber
} from '../../lib/menuFormatter.js';

const tick = String.fromCharCode(96);

describe('SLOW-XV primary menu', () => {
    it('extracts a real sender JID for WhatsApp mentions', () => {
        const message = { key: { participant: '22412345678:4@s.whatsapp.net', remoteJid: '12345@g.us' } };
        expect(getMenuSenderJid(message)).toBe('22412345678:4@s.whatsapp.net');
        expect(getMenuSenderNumber(message)).toBe('22412345678');
        expect(getMenuSenderJid({ key: { remoteJid: '12345@g.us' } })).toBe('');
    });

    it('matches the supplied menu layout and renders every command category', () => {
        const text = buildStyledMenu({
            categories: new Map([['general', ['menu', 'ping']], ['owner', ['settings']]]),
            commandCount: 3,
            owner: 'vArnox',
            prefix: '.',
            mode: 'private',
            user: 'Aminata',
            senderNum: '22412345678',
            uptimeSeconds: 296,
            latencyMs: 185,
            platform: 'linux',
            version: '1.0.0'
        });

        expect(text).toContain('╭─〔 *SLOW-XV* 🤖〕➤');
        expect(text).toContain('vArnox');
        expect(text).toContain('`🏷️ 𝖯𝗋𝖾𝖿𝗂𝗑`    : .');
        expect(text).toContain('PRIVATE');
        expect(text).toContain('`📚 𝖢𝗈𝗆𝗆𝖺𝗇𝖽𝗌`  : 3');
        expect(text).toContain('╭─〔 SYSTEM STATS 〕➤');
        expect(text).toContain('│◯ `⏱️ 𝖴𝗉𝗍𝗂𝗆𝖾`    : 4 minutes, 56 seconds');
        expect(text).toContain('│◯ `🚀 𝖫𝖺𝗍𝖾𝗇𝖼𝗒`  : 185 ms');
        expect(text).toContain('│◯ `💻 𝖯𝗅𝖺𝗍𝖿𝗈𝗋𝗆`  : Linux');
        expect(text).toContain('│◯ `🤖 𝖵𝖾𝗋𝗌𝗂𝗈𝗇`   : 1.0.0');
        expect(text).toContain('╭─❮ *👑OWNER*❯');
        expect(text).toContain('╭─❮ *☑️ GENERAL*❯');
        expect(text).toContain('│ 🝓 *ᴍᴇɴᴜ*');
        expect(text).toContain('│ 🝓 *ꜱᴇᴛᴛɪɴɢꜱ*');
        expect(text).toContain('*ʜᴇʟʟᴏ @22412345678 ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴛʜᴇ ʙᴇsᴛ ʙᴏᴛ, SLOW-XV*');
        expect(text).toContain('> ©' + new Date().getFullYear() + ' sʟᴏᴡ xᴠ🤖 ᴄᴏᴘʏʀɪɢʜᴛ Ⴆყ ᴠᴀʀɴᴏx ƚᴇᴄʜ');
        expect(text).not.toContain('Aminata');
        expect(text.indexOf('👑OWNER')).toBeLessThan(text.indexOf('☑️ GENERAL'));
    });

    it('uses the requested owner label when the generic config fallback is present', () => {
        const text = buildStyledMenu({
            categories: new Map([['general', ['menu']]]),
            commandCount: 1,
            owner: 'SLOW-XV',
            prefix: '.',
            mode: 'private',
            user: 'Aminata'
        });
        expect(text.split('\n')[1]).toContain('vArnox');
    });

    it('formats the uptime in the long form used by the primary menu', () => {
        expect(formatUptime(296)).toBe('4 minutes, 56 seconds');
        expect(formatUptime(1)).toBe('1 second');
        expect(formatUptime(0)).toBe('0 seconds');
        expect(formatUptime(90061)).toBe('1 day, 1 hour, 1 minute, 1 second');
    });

    it('formats WhatsApp message latency', () => {
        expect(getMessageLatency({ messageTimestamp: 1800000000000 }, 1800000000185)).toBe(185);
        expect(getMessageLatency({}, 1800000000185)).toBe(0);
    });

    it('uses the same Fallen X frame for a command detail', () => {
        const text = buildCommandInfo({
            command: 'ping',
            description: 'Check latency',
            usage: '.ping',
            category: 'general',
            aliases: ['latency']
        }, '.');
        expect(text).toContain('𝗖ᴏᴍᴍᴀɴᴅ 𝗜ɴғᴏ');
        expect(text).toContain(tick + '.ping' + tick);
        expect(text).toContain('.latency');
    });
});
