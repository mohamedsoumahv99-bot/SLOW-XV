import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import config from '../../config.js';
import { NEWSLETTER_CONSENT_VERSION } from '../../lib/newsletterAutomation.js';

const adminPassword = 'test-admin-secret-that-is-long-enough';
let server;
let sessionManager;
let baseUrl;

beforeAll(async () => {
    vi.stubEnv('ADMIN_PANEL_PASSWORD', adminPassword);
    ({ server } = await import('../../lib/server.js'));
    ({ sessionManager } = await import('../../lib/sessionManager.js'));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
    vi.restoreAllMocks();
    sessionManager.sessions.clear();
});

afterAll(async () => {
    sessionManager.sessions.clear();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    vi.unstubAllEnvs();
});

async function adminSignIn() {
    const response = await fetch(`${baseUrl}/api/admin/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
    });
    expect(response.status).toBe(200);
    return response.headers.get('set-cookie').split(';')[0];
}

describe('Web Pair privacy and admin boundary', () => {
    it('shows terms acceptance separately from optional channel automation consent', async () => {
        const response = await fetch(`${baseUrl}/`);
        const page = await response.text();

        expect(response.status).toBe(200);
        expect(page).toContain('J’accepte les <a href="/terms"');
        expect(page).toContain('href="/privacy"');
        expect(page).toContain('Option facultative');
        expect(page).toContain('id="automation-consent" name="newsletterAutomationConsent" type="checkbox"');
        expect(page).toContain('name="reactionEmojis"');
        for (const link of config.channelLinks) expect(page).toContain(link);
        expect(page).not.toContain('id="sessions"');
        expect(page).not.toContain('Sessions actives');
        expect(page).not.toContain('WEB_PAIR_PASSWORD');

        const terms = await fetch(`${baseUrl}/terms`);
        const privacy = await fetch(`${baseUrl}/privacy`);
        expect(terms.status).toBe(200);
        expect((await terms.text()).toLowerCase()).toContain('conditions d’utilisation');
        expect(privacy.status).toBe(200);
        expect((await privacy.text())).toContain('Le suivi des chaînes et les réactions automatiques');
    });

    it('requires legal acceptance and does not require optional automation consent', async () => {
        const pair = vi.spyOn(sessionManager, 'pair');
        const noTerms = await fetch(`${baseUrl}/api/pair`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ phoneNumber: '224123456789', newsletterAutomationConsent: false })
        });
        expect(noTerms.status).toBe(400);
        expect(pair).not.toHaveBeenCalled();

        pair.mockResolvedValue({ status: 'pairing', pairingCode: 'ABCD-1234' });
        const response = await fetch(`${baseUrl}/api/pair`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                phoneNumber: '224123456789',
                termsAccepted: true,
                newsletterAutomationConsent: false
            })
        });

        expect(response.status).toBe(200);
        expect(pair).toHaveBeenCalledWith('224123456789', {
            reactionEmojis: [],
            newsletterAutomationConsent: false,
            newsletterConsentVersion: 0,
            termsVersion: '2026-11-13',
            privacyVersion: '2026-11-13'
        });
    });

    it('passes explicitly selected emojis when optional channel automation is accepted', async () => {
        const pair = vi.spyOn(sessionManager, 'pair').mockResolvedValue({
            status: 'connected',
            phoneNumber: '224123456789',
            pairingCode: 'ABCD-1234'
        });
        const response = await fetch(`${baseUrl}/api/pair`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                phoneNumber: '224123456789',
                termsAccepted: true,
                newsletterAutomationConsent: true,
                reactionEmojis: ['🔥', '❤️']
            })
        });

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ pairingCode: 'ABCD-1234' });
        expect(pair).toHaveBeenCalledWith('224123456789', {
            reactionEmojis: ['🔥', '❤️'],
            newsletterAutomationConsent: true,
            newsletterConsentVersion: NEWSLETTER_CONSENT_VERSION,
            termsVersion: '2026-11-13',
            privacyVersion: '2026-11-13'
        });
    });

    it('does not expose a public session list or session counts', async () => {
        sessionManager.sessions.set('user_224123456789', {
            sessionId: 'user_224123456789',
            phoneNumber: '224123456789',
            status: 'connected',
            pairingCode: 'ABCD-1234',
            createdAt: '2026-10-18T00:00:00.000Z',
            updatedAt: '2026-10-18T00:00:00.000Z',
            socket: { user: { id: '224123456789:1@s.whatsapp.net' } }
        });

        const list = await fetch(`${baseUrl}/api/sessions`);
        const health = await fetch(`${baseUrl}/health`);
        expect(list.status).toBe(404);
        const healthBody = await health.json();
        expect(healthBody).not.toHaveProperty('sessions');
        expect(JSON.stringify(healthBody)).not.toContain('224123456789');
    });

    it('protects full-number session records and deletion behind admin authentication', async () => {
        sessionManager.sessions.set('user_224123456789', {
            sessionId: 'user_224123456789',
            phoneNumber: '224123456789',
            status: 'connected',
            pairingCode: 'ABCD-1234',
            reactionEmojis: ['🔥'],
            newsletterAutomationConsent: true,
            createdAt: '2026-10-18T00:00:00.000Z',
            updatedAt: '2026-10-18T00:00:00.000Z'
        });

        const denied = await fetch(`${baseUrl}/api/admin/sessions`);
        expect(denied.status).toBe(401);

        const cookie = await adminSignIn();
        const listing = await fetch(`${baseUrl}/api/admin/sessions`, { headers: { cookie } });
        const records = await listing.json();
        expect(listing.status).toBe(200);
        expect(records[0].phoneNumber).toBe('224123456789');
        expect(records[0].sessionId).toMatch(/^session_[a-f0-9]{12}$/);
        expect(JSON.stringify(records)).not.toContain('ABCD-1234');
        expect(JSON.stringify(records)).not.toContain('224123456789:1@s.whatsapp.net');

        const remove = vi.spyOn(sessionManager, 'removeSession').mockResolvedValue(true);
        const response = await fetch(`${baseUrl}/api/admin/sessions/${records[0].sessionId}`, {
            method: 'DELETE',
            headers: { cookie }
        });
        expect(response.status).toBe(204);
        expect(remove).toHaveBeenCalledWith(records[0].sessionId);
    });
});
