import { Logger } from '../../utils/logger.js';
import { query } from '../../database/database.js';
import { EmbedBuilder } from 'discord.js';

const logger = new Logger('BUTTON');

const button = {
  customId: 'ticket_fechar',
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

      const t = ticket[0];

      // Atualizar status
      await query(
        'UPDATE tickets SET status = $1, closed_at = NOW() WHERE id = $2',
        ['closed', t.id]
      );

      // Arquivar canal
      await channel.edit({
        name: `ticket-${t.ticket_number}-fechado`,
        archived: true,
      });

      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🔒 Ticket Fechado')
        .setDescription(`Ticket #${t.ticket_number} foi fechado.`)
        .setFooter({ text: 'Grupo Legacy' });

      await interaction.reply({
        embeds: [embed],
      });

      logger.info(`🔒 Ticket #${t.ticket_number} fechado`);
    } catch (error) {
      logger.error('Erro ao fechar ticket:', error);
      await interaction.reply({
        content: '❌ Erro ao fechar o ticket.',
        ephemeral: true,
      });
    }
  },
};

export default button;
