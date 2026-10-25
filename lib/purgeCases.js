import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import globalStore from './lightweight_store.js';
import { DATA_DIR } from './paths.js';

const FILE_NAME = 'group-moderation-cases.json';
const SETTING_PREFIX = 'groupModerationCases';
const MAX_CASES_PER_GROUP = 100;
const locks = new Map();

function getAccountNamespace(sock) {
    const jid = String(sock?.user?.id || sock?.user?.lid || 'default')
        .replace(/:\d+(?=@)/, '');
    return createHash('sha256').update(jid).digest('hex').slice(0, 20);
}

function getStorage(sock) {
    const sessionStore = sock?.sessionStore;
    const store = sessionStore || globalStore;
    const backend = sessionStore
        ? 'session'
        : store?.getStats?.().backend || 'memory';
    const namespace = getAccountNamespace(sock);

    if (!sessionStore && backend === 'memory') {
        return {
            kind: 'file',
            namespace,
            filePath: path.join(DATA_DIR, FILE_NAME)
        };
    }

    return {
        kind: 'store',
        namespace,
        store,
        key: `${SETTING_PREFIX}_${namespace}`
    };
}

function emptyState() {
    return { version: 1, info: '', infoUpdatedAt: null, infoUpdatedBy: null, nextId: 1, cases: [] };
}

function normalizeState(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyState();
    return {
        ...emptyState(),
        ...value,
        version: 1,
        info: typeof value.info === 'string' ? value.info : '',
        cases: Array.isArray(value.cases) ? value.cases.slice(-MAX_CASES_PER_GROUP) : []
    };
}

async function readFileData(filePath) {
    try {
        const contents = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(contents);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
        if (error.code === 'ENOENT') return {};
        throw new Error(`Could not read group moderation records: ${error.message}`);
    }
}

async function readState(storage, groupId) {
    if (storage.kind === 'store') {
        return normalizeState(await storage.store.getSetting(groupId, storage.key));
    }

    const fileData = await readFileData(storage.filePath);
    return normalizeState(fileData[storage.namespace]?.[groupId]);
}

async function writeState(storage, groupId, state) {
    if (storage.kind === 'store') {
        await storage.store.saveSetting(groupId, storage.key, state);
        return;
    }

    const fileData = await readFileData(storage.filePath);
    fileData[storage.namespace] ||= {};
    fileData[storage.namespace][groupId] = state;
    await fs.mkdir(path.dirname(storage.filePath), { recursive: true });
    const temporaryPath = `${storage.filePath}.${process.pid}.${randomUUID()}.tmp`;
    try {
        await fs.writeFile(temporaryPath, JSON.stringify(fileData, null, 2), { mode: 0o600 });
        await fs.rename(temporaryPath, storage.filePath);
    } catch (error) {
        await fs.rm(temporaryPath, { force: true }).catch(() => {});
        throw new Error(`Could not save group moderation records: ${error.message}`);
    }
}

async function withStorageLock(storage, groupId, callback) {
    const lockKey = storage.kind === 'file'
        ? storage.filePath
        : `${storage.namespace}:${groupId}`;
    const previous = locks.get(lockKey) || Promise.resolve();
    let release;
    const current = new Promise((resolve) => {
        release = resolve;
    });
    const tail = previous.then(() => current);
    locks.set(lockKey, tail);

    await previous;
    try {
        return await callback();
    } finally {
        release();
        if (locks.get(lockKey) === tail) locks.delete(lockKey);
    }
}

export async function readGroupPurgeState(sock, groupId) {
    const storage = getStorage(sock);
    return withStorageLock(storage, groupId, async () => {
        const state = await readState(storage, groupId);
        return JSON.parse(JSON.stringify(state));
    });
}

export async function updateGroupPurgeState(sock, groupId, update) {
    const storage = getStorage(sock);
    return withStorageLock(storage, groupId, async () => {
        const state = await readState(storage, groupId);
        const result = await update(state);
        await writeState(storage, groupId, state);
        return result === undefined ? undefined : JSON.parse(JSON.stringify(result));
    });
}

export async function createPurgeCase(sock, groupId, { reporterId, description }) {
    return updateGroupPurgeState(sock, groupId, (state) => {
        const record = {
            id: state.nextId,
            reporterId,
            description,
            createdAt: new Date().toISOString(),
            status: 'open',
            evidence: []
        };
        state.nextId += 1;
        state.cases.push(record);
        if (state.cases.length > MAX_CASES_PER_GROUP) {
            state.cases = state.cases.slice(-MAX_CASES_PER_GROUP);
        }
        return record;
    });
}

export async function updatePurgeCase(sock, groupId, caseId, update) {
    return updateGroupPurgeState(sock, groupId, (state) => {
        const record = state.cases.find((entry) => entry.id === caseId);
        if (!record) return null;
        return update(record, state);
    });
}

export function isValidGroupId(groupId) {
    return typeof groupId === 'string' && groupId.endsWith('@g.us');
}

export function cleanShortText(value, maxLength = 1000) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function getSenderId(message, context = {}) {
    return context.senderId || message?.key?.participant || message?.key?.remoteJid || '';
}
