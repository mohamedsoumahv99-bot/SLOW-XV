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
});
