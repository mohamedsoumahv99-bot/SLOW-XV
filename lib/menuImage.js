import sharp from 'sharp';

const IMAGE_WIDTH = 1800;
const SIDE_MARGIN = 72;
const COLUMN_GAP = 64;
const COLUMN_WIDTH = (IMAGE_WIDTH - SIDE_MARGIN * 2 - COLUMN_GAP) / 2;
const FONT_SIZE = 21;
const LINE_HEIGHT = 32;
const TOP_MARGIN = 88;
const BOTTOM_MARGIN = 72;
const MAX_LINE_LENGTH = 62;

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function wrapLine(line) {
    const remaining = Array.from(String(line).replace(/[*`]/g, ''));
    if (!remaining.length) return [''];

    const wrapped = [];
    while (remaining.length > MAX_LINE_LENGTH) {
        let splitAt = MAX_LINE_LENGTH;
        for (let index = MAX_LINE_LENGTH; index > 0; index--) {
            if (remaining[index] === ' ') {
                splitAt = index;
                break;
            }
        }
        wrapped.push(remaining.splice(0, splitAt).join('').trimEnd());
        while (remaining[0] === ' ') remaining.shift();
    }
    wrapped.push(remaining.join(''));
    return wrapped;
}

function findColumnBreak(lines) {
    const target = Math.ceil(lines.length / 2);
    for (let distance = 0; distance < Math.min(lines.length, 40); distance++) {
        for (const candidate of [target + distance, target - distance]) {
            if (
                candidate > 0 &&
                candidate < lines.length &&
                lines[candidate - 1] === ''
            ) {
                return candidate;
            }
        }
    }
    return target;
}

function renderColumn(lines, x) {
    return lines.map((line, index) => {
        const y = TOP_MARGIN + (index + 1) * LINE_HEIGHT;
        const isHeading = line.startsWith('╭─') || line.startsWith('> ©');
        const color = isHeading ? '#9ee7ff' : '#edf5ff';
        const weight = isHeading ? 700 : 400;
        const size = index === 0 && x === SIDE_MARGIN ? 27 : FONT_SIZE;
        return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}">${escapeXml(line)}</text>`;
    }).join('');
}

export function createMenuImageSvg(text) {
    const lines = String(text ?? '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .flatMap(wrapLine);
    const splitAt = findColumnBreak(lines);
    const leftColumn = lines.slice(0, splitAt);
    const rightColumn = lines.slice(splitAt);
    const rows = Math.max(leftColumn.length, rightColumn.length, 1);
    const height = Math.max(640, TOP_MARGIN + rows * LINE_HEIGHT + BOTTOM_MARGIN);
    const rightX = SIDE_MARGIN + COLUMN_WIDTH + COLUMN_GAP;

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${IMAGE_WIDTH}" height="${height}" viewBox="0 0 ${IMAGE_WIDTH} ${height}">`,
        '<defs><linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#101a35"/><stop offset="1" stop-color="#07101f"/></linearGradient></defs>',
        `<rect width="${IMAGE_WIDTH}" height="${height}" rx="42" fill="url(#background)"/>`,
        `<rect x="32" y="32" width="${IMAGE_WIDTH - 64}" height="${height - 64}" rx="28" fill="none" stroke="#31c9e8" stroke-opacity=".48" stroke-width="2"/>`,
        `<path d="M${SIDE_MARGIN} 62h180" stroke="#31c9e8" stroke-width="5" stroke-linecap="round"/>`,
        `<g font-family="Arial, 'Noto Sans', sans-serif" xml:space="preserve">${renderColumn(leftColumn, SIDE_MARGIN)}${renderColumn(rightColumn, rightX)}</g>`,
        '</svg>'
    ].join('');
}

export async function renderMenuImage(text) {
    const svg = createMenuImageSvg(text);
    return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
