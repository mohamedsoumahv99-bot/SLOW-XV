import { describe, expect, it, vi } from 'vitest';
import addInfoPurge from '../../plugins/addinfopurge.js';
import purgeCase from '../../plugins/purgecase.js';
import purgeEvidence from '../../plugins/purgeevidence.js';
import purgeInfo from '../../plugins/purgeinfo.js';
import purgeMenu from '../../plugins/purgemenu.js';
import purgeReport from '../../plugins/purgereport.js';
import purgeSearch from '../../plugins/purgesearch.js';
import { readGroupPurgeState } from '../../lib/purgeCases.js';
import config from '../../config.js';

function makeStore() {
    const values = new Map();
    return {
        async getSetting(chatId, key) {
            return values.get(`${chatId}:${key}`) ?? null;
        },
        async saveSetting(chatId, key, value) {
            values.set(`${chatId}:${key}`, structuredClone(value));
        }
    };
}

function makeSocket({ senderIsAdmin = false, senderId } = {}) {
    const chatId = '120363000000000001@g.us';
    const sender = senderId || (senderIsAdmin ? 'admin@s.whatsapp.net' : 'member@s.whatsapp.net');
    const participants = [
        { id: 'admin@s.whatsapp.net', admin: 'admin' },
        { id: 'member@s.whatsapp.net', admin: null }
    ];
    const sent = [];
    const sock = {
        user: { id: 'bot@s.whatsapp.net' },
        sessionStore: makeStore(),
        groupMetadata: vi.fn(async () => ({ participants })),
        sendMessage: vi.fn(async (jid, content, options) => {
            sent.push({ jid, content, options });
            return {};
        }),
        _sent: sent
    };
    const message = {
        key: { remoteJid: chatId, participant: sender, id: 'message-1' },
        message: { conversation: '' }
    };
    const context = {
        chatId,
        senderId: sender,
        senderIsOwnerOrSudo: false,
        channelInfo: {}
    };
    return { sock, message, context, chatId, sender };
}

describe('safe group moderation commands', () => {
    it('creates a report and limits public output to its case number', async () => {
        const { sock, message, context, chatId } = makeSocket();
        await purgeReport.handler(sock, message, ['Suspicious', 'link'], context);

        const state = await readGroupPurgeState(sock, chatId);
        expect(sock._sent.at(-1).content.text).toContain('dossier #1');
        expect(state.cases).toHaveLength(1);
        expect(state.cases[0].description).toBe('Suspicious link');
    });

    it('allows only group admins to configure information and inspect cases', async () => {
        const { sock, message, context, chatId } = makeSocket();
        await addInfoPurge.handler(sock, message, ['Report', 'issues', 'to', 'admins'], context);
        expect(sock._sent.at(-1).content.text).toContain('Seuls les administrateurs');

        const admin = makeSocket({ senderIsAdmin: true });
        await addInfoPurge.handler(admin.sock, admin.message, ['Contact', 'the', 'admins'], admin.context);
        await purgeInfo.handler(admin.sock, admin.message, [], admin.context);
        expect(admin.sock._sent.at(-1).content.text).toContain('Contact the admins');

        await purgeCase.handler(sock, message, [], context);
        expect(sock._sent.at(-1).content.text).toContain('Seuls les administrateurs');
        expect(chatId).toBe('120363000000000001@g.us');
    });

    it('lets a reporter add HTTPS evidence only to their own open case', async () => {
        const reporter = makeSocket();
        await purgeReport.handler(reporter.sock, reporter.message, ['Needs', 'review'], reporter.context);
        await purgeEvidence.handler(
            reporter.sock,
            reporter.message,
            ['1', 'https://example.com/evidence.jpg'],
            reporter.context
        );
        expect(reporter.sock._sent.at(-1).content.text).toContain('a été ajouté');

        const otherMember = makeSocket({ senderId: 'other@s.whatsapp.net' });
        await purgeEvidence.handler(
            reporter.sock,
            otherMember.message,
            ['1', 'https://example.com/other.jpg'],
            otherMember.context
        );
        expect(reporter.sock._sent.at(-1).content.text).toContain('ton propre signalement');

        const invalidUrl = makeSocket();
        await purgeEvidence.handler(
            invalidUrl.sock,
            invalidUrl.message,
            ['1', 'http://example.com/evidence.jpg'],
            invalidUrl.context
        );
        expect(invalidUrl.sock._sent.at(-1).content.text).toContain('HTTPS');
    });

    it('supports admin search and case closure without group actions', async () => {
        const admin = makeSocket({ senderIsAdmin: true });
        await purgeReport.handler(admin.sock, admin.message, ['Repeated', 'scam', 'link'], admin.context);
        await purgeSearch.handler(admin.sock, admin.message, ['scam'], admin.context);
        expect(admin.sock._sent.at(-1).content.text).toContain('#1');

        await purgeCase.handler(admin.sock, admin.message, ['close', '1'], admin.context);
        expect(admin.sock._sent.at(-1).content.text).toContain('a été fermé');
        expect(admin.sock.groupParticipantsUpdate).toBeUndefined();
    });

    it('shows only implemented safe commands in the menu', async () => {
        const { sock, message, context } = makeSocket();
        await purgeMenu.handler(sock, message, [], context);
        const caption = sock._sent.at(-1).content.caption;
        expect(caption).toContain('purgereport');
        expect(caption).toContain('purgeevidence');
        expect(caption).not.toMatch(/kickall|kickpurge|spamgroup/i);
        expect(sock._sent.at(-1).content.image.url).toContain('assets/menu-catbox.jpg');
    });

    it('forwards a safe channel menu but ignores a channel post advertising group purges', async () => {
        const safeSource = {
            key: {
                remoteJid: config.newsletterJid,
                id: 'safe-menu',
                server_id: '42',
                fromMe: false
            },
            message: {
                imageMessage: {
                    caption: 'purgereport purgecase purgeevidence purgeinfo addinfopurge purgesearch'
                }
            }
        };
        const safe = makeSocket();
        safe.sock.store = { messages: { [config.newsletterJid]: [safeSource] } };
        await purgeMenu.handler(safe.sock, safe.message, [], safe.context);
        expect(safe.sock._sent).toHaveLength(1);
        expect(safe.sock._sent[0].content.forward).toBe(safeSource);

        const unsafeSource = {
            ...safeSource,
            key: { ...safeSource.key, id: 'unsafe-menu', server_id: '43' },
            message: {
                imageMessage: {
                    caption: 'purgereport purgecase purgeevidence purgeinfo addinfopurge purgesearch kickall2'
                }
            }
        };
        const fallback = makeSocket();
        fallback.sock.store = { messages: { [config.newsletterJid]: [unsafeSource] } };
        await purgeMenu.handler(fallback.sock, fallback.message, [], fallback.context);
        expect(fallback.sock._sent[0].content.forward).toBeUndefined();
        expect(fallback.sock._sent[0].content.caption).toContain('PURGE MENU');
    });
});
