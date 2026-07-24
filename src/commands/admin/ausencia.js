import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Logger } from '../../utils/logger.js';
import { insert, query, queryOne, update } from '../../database/database.js';
import { logAudit } from '../../utils/audit.js';

const logger = new Logger('COMMAND');

const command = {
  data: new SlashCommandBuilder()
    .setName('ausencia')
    .setDescription('🏖️ Sistema de Ausências')
    .addSubcommand(sub =>
      sub
        .setName('solicitar')
        .setDescription('Solicitar ausência')
        .addStringOption(option =>
          option
            .setName('motivo')
            .setDescription('Motivo da ausência')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('dias')
            .setDescription('Número de dias')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(90)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('aprovar')
        .setDescription('Aprovar ausência de um membro')
        .addUserOption(option =>
          option
            .setName('membro')
            .setDescription('Membro')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('ID da ausência')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('rejeitar')
        .setDescription('Rejeitar ausência de um membro')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('ID da ausência')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('listar')
        .setDescription('Listar ausências pendentes')
    )
    .addSubcommand(sub =>
      sub
        .setName('minhas')
        .setDescription('Ver minhas ausências')
    ),

  async execute(interaction, client) {
    const { options, user, guild } = interaction;
    const subcommand = options.getSubcommand();

    switch (subcommand) {
      case 'solicitar':
        return handleSolicitar(interaction);
      case 'aprovar':
        return handleAprovar(interaction);
      case 'rejeitar':
        return handleRejeitar(interaction);
      case 'listar':
        return handleListar(interaction);
      case 'minhas':
        return handleMinhas(interaction);
    }
  },
};

/**
 * Solicitar ausência
 */
async function handleSolicitar(interaction) {
  const { guild, user, options } = interaction;
  const motivo = options.getString('motivo');
  const dias = options.getInteger('dias');

  try {
    const hoje = new Date();
    const fimData = new Date();
    fimData.setDate(fimData.getDate() + dias);

    const ausencia = await insert('absences', {
      guild_id: guild.id,
      user_id: user.id,
      reason: motivo,
      start_date: hoje.toISOString().split('T')[0],
      end_date: fimData.toISOString().split('T')[0],
      status: 'pending',
    });

    const embed = new EmbedBuilder()
      .setColor('#1a1a1a')
      .setTitle('🏖️ Solicitação de Ausência')
      .addFields(
        { name: 'Membro', value: user.tag, inline: true },
        { name: 'ID', value: ausencia.id.toString(), inline: true },
        { name: 'Dias', value: dias.toString(), inline: true },
        { name: 'Motivo', value: motivo, inline: false },
        { name: 'Data Início', value: hoje.toLocaleDateString('pt-BR'), inline: true },
        { name: 'Data Fim', value: fimData.toLocaleDateString('pt-BR'), inline: true },
        { name: 'Status', value: '⏳ Pendente', inline: true }
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });

    logger.info(`🏖️ Ausência solicitada por ${user.tag}: ${dias} dias`);
  } catch (error) {
    logger.error('Erro ao solicitar ausência:', error);
    await interaction.reply({
      content: '❌ Erro ao solicitar ausência.',
      ephemeral: true,
    });
  }
}

/**
 * Aprovar ausência
 */
async function handleAprovar(interaction) {
  const { guild, user, options } = interaction;
  const membro = options.getUser('membro');
  const id = options.getInteger('id');

  try {
    const ausencia = await queryOne(
      'SELECT * FROM absences WHERE id = $1 AND guild_id = $2',
      [id, guild.id]
    );

    if (!ausencia) {
      return interaction.reply({
        content: '❌ Ausência não encontrada.',
        ephemeral: true,
      });
    }

    // Atualizar status
    await update('absences', { status: 'approved', approved_by: user.id }, { id });

    await logAudit(guild.id, user.id, 'absence_approved', `${membro.tag} - ${ausencia.reason}`);

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Ausência Aprovada')
      .addFields(
        { name: 'Membro', value: membro.tag, inline: true },
        { name: 'Aprovado por', value: user.tag, inline: true },
        { name: 'Período', value: `${ausencia.start_date} até ${ausencia.end_date}`, inline: false }
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });

    logger.success(`✅ Ausência #${id} aprovada`);
  } catch (error) {
    logger.error('Erro ao aprovar ausência:', error);
    await interaction.reply({
      content: '❌ Erro ao aprovar ausência.',
      ephemeral: true,
    });
  }
}

/**
 * Rejeitar ausência
 */
async function handleRejeitar(interaction) {
  const { guild, user, options } = interaction;
  const id = options.getInteger('id');

  try {
    const ausencia = await queryOne(
      'SELECT * FROM absences WHERE id = $1 AND guild_id = $2',
      [id, guild.id]
    );

    if (!ausencia) {
      return interaction.reply({
        content: '❌ Ausência não encontrada.',
        ephemeral: true,
      });
    }

    // Atualizar status
    await update('absences', { status: 'rejected' }, { id });

    await logAudit(guild.id, user.id, 'absence_rejected', `Ausência #${id}`);

    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('❌ Ausência Rejeitada')
      .setDescription(`A solicitação de ausência foi rejeitada.`)
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });

    logger.info(`❌ Ausência #${id} rejeitada`);
  } catch (error) {
    logger.error('Erro ao rejeitar ausência:', error);
    await interaction.reply({
      content: '❌ Erro ao rejeitar ausência.',
      ephemeral: true,
    });
  }
}

/**
 * Listar ausências
 */
async function handleListar(interaction) {
  const { guild } = interaction;

  try {
    const ausencias = await query(
      'SELECT * FROM absences WHERE guild_id = $1 AND status = $2 ORDER BY created_at DESC',
      [guild.id, 'pending']
    );

    if (ausencias.length === 0) {
      return interaction.reply({
        content: '📭 Nenhuma ausência pendente.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#1a1a1a')
      .setTitle('🏖️ Ausências Pendentes')
      .setDescription(
        ausencias
          .map(
            a =>
              `**ID #${a.id}** - <@${a.user_id}>\n📅 ${a.start_date} até ${a.end_date}\n*${a.reason}*`
          )
          .join('\n\n')
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Erro ao listar ausências:', error);
    await interaction.reply({
      content: '❌ Erro ao listar ausências.',
      ephemeral: true,
    });
  }
}

/**
 * Ver minhas ausências
 */
async function handleMinhas(interaction) {
  const { guild, user } = interaction;

  try {
    const ausencias = await query(
      'SELECT * FROM absences WHERE guild_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 10',
      [guild.id, user.id]
    );

    if (ausencias.length === 0) {
      return interaction.reply({
        content: '📭 Você não tem ausências registradas.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#1a1a1a')
      .setTitle('🏖️ Minhas Ausências')
      .setDescription(
        ausencias
          .map(
            a =>
              `**${a.status.toUpperCase()}** - ${a.start_date} até ${a.end_date}\n*${a.reason}*`
          )
          .join('\n\n')
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Erro ao obter ausências:', error);
    await interaction.reply({
      content: '❌ Erro ao obter ausências.',
      ephemeral: true,
    });
  }
}

export default command;
