import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Logger } from '../../utils/logger.js';
import { insert, query, queryOne } from '../../database/database.js';
import { logAudit } from '../../utils/audit.js';

const logger = new Logger('COMMAND');

const command = {
  data: new SlashCommandBuilder()
    .setName('cga')
    .setDescription('⚖️ Corregedoria Geral Administrativa')
    .addSubcommand(sub =>
      sub
        .setName('painel')
        .setDescription('Abre o painel CGA')
    )
    .addSubcommand(sub =>
      sub
        .setName('ficha')
        .setDescription('Ver ficha administrativa de um membro')
        .addUserOption(option =>
          option
            .setName('membro')
            .setDescription('Membro')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('advertir')
        .setDescription('Advertir um membro')
        .addUserOption(option =>
          option
            .setName('membro')
            .setDescription('Membro a advertir')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('motivo')
            .setDescription('Motivo da advertência')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('suspender')
        .setDescription('Suspender um membro')
        .addUserOption(option =>
          option
            .setName('membro')
            .setDescription('Membro a suspender')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('motivo')
            .setDescription('Motivo da suspensão')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('dias')
            .setDescription('Dias de suspensão')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('demitir')
        .setDescription('Demitir um membro do staff')
        .addUserOption(option =>
          option
            .setName('membro')
            .setDescription('Membro a demitir')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('motivo')
            .setDescription('Motivo da demissão')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('historico')
        .setDescription('Ver histórico de um membro')
        .addUserOption(option =>
          option
            .setName('membro')
            .setDescription('Membro')
            .setRequired(true)
        )
    ),

  async execute(interaction, client) {
    const { options, user, guild } = interaction;
    const subcommand = options.getSubcommand();

    switch (subcommand) {
      case 'painel':
        return handlePainel(interaction);
      case 'ficha':
        return handleFicha(interaction);
      case 'advertir':
        return handleAdvertir(interaction);
      case 'suspender':
        return handleSuspender(interaction);
      case 'demitir':
        return handleDemitir(interaction);
      case 'historico':
        return handleHistorico(interaction);
    }
  },
};

/**
 * Painel CGA
 */
async function handlePainel(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#1a1a1a')
    .setTitle('⚖️ Corregedoria Geral Administrativa')
    .setDescription('Sistema administrativo completo do Grupo Legacy')
    .addFields(
      {
        name: '📋 Funções Disponíveis',
        value: `
✅ Ver Ficha Administrativa
✅ Advertir Membros
✅ Suspender Membros
✅ Demitir Membros
✅ Consultar Histórico
✅ Gerenciar Processos
        `,
      }
    )
    .setFooter({ text: 'Grupo Legacy - Ordem, disciplina e tecnologia' });

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/**
 * Ver ficha de um membro
 */
async function handleFicha(interaction) {
  const { guild, options } = interaction;
  const member = options.getUser('membro');

  try {
    // Obter dados
    const profile = await queryOne(
      'SELECT * FROM staff_profiles WHERE guild_id = $1 AND user_id = $2',
      [guild.id, member.id]
    );

    const warnings = await query(
      'SELECT COUNT(*) as count FROM warnings WHERE guild_id = $1 AND user_id = $2',
      [guild.id, member.id]
    );

    const punishments = await query(
      'SELECT COUNT(*) as count FROM punishments WHERE guild_id = $1 AND user_id = $2 AND expires_at > NOW()',
      [guild.id, member.id]
    );

    const embed = new EmbedBuilder()
      .setColor('#1a1a1a')
      .setTitle(`📋 Ficha de ${member.username}`)
      .setThumbnail(member.displayAvatarURL())
      .addFields(
        { name: 'Discord ID', value: member.id, inline: true },
        { name: 'Cargo', value: profile?.position || '❌ Não é Staff', inline: true },
        { name: 'Status', value: profile?.status || 'N/A', inline: true },
        { name: '⚠️ Avisos', value: warnings[0]?.count || '0', inline: true },
        { name: '🔴 Punições Ativas', value: punishments[0]?.count || '0', inline: true },
        { name: '📅 Contratado em', value: profile?.hired_at ? new Date(profile.hired_at).toLocaleDateString('pt-BR') : 'N/A', inline: true }
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Erro ao obter ficha:', error);
    await interaction.reply({
      content: '❌ Erro ao obter ficha do membro.',
      ephemeral: true,
    });
  }
}

/**
 * Advertir membro
 */
async function handleAdvertir(interaction) {
  const { guild, user, options } = interaction;
  const member = options.getUser('membro');
  const motivo = options.getString('motivo');

  try {
    // Adicionar aviso
    await insert('warnings', {
      guild_id: guild.id,
      user_id: member.id,
      moderator_id: user.id,
      reason: motivo,
    });

    // Registrar ação
    await insert('staff_history', {
      user_id: member.id,
      guild_id: guild.id,
      action: 'advertencia',
      reason: motivo,
      responsible_id: user.id,
    });

    await logAudit(guild.id, user.id, 'member_warned', motivo, member.id);

    const embed = new EmbedBuilder()
      .setColor('#ffff00')
      .setTitle('⚠️ Advertência Registrada')
      .addFields(
        { name: 'Membro', value: member.tag, inline: true },
        { name: 'Responsável', value: interaction.user.tag, inline: true },
        { name: 'Motivo', value: motivo, inline: false }
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });

    logger.info(`⚠️ ${member.tag} advertido por ${user.tag}`);
  } catch (error) {
    logger.error('Erro ao advertir:', error);
    await interaction.reply({
      content: '❌ Erro ao advertir o membro.',
      ephemeral: true,
    });
  }
}

/**
 * Suspender membro
 */
async function handleSuspender(interaction) {
  const { guild, user, options } = interaction;
  const member = options.getUser('membro');
  const motivo = options.getString('motivo');
  const dias = options.getInteger('dias') || 7;

  try {
    const duracao = dias * 24 * 60 * 60 * 1000; // Converter para ms

    // Adicionar punição
    await insert('punishments', {
      guild_id: guild.id,
      user_id: member.id,
      type: 'suspensao',
      moderator_id: user.id,
      reason: motivo,
      duration: duracao,
      expires_at: new Date(Date.now() + duracao),
    });

    // Registrar ação
    await insert('staff_history', {
      user_id: member.id,
      guild_id: guild.id,
      action: 'suspensao',
      reason: motivo,
      responsible_id: user.id,
    });

    await logAudit(guild.id, user.id, 'member_suspended', `${motivo} (${dias} dias)`, member.id);

    const embed = new EmbedBuilder()
      .setColor('#ff6600')
      .setTitle('⏸️ Membro Suspenso')
      .addFields(
        { name: 'Membro', value: member.tag, inline: true },
        { name: 'Duração', value: `${dias} dias`, inline: true },
        { name: 'Motivo', value: motivo, inline: false }
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });

    logger.info(`⏸️ ${member.tag} suspenso por ${dias} dias`);
  } catch (error) {
    logger.error('Erro ao suspender:', error);
    await interaction.reply({
      content: '❌ Erro ao suspender o membro.',
      ephemeral: true,
    });
  }
}

/**
 * Demitir membro
 */
async function handleDemitir(interaction) {
  const { guild, user, options } = interaction;
  const member = options.getUser('membro');
  const motivo = options.getString('motivo');

  try {
    // Atualizar perfil
    await query(
      'UPDATE staff_profiles SET status = $1 WHERE guild_id = $2 AND user_id = $3',
      ['demitido', guild.id, member.id]
    );

    // Registrar ação
    await insert('staff_history', {
      user_id: member.id,
      guild_id: guild.id,
      action: 'demissao',
      reason: motivo,
      responsible_id: user.id,
    });

    await logAudit(guild.id, user.id, 'member_dismissed', motivo, member.id);

    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('🚪 Membro Demitido')
      .addFields(
        { name: 'Membro', value: member.tag, inline: true },
        { name: 'Responsável', value: interaction.user.tag, inline: true },
        { name: 'Motivo', value: motivo, inline: false }
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });

    logger.info(`🚪 ${member.tag} demitido por ${user.tag}`);
  } catch (error) {
    logger.error('Erro ao demitir:', error);
    await interaction.reply({
      content: '❌ Erro ao demitir o membro.',
      ephemeral: true,
    });
  }
}

/**
 * Ver histórico de um membro
 */
async function handleHistorico(interaction) {
  const { guild, options } = interaction;
  const member = options.getUser('membro');

  try {
    const history = await query(
      'SELECT * FROM staff_history WHERE guild_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 10',
      [guild.id, member.id]
    );

    if (history.length === 0) {
      return interaction.reply({
        content: `📭 ${member.tag} não possui histórico.`,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#1a1a1a')
      .setTitle(`📜 Histórico de ${member.username}`)
      .setDescription(
        history
          .map(
            h => `**${h.action.toUpperCase()}** - ${new Date(h.created_at).toLocaleDateString('pt-BR')}\n*${h.reason}*`
          )
          .join('\n\n')
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Erro ao obter histórico:', error);
    await interaction.reply({
      content: '❌ Erro ao obter histórico.',
      ephemeral: true,
    });
  }
}

export default command;
