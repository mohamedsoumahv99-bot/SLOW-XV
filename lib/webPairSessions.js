const VISIBLE_PHONE_DIGITS = 3;
const MASKED_PHONE_SUFFIX = '••••••';

export function maskPhoneNumber(phoneNumber) {
    const raw = String(phoneNumber ?? '').trim();
    const digits = raw.replace(/\D/g, '');
    const visiblePrefix = digits.length > VISIBLE_PHONE_DIGITS
        ? digits.slice(0, VISIBLE_PHONE_DIGITS)
        : '';
    const internationalPrefix = raw.startsWith('+') ? '+' : '';

    return `${internationalPrefix}${visiblePrefix}${MASKED_PHONE_SUFFIX}`;
}

export function toWebPairSession(record, { includePairingCode = false } = {}) {
    const summary = {
        phoneNumber: maskPhoneNumber(record?.phoneNumber),
        status: typeof record?.status === 'string' ? record.status : 'unknown',
        connected: typeof record?.connected === 'boolean'
            ? record.connected
            : record?.status === 'connected'
    };

    if (includePairingCode && typeof record?.pairingCode === 'string' && record.pairingCode) {
        summary.pairingCode = record.pairingCode;
    }

    return summary;
}
