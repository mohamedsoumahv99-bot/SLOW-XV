import { describe, expect, it, vi } from 'vitest';
import { createAdminAuth } from '../../lib/adminAuth.js';

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

describe('admin panel authentication', () => {
    it('does not issue a cookie without a configured strong password', () => {
        const auth = createAdminAuth({ password: '' });
        const response = createResponse();

        auth.login({ body: { password: 'anything' } }, response);

        expect(response.statusCode).toBe(503);
        expect(response.headers['Set-Cookie']).toBeUndefined();
    });

    it('rejects an admin password shorter than the minimum length', () => {
        const auth = createAdminAuth({ password: 'short-secret' });
        const response = createResponse();

        auth.login({ body: { password: 'short-secret' } }, response);

        expect(response.statusCode).toBe(503);
    });

    it('issues an HTTP-only secure admin cookie and authenticates its holder', () => {
        const password = 'test-admin-secret-that-is-long-enough';
        const auth = createAdminAuth({ password, secureCookies: true });
        const response = createResponse();

        auth.login({ body: { password } }, response);

        expect(response.body).toEqual({ authenticated: true });
        expect(response.headers['Set-Cookie']).toContain('HttpOnly');
        expect(response.headers['Set-Cookie']).toContain('Secure');
        expect(response.headers['Set-Cookie']).toContain('SameSite=Strict');

        const cookie = response.headers['Set-Cookie'].split(';')[0];
        const next = vi.fn();
        auth.requireAuth({ headers: { cookie } }, createResponse(), next);
        expect(next).toHaveBeenCalledOnce();
    });

    it('blocks unauthenticated access and revokes the cookie on logout', () => {
        const password = 'test-admin-secret-that-is-long-enough';
        const auth = createAdminAuth({ password });
        const denied = createResponse();
        const next = vi.fn();

        auth.requireAuth({ headers: {} }, denied, next);
        expect(denied.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();

        const loginResponse = createResponse();
        auth.login({ body: { password } }, loginResponse);
        const cookie = loginResponse.headers['Set-Cookie'].split(';')[0];
        const request = { headers: { cookie } };
        const logoutResponse = createResponse();
        auth.logout(request, logoutResponse);
        expect(logoutResponse.statusCode).toBe(204);
        expect(logoutResponse.headers['Set-Cookie']).toContain('Max-Age=0');
        expect(auth.isAuthenticated(request)).toBe(false);
    });
});
