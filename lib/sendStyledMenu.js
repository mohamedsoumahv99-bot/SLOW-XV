import config from '../config.js';
import { forwardLatestNewsletterPost } from './menuNewsletter.js';
import { isPrimaryMenuPost } from './menuSafety.js';

export async function sendStyledMenu(sock, { chatId }) {
    try {
        // One native forward contains the original image, caption, and channel attribution.
        return await forwardLatestNewsletterPost(sock, {
            chatId,
            newsletterJid: config.newsletterJid,
            isValidPost: isPrimaryMenuPost
        });
    }
    catch (error) {
        // Do not replace a failed channel forward with split or misleading menu messages.
        console.warn('Could not forward the SLOW-XV menu post:', error.message);
        return false;
    }
}
