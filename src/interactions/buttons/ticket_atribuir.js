import { Logger } from '../../utils/logger.js';
import { query } from '../../database/database.js';
import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

const logger = new Logger('BUTTON');

const button = {
  customId: 'ticket_atribuir',
  async execute(interaction, client) {
    const { channel, guild, user } = interaction;

    try {
      const ticket = await query(
        'SELECT * FROM tickets WHERE channel_id = $1',
        [channel.id]
      );

      if (ticket.length === 0) {
        return interaction.reply({
          content: '❌ Este canal não é um ticket.',
          ephemeral: true,
        });
      }

      // Buscar membros do staff
      const staffMembers = await query(
        'SELECT * FROM staff_profiles WHERE guild_id = $1 AND status = $2 LIMIT 25',
        [guild.id, 'active']
      );

      if (staffMembers.length === 0) {
        return interaction.reply({
          content: '❌ Nenhum staff disponível para atribuição.',
          ephemeral: true,
        });
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_assign_staff')
        .setPlaceholder('Selecione um staff')
        .addOptions(
          staffMembers.map(s => ({
            label: `User ${s.user_id}`,
            value: s.user_id.toString(),
            description: s.position,
          }))
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await interaction.reply({
        content: 'Selecione um staff para atribuir este ticket:',
        components: [row],
        ephemeral: true,
      });
    } catch (error) {
      logger.error('Erro ao atribuir ticket:', error);
      await interaction.reply({
        content: '❌ Erro ao atribuir o ticket.',
        ephemeral: true,
      });
    }
  },
};

export default button;
