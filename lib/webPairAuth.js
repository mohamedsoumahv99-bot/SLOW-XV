import { randomBytes, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'slow_xv_pair_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGINS = 10;

function readCookie(req, name) {
    const cookieHeader = req.headers?.cookie || '';
    for (const part of cookieHeader.split(';')) {
        const [key, ...value] = part.trim().split('=');
        if (key === name) return value.join('=');
    }
    return '';
}

function passwordsMatch(candidate, expected) {
    if (typeof candidate !== 'string' || typeof expected !== 'string' || !expected) return false;
    const candidateBytes = Buffer.from(candidate);
    const expectedBytes = Buffer.from(expected);
    return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
}

export function createWebPairAuth({
    password = process.env.WEB_PAIR_PASSWORD || '',
    secureCookies = process.env.NODE_ENV === 'production'
} = {}) {
    const sessions = new Map();
    const failedLogins = new Map();

    function tokenFor(req) {
        return readCookie(req, COOKIE_NAME);
    }

    function isAuthenticated(req) {
        const token = tokenFor(req);
        const expiresAt = sessions.get(token);
        if (!expiresAt) return false;
        if (expiresAt <= Date.now()) {
            sessions.delete(token);
            return false;
        }
        return true;
    }

    function requireAuth(req, res, next) {
        if (!isAuthenticated(req)) {
            return res.status(401).json({ error: 'Sign in to manage WhatsApp sessions.' });
        }
        return next();
    }

    function status(req, res) {
        return res.json({ authenticated: isAuthenticated(req) });
    }

    function login(req, res) {
        if (Buffer.byteLength(password) < 12) {
            return res.status(503).json({ error: 'Set WEB_PAIR_PASSWORD to at least 12 characters on the server.' });
        }
        const address = req.ip || req.socket?.remoteAddress || 'unknown';
        const now = Date.now();
        const attempts = (failedLogins.get(address) || []).filter((timestamp) => now - timestamp < LOGIN_WINDOW_MS);
        if (attempts.length >= MAX_FAILED_LOGINS) {
            failedLogins.set(address, attempts);
            return res.status(429).json({ error: 'Too many failed sign-in attempts. Try again later.' });
        }
        if (!passwordsMatch(req.body?.password, password)) {
            attempts.push(now);
            failedLogins.set(address, attempts);
            if (failedLogins.size > 1000) {
                for (const [key, timestamps] of failedLogins) {
                    if (!timestamps.some((timestamp) => now - timestamp < LOGIN_WINDOW_MS)) failedLogins.delete(key);
                }
            }
            return res.status(401).json({ error: 'Incorrect password.' });
        }

        failedLogins.delete(address);
        for (const [token, expiresAt] of sessions) {
            if (expiresAt <= now) sessions.delete(token);
        }
        const token = randomBytes(32).toString('hex');
        const expiresAt = now + SESSION_TTL_MS;
        sessions.set(token, expiresAt);
        const attributes = [
            `${COOKIE_NAME}=${token}`,
            'Path=/',
            'HttpOnly',
            'SameSite=Strict',
            `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
        ];
        if (secureCookies) attributes.push('Secure');
        res.setHeader('Set-Cookie', attributes.join('; '));
        return res.json({ authenticated: true });
    }

    function logout(req, res) {
        sessions.delete(tokenFor(req));
        const attributes = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
        if (secureCookies) attributes.push('Secure');
        res.setHeader('Set-Cookie', attributes.join('; '));
        return res.status(204).end();
    }

    return { requireAuth, status, login, logout, isAuthenticated };
}