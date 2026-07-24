import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Logger } from '../../utils/logger.js';
import { insert, query, queryOne } from '../../database/database.js';
import { logAudit } from '../../utils/audit.js';

const logger = new Logger('COMMAND');

const command = {
  data: new SlashCommandBuilder()
    .setName('convocacao')
    .setDescription('📣 Sistema de Convocações')
    .addSubcommand(sub =>
      sub
        .setName('criar')
        .setDescription('Criar uma nova convocação')
        .addStringOption(option =>
          option
            .setName('titulo')
            .setDescription('Título da convocação')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('descricao')
            .setDescription('Descrição')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('dias')
            .setDescription('Dias até o evento')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('listar')
        .setDescription('Listar convocações ativas')
    )
    .addSubcommand(sub =>
      sub
        .setName('responder')
        .setDescription('Responder uma convocação')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('ID da convocação')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('resposta')
            .setDescription('Sua resposta')
            .setRequired(true)
            .addChoices(
              { name: '✅ Vou', value: 'confirmado' },
              { name: '❌ Não vou', value: 'negado' },
              { name: '❓ Talvez', value: 'indeciso' }
            )
        )
        .addStringOption(option =>
          option
            .setName('justificativa')
            .setDescription('Justificativa (opcional)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('relatorio')
        .setDescription('Gerar relatório de uma convocação')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('ID da convocação')
            .setRequired(true)
        )
    ),

  async execute(interaction, client) {
    const { options, user, guild } = interaction;
    const subcommand = options.getSubcommand();

    switch (subcommand) {
      case 'criar':
        return handleCriar(interaction);
      case 'listar':
        return handleListar(interaction);
      case 'responder':
        return handleResponder(interaction);
      case 'relatorio':
        return handleRelatorio(interaction);
    }
  },
};

/**
 * Criar convocação
 */
async function handleCriar(interaction) {
  const { guild, user, options } = interaction;
  const titulo = options.getString('titulo');
  const descricao = options.getString('descricao') || 'Sem descrição';
  const dias = options.getInteger('dias') || 0;

  try {
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + dias);

    const convocacao = await insert('convocations', {
      guild_id: guild.id,
      creator_id: user.id,
      title: titulo,
      description: descricao,
      scheduled_for: scheduledFor,
    });

    await logAudit(guild.id, user.id, 'convocation_created', titulo);

    const embed = new EmbedBuilder()
      .setColor('#1a1a1a')
      .setTitle(`📣 ${titulo}`)
      .setDescription(descricao)
      .addFields(
        { name: 'ID', value: convocacao.id.toString(), inline: true },
        { name: 'Data', value: scheduledFor.toLocaleDateString('pt-BR'), inline: true },
        { name: 'Criado por', value: user.tag, inline: true }
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });

    logger.success(`📣 Convocação criada: ${titulo}`);
  } catch (error) {
    logger.error('Erro ao criar convocação:', error);
    await interaction.reply({
      content: '❌ Erro ao criar convocação.',
      ephemeral: true,
    });
  }
}

/**
 * Listar convocações
 */
async function handleListar(interaction) {
  const { guild } = interaction;

  try {
    const convocacoes = await query(
      'SELECT * FROM convocations WHERE guild_id = $1 ORDER BY scheduled_for ASC LIMIT 10',
      [guild.id]
    );

    if (convocacoes.length === 0) {
      return interaction.reply({
        content: '📭 Nenhuma convocação ativa.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#1a1a1a')
      .setTitle('📣 Convocações Ativas')
      .setDescription(
        convocacoes
          .map(
            c =>
              `**#${c.id}** - ${c.title}\n📅 ${new Date(c.scheduled_for).toLocaleDateString('pt-BR')}`
          )
          .join('\n\n')
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Erro ao listar convocações:', error);
    await interaction.reply({
      content: '❌ Erro ao listar convocações.',
      ephemeral: true,
    });
  }
}

/**
 * Responder convocação
 */
async function handleResponder(interaction) {
  const { guild, user, options } = interaction;
  const id = options.getInteger('id');
  const resposta = options.getString('resposta');
  const justificativa = options.getString('justificativa');

  try {
    const convocacao = await queryOne(
      'SELECT * FROM convocations WHERE id = $1 AND guild_id = $2',
      [id, guild.id]
    );

    if (!convocacao) {
      return interaction.reply({
        content: '❌ Convocação não encontrada.',
        ephemeral: true,
      });
    }

    // Verificar se já respondeu
    const existing = await queryOne(
      'SELECT * FROM convocation_responses WHERE convocation_id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (existing) {
      return interaction.reply({
        content: '⚠️ Você já respondeu esta convocação.',
        ephemeral: true,
      });
    }

    // Registrar resposta
    await insert('convocation_responses', {
      convocation_id: id,
      user_id: user.id,
      response: resposta,
      justification: justificativa,
    });

    const statusEmoji = resposta === 'confirmado' ? '✅' : resposta === 'negado' ? '❌' : '❓';

    const embed = new EmbedBuilder()
      .setColor(resposta === 'confirmado' ? '#00ff00' : resposta === 'negado' ? '#ff0000' : '#ffff00')
      .setTitle(`${statusEmoji} Resposta Registrada`)
      .setDescription(`Sua resposta foi registrada para a convocação **${convocacao.title}**`)
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });

    logger.info(`📣 ${user.tag} respondeu convocação #${id}: ${resposta}`);
  } catch (error) {
    logger.error('Erro ao responder convocação:', error);
    await interaction.reply({
      content: '❌ Erro ao registrar resposta.',
      ephemeral: true,
    });
  }
}

/**
 * Gerar relatório
 */
async function handleRelatorio(interaction) {
  const { guild, options } = interaction;
  const id = options.getInteger('id');

  try {
    const convocacao = await queryOne(
      'SELECT * FROM convocations WHERE id = $1 AND guild_id = $2',
      [id, guild.id]
    );

    if (!convocacao) {
      return interaction.reply({
        content: '❌ Convocação não encontrada.',
        ephemeral: true,
      });
    }

    const respostas = await query(
      'SELECT * FROM convocation_responses WHERE convocation_id = $1',
      [id]
    );

    const confirmados = respostas.filter(r => r.response === 'confirmado').length;
    const negados = respostas.filter(r => r.response === 'negado').length;
    const indecisos = respostas.filter(r => r.response === 'indeciso').length;

    const embed = new EmbedBuilder()
      .setColor('#1a1a1a')
      .setTitle(`📊 Relatório - ${convocacao.title}`)
      .addFields(
        { name: '✅ Confirmados', value: confirmados.toString(), inline: true },
        { name: '❌ Negados', value: negados.toString(), inline: true },
        { name: '❓ Indecisos', value: indecisos.toString(), inline: true },
        { name: 'Total de Respostas', value: respostas.length.toString(), inline: true }
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Erro ao gerar relatório:', error);
    await interaction.reply({
      content: '❌ Erro ao gerar relatório.',
      ephemeral: true,
    });
  }
}

export default command;
