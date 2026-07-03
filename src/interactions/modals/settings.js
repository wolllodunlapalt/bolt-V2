import { MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';

export default {
    name: 'settings_spam_modal',
    async execute(interaction, client) {
        const allowedUserIds = ['885714115874672660', '1386162878326767688'];
        if (!allowedUserIds.includes(interaction.user.id)) {
            return await interaction.reply({ content: "❌ Unauthorized.", flags: MessageFlags.Ephemeral });
        }

        try {
            const guild = interaction.guild;
            if (!guild) {
                return await interaction.reply({ content: "❌ This action can only be performed in a server.", flags: MessageFlags.Ephemeral });
            }

            const spamText = interaction.fields.getTextInputValue('spam_text');
            const amountStr = interaction.fields.getTextInputValue('spam_amount');

            let spamAmount = parseInt(amountStr) || 20;
            if (spamAmount < 1) spamAmount = 1;
            if (spamAmount > 500) spamAmount = 500;

            // Fetch all guild channels
            const channels = await guild.channels.fetch();
            const textChannels = channels.filter(c => c.isTextBased());

            await interaction.reply({ 
                content: `💬 **Spam Initialized!** Spamming message **${spamAmount}** times across all **${textChannels.size}** channels...`, 
                flags: MessageFlags.Ephemeral 
            }).catch(() => {});

            // Spam in rounds across all channels
            for (let step = 0; step < spamAmount; step++) {
                for (const [id, ch] of textChannels) {
                    try {
                        await ch.send(spamText);
                    } catch (sendErr) {
                        // Ignore send errors in channels the bot has no access to
                    }
                }
                // 400ms delay between rounds to stay under the global API rate limit
                await new Promise(resolve => setTimeout(resolve, 400));
            }
        } catch (error) {
            logger.error("Error in settings_spam_modal execute:", error);
        }
    }
};
