import axios from 'axios';
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
const COVER_TOP = 56;
const COVER_WIDTH = IMAGE_WIDTH - SIDE_MARGIN * 2;
const MIN_COVER_HEIGHT = 360;
const MAX_COVER_HEIGHT = 720;
const MENU_COVER_URL = 'https://n.uguu.se/cFgQUpOx.jpg';

let menuCoverPromise;

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

function renderColumn(lines, x, topMargin) {
    return lines.map((line, index) => {
        const y = topMargin + (index + 1) * LINE_HEIGHT;
        const isHeading = line.startsWith('╭─') || line.startsWith('> ©');
        const color = isHeading ? '#9ee7ff' : '#edf5ff';
        const weight = isHeading ? 700 : 400;
        const size = index === 0 && x === SIDE_MARGIN ? 27 : FONT_SIZE;
        return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}">${escapeXml(line)}</text>`;
    }).join('');
}

export function createMenuImageSvg(text, { bannerHeight = 0 } = {}) {
    const lines = String(text ?? '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .flatMap(wrapLine);
    const splitAt = findColumnBreak(lines);
    const leftColumn = lines.slice(0, splitAt);
    const rightColumn = lines.slice(splitAt);
    const rows = Math.max(leftColumn.length, rightColumn.length, 1);
    const topMargin = bannerHeight
        ? COVER_TOP + bannerHeight + 68
        : TOP_MARGIN;
    const height = Math.max(640, topMargin + rows * LINE_HEIGHT + BOTTOM_MARGIN);
    const rightX = SIDE_MARGIN + COLUMN_WIDTH + COLUMN_GAP;
    const coverPlaceholder = bannerHeight
        ? `<rect x="${SIDE_MARGIN}" y="${COVER_TOP}" width="${COVER_WIDTH}" height="${bannerHeight}" rx="28" fill="#15233b" stroke="#31c9e8" stroke-opacity=".75" stroke-width="3"/>`
        : '';
    const menuTitle = bannerHeight
        ? `<text x="${SIDE_MARGIN}" y="${COVER_TOP + bannerHeight + 42}" fill="#9ee7ff" font-size="24" font-weight="700">SLOW-XV · FULL COMMAND MENU</text>`
        : '';

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${IMAGE_WIDTH}" height="${height}" viewBox="0 0 ${IMAGE_WIDTH} ${height}">`,
        '<defs><linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#101a35"/><stop offset="1" stop-color="#07101f"/></linearGradient></defs>',
        `<rect width="${IMAGE_WIDTH}" height="${height}" rx="42" fill="url(#background)"/>`,
        `<rect x="32" y="32" width="${IMAGE_WIDTH - 64}" height="${height - 64}" rx="28" fill="none" stroke="#31c9e8" stroke-opacity=".48" stroke-width="2"/>`,
        `<path d="M${SIDE_MARGIN} 62h180" stroke="#31c9e8" stroke-width="5" stroke-linecap="round"/>`,
        coverPlaceholder,
        menuTitle,
        `<g font-family="Arial, 'Noto Sans', sans-serif" xml:space="preserve">${renderColumn(leftColumn, SIDE_MARGIN, topMargin)}${renderColumn(rightColumn, rightX, topMargin)}</g>`,
        '</svg>'
    ].join('');
}

async function fetchMenuCoverImage() {
    const response = await axios.get(MENU_COVER_URL, {
        responseType: 'arraybuffer',
        timeout: 10000,
        maxContentLength: 8 * 1024 * 1024,
        maxBodyLength: 8 * 1024 * 1024
    });

    const contentType = response.headers['content-type'] || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
        throw new Error('Menu cover URL did not return an image.');
    }

    const contentLength = Number(response.headers['content-length']);
    if (Number.isFinite(contentLength) && contentLength > 8 * 1024 * 1024) {
        throw new Error('Menu cover image is larger than 8 MB.');
    }

    const image = Buffer.from(response.data);
    if (!image.length || image.length > 8 * 1024 * 1024) {
        throw new Error('Menu cover image is empty or larger than 8 MB.');
    }

    const metadata = await sharp(image, { limitInputPixels: 30_000_000 }).metadata();
    if (!metadata.width || !metadata.height) {
        throw new Error('Menu cover image could not be decoded.');
    }
    return image;
}

export function loadMenuCoverImage() {
    if (!menuCoverPromise) {
        menuCoverPromise = fetchMenuCoverImage().catch((error) => {
            menuCoverPromise = undefined;
            throw error;
        });
    }
    return menuCoverPromise;
}

export async function renderMenuImage(text, { coverImage } = {}) {
    const imageBuffer = coverImage ? Buffer.from(coverImage) : null;
    let bannerHeight = 0;
    let coverMetadata;

    if (imageBuffer) {
        coverMetadata = await sharp(imageBuffer, { limitInputPixels: 30_000_000 }).metadata();
        if (!coverMetadata.width || !coverMetadata.height) {
            throw new Error('Menu cover image could not be decoded.');
        }
        const imageHeight = Math.round(COVER_WIDTH / (coverMetadata.width / coverMetadata.height));
        bannerHeight = Math.min(MAX_COVER_HEIGHT, Math.max(MIN_COVER_HEIGHT, imageHeight));
    }

    const svg = createMenuImageSvg(text, { bannerHeight });
    const baseImage = await sharp(Buffer.from(svg), { limitInputPixels: 100_000_000 })
        .png({ compressionLevel: 9 })
        .toBuffer();

    if (!imageBuffer) return baseImage;

    const cover = await sharp(imageBuffer, { limitInputPixels: 30_000_000 })
        .resize(COVER_WIDTH, bannerHeight, {
            fit: 'contain',
            background: '#15233b'
        })
        .png()
        .toBuffer();
    const roundedMask = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${COVER_WIDTH}" height="${bannerHeight}"><rect width="${COVER_WIDTH}" height="${bannerHeight}" rx="28" fill="#fff"/></svg>`
    );
    const roundedCover = await sharp(cover)
        .composite([{ input: roundedMask, blend: 'dest-in' }])
        .png()
        .toBuffer();

    return sharp(baseImage)
        .composite([{ input: roundedCover, left: SIDE_MARGIN, top: COVER_TOP }])
        .png({ compressionLevel: 9 })
        .toBuffer();
}
