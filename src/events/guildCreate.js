import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { registerCommandsForGuild } from '../handlers/commandLoader.js';

export default {
    name: Events.GuildCreate,

    /**
     * Fires whenever the bot is invited to and joins a new guild.
     * Instantly registers all slash commands in that guild so they
     * appear immediately without any global propagation delay.
     */
    async execute(guild, client) {
        logger.info(`Bot joined new guild: ${guild.name} (${guild.id}) — auto-registering commands...`);
        await registerCommandsForGuild(client, guild);
    }
};
