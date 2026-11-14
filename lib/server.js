import express from 'express';
import { createServer } from 'http';
import { createHash } from 'node:crypto';
import config from '../config.js';
import { createAdminAuth } from './adminAuth.js';
import { sessionManager } from './sessionManager.js';
import { getReactionEmojiOptions, NEWSLETTER_CONSENT_VERSION } from './newsletterAutomation.js';
import { renderAdminPage, renderLegalPage, renderPairPage } from './webPages.js';

const app = express();
const server = createServer(app);
const PORT = config.port || 5000;
const adminAuth = createAdminAuth();
const pairAttempts = new Map();
const numberPairAttempts = new Map();
const PAIR_WINDOW_MS = 10 * 60 * 1000;
const MAX_PAIR_ATTEMPTS_PER_IP = 120;
const MAX_PAIR_ATTEMPTS_PER_NUMBER = 5;
const LEGAL_VERSION = '2026-11-13';

app.set('trust proxy', 1);
app.locals.ready = false;
app.use(express.json({ limit: '32kb' }));
app.use((_req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    next();
});
app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

function takeRateLimit(map, key, maxAttempts) {
    const now = Date.now();
    const recent = (map.get(key) || []).filter((timestamp) => now - timestamp < PAIR_WINDOW_MS);
    if (recent.length >= maxAttempts) {
        map.set(key, recent);
        return false;
    }
    recent.push(now);
    map.set(key, recent);
    if (map.size > 2000) {
        for (const [storedKey, timestamps] of map) {
            if (!timestamps.some((timestamp) => now - timestamp < PAIR_WINDOW_MS)) map.delete(storedKey);
        }
    }
    return true;
}

function allowPairRequest(req, res, next) {
    const address = req.ip || req.socket.remoteAddress || 'unknown';
    if (!takeRateLimit(pairAttempts, address, MAX_PAIR_ATTEMPTS_PER_IP)) {
        return res.status(429).json({ error: 'Trop de demandes depuis cette adresse. Réessayez dans quelques minutes.' });
    }
    const number = String(req.body?.phoneNumber || '').replace(/\D/g, '');
    if (number) {
        const numberKey = createHash('sha256').update(number).digest('hex');
        if (!takeRateLimit(numberPairAttempts, numberKey, MAX_PAIR_ATTEMPTS_PER_NUMBER)) {
            return res.status(429).json({ error: 'Trop de demandes pour ce numéro. Réessayez plus tard.' });
        }
    }
    return next();
}

function sendPairError(res, error) {
    const message = String(error?.message || '');
    if (message.startsWith('Maximum number of saved sessions reached')) {
        return res.status(503).json({ error: 'La capacité maximale de sessions est atteinte. Réessayez plus tard.' });
    }
    if (message.includes('international phone number')) {
        return res.status(400).json({ error: 'Saisissez un numéro WhatsApp valide au format international.' });
    }
    return res.status(400).json({ error: 'Impossible de traiter la demande. Vérifiez le numéro et réessayez.' });
}

app.get('/', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.type('html').send(renderPairPage({
        botName: config.botName,
        version: config.version,
        timeZone: config.timeZone,
        channelLinks: config.channelLinks,
        reactionEmojis: getReactionEmojiOptions(config.channelReactionEmoji),
        defaultEmoji: config.channelReactionEmoji
    }));
});

app.get('/admin', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.type('html').send(renderAdminPage({ botName: config.botName }));
});

app.get('/terms', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.type('html').send(renderLegalPage({ botName: config.botName, kind: 'terms' }));
});

app.get('/privacy', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.type('html').send(renderLegalPage({ botName: config.botName, kind: 'privacy' }));
});

app.get('/health', (_req, res) => {
    const memory = process.memoryUsage();
    const ready = app.locals.ready === true;
    res.status(ready ? 200 : 503).json({
        status: ready ? 'ok' : 'starting',
        bot: config.botName,
        version: config.version,
        uptime: Math.floor(process.uptime()),
        memory: { rss: Math.round(memory.rss / 1024 / 1024), heapUsed: Math.round(memory.heapUsed / 1024 / 1024) },
        timestamp: new Date().toISOString()
    });
});

app.get('/api/admin/auth/status', adminAuth.status);
app.post('/api/admin/auth/login', adminAuth.login);
app.post('/api/admin/auth/logout', adminAuth.logout);
app.get('/api/admin/sessions', adminAuth.requireAuth, (_req, res) => res.json(sessionManager.adminList()));
app.delete('/api/admin/sessions/:sessionId', adminAuth.requireAuth, async (req, res) => {
    try {
        const removed = await sessionManager.removeSession(req.params.sessionId);
        if (!removed) return res.status(404).json({ error: 'Session introuvable.' });
        return res.status(204).end();
    } catch {
        return res.status(500).json({ error: 'La suppression locale de la session a échoué.' });
    }
});

app.post('/api/pair', allowPairRequest, async (req, res) => {
    if (req.body?.termsAccepted !== true) {
        return res.status(400).json({ error: 'Acceptez les conditions d’utilisation et la politique de confidentialité pour continuer.' });
    }
    if (req.body?.newsletterAutomationConsent !== undefined
        && typeof req.body.newsletterAutomationConsent !== 'boolean') {
        return res.status(400).json({ error: 'Le choix des automatismes de chaîne est invalide.' });
    }
    const automationConsent = req.body.newsletterAutomationConsent === true;
    const reactionEmojis = Array.isArray(req.body.reactionEmojis) ? req.body.reactionEmojis : [];
    if (automationConsent && reactionEmojis.length === 0) {
        return res.status(400).json({ error: 'Choisissez au moins un emoji ou désactivez les automatismes de chaîne.' });
    }
    if (reactionEmojis.length > 4) {
        return res.status(400).json({ error: 'Choisissez au maximum quatre emojis.' });
    }
    try {
        const result = await sessionManager.pair(req.body?.phoneNumber, {
            reactionEmojis,
            newsletterAutomationConsent: automationConsent,
            newsletterConsentVersion: automationConsent ? NEWSLETTER_CONSENT_VERSION : 0,
            termsVersion: LEGAL_VERSION,
            privacyVersion: LEGAL_VERSION
        });
        // Never return session status, full numbers, or the public session inventory.
        return res.json({ pairingCode: result.pairingCode || null });
    } catch (error) {
        return sendPairError(res, error);
    }
});

app.use((error, _req, res, _next) => {
    if (res.headersSent) return;
    res.status(400).json({ error: 'Requête invalide.' });
});

export { app, server, PORT };
