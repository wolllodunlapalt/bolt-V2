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

      // --- Per-guild registration (instant, works in servers the bot has joined) ---
      startupLog(`Registering commands in all ${client.guilds.cache.size} guild(s)...`);
      const registrationResults = await Promise.allSettled(
        client.guilds.cache.map(guild => registerCommandsForGuild(client, guild))
      );
      const failed = registrationResults.filter(r => r.status === 'rejected').length;
      startupLog(`Guild registration complete — ${client.guilds.cache.size - failed} succeeded, ${failed} failed`);

      // --- Global registration (required for user-install to work in ANY server) ---
      // This is what makes /advanced-announcement show up when added to your account.
      // Discord caches global commands, so this is a one-time propagation (up to 1 hour first time).
      try {
        startupLog('Registering commands globally for user-install support...');
        const globalCommands = [...client.commands.values()]
          .filter(cmd => cmd.data && typeof cmd.data.toJSON === 'function')
          .map(cmd => cmd.data.toJSON())
          .slice(0, 100);

        await client.application.commands.set(globalCommands);
        startupLog(`Global registration complete — ${globalCommands.length} commands registered`);
      } catch (globalErr) {
        logger.error('Failed to register global commands (user-install may not work):', globalErr);
      }

      const reconciliationSummary = await reconcileReactionRoleMessages(client);
      startupLog(
        `Reaction role reconciliation: scanned ${reconciliationSummary.scannedMessages}, removed ${reconciliationSummary.removedMessages}, errors ${reconciliationSummary.errors}`
      );
    } catch (error) {
      logger.error("Error in ready event:", error);
    }
  },
};
