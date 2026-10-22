import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { resolveMaxSessions, resolvePersistentPath } from '../../config.js';
import { SessionManager } from '../../lib/sessionManager.js';

describe('saved WhatsApp sessions', () => {
    it('defaults to 20 when unset or invalid', () => {
        expect(resolveMaxSessions(undefined)).toBe(20);
        expect(resolveMaxSessions('not-a-number')).toBe(20);
    });

    it('caps configured values at 20', () => {
        expect(resolveMaxSessions('25')).toBe(20);
        expect(resolveMaxSessions('20')).toBe(20);
    });

    it('allows a lower positive limit and clamps zero to one', () => {
        expect(resolveMaxSessions('3')).toBe(3);
        expect(resolveMaxSessions('0')).toBe(1);
    });

    it('stores session and bot data under an attached Railway volume by default', () => {
        expect(resolvePersistentPath(undefined, '/data', 'sessions')).toBe('/data/sessions');
        expect(resolvePersistentPath(undefined, '/data/', 'data')).toBe('/data/data');
        expect(resolvePersistentPath('custom/sessions', '/data', 'sessions')).toBe('custom/sessions');
        expect(resolvePersistentPath(undefined, undefined, 'sessions')).toBe('sessions');
    });

    it('rejects a 21st new pairing request', async () => {
        const manager = new SessionManager();
        for (let index = 0; index < 20; index += 1) {
            const sessionId = `user_existing_${index}`;
            manager.sessions.set(sessionId, { sessionId, phoneNumber: `unused-${index}` });
        }

        await expect(manager.pair('+12025550123')).rejects.toThrow('Maximum number of saved sessions reached (20).');
        expect(manager.sessions.size).toBe(20);
    });

    it('returns the active pairing code when the same phone number is submitted again', async () => {
        const manager = new SessionManager();
        const sessionId = 'user_12025550123';
        const record = {
            sessionId,
            phoneNumber: '12025550123',
            status: 'pairing',
            pairingCode: 'ABCD-1234',
            dir: '/tmp/slow-xv-active-pair',
            socket: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        manager.sessions.set(sessionId, record);
        manager.writeMetadata = vi.fn();
        manager.start = vi.fn();

        const result = await manager.pair('+12025550123', { reactionEmojis: ['❤️', '👍'] });

        expect(result.reused).toBe(true);
        expect(result.pairingCode).toBe('ABCD-1234');
        expect(result.reactionEmojis).toEqual(['❤️', '👍']);
        expect(manager.start).not.toHaveBeenCalled();
    });

    it('generates a fresh pairing code after a previous code expires', async () => {
        const manager = new SessionManager();
        const sessionId = 'user_12025550123';
        manager.sessions.set(sessionId, {
            sessionId,
            phoneNumber: '12025550123',
            status: 'pairing_expired',
            pairingCode: null,
            dir: '/tmp/slow-xv-expired-pair',
            socket: null
        });
        manager.writeMetadata = vi.fn();
        manager.start = vi.fn().mockResolvedValue({ pairingCode: 'NEW-CODE' });

        const result = await manager.pair('+12025550123');

        expect(result.pairingCode).toBe('NEW-CODE');
        expect(manager.start).toHaveBeenCalledWith(sessionId, '12025550123', {
            requestPairing: true,
            reactionEmojis: ['🔥'],
            newsletterConsentVersion: 0
        });
    });

    it('clears a logged-out session and creates a new pairing attempt', async () => {
        const manager = new SessionManager();
        const sessionId = 'user_12025550123';
        const record = {
            sessionId,
            phoneNumber: '12025550123',
            status: 'logged_out',
            dir: '/tmp/slow-xv-logged-out',
            socket: null
        };
        manager.sessions.set(sessionId, record);
        manager.writeMetadata = vi.fn();
        manager.clearAuth = vi.fn();
        manager.start = vi.fn().mockResolvedValue({ pairingCode: 'RECONNECT-CODE' });

        const result = await manager.pair('+12025550123');

        expect(manager.clearAuth).toHaveBeenCalledWith(record.dir);
        expect(result.pairingCode).toBe('RECONNECT-CODE');
        expect(manager.start).toHaveBeenCalledWith(sessionId, '12025550123', {
            requestPairing: true,
            reactionEmojis: ['🔥'],
            newsletterConsentVersion: 0
        });
    });

    it('updates reaction emoji preferences for an already connected session', async () => {
        const manager = new SessionManager();
        const record = {
            sessionId: 'user_12025550123',
            phoneNumber: '12025550123',
            status: 'connected',
            dir: '/tmp/slow-xv-connected',
            socket: {}
        };
        manager.sessions.set(record.sessionId, record);
        manager.writeMetadata = vi.fn();

        const result = await manager.pair('+12025550123', { reactionEmojis: ['😂', '🙏'] });

        expect(record.reactionEmojis).toEqual(['😂', '🙏']);
        expect(result.reactionEmojis).toEqual(['😂', '🙏']);
        expect(manager.writeMetadata).toHaveBeenCalledWith(record);
    });

    it('restores no more than 20 saved sessions', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'slow-xv-restore-limit-'));
        const manager = new SessionManager();
        manager.root = root;
        manager.ensureCommands = async () => {};
        manager.start = async (sessionId, phoneNumber) => {
            manager.sessions.set(sessionId, { sessionId, phoneNumber });
        };
        manager.pair = async () => {};

        try {
            for (let index = 0; index < 21; index += 1) {
                const sessionId = `user_saved_${String(index).padStart(2, '0')}`;
                const directory = path.join(root, sessionId);
                fs.mkdirSync(directory);
                fs.writeFileSync(
                    path.join(directory, 'metadata.json'),
                    JSON.stringify({ phoneNumber: `saved-${index}`, status: 'connected' })
                );
            }

            await manager.restore();
            expect(manager.sessions.size).toBe(20);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });

    it('keeps stopped sessions saved without reconnecting them at startup', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'slow-xv-stopped-restore-'));
        const manager = new SessionManager();
        manager.root = root;
        manager.ensureCommands = async () => {};
        manager.start = vi.fn(async (sessionId, phoneNumber) => {
            const record = manager.get(sessionId);
            record.phoneNumber = phoneNumber;
            record.status = 'connected';
            return record;
        });
        manager.pair = async () => {};

        try {
            for (const [sessionId, status] of [['user_stopped', 'stopped'], ['user_active', 'connected']]) {
                const directory = path.join(root, sessionId);
                fs.mkdirSync(directory);
                fs.writeFileSync(
                    path.join(directory, 'metadata.json'),
                    JSON.stringify({ phoneNumber: '+12025550123', status })
                );
            }

            await manager.restore();

            expect(manager.start).toHaveBeenCalledTimes(1);
            expect(manager.start).toHaveBeenCalledWith('user_active', '+12025550123', {
                requestPairing: false,
                restoring: true
            });
            expect(manager.get('user_stopped').status).toBe('stopped');
            expect(manager.sessions.size).toBe(2);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });

    it('schedules a retry when an active saved session cannot initialize at startup', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'slow-xv-retry-restore-'));
        const manager = new SessionManager();
        manager.root = root;
        manager.ensureCommands = async () => {};
        manager.start = vi.fn().mockRejectedValue(new Error('temporary startup failure'));
        manager.scheduleReconnect = vi.fn();
        manager.writeMetadata = vi.fn();
        manager.pair = async () => {};

        try {
            const sessionId = 'user_12025550123';
            const directory = path.join(root, sessionId);
            fs.mkdirSync(directory);
            fs.writeFileSync(
                path.join(directory, 'metadata.json'),
                JSON.stringify({ phoneNumber: '+12025550123', status: 'connected' })
            );

            await manager.restore();

            const record = manager.get(sessionId);
            expect(record.status).toBe('reconnecting');
            expect(record.lastError).toBe('temporary startup failure');
            expect(record.reconnectAttempt).toBe(1);
            expect(manager.scheduleReconnect).toHaveBeenCalledWith(record);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });

    it('preserves active sessions for automatic restore after graceful shutdown', async () => {
        const manager = new SessionManager();
        const writeMetadata = vi.fn();
        const writeToFile = vi.fn().mockResolvedValue(undefined);
        const record = {
            sessionId: 'user_12025550123',
            phoneNumber: '12025550123',
            dir: '/unused',
            status: 'connected',
            socket: {
                ws: { close: vi.fn() },
                end: vi.fn()
            },
            store: { writeToFile },
            saveCredsQueue: Promise.resolve(),
            reconnectTimer: null,
            pairingTimer: null,
            manualStop: false,
            resumeAfterShutdown: false,
            updatedAt: null
        };
        manager.sessions.set(record.sessionId, record);
        manager.writeMetadata = writeMetadata;

        await manager.shutdown();

        expect(record.status).toBe('reconnecting');
        expect(record.manualStop).toBe(true);
        expect(record.socket).toBeNull();
        expect(writeToFile).toHaveBeenCalledOnce();
        expect(writeMetadata).toHaveBeenCalledWith(record);
    });
});
