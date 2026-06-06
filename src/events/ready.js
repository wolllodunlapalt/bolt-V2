import { Events } from "discord.js";
import { logger, startupLog } from "../utils/logger.js";
import config from "../config/application.js";
import { reconcileReactionRoleMessages } from "../services/reactionRoleService.js";
import { registerCommandsForGuild } from "../handlers/commandLoader.js";

export default {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    try {
      client.user.setPresence(config.bot.presence);

      startupLog(`Ready! Logged in as ${client.user.tag}`);
      startupLog(`Serving ${client.guilds.cache.size} guild(s)`);
      startupLog(`Loaded ${client.commands.size} commands`);

      // Register commands in every guild the bot is already in so they
      // appear instantly without waiting for global propagation.
      startupLog(`Registering commands in all ${client.guilds.cache.size} guild(s)...`);
      const registrationResults = await Promise.allSettled(
        client.guilds.cache.map(guild => registerCommandsForGuild(client, guild))
      );
      const failed = registrationResults.filter(r => r.status === 'rejected').length;
      startupLog(`Command registration complete — ${client.guilds.cache.size - failed} succeeded, ${failed} failed`);

      const reconciliationSummary = await reconcileReactionRoleMessages(client);
      startupLog(
        `Reaction role reconciliation: scanned ${reconciliationSummary.scannedMessages}, removed ${reconciliationSummary.removedMessages}, errors ${reconciliationSummary.errors}`
      );
    } catch (error) {
      logger.error("Error in ready event:", error);
    }
  },
};



