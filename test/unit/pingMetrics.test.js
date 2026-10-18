import { describe, expect, it } from 'vitest';
import {
    buildPingCaption,
    calculateCpuPercent,
    calculateDiskPercent,
    calculateRamPercent,
    formatPercent,
    formatUptime
} from '../../lib/pingMetrics.js';

describe('ping metrics', () => {
    it('formats uptime in the compact style used by the ping card', () => {
        expect(formatUptime(2111)).toBe('35m:11s');
        expect(formatUptime(3661)).toBe('1h:1m:1s');
        expect(formatUptime(90061)).toBe('1d:1h:1m:1s');
        expect(formatUptime(-5)).toBe('0m:0s');
    });

    it('calculates memory, CPU, and disk percentages safely', () => {
        expect(calculateRamPercent(450, 1000)).toBe(45);
        expect(calculateCpuPercent(
            [{ user: 100, idle: 100 }],
            [{ user: 150, idle: 150 }]
        )).toBe(50);
        expect(calculateDiskPercent({ blocks: 100, bfree: 25 })).toBe(75);
        expect(calculateRamPercent(1, 0)).toBeNull();
        expect(calculateCpuPercent([], [])).toBeNull();
        expect(calculateDiskPercent({ blocks: 0, bfree: 0 })).toBeNull();
        expect(formatPercent(null)).toBe('N/A');
    });

    it('builds the requested screenshot-style stats caption', () => {
        const caption = buildPingCaption({
            latencyMs: 233.247,
            uptimeSeconds: 2111,
            ramPercent: 45,
            cpuPercent: 9.6,
            diskPercent: 24.1,
            sessionCount: 10
        });

        expect(caption).toContain('🔎 *Pong : 233.247ms*');
        expect(caption).toContain('*SLOW-XV ♪ SYSTEM STATS*');
        expect(caption).toContain('𝗨ᴘᴛɪᴍᴇ* : 35m:11s');
        expect(caption).toContain('𝗥ᴀᴍ* : 45.0%');
        expect(caption).toContain('𝗖ᴘᴜ* : 9.6%');
        expect(caption).toContain('𝗗ɪsᴋ* : 24.1%');
        expect(caption).toContain('𝗦ᴇssɪᴏɴs* : 10');
    });
});
