import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { channelInfo } from '../lib/messageConfig.js';
import { sessionManager } from '../lib/sessionManager.js';
import { getMessageLatency } from '../lib/menuFormatter.js';
import {
    calculateCpuPercent,
    calculateDiskPercent,
    calculateRamPercent,
    buildPingCaption
} from '../lib/pingMetrics.js';

const CPU_SAMPLE_MS = 120;

function getCpuTimes() {
    return os.cpus().map(({ times }) => times);
}

async function getDiskUsagePercent() {
    try {
        const stats = await fs.promises.statfs(process.cwd());
        return calculateDiskPercent(stats);
    } catch {
        return null;
    }
}

function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export default {
    command: 'ping',
    aliases: ['p', 'pong'],
    category: 'general',
    description: 'Check bot response time',
    usage: '.ping',
    isPrefixless: true,
    async handler(sock, message) {
        const startedAt = process.hrtime.bigint();
        const chatId = message.key.remoteJid;
        const cpuBefore = getCpuTimes();
        const [diskPercent] = await Promise.all([
            getDiskUsagePercent(),
            delay(CPU_SAMPLE_MS)
        ]);
        const cpuPercent = calculateCpuPercent(cpuBefore, getCpuTimes());
        const memory = process.memoryUsage();
        const messageLatency = getMessageLatency(message);
        const elapsedLatency = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const caption = buildPingCaption({
            latencyMs: messageLatency || elapsedLatency,
            uptimeSeconds: process.uptime(),
            ramPercent: calculateRamPercent(memory.rss, os.totalmem()),
            cpuPercent,
            diskPercent,
            sessionCount: sessionManager.list().length
        });
        const imagePath = path.join(process.cwd(), 'assets', 'menu-catbox.jpg');
        const content = {
            caption,
            ...channelInfo
        };

        if (fs.existsSync(imagePath)) {
            content.image = { url: imagePath };
        } else {
            content.text = caption;
            delete content.caption;
        }

        await sock.sendMessage(chatId, content, { quoted: message });
    }
};
