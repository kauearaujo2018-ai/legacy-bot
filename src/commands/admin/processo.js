import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Logger } from '../../utils/logger.js';
import { insert, query, queryOne } from '../../database/database.js';
import { logAudit } from '../../utils/audit.js';

const logger = new Logger('COMMAND');

const command = {
  data: new SlashCommandBuilder()
    .setName('processo')
    .setDescription('📋 Sistema de Processos Administrativos')
    .addSubcommand(sub =>
      sub
        .setName('abrir')
        .setDescription('Abrir um novo processo administrativo')
        .addUserOption(option =>
          option
            .setName('investigado')
            .setDescription('Membro investigado')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('motivo')
            .setDescription('Motivo do processo')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('descricao')
            .setDescription('Descrição detalhada')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('consultar')
        .setDescription('Consultar um processo')
        .addStringOption(option =>
          option
            .setName('protocolo')
            .setDescription('Número do protocolo')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('julgar')
        .setDescription('Proferir decisão em um processo')
        .addStringOption(option =>
          option
            .setName('protocolo')
            .setDescription('Número do protocolo')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('decisao')
            .setDescription('Decisão')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('listar')
        .setDescription('Listar processos ativos')
    ),

  async execute(interaction, client) {
    const { options, user, guild } = interaction;
    const subcommand = options.getSubcommand();

    switch (subcommand) {
      case 'abrir':
        return handleAbrir(interaction);
      case 'consultar':
        return handleConsultar(interaction);
      case 'julgar':
        return handleJulgar(interaction);
      case 'listar':
        return handleListar(interaction);
    }
  },
};

/**
 * Abrir novo processo
 */
async function handleAbrir(interaction) {
  const { guild, user, options } = interaction;
  const investigado = options.getUser('investigado');
  const motivo = options.getString('motivo');
  const descricao = options.getString('descricao');

  try {
    // Gerar número de protocolo: PA Nº XXX/YYYY-CGA
    const ano = new Date().getFullYear();
    const lastProcess = await query(
      'SELECT COUNT(*) as count FROM administrative_processes WHERE guild_id = $1 AND EXTRACT(YEAR FROM created_at) = $2',
      [guild.id, ano]
    );

    const numero = (lastProcess[0]?.count || 0) + 1;
    const protocolo = `PA Nº ${String(numero).padStart(3, '0')}/${ano}-CGA`;

    // Criar processo
    const process = await insert('administrative_processes', {
      guild_id: guild.id,
      protocol_number: protocolo,
      investigator_id: user.id,
      target_user_id: investigado.id,
      reason: motivo,
      description: descricao,
      status: 'open',
    });

    await logAudit(guild.id, user.id, 'process_opened', `${protocolo} - ${motivo}`, investigado.id);

    const embed = new EmbedBuilder()
      .setColor('#1a1a1a')
      .setTitle('📋 Processo Administrativo Aberto')
      .addFields(
        { name: 'Protocolo', value: protocolo, inline: true },
        { name: 'Investigado', value: investigado.tag, inline: true },
        { name: 'Investigador', value: user.tag, inline: true },
        { name: 'Motivo', value: motivo, inline: false },
        { name: 'Descrição', value: descricao || 'Sem descrição', inline: false },
        { name: 'Status', value: '🟡 Aberto', inline: true }
      )
      .setFooter({ text: 'Grupo Legacy - Ordem, disciplina e tecnologia' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });

    logger.success(`📋 Processo ${protocolo} aberto por ${user.tag}`);
  } catch (error) {
    logger.error('Erro ao abrir processo:', error);
    await interaction.reply({
      content: '❌ Erro ao abrir o processo.',
      ephemeral: true,
    });
  }
}

/**
 * Consultar processo
 */
async function handleConsultar(interaction) {
  const { guild, options } = interaction;
  const protocolo = options.getString('protocolo');

  try {
    const process = await queryOne(
      'SELECT * FROM administrative_processes WHERE guild_id = $1 AND protocol_number = $2',
      [guild.id, protocolo]
    );

    if (!process) {
      return interaction.reply({
        content: '❌ Processo não encontrado.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#1a1a1a')
      .setTitle(`📋 ${process.protocol_number}`)
      .addFields(
        { name: 'Status', value: process.status, inline: true },
        { name: 'Investigador', value: `<@${process.investigator_id}>`, inline: true },
        { name: 'Investigado', value: `<@${process.target_user_id}>`, inline: true },
        { name: 'Motivo', value: process.reason, inline: false },
        { name: 'Descrição', value: process.description || 'Sem descrição', inline: false },
        { name: 'Decisão', value: process.decision || 'Pendente', inline: false },
        { name: 'Aberto em', value: new Date(process.created_at).toLocaleDateString('pt-BR'), inline: true }
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Erro ao consultar processo:', error);
    await interaction.reply({
      content: '❌ Erro ao consultar o processo.',
      ephemeral: true,
    });
  }
}

/**
 * Proferir decisão
 */
async function handleJulgar(interaction) {
  const { guild, user, options } = interaction;
  const protocolo = options.getString('protocolo');
  const decisao = options.getString('decisao');

  try {
    const process = await queryOne(
      'SELECT * FROM administrative_processes WHERE guild_id = $1 AND protocol_number = $2',
      [guild.id, protocolo]
    );

    if (!process) {
      return interaction.reply({
        content: '❌ Processo não encontrado.',
        ephemeral: true,
      });
    }

    // Atualizar processo
    await query(
      'UPDATE administrative_processes SET status = $1, decision = $2, closed_at = NOW() WHERE id = $3',
      ['closed', decisao, process.id]
    );

    await logAudit(guild.id, user.id, 'process_decided', `${protocolo} - ${decisao}`);

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('⚖️ Decisão Proferida')
      .addFields(
        { name: 'Protocolo', value: protocolo, inline: true },
        { name: 'Juiz', value: user.tag, inline: true },
        { name: 'Decisão', value: decisao, inline: false }
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });

    logger.success(`⚖️ Decisão proferida em ${protocolo} por ${user.tag}`);
  } catch (error) {
    logger.error('Erro ao proferir decisão:', error);
    await interaction.reply({
      content: '❌ Erro ao proferir decisão.',
      ephemeral: true,
    });
  }
}

/**
 * Listar processos ativos
 */
async function handleListar(interaction) {
  const { guild } = interaction;

  try {
    const processes = await query(
      'SELECT * FROM administrative_processes WHERE guild_id = $1 AND status = $2 ORDER BY created_at DESC',
      [guild.id, 'open']
    );

    if (processes.length === 0) {
      return interaction.reply({
        content: '📭 Nenhum processo aberto.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#1a1a1a')
      .setTitle('📋 Processos Ativos')
      .setDescription(
        processes
          .map(
            p => `**${p.protocol_number}** - ${p.reason}\n*Investigado: <@${p.target_user_id}>*`
          )
          .join('\n\n')
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Erro ao listar processos:', error);
    await interaction.reply({
      content: '❌ Erro ao listar processos.',
      ephemeral: true,
    });
  }
}

export default command;
