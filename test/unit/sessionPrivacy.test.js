import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { maskPhoneNumber, SessionManager } from '../../lib/sessionManager.js';

describe('public session privacy', () => {
    it('shows only the first three phone digits', () => {
        expect(maskPhoneNumber('+224123456789')).toBe('224•••••••••');
        expect(maskPhoneNumber('')).toBe('');
    });

    it('does not expose a full number, internal session id, or WhatsApp user id', () => {
        const manager = new SessionManager();
        const phoneNumber = '224123456789';
        const sessionId = `user_${phoneNumber}`;
        const record = {
            sessionId,
            phoneNumber,
            status: 'connected',
            pairingCode: 'ABCD-1234',
            qr: 'private-qr-data',
            user: { id: `${phoneNumber}:1@s.whatsapp.net`, name: 'SLOW-XV' },
            socket: { user: { id: `${phoneNumber}:1@s.whatsapp.net`, name: 'SLOW-XV' } },
            lastError: `connection failed for +${phoneNumber}@s.whatsapp.net`,
            createdAt: '2026-10-18T00:00:00.000Z',
            updatedAt: '2026-10-18T00:00:00.000Z'
        };

        const publicRecord = manager.publicRecord(record);
        const serialized = JSON.stringify(publicRecord);

        expect(publicRecord.phoneNumber).toBe('224•••••••••');
        expect(publicRecord.sessionId).not.toContain(phoneNumber);
        expect(publicRecord.pairingCode).toBeNull();
        expect(manager.publicRecord(record, { includePairingCode: true }).pairingCode).toBe('ABCD-1234');
        expect(publicRecord).not.toHaveProperty('user');
        expect(publicRecord).not.toHaveProperty('qr');
        expect(serialized).not.toContain(phoneNumber);
        expect(serialized).not.toContain(sessionId);
    });

    it('uses the same sanitized record for the session list', () => {
        const manager = new SessionManager();
        manager.sessions.set('user_224123456789', {
            sessionId: 'user_224123456789',
            phoneNumber: '224123456789',
            status: 'connected',
            createdAt: '2026-10-18T00:00:00.000Z',
            updatedAt: '2026-10-18T00:00:00.000Z'
        });

        expect(manager.list()[0].phoneNumber).toBe('224•••••••••');
        expect(JSON.stringify(manager.list())).not.toContain('224123456789');
    });

    it('reveals full session details only through the admin-only record builder', () => {
        const manager = new SessionManager();
        manager.sessions.set('user_224123456789', {
            sessionId: 'user_224123456789',
            phoneNumber: '224123456789',
            status: 'connected',
            pairingCode: 'ABCD-1234',
            qr: 'private-qr-data',
            newsletterAutomationConsent: true,
            reactionEmojis: ['🔥'],
            createdAt: '2026-10-18T00:00:00.000Z',
            updatedAt: '2026-10-18T00:00:00.000Z'
        });

        const publicJson = JSON.stringify(manager.list());
        const adminRecord = manager.adminList()[0];

        expect(publicJson).not.toContain('224123456789');
        expect(adminRecord.phoneNumber).toBe('224123456789');
        expect(adminRecord.newsletterAutomationConsent).toBe(true);
        expect(adminRecord).not.toHaveProperty('pairingCode');
        expect(adminRecord).not.toHaveProperty('qr');
    });

    it('removes local credentials and the session record by opaque admin id', async () => {
        const manager = new SessionManager();
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slow-xv-admin-remove-'));
        fs.writeFileSync(path.join(dir, 'creds.json'), '{}');
        const record = {
            sessionId: 'user_224123456789',
            phoneNumber: '224123456789',
            dir,
            status: 'connected',
            socket: { ws: { close() {} }, end() {} },
            reconnectTimer: null,
            pairingTimer: null,
            saveCredsQueue: Promise.resolve(),
            queue: Promise.resolve(),
            newsletterQueue: Promise.resolve()
        };
        manager.sessions.set(record.sessionId, record);

        try {
            const id = manager.adminList()[0].sessionId;
            await expect(manager.removeSession(id)).resolves.toBe(true);
            expect(manager.sessions.size).toBe(0);
            expect(fs.existsSync(dir)).toBe(false);
            await expect(manager.removeSession(id)).resolves.toBe(false);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});
