import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSessionStore } from '../../lib/sessionStore.js';
import { DATA_DIR } from '../../lib/paths.js';
import {
    createPurgeCase,
    readGroupPurgeState,
    updateGroupPurgeState
} from '../../lib/purgeCases.js';

const groupA = '120363000000000001@g.us';
const groupB = '120363000000000002@g.us';

function makeSocket(sessionStore, userId = '22412345678@s.whatsapp.net') {
    return { sessionStore, user: { id: userId } };
}

function makeFakeStore() {
    const values = new Map();
    return {
        values,
        async getSetting(chatId, key) {
            return values.get(`${chatId}:${key}`) ?? null;
        },
        async saveSetting(chatId, key, value) {
            await new Promise((resolve) => setTimeout(resolve, 2));
            values.set(`${chatId}:${key}`, structuredClone(value));
        }
    };
}

describe('group moderation case storage', () => {
    let tempDirectory;

    afterEach(async () => {
        if (tempDirectory) {
            await fs.rm(tempDirectory, { recursive: true, force: true });
            tempDirectory = undefined;
        }
    });

    it('keeps reports isolated by group and by WhatsApp session', async () => {
        const storeA = makeFakeStore();
        const storeB = makeFakeStore();
        const socketA = makeSocket(storeA);
        const socketB = makeSocket(storeB, '22499999999@s.whatsapp.net');

        await createPurgeCase(socketA, groupA, {
            reporterId: 'user-a@s.whatsapp.net',
            description: 'Report A'
        });
        await createPurgeCase(socketA, groupB, {
            reporterId: 'user-a@s.whatsapp.net',
            description: 'Report B'
        });

        expect((await readGroupPurgeState(socketA, groupA)).cases.map((item) => item.description))
            .toEqual(['Report A']);
        expect((await readGroupPurgeState(socketA, groupB)).cases.map((item) => item.description))
            .toEqual(['Report B']);
        expect((await readGroupPurgeState(socketB, groupA)).cases).toEqual([]);
    });

    it('serializes concurrent updates so case IDs are unique', async () => {
        const socket = makeSocket(makeFakeStore());
        const records = await Promise.all(
            ['one', 'two', 'three'].map((description) => createPurgeCase(socket, groupA, {
                reporterId: 'user@s.whatsapp.net',
                description
            }))
        );

        expect(records.map((record) => record.id).sort((a, b) => a - b)).toEqual([1, 2, 3]);
        expect((await readGroupPurgeState(socket, groupA)).cases).toHaveLength(3);
    });

    it('restores cases from a session store after recreating the store', async () => {
        tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'slow-xv-purge-'));
        const sessionDir = path.join(tempDirectory, 'user_1');
        const firstStore = await createSessionStore(sessionDir);
        const socket = makeSocket(firstStore);

        await createPurgeCase(socket, groupA, {
            reporterId: 'reporter@s.whatsapp.net',
            description: 'Persist this report'
        });

        const restoredStore = await createSessionStore(sessionDir);
        const restored = await readGroupPurgeState(makeSocket(restoredStore), groupA);
        expect(restored.cases).toHaveLength(1);
        expect(restored.cases[0].description).toBe('Persist this report');
    });

    it('serializes group info and cases in the same session scope', async () => {
        const socket = makeSocket(makeFakeStore());
        await updateGroupPurgeState(socket, groupA, (state) => {
            state.info = 'Report issues to group admins.';
        });
        expect((await readGroupPurgeState(socket, groupA)).info)
            .toBe('Report issues to group admins.');
    });

    it('persists the legacy file fallback by account and group', async () => {
        const filePath = path.join(DATA_DIR, 'group-moderation-cases.json');
        await fs.rm(filePath, { force: true });
        try {
            const socket = { user: { id: '22412345678@s.whatsapp.net' } };
            await createPurgeCase(socket, groupA, {
                reporterId: 'reporter@s.whatsapp.net',
                description: 'File-backed report'
            });

            const restored = await readGroupPurgeState(
                { user: { id: '22412345678@s.whatsapp.net' } },
                groupA
            );
            const otherAccount = await readGroupPurgeState(
                { user: { id: '22499999999@s.whatsapp.net' } },
                groupA
            );
            expect(restored.cases[0].description).toBe('File-backed report');
            expect(otherAccount.cases).toEqual([]);
        } finally {
            await fs.rm(filePath, { force: true });
        }
    });
});
