import { describe, expect, it } from 'vitest';
import { decorateOutboundMessage, SLOW_XV_FOOTER } from '../../lib/messageDecorators.js';

describe('outbound SLOW-XV styling', () => {
    it('rebrands legacy bot names, adds the style footer and channel forward metadata', () => {
        const content = {
            text: 'Powered by MEGA-MD',
            contextInfo: { mentionedJid: ['224123@s.whatsapp.net'] }
        };
        const decorated = decorateOutboundMessage(content);

        expect(decorated.text).toContain('Powered by SLOW-XV');
        expect(decorated.text).toContain(SLOW_XV_FOOTER);
        expect(decorated.contextInfo.isForwarded).toBe(true);
        expect(decorated.contextInfo.forwardedNewsletterMessageInfo.newsletterJid).toContain('@newsletter');
        expect(decorated.contextInfo.mentionedJid).toEqual(['224123@s.whatsapp.net']);
        expect(content.text).toBe('Powered by MEGA-MD');
    });

    it('decorates media captions without duplicating an existing footer', () => {
        const decorated = decorateOutboundMessage({ caption: `Photo\n\n${SLOW_XV_FOOTER}` });
        expect(decorated.caption.split(SLOW_XV_FOOTER)).toHaveLength(2);
    });
});
