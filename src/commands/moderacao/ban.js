import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Logger } from '../../utils/logger.js';
import { query } from '../../database/database.js';
import { logAudit } from '../../utils/audit.js';

const logger = new Logger('COMMAND');

const command = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('🚫 Banir um usuário do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuário a banir')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('motivo')
        .setDescription('Motivo do ban')
        .setRequired(false)
    ),

  permissions: [PermissionFlagsBits.BanMembers],

  async execute(interaction, client) {
    const { guild, options, user } = interaction;
    const targetUser = options.getUser('usuario');
    const reason = options.getString('motivo') || 'Sem motivo especificado';

    try {
      // Verificar se o bot pode banir
      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!member) {
        return interaction.reply({
          content: '❌ Usuário não encontrado no servidor',
          ephemeral: true,
        });
      }

      // Banir usuário
      await guild.members.ban(targetUser.id, { reason });

      // Registrar ação
      await logAudit(guild.id, user.id, 'ban', reason, targetUser.id);

      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('✅ Usuário Banido')
        .addFields(
          { name: 'Usuário', value: targetUser.tag, inline: true },
          { name: 'Moderador', value: user.tag, inline: true },
          { name: 'Motivo', value: reason, inline: false }
        )
        .setFooter({ text: 'Grupo Legacy' });

      await interaction.reply({
        embeds: [embed],
        ephemeral: false,
      });

      // Enviar para logs
      const config = await query('SELECT * FROM guild_config WHERE guild_id = $1', [guild.id]);
      if (config[0]?.log_channel_id) {
        try {
          const logChannel = await guild.channels.fetch(config[0].log_channel_id);
          await logChannel.send({ embeds: [embed] });
        } catch (error) {
          logger.warn('Erro ao enviar log:', error);
        }
      }
    } catch (error) {
      logger.error('Erro ao banir usuário:', error);
      await interaction.reply({
        content: '❌ Erro ao banir o usuário. Tente novamente.',
        ephemeral: true,
      });
    }
  },
};

export default command;
