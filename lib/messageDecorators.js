import { getChannelInfo } from './messageConfig.js';

export const SLOW_XV_FOOTER = '╰─❮ 𓆩 𝗦ʟᴏᴡ-XV 𓆪 ❯';
const LEGACY_BOT_BRAND = /\bMEGA(?:[\s-]?MDX?)\b/gi;

function decorateText(value) {
    if (typeof value !== 'string' || !value.trim()) return value;
    const text = value.replace(LEGACY_BOT_BRAND, 'SLOW-XV');
    return text.includes(SLOW_XV_FOOTER) ? text : `${text}\n\n${SLOW_XV_FOOTER}`;
}

export function decorateOutboundMessage(content, channelInfo = getChannelInfo()) {
    if (!content || typeof content !== 'object' || Buffer.isBuffer(content) || ArrayBuffer.isView(content)) {
        return content;
    }

    const decorated = { ...content };
    if (typeof decorated.text === 'string') decorated.text = decorateText(decorated.text);
    if (typeof decorated.caption === 'string') decorated.caption = decorateText(decorated.caption);

    const channelContext = channelInfo?.contextInfo;
    if (!channelContext) return decorated;

    const existingContext = decorated.contextInfo && typeof decorated.contextInfo === 'object'
        ? decorated.contextInfo
        : {};
    decorated.contextInfo = {
        ...channelContext,
        ...existingContext,
        forwardingScore: Math.max(
            Number(channelContext.forwardingScore) || 0,
            Number(existingContext.forwardingScore) || 0
        ),
        isForwarded: existingContext.isForwarded === true || channelContext.isForwarded === true,
        forwardedNewsletterMessageInfo: existingContext.forwardedNewsletterMessageInfo
            || channelContext.forwardedNewsletterMessageInfo
    };
    return decorated;
}
