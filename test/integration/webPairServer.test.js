import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const sharedPassword = 'web-pair-test-password-2026';
let server;
let sessionManager;
let baseUrl;

beforeAll(async () => {
    vi.stubEnv('WEB_PAIR_PASSWORD', sharedPassword);
    ({ server } = await import('../../lib/server.js'));
    ({ sessionManager } = await import('../../lib/sessionManager.js'));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
    sessionManager.sessions.clear();
});

afterAll(async () => {
    sessionManager.sessions.clear();
    await new Promise((resolve) => server.close(resolve));
    vi.unstubAllEnvs();
});

async function signIn() {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: sharedPassword })
    });
    expect(response.status).toBe(200);
    return response.headers.get('set-cookie').split(';')[0];
}

describe('Web Pair permissions and public data', () => {
    it('requires explicit channel consent before pairing', async () => {
        const cookie = await signIn();
        const pair = vi.spyOn(sessionManager, 'pair');
        const response = await fetch(`${baseUrl}/api/pair`, {
            method: 'POST',
            headers: { cookie, 'content-type': 'application/json' },
            body: JSON.stringify({ phoneNumber: '224123456789' })
        });

        expect(response.status).toBe(400);
        expect(pair).not.toHaveBeenCalled();
    });

    it('lists masked session data and exposes no stop, detail, or chat API', async () => {
        const cookie = await signIn();
        sessionManager.sessions.set('user_224123456789', {
            sessionId: 'user_224123456789',
            phoneNumber: '224123456789',
            status: 'connected',
            pairingCode: 'ABCD-1234',
            lastError: null,
            createdAt: '2026-10-18T00:00:00.000Z',
            updatedAt: '2026-10-18T00:00:00.000Z',
            socket: { user: { id: '224123456789:1@s.whatsapp.net' } }
        });

        const listing = await fetch(`${baseUrl}/api/sessions`, { headers: { cookie } });
        const records = await listing.json();

        expect(listing.status).toBe(200);
        expect(records[0].phoneNumber).toBe('224•••••••••');
        expect(records[0].pairingCode).toBeNull();
        expect(JSON.stringify(records)).not.toContain('224123456789');

        const stop = await fetch(`${baseUrl}/api/sessions/session-id/stop`, {
            method: 'POST',
            headers: { cookie }
        });
        const detail = await fetch(`${baseUrl}/api/sessions/session-id`, { headers: { cookie } });
        const chat = await fetch(`${baseUrl}/chat?to=someone&message=test`, { headers: { cookie } });

        expect(stop.status).toBe(404);
        expect(detail.status).toBe(404);
        expect(chat.status).toBe(404);
    });
});
