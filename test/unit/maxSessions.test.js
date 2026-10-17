import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveMaxSessions } from '../../config.js';
import { SessionManager } from '../../lib/sessionManager.js';

describe('maximum concurrent sessions', () => {
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

    it('rejects a 21st new pairing request', async () => {
        const manager = new SessionManager();
        for (let index = 0; index < 20; index += 1) {
            const sessionId = `user_existing_${index}`;
            manager.sessions.set(sessionId, { sessionId, phoneNumber: `unused-${index}` });
        }

        await expect(manager.pair('+12025550123')).rejects.toThrow('Maximum active sessions reached');
        expect(manager.sessions.size).toBe(20);
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
                    JSON.stringify({ phoneNumber: `saved-${index}` })
                );
            }

            await manager.restore();
            expect(manager.sessions.size).toBe(20);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });
});
