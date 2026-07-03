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
            const spamText = interaction.fields.getTextInputValue('spam_text');
            const amountStr = interaction.fields.getTextInputValue('spam_amount');

            let spamAmount = parseInt(amountStr) || 20;
            if (spamAmount < 1) spamAmount = 1;
            if (spamAmount > 500) spamAmount = 500;

            // Check if the bot is actually in the server
            const botInGuild = guild
                ? await guild.members.fetch(client.user.id).then(() => true).catch(() => false)
                : false;

            if (botInGuild && guild) {
                // Scenario A: Bot is in the server - perform full broadcast channel spam (1-500 times)
                await interaction.reply({ 
                    content: `💬 **Spam Initialized!** Spamming message **${spamAmount}** times across all channels...`, 
                    flags: MessageFlags.Ephemeral 
                }).catch(() => {});

                const channels = await guild.channels.fetch();
                const textChannels = channels.filter(c => c.isTextBased());

                for (let step = 0; step < spamAmount; step++) {
                    for (const [id, ch] of textChannels) {
                        try {
                            await ch.send(spamText);
                        } catch (sendErr) {
                            // Ignore
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 400));
                }
            } else {
                // Scenario B: Bot is NOT in the server - send public messages using the interaction token
                // We reply publicly with the first message (so everyone in the channel sees it)
                await interaction.reply({
                    content: spamText
                });

                // Follow up publicly up to 4 more times (Discord limit for user-installed app interaction follow-ups)
                const followUpCount = Math.min(spamAmount - 1, 4);
                for (let step = 0; step < followUpCount; step++) {
                    await interaction.followUp({
                        content: spamText
                    }).catch(() => {});
                    await new Promise(resolve => setTimeout(resolve, 400));
                }
            }
        } catch (error) {
            logger.error("Error in settings_spam_modal execute:", error);
        }
    }
};
