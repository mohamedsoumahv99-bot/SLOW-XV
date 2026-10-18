import { describe, expect, it } from 'vitest';
import {
    buildCommandInfo,
    buildStyledMenu,
    formatUptime,
    getMessageLatency
} from '../../lib/menuFormatter.js';

const tick = String.fromCharCode(96);

describe('Fallen X-inspired SLOW-XV menu', () => {
    it('renders live metadata, system stats and the full command groups consistently', () => {
        const text = buildStyledMenu({
            categories: new Map([['general', ['menu', 'ping']], ['owner', ['settings']]]),
            commandCount: 3,
            owner: 'vArnox',
            prefix: '.',
            mode: 'private',
            user: 'Aminata',
            uptimeSeconds: 296,
            latencyMs: 185,
            platform: 'linux',
            version: '1.0.0'
        });

        expect(text).toContain('𝗦ʟᴏᴡ-XV');
        expect(text).toContain('vArnox');
        expect(text).toContain('[ . ]');
        expect(text).toContain('PRIVATE');
        expect(text).toContain('➪ 3');
        expect(text).toContain('4m 56s');
        expect(text).toContain('185 ms');
        expect(text).toContain('Linux');
        expect(text).toContain('1.0.0');
        expect(text).toContain(tick + '.menu' + tick);
        expect(text).toContain(tick + '.settings' + tick);
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

    it('formats uptime and WhatsApp message latency', () => {
        expect(formatUptime(296)).toBe('4m 56s');
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
