export function formatUptime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainingSeconds = total % 60;

    if (days) return `${days}d:${hours}h:${minutes}m:${remainingSeconds}s`;
    if (hours) return `${hours}h:${minutes}m:${remainingSeconds}s`;
    return `${minutes}m:${remainingSeconds}s`;
}

export function formatPercent(value) {
    if (value === null || value === undefined || value === '') return 'N/A';
    const percent = Number(value);
    return Number.isFinite(percent) ? `${Math.max(0, percent).toFixed(1)}%` : 'N/A';
}

export function calculateRamPercent(usedBytes, totalBytes) {
    const used = Number(usedBytes);
    const total = Number(totalBytes);
    if (!Number.isFinite(used) || !Number.isFinite(total) || total <= 0) return null;
    return (used / total) * 100;
}

export function calculateCpuPercent(before, after) {
    if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length || before.length === 0) {
        return null;
    }

    let totalDelta = 0;
    let idleDelta = 0;
    for (let index = 0; index < before.length; index += 1) {
        const beforeTimes = before[index];
        const afterTimes = after[index];
        const beforeTotal = Object.values(beforeTimes || {}).reduce((sum, value) => sum + Number(value || 0), 0);
        const afterTotal = Object.values(afterTimes || {}).reduce((sum, value) => sum + Number(value || 0), 0);
        totalDelta += Math.max(0, afterTotal - beforeTotal);
        idleDelta += Math.max(0, Number(afterTimes?.idle || 0) - Number(beforeTimes?.idle || 0));
    }

    if (totalDelta <= 0) return null;
    return Math.min(100, Math.max(0, ((totalDelta - idleDelta) / totalDelta) * 100));
}

export function calculateDiskPercent(stats) {
    const blocks = Number(stats?.blocks);
    const availableBlocks = Number(stats?.bfree);
    if (!Number.isFinite(blocks) || !Number.isFinite(availableBlocks) || blocks <= 0) return null;
    return ((blocks - availableBlocks) / blocks) * 100;
}

export function buildPingCaption({
    latencyMs,
    uptimeSeconds,
    ramPercent,
    cpuPercent,
    diskPercent,
    sessionCount
}) {
    const latency = Number.isFinite(Number(latencyMs)) ? Math.max(0, Number(latencyMs)) : 0;
    const sessions = Number.isFinite(Number(sessionCount)) ? Math.max(0, Math.floor(Number(sessionCount))) : 0;

    return [
        `🔎 *Pong : ${latency.toFixed(3)}ms*`,
        '',
        '*SLOW-XV ♪ SYSTEM STATS*',
        '',
        `➜   *𝗨ᴘᴛɪᴍᴇ* : ${formatUptime(uptimeSeconds)}`,
        `➜   *𝗥ᴀᴍ* : ${formatPercent(ramPercent)}`,
        `➜   *𝗖ᴘᴜ* : ${formatPercent(cpuPercent)}`,
        `➜   *𝗗ɪsᴋ* : ${formatPercent(diskPercent)}`,
        `➜   *𝗦ᴇssɪᴏɴs* : ${sessions}`
    ].join('\n');
}
