import { describe, expect, it } from 'vitest';
import { COMMAND_REACTION_MAP, getCommandReactionEmoji } from '../../lib/reactions.js';

describe('SLOW-XV command reaction map', () => {
    it('contains one reaction for each of the 268 listed commands', () => {
        expect(Object.keys(COMMAND_REACTION_MAP)).toHaveLength(268);
        expect(Object.values(COMMAND_REACTION_MAP).every(emoji => typeof emoji === 'string' && emoji.length > 0)).toBe(true);
    });

    it('returns the configured emoji case-insensitively and falls back for unknown commands', () => {
        expect(getCommandReactionEmoji('addreply')).toBe('💬');
        expect(getCommandReactionEmoji('SORA')).toBe('🎬');
        expect(getCommandReactionEmoji('8ball')).toBe('🎱');
        expect(getCommandReactionEmoji('not-in-the-map')).toBe('⏳');
    });
});
