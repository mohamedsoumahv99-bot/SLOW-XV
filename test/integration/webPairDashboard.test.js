import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const manager = vi.hoisted(() => ({
    list: vi.fn(),
    pair: vi.fn(),
    stop: vi.fn(),
    get: vi.fn()
}));

vi.mock('../../lib/sessionManager.js', () => ({
    sessionManager: manager
}));

const TEST_PASSWORD = 'test-web-pair-shared-password';
const FULL_NUMBER = '224555123456';
let appServer;
let baseUrl;
let authCookie;
let originalPassword;

async function login() {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: TEST_PASSWORD })
    });
    expect(response.status).toBe(200);
    return response.headers.get('set-cookie').split(';')[0];
}

describe('Web Pair dashboard session privacy', () => {
    beforeAll(async () => {
        originalPassword = process.env.WEB_PAIR_PASSWORD;
        process.env.WEB_PAIR_PASSWORD = TEST_PASSWORD;
        const { app } = await import('../../lib/server.js');
        appServer = app.listen(0);
        await new Promise((resolve) => appServer.once('listening', resolve));
        baseUrl = `http://127.0.0.1:${appServer.address().port}`;
    });

    afterAll(async () => {
        if (appServer) {
            await new Promise((resolve, reject) => {
                appServer.close((error) => error ? reject(error) : resolve());
            });
        }
        if (originalPassword === undefined) delete process.env.WEB_PAIR_PASSWORD;
        else process.env.WEB_PAIR_PASSWORD = originalPassword;
    });

    beforeEach(async () => {
        manager.list.mockReset().mockReturnValue([{
            sessionId: `user_${FULL_NUMBER}`,
            phoneNumber: FULL_NUMBER,
            status: 'connected',
            connected: true,
            user: { name: 'Private account name' },
            lastError: `error containing ${FULL_NUMBER}`,
            pairingCode: 'PRIVATE-PAIR-CODE',
            qr: 'PRIVATE-QR'
        }]);
        manager.pair.mockReset().mockResolvedValue({
            sessionId: `user_${FULL_NUMBER}`,
            phoneNumber: FULL_NUMBER,
            status: 'pairing',
            connected: false,
            pairingCode: 'NEW-PAIR-CODE',
            qr: 'PRIVATE-QR'
        });
        manager.stop.mockReset();
        manager.get.mockReset();
        authCookie = await login();
    });

    it('requires the shared environment password for dashboard APIs', async () => {
        const response = await fetch(`${baseUrl}/api/sessions`, {
            headers: { cookie: 'slow_xv_pair_session=invalid' }
        });

        expect(response.status).toBe(401);
        expect(manager.list).not.toHaveBeenCalled();
    });

    it('returns masked numbers without session identifiers or sensitive session fields', async () => {
        const response = await fetch(`${baseUrl}/api/sessions`, {
            headers: { cookie: authCookie }
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual([{
            phoneNumber: '224••••••',
            status: 'connected',
            connected: true
        }]);
        expect(JSON.stringify(body)).not.toContain(FULL_NUMBER);
        expect(JSON.stringify(body)).not.toContain('PRIVATE-PAIR-CODE');
        expect(JSON.stringify(body)).not.toContain('PRIVATE-QR');
        expect(JSON.stringify(body)).not.toContain('Private account name');
    });

    it('returns only a masked number and the new pairing code when pairing', async () => {
        const response = await fetch(`${baseUrl}/api/pair`, {
            method: 'POST',
            headers: {
                cookie: authCookie,
                'content-type': 'application/json'
            },
            body: JSON.stringify({ phoneNumber: FULL_NUMBER })
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({
            phoneNumber: '224••••••',
            status: 'pairing',
            connected: false,
            pairingCode: 'NEW-PAIR-CODE'
        });
        expect(JSON.stringify(body)).not.toContain(FULL_NUMBER);
        expect(JSON.stringify(body)).not.toContain('PRIVATE-QR');
    });

    it('does not expose session detail, stop, or send-message controls', async () => {
        const headers = { cookie: authCookie };
        const details = await fetch(`${baseUrl}/api/sessions/user_${FULL_NUMBER}`, { headers });
        const stop = await fetch(`${baseUrl}/api/sessions/user_${FULL_NUMBER}/stop`, {
            method: 'POST',
            headers
        });
        const chat = await fetch(`${baseUrl}/chat?to=224555000000&message=hello`, { headers });

        expect(details.status).toBe(404);
        expect(stop.status).toBe(404);
        expect(chat.status).toBe(404);
        expect(manager.get).not.toHaveBeenCalled();
        expect(manager.stop).not.toHaveBeenCalled();
    });
});
