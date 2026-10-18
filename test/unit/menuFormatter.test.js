import { describe, expect, it } from 'vitest';
import {
    buildStyledMenu,
    formatUptime,
    getMessageLatency
} from '../../lib/menuFormatter.js';

describe('styled menu', () => {
    it('shows the requested SLOW-XV metadata and all actual commands', () => {
        const text = buildStyledMenu({
            categories: new Map([['general', ['menu', 'ping']], ['owner', ['settings']]]),
            commandCount: 3,
            owner: 'vArnox',
            prefix: '.',
            mode: 'private',
            user: 'Aminata',
            uptimeSeconds: 296,
            latencyMs: 185,
            platform: 'Linux',
            version: '1.0.0'
        });

        expect(text).toContain('𝗦ʟᴏᴡ-XV');
        expect(text).toContain('vArnox');
        expect(text).toContain('[ . ]');
        expect(text).toContain('PRIVATE');
        expect(text).toContain('𝗖ᴏᴍᴍᴀɴᴅs');
        expect(text).toContain('➪ 3');
        expect(text).toContain('4m 56s');
        expect(text).toContain('185 ms');
        expect(text).toContain('Linux');
        expect(text).toContain('1.0.0');
        expect(text).toContain('`.menu`');
        expect(text).toContain('`.ping`');
        expect(text).toContain('`.settings`');
    });

    it('formats uptime and message latency from WhatsApp timestamps', () => {
        expect(formatUptime(296)).toBe('4m 56s');
        expect(getMessageLatency({ messageTimestamp: 1_800_000_000_000 }, 1_800_000_000_185)).toBe(185);
        expect(getMessageLatency({}, 1_800_000_185_000)).toBe(0);
    });
});
