import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Logger } from '../../utils/logger.js';
import { query } from '../../database/database.js';
import { logAudit, addWarning } from '../../utils/audit.js';

const logger = new Logger('COMMAND');

const command = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('⚠️ Dar um aviso a um usuário')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuário a avisar')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('motivo')
        .setDescription('Motivo do aviso')
        .setRequired(true)
    ),

  permissions: [PermissionFlagsBits.ModerateMembers],

  async execute(interaction, client) {
    const { guild, options, user } = interaction;
    const targetUser = options.getUser('usuario');
    const reason = options.getString('motivo');

    try {
      // Adicionar aviso
      await addWarning(guild.id, targetUser.id, user.id, reason);

      const embed = new EmbedBuilder()
        .setColor('#ffff00')
        .setTitle('⚠️ Aviso Registrado')
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

      // Tentar notificar o usuário
      try {
        await targetUser.send({
          content: `⚠️ Você recebeu um aviso em **${guild.name}**\n**Motivo:** ${reason}`,
        });
      } catch (error) {
        logger.warn('Não foi possível enviar mensagem privada');
      }
    } catch (error) {
      logger.error('Erro ao avisar usuário:', error);
      await interaction.reply({
        content: '❌ Erro ao registrar aviso. Tente novamente.',
        ephemeral: true,
      });
    }
  },
};

export default command;
