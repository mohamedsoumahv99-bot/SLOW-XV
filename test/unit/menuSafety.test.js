import { describe, expect, it } from 'vitest';
import {
    containsDisallowedMenuCommand,
    isDisallowedMenuCommand,
    isPrimaryMenuPost,
    isSafePurgeMenuPost
} from '../../lib/menuSafety.js';

function makePost(caption, { image = true } = {}) {
    return {
        key: {
            remoteJid: '120363424782348922@newsletter',
            server_id: '42'
        },
        message: image
            ? { imageMessage: { caption } }
            : { conversation: caption }
    };
}

const primaryMenuCaption = [
    '╭─〔 *SLOW-XV* 🤖〕➤',
    '👑 Owner : VArnox',
    'Commands : 269',
    '╭─〔 SYSTEM STATS 〕➤'
].join('\n');

const safePurgeCaption = [
    '╭─〔 *SLOW-XV* 🤖〕➤',
    '╭─〔 *PURGE MENU* 🤖〕➤',
    'purgereport purgecase purgeevidence',
    '╭─〔 *PURGE-INFO* 📢〕➤',
    'purgeinfo addinfopurge purgesearch'
].join('\n');

describe('newsletter menu safety validation', () => {
    it('accepts an illustrated main menu and rejects news or text-only posts', () => {
        expect(isPrimaryMenuPost(makePost(primaryMenuCaption))).toBe(true);
        expect(isPrimaryMenuPost(makePost('SLOW-XV latest news'))).toBe(false);
        expect(isPrimaryMenuPost(makePost(primaryMenuCaption, { image: false }))).toBe(false);
    });

    it('rejects bulk group actions in plain or small-caps text', () => {
        expect(containsDisallowedMenuCommand('Try .kickall2 now')).toBe(true);
        expect(containsDisallowedMenuCommand('ᴋɪᴄᴋᴀʟʟ · sᴘᴀᴍɢʀᴏᴜᴘ')).toBe(true);
        expect(isDisallowedMenuCommand('kickpurge')).toBe(true);
        expect(containsDisallowedMenuCommand('purgereport and purgecase')).toBe(false);
    });

    it('accepts only illustrated purge menus containing the safe reporting commands', () => {
        expect(isSafePurgeMenuPost(makePost(safePurgeCaption))).toBe(true);
        expect(isSafePurgeMenuPost(makePost(safePurgeCaption, { image: false }))).toBe(false);
        expect(isSafePurgeMenuPost(makePost(safePurgeCaption + '\nᴋɪᴄᴋᴀʟʟ'))).toBe(false);
    });
});
