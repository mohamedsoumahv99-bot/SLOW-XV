import { describe, expect, it, vi } from 'vitest';
import { createWebPairAuth } from '../../lib/webPairAuth.js';

function createResponse() {
    return {
        statusCode: 200,
        headers: {},
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        setHeader(name, value) {
            this.headers[name] = value;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
        end() {
            this.ended = true;
            return this;
        }
    };
}

describe('Web Pair authentication', () => {
    it('does not create a login session without a configured password', () => {
        const auth = createWebPairAuth({ password: '' });
        const response = createResponse();

        auth.login({ body: { password: 'anything' } }, response);

        expect(response.statusCode).toBe(503);
        expect(response.body.authenticated).toBeUndefined();
        expect(response.headers['Set-Cookie']).toBeUndefined();
    });

    it('rejects an incorrect password without issuing a cookie', () => {
        const auth = createWebPairAuth({ password: 'correct-password' });
        const response = createResponse();

        auth.login({ body: { password: 'wrong-password' } }, response);

        expect(response.statusCode).toBe(401);
        expect(response.headers['Set-Cookie']).toBeUndefined();
    });

    it('issues an HTTP-only session cookie and authenticates its holder', () => {
        const auth = createWebPairAuth({ password: 'correct-password', secureCookies: true });
        const response = createResponse();

        auth.login({ body: { password: 'correct-password' } }, response);

        expect(response.body).toEqual({ authenticated: true });
        expect(response.headers['Set-Cookie']).toContain('HttpOnly');
        expect(response.headers['Set-Cookie']).toContain('Secure');
        expect(response.headers['Set-Cookie']).toContain('SameSite=Strict');

        const cookie = response.headers['Set-Cookie'].split(';')[0];
        const request = { headers: { cookie } };
        const next = vi.fn();
        auth.requireAuth(request, createResponse(), next);
        expect(next).toHaveBeenCalledOnce();
    });

    it('blocks unauthenticated access and revokes the cookie on logout', () => {
        const auth = createWebPairAuth({ password: 'correct-password' });
        const denied = createResponse();
        const next = vi.fn();

        auth.requireAuth({ headers: {} }, denied, next);

        expect(denied.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();

        const loginResponse = createResponse();
        auth.login({ body: { password: 'correct-password' } }, loginResponse);
        const cookie = loginResponse.headers['Set-Cookie'].split(';')[0];
        const request = { headers: { cookie } };
        const logoutResponse = createResponse();
        auth.logout(request, logoutResponse);

        expect(logoutResponse.statusCode).toBe(204);
        expect(logoutResponse.headers['Set-Cookie']).toContain('Max-Age=0');
        const afterLogout = createResponse();
        auth.requireAuth(request, afterLogout, next);
        expect(afterLogout.statusCode).toBe(401);
    });
});