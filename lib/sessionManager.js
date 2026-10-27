import fs from 'fs';
import path from 'path';
import { createHash } from 'node:crypto';
import { parsePhoneNumber } from 'awesome-phonenumber';
import makeWASocket, {
    Browsers,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidDecode,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState
} from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';
import pino from 'pino';
import QRCode from 'qrcode';
import config from '../config.js';
import { smsg } from './myfunc.js';
import { compileAll } from './compile.js';
import commandHandler from './commandHandler.js';
import { handleCall, handleGroupParticipantUpdate, handleMessages, handleStatus } from './messageHandler.js';
import { createSessionStore } from './sessionStore.js';
import { runWithSessionStore } from './sessionContext.js';
import { printLog } from './print.js';
import {
    followAndSubscribeNewsletter,
    NEWSLETTER_CONSENT_VERSION,
    normalizeReactionEmojis,
    resolveNewsletterJids,
    reactToNewsletterPosts
} from './newsletterAutomation.js';

const silentLogger = pino({ level: 'silent' });

function normalizeNumber(value) {
    const number = String(value || '').replace(/\D/g, '');
    const parsed = parsePhoneNumber(`+${number}`);
    if (!parsed.valid) throw new Error('Invalid international phone number');
    return number;
}

function safeSessionId(value) {
    return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
}

function publicSessionId(sessionId) {
    const digest = createHash('sha256').update(String(sessionId)).digest('hex').slice(0, 12);
    return `session_${digest}`;
}

export function maskPhoneNumber(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    const visible = digits.slice(0, Math.min(3, digits.length));
    return `${visible}${'•'.repeat(digits.length - visible.length)}`;
}

function publicErrorMessage(value, record) {
    if (!value) return null;
    let message = String(value);
    const digits = String(record.phoneNumber || '').replace(/\D/g, '');
    if (digits.length >= 4) {
        const formattedNumber = new RegExp(digits.split('').join('\\D*'), 'g');
        message = message.replace(formattedNumber, maskPhoneNumber(digits));
    }
    if (record.sessionId) {
        message = message.split(record.sessionId).join(publicSessionId(record.sessionId));
    }
    return message.slice(0, 240);
}

function statusCodeFrom(error) {
    return error?.output?.statusCode || error?.data?.statusCode || error?.statusCode;
}

export class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.pairingRequests = new Map();
        this.root = path.resolve(process.cwd(), config.sessionsDir);
        this.started = false;
        this.commandsReady = false;
        this.versionPromise = null;
    }

    ensureRoot() {
        fs.mkdirSync(this.root, { recursive: true });
    }

    sessionDir(sessionId) {
        return path.join(this.root, safeSessionId(sessionId));
    }

    metadataPath(sessionId) {
        return path.join(this.sessionDir(sessionId), 'metadata.json');
    }

    readMetadata(sessionId) {
        try {
            return JSON.parse(fs.readFileSync(this.metadataPath(sessionId), 'utf8'));
        } catch {
            return null;
        }
    }

    createSavedRecord(sessionId, metadata) {
        return {
            sessionId,
            phoneNumber: metadata.phoneNumber,
            dir: this.sessionDir(sessionId),
            createdAt: metadata.createdAt || new Date().toISOString(),
            updatedAt: metadata.updatedAt || new Date().toISOString(),
            status: metadata.status || 'connecting',
            reconnectAttempt: 0,
            queue: Promise.resolve(),
            reconnectTimer: null,
            pairingTimer: null,
            manualStop: false,
            resumeAfterShutdown: false,
            saveCredsQueue: Promise.resolve(),
            newsletterReactionIds: new Set(),
            reactionEmojis: normalizeReactionEmojis(metadata.reactionEmojis, config.channelReactionEmoji),
            newsletterConsentVersion: Number(metadata.newsletterConsentVersion) || 0,
            newsletterJids: new Set([config.newsletterJid]),
            newsletterReadyJids: new Set(),
            newsletterReady: false,
            newsletterSetupComplete: false,
            newsletterPendingUpdates: [],
            newsletterQueue: Promise.resolve(),
            lastError: metadata.lastError || null,
            socket: null,
            store: null
        };
    }

    writeMetadata(record) {
        fs.mkdirSync(record.dir, { recursive: true });
        const file = this.metadataPath(record.sessionId);
        const temporary = `${file}.tmp`;
        fs.writeFileSync(temporary, JSON.stringify({
            sessionId: record.sessionId,
            phoneNumber: record.phoneNumber,
            createdAt: record.createdAt,
            updatedAt: new Date().toISOString(),
            status: record.status,
            reactionEmojis: normalizeReactionEmojis(record.reactionEmojis, config.channelReactionEmoji),
            newsletterConsentVersion: Number(record.newsletterConsentVersion) || 0,
            lastError: record.lastError || null
        }, null, 2));
        fs.renameSync(temporary, file);
    }

    async ensureCommands() {
        if (this.commandsReady) return;
        await compileAll();
        await commandHandler.loadCommands();
        this.commandsReady = true;
    }

    async restore() {
        if (this.started) return;
        this.started = true;
        this.ensureRoot();
        await this.ensureCommands();
        const entries = fs.readdirSync(this.root, { withFileTypes: true })
            .filter((entry) => entry.isDirectory() && entry.name.startsWith('user_'));

        for (const entry of entries) {
            if (this.sessions.size >= config.maxSessions) {
                printLog('warn', `Skipping remaining saved sessions: maximum of ${config.maxSessions} reached.`);
                break;
            }
            const sessionId = entry.name;
            const metadata = this.readMetadata(sessionId);
            if (!metadata?.phoneNumber) continue;
            const record = this.createSavedRecord(sessionId, metadata);
            this.sessions.set(sessionId, record);
            if (metadata.status && !['connected', 'connecting', 'reconnecting'].includes(metadata.status)) {
                continue;
            }
            try {
                await this.start(sessionId, metadata.phoneNumber, { requestPairing: false, restoring: true });
            } catch (error) {
                record.status = 'reconnecting';
                record.lastError = error.message;
                record.reconnectAttempt += 1;
                record.updatedAt = new Date().toISOString();
                this.writeMetadata(record);
                this.scheduleReconnect(record);
                printLog('error', `Failed to restore ${publicSessionId(sessionId)}: ${error.message}`);
            }
        }

        if (config.pairingNumber) {
            try {
                await this.pair(config.pairingNumber);
            } catch (error) {
                printLog('error', `Legacy PAIRING_NUMBER could not start: ${error.message}`);
            }
        }
    }

    list() {
        return [...this.sessions.values()].map((record) => this.publicRecord(record));
    }

    get(sessionId) {
        return this.sessions.get(safeSessionId(sessionId));
    }

    findByNumber(phoneNumber) {
        const number = normalizeNumber(phoneNumber);
        return [...this.sessions.values()].find((record) => record.phoneNumber === number);
    }

    async pair(phoneNumber, { reactionEmojis, newsletterConsentVersion } = {}) {
        const number = normalizeNumber(phoneNumber);
        const existing = this.findByNumber(number);
        const selectedEmojis = normalizeReactionEmojis(reactionEmojis, config.channelReactionEmoji);
        const acceptedConsentVersion = Math.max(0, Number(newsletterConsentVersion) || 0);
        const renewedConsent = acceptedConsentVersion > Number(existing?.newsletterConsentVersion || 0);
        if (existing) {
            existing.reactionEmojis = selectedEmojis;
            existing.newsletterConsentVersion = Math.max(
                Number(existing.newsletterConsentVersion) || 0,
                acceptedConsentVersion
            );
            this.writeMetadata(existing);
            if (renewedConsent && existing.status === 'connected' && existing.socket) {
                existing.newsletterReadyJids = new Set();
                existing.newsletterReady = false;
                existing.newsletterSetupComplete = false;
                existing.newsletterPendingUpdates = [];
                void this.enableOfficialNewsletter(existing, existing.socket);
            }
        }
        if (existing && this.pairingRequests.has(existing.sessionId)) {
            const pendingResult = await this.pairingRequests.get(existing.sessionId);
            return { ...pendingResult, reactionEmojis: selectedEmojis, reused: true };
        }
        if (existing && ['connecting', 'connected', 'reconnecting'].includes(existing.status)) {
            return { ...this.publicRecord(existing), reused: true };
        }
        if (existing?.status === 'pairing' && existing.pairingCode && existing.socket) {
            return { ...this.publicRecord(existing, { includePairingCode: true }), reused: true };
        }
        if (this.sessions.size >= config.maxSessions && !existing) {
            throw new Error(`Maximum number of saved sessions reached (${config.maxSessions}).`);
        }

        const sessionId = existing?.sessionId || `user_${number}`;
        if (existing?.status === 'logged_out') {
            this.clearAuth(existing.dir);
        }
        if (existing?.pairingTimer) {
            clearTimeout(existing.pairingTimer);
            existing.pairingTimer = null;
        }
        const resultPromise = this.start(sessionId, number, {
            requestPairing: true,
            reactionEmojis: selectedEmojis,
            newsletterConsentVersion: acceptedConsentVersion
        });
        this.pairingRequests.set(sessionId, resultPromise);
        try {
            return await resultPromise;
        } finally {
            this.pairingRequests.delete(sessionId);
        }
    }

    async start(sessionId, phoneNumber, options = {}) {
        const normalizedId = safeSessionId(sessionId);
        const number = normalizeNumber(phoneNumber);
        let record = this.sessions.get(normalizedId);

        if (record?.socket && ['connecting', 'connected', 'pairing'].includes(record.status)) {
            if (record.status !== 'pairing' || !options.requestPairing || record.pairingCode) {
                return this.publicRecord(record, {
                    includePairingCode: record.status === 'pairing' && Boolean(options.requestPairing)
                });
            }
        }

        record ||= {
            sessionId: normalizedId,
            phoneNumber: number,
            dir: this.sessionDir(normalizedId),
            createdAt: new Date().toISOString(),
            status: options.requestPairing ? 'pairing' : 'connecting',
            reconnectAttempt: 0,
            queue: Promise.resolve(),
            reconnectTimer: null,
            pairingTimer: null,
            manualStop: false,
            resumeAfterShutdown: false,
            saveCredsQueue: Promise.resolve(),
            newsletterReactionIds: new Set(),
            reactionEmojis: normalizeReactionEmojis(options.reactionEmojis, config.channelReactionEmoji),
            newsletterConsentVersion: Number(options.newsletterConsentVersion) || 0,
            newsletterJids: new Set([config.newsletterJid]),
            newsletterReadyJids: new Set(),
            newsletterReady: false,
            newsletterSetupComplete: false,
            newsletterPendingUpdates: [],
            newsletterQueue: Promise.resolve(),
            lastError: null,
            socket: null,
            store: null
        };
        record.phoneNumber = number;
        record.dir = this.sessionDir(normalizedId);
        if (record.socket && (
            !['connecting', 'connected', 'pairing'].includes(record.status)
            || (record.status === 'pairing' && options.requestPairing && !record.pairingCode)
        )) {
            try {
                record.socket.ws?.close();
                record.socket.end?.(new Error('Replacing stale pairing socket'));
            } catch {
                // The previous socket may already be closed.
            }
            record.socket = null;
        }
        record.manualStop = false;
        record.newsletterReactionIds ||= new Set();
        record.newsletterJids = new Set([config.newsletterJid]);
        record.newsletterReadyJids = new Set();
        record.reactionEmojis = normalizeReactionEmojis(
            options.reactionEmojis ?? record.reactionEmojis,
            config.channelReactionEmoji
        );
        record.newsletterReady = false;
        record.newsletterSetupComplete = false;
        record.newsletterPendingUpdates = [];
        record.newsletterQueue = Promise.resolve();
        record.pairingCode = null;
        record.qr = null;
        record.status = options.requestPairing ? 'pairing' : 'connecting';
        record.updatedAt = new Date().toISOString();
        this.sessions.set(normalizedId, record);
        this.writeMetadata(record);

        const socket = await this.createSocket(record);
        const registered = socket.authState.creds.registered === true;
        if (options.requestPairing && !registered) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            try {
                const pairingCode = await socket.requestPairingCode(number);
                const formatted = pairingCode?.match(/.{1,4}/g)?.join('-') || pairingCode;
                record.pairingCode = formatted;
                record.status = 'pairing';
                record.updatedAt = new Date().toISOString();
                this.writeMetadata(record);
                printLog('success', `Pairing code generated for ${publicSessionId(record.sessionId)}; sensitive values omitted.`);
                record.pairingTimer = setTimeout(() => {
                    if (record.status === 'pairing') {
                        record.status = 'pairing_expired';
                        record.lastError = 'Pairing window expired';
                        record.pairingCode = null;
                        try {
                            record.socket?.ws?.close();
                            record.socket?.end?.(new Error('Pairing window expired'));
                        } catch {
                            // The socket may already be closed.
                        }
                        record.socket = null;
                        this.writeMetadata(record);
                    }
                }, config.pairingTimeoutMs);
                return { ...this.publicRecord(record, { includePairingCode: true }), pairingCode: formatted };
            } catch (error) {
                record.lastError = error.message;
                record.status = 'error';
                this.writeMetadata(record);
                throw error;
            }
        }
        return this.publicRecord(record);
    }

    async createSocket(record) {
        fs.mkdirSync(record.dir, { recursive: true });
        const { state, saveCreds } = await useMultiFileAuthState(record.dir);
        if (!this.versionPromise) this.versionPromise = fetchLatestBaileysVersion();
        const { version } = await this.versionPromise;
        const sessionStore = await createSessionStore(record.dir);
        const retryCache = new NodeCache();
        const ghostMode = await sessionStore.getSetting('global', 'stealthMode');
        const socket = makeWASocket({
            version,
            logger: silentLogger,
            browser: Browsers.macOS('Chrome'),
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, silentLogger)
            },
            markOnlineOnConnect: !ghostMode?.enabled,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            msgRetryCounterCache: retryCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            getMessage: async (key) => {
                const message = await sessionStore.loadMessage(jidNormalizedUser(key.remoteJid), key.id);
                return message?.message || undefined;
            }
        });

        record.socket = socket;
        record.store = sessionStore;
        record.status = state.creds.registered ? 'connecting' : 'pairing';
        socket.authState = { creds: state.creds };
        socket.sessionId = record.sessionId;
        socket.phoneNumber = record.phoneNumber;
        socket.sessionStore = sessionStore;
        socket.store = sessionStore;
        socket.public = true;
        socket.msgRetryCounterCache = retryCache;
        socket.serializeM = (message) => smsg(socket, message, sessionStore);
        socket.decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\\d+@/i.test(jid)) {
                const decoded = jidDecode(jid) || {};
                return decoded.user && decoded.server ? `${decoded.user}@${decoded.server}` : jid;
            }
            return jid;
        };
        socket.getName = (jid, withoutContact = false) => {
            const id = socket.decodeJid(jid);
            const contact = sessionStore.contacts[id] || {};
            if (withoutContact) return '';
            return contact.name || contact.subject || contact.verifiedName || id.split('@')[0];
        };
        socket.isGhostMode = async () => Boolean((await sessionStore.getSetting('global', 'stealthMode'))?.enabled);

        const originalPresence = socket.sendPresenceUpdate.bind(socket);
        socket.sendPresenceUpdate = async (...args) => {
            if (await socket.isGhostMode()) return;
            return originalPresence(...args);
        };
        const originalRead = socket.readMessages?.bind(socket);
        if (originalRead) {
            socket.readMessages = async (...args) => {
                if (await socket.isGhostMode()) return;
                return originalRead(...args);
            };
        }

        sessionStore.bind(socket.ev);
        socket.ev.on('creds.update', () => {
            record.saveCredsQueue = record.saveCredsQueue
                .then(() => saveCreds())
                .catch((error) => {
                    record.lastError = `credentials: ${error.message}`;
                    printLog('error', `[${publicSessionId(record.sessionId)}] ${record.lastError}`);
                });
        });
        socket.ev.on('messages.upsert', (update) => {
            const messages = Array.isArray(update?.messages) ? update.messages : [];
            this.queueNewsletterUpdate(record, socket, update);
            const ordinaryMessages = messages.filter((message) => !String(message?.key?.remoteJid || '').endsWith('@newsletter'));
            if (ordinaryMessages.length) {
                this.enqueue(record, () => handleMessages(socket, { ...update, messages: ordinaryMessages }));
            }
        });
        socket.ev.on('group-participants.update', (update) => this.enqueue(record, () => handleGroupParticipantUpdate(socket, update)));
        socket.ev.on('status.update', (status) => this.enqueue(record, () => handleStatus(socket, status)));
        socket.ev.on('messages.reaction', (reaction) => this.enqueue(record, () => handleStatus(socket, reaction)));
        socket.ev.on('call', (calls) => this.enqueue(record, () => handleCall(socket, calls)));
        socket.ev.on('connection.update', (update) => this.onConnectionUpdate(record, update));
        return socket;
    }

    enqueue(record, task) {
        record.queue = record.queue
            .then(() => runWithSessionStore(record.store, task))
            .catch((error) => {
                record.lastError = error.message;
                printLog('error', `[${publicSessionId(record.sessionId)}] message task: ${error.message}`);
            });
        return record.queue;
    }

    async onConnectionUpdate(record, update) {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            record.lastQr = qr;
            try {
                record.qr = await QRCode.toDataURL(qr);
            } catch {
                record.qr = null;
            }
        }
        if (connection === 'open') {
            record.status = 'connected';
            record.pairingCode = null;
            if (record.pairingTimer) clearTimeout(record.pairingTimer);
            record.pairingTimer = null;
            record.reconnectAttempt = 0;
            record.lastError = null;
            record.updatedAt = new Date().toISOString();
            this.writeMetadata(record);
            printLog('success', `[${publicSessionId(record.sessionId)}] ${config.botName} connected`);
            record.newsletterJids = new Set([config.newsletterJid]);
            record.newsletterReadyJids = new Set();
            record.newsletterReady = false;
            record.newsletterSetupComplete = false;
            record.newsletterPendingUpdates = [];
            record.newsletterQueue = Promise.resolve();
            void this.enableOfficialNewsletter(record, record.socket);
            try {
                const setbioModule = await import('../plugins/setbio.js');
                const startAutoBio = setbioModule.startAutoBio || setbioModule.default?.startAutoBio;
                if (typeof startAutoBio === 'function') await startAutoBio(record.socket);
            } catch (error) {
                printLog('warning', `[${publicSessionId(record.sessionId)}] auto bio: ${error.message}`);
            }
        }
        if (connection === 'close') {
            record.socket = null;
            record.newsletterReadyJids = new Set();
            record.newsletterReady = false;
            record.newsletterSetupComplete = false;
            record.newsletterPendingUpdates = [];
            if (record.manualStop) {
                record.status = record.resumeAfterShutdown ? 'reconnecting' : 'stopped';
                record.updatedAt = new Date().toISOString();
                this.writeMetadata(record);
                return;
            }
            const code = statusCodeFrom(lastDisconnect?.error);
            if (code === DisconnectReason.loggedOut || code === 401) {
                record.status = 'logged_out';
                record.lastError = 'WhatsApp logged out this session';
                record.updatedAt = new Date().toISOString();
                this.writeMetadata(record);
                printLog('warning', `[${publicSessionId(record.sessionId)}] logged out; credentials kept for inspection`);
                return;
            }
            record.status = 'reconnecting';
            record.reconnectAttempt += 1;
            record.updatedAt = new Date().toISOString();
            this.writeMetadata(record);
            this.scheduleReconnect(record);
        }
    }

    async enableOfficialNewsletter(record, socket) {
        try {
            const resolution = await resolveNewsletterJids(
                socket,
                config.newsletterJid,
                record.newsletterConsentVersion >= NEWSLETTER_CONSENT_VERSION
                    ? config.newsletterInviteCodes
                    : []
            );
            if (record.socket !== socket || record.status !== 'connected') return false;
            record.newsletterJids = new Set(resolution.newsletterJids);

            for (const failure of resolution.errors) {
                printLog('warning', `[${publicSessionId(record.sessionId)}] SLOW-XV channel link could not be resolved: ${failure.error?.message || 'unknown error'}`);
            }

            const readyJids = new Set();
            for (const newsletterJid of record.newsletterJids) {
                if (record.socket !== socket || record.status !== 'connected') return false;
                const result = await followAndSubscribeNewsletter(socket, newsletterJid);
                if (result.followed && result.subscribed) {
                    readyJids.add(newsletterJid);
                    printLog('success', `[${publicSessionId(record.sessionId)}] followed and subscribed to a SLOW-XV channel.`);
                }
                for (const failure of result.errors) {
                    printLog('warning', `[${publicSessionId(record.sessionId)}] SLOW-XV channel ${failure.step} failed: ${failure.error?.message || 'unknown error'}`);
                }
                if (!result.followed || !result.subscribed) {
                    printLog('warning', `[${publicSessionId(record.sessionId)}] SLOW-XV channel live updates are unavailable for one channel.`);
                }
            }

            record.newsletterReadyJids = readyJids;
            record.newsletterReady = readyJids.size > 0;
            record.newsletterSetupComplete = true;
        } catch (error) {
            printLog('warning', `[${publicSessionId(record.sessionId)}] SLOW-XV channel setup failed: ${error.message}`);
            if (record.socket === socket) {
                record.newsletterReady = false;
                record.newsletterReadyJids = new Set();
                record.newsletterSetupComplete = true;
                record.newsletterPendingUpdates = [];
            }
            return false;
        }

        if (record.socket !== socket || record.status !== 'connected') return false;
        if (!record.newsletterReady) {
            record.newsletterPendingUpdates = [];
            return false;
        }

        const pendingUpdates = record.newsletterPendingUpdates.splice(0);
        for (const update of pendingUpdates) {
            this.queueNewsletterUpdate(record, socket, update);
        }
        return true;
    }

    queueNewsletterUpdate(record, socket, update) {
        if (record.socket !== socket || record.status !== 'connected') return;
        const configuredJids = record.newsletterJids instanceof Set
            ? record.newsletterJids
            : new Set([config.newsletterJid]);
        const groupedMessages = new Map();
        for (const message of Array.isArray(update?.messages) ? update.messages : []) {
            const newsletterJid = message?.key?.remoteJid;
            if (!configuredJids.has(newsletterJid)) continue;
            const messages = groupedMessages.get(newsletterJid) || [];
            messages.push(message);
            groupedMessages.set(newsletterJid, messages);
        }
        if (!groupedMessages.size) return;

        if (!record.newsletterSetupComplete) {
            record.newsletterPendingUpdates ||= [];
            for (const messages of groupedMessages.values()) {
                record.newsletterPendingUpdates.push({ ...update, messages });
            }
            return;
        }

        const readyJids = record.newsletterReadyJids instanceof Set
            ? record.newsletterReadyJids
            : new Set(record.newsletterReady ? [config.newsletterJid] : []);
        record.newsletterQueue ||= Promise.resolve();
        for (const [newsletterJid, messages] of groupedMessages) {
            if (!readyJids.has(newsletterJid)) continue;
            record.newsletterQueue = record.newsletterQueue
                .then(() => {
                    if (record.socket !== socket || record.status !== 'connected') return;
                    return this.reactToOfficialNewsletter(record, socket, { ...update, messages });
                })
                .catch((error) => {
                    printLog('warning', `[${publicSessionId(record.sessionId)}] SLOW-XV channel reaction queue failed: ${error.message}`);
                });
        }
        return record.newsletterQueue;
    }

    async reactToOfficialNewsletter(record, socket, update) {
        const newsletterJid = update?.messages?.[0]?.key?.remoteJid;
        if (record.socket !== socket || record.status !== 'connected'
            || !record.newsletterReadyJids?.has(newsletterJid)) return;
        const result = await reactToNewsletterPosts(
            socket,
            update,
            newsletterJid,
            record.reactionEmojis,
            record.newsletterReactionIds
        );
        for (const failure of result.errors) {
            printLog('warning', `[${publicSessionId(record.sessionId)}] SLOW-XV channel reaction failed: ${failure.error?.message || 'unknown error'}`);
        }
    }

    scheduleReconnect(record) {
        if (record.reconnectTimer) return;
        const delay = Math.min(
            config.reconnectMaxDelayMs,
            config.reconnectBaseDelayMs * (2 ** Math.min(record.reconnectAttempt - 1, 5))
        );
        record.reconnectTimer = setTimeout(async () => {
            record.reconnectTimer = null;
            try {
                await this.start(record.sessionId, record.phoneNumber, { requestPairing: false });
            } catch (error) {
                record.lastError = error.message;
                record.status = 'reconnecting';
                record.reconnectAttempt += 1;
                record.updatedAt = new Date().toISOString();
                this.writeMetadata(record);
                this.scheduleReconnect(record);
            }
        }, delay);
    }

    async shutdown() {
        const records = [...this.sessions.values()];
        await Promise.allSettled(records.map(async (record) => {
            if (record.reconnectTimer) clearTimeout(record.reconnectTimer);
            record.reconnectTimer = null;
            if (record.pairingTimer) clearTimeout(record.pairingTimer);
            record.pairingTimer = null;

            record.resumeAfterShutdown = ['connecting', 'connected', 'reconnecting'].includes(record.status);
            record.manualStop = true;
            if (record.socket) {
                record.status = record.resumeAfterShutdown ? 'reconnecting' : 'stopped';
                try {
                    record.socket.ws?.close();
                    record.socket.end?.(new Error('Process shutting down'));
                } catch {
                    // The socket may already be closed.
                }
            }

            try {
                await record.saveCredsQueue;
                await record.store?.writeToFile();
            } catch (error) {
                record.lastError = `shutdown persistence failed: ${error.message}`;
                printLog('error', `[${publicSessionId(record.sessionId)}] ${record.lastError}`);
            } finally {
                record.socket = null;
                if (record.resumeAfterShutdown) record.status = 'reconnecting';
                record.updatedAt = new Date().toISOString();
                try {
                    this.writeMetadata(record);
                } catch (error) {
                    printLog('error', `[${publicSessionId(record.sessionId)}] could not persist shutdown metadata: ${error.message}`);
                }
            }
        }));
    }

    publicRecord(record, { includePairingCode = false } = {}) {
        return {
            sessionId: publicSessionId(record.sessionId),
            phoneNumber: maskPhoneNumber(record.phoneNumber),
            status: record.status,
            connected: record.status === 'connected',
            pairingCode: includePairingCode ? record.pairingCode || null : null,
            reactionEmojis: normalizeReactionEmojis(record.reactionEmojis, config.channelReactionEmoji),
            lastError: publicErrorMessage(record.lastError, record),
            createdAt: record.createdAt,
            updatedAt: record.updatedAt
        };
    }

    clearAuth(directory) {
        if (!fs.existsSync(directory)) return;
        for (const entry of fs.readdirSync(directory)) {
            if (entry === 'metadata.json' || entry === 'state') continue;
            fs.rmSync(path.join(directory, entry), { recursive: true, force: true });
        }
    }
}

export const sessionManager = new SessionManager();
export { normalizeNumber };
