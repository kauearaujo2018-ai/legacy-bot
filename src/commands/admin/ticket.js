import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
import { Logger } from '../../utils/logger.js';
import { insert, query, queryOne } from '../../database/database.js';
import { logAudit } from '../../utils/audit.js';

const logger = new Logger('COMMAND');

const command = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('🎫 Sistema de Tickets')
    .addSubcommand(sub =>
      sub
        .setName('criar')
        .setDescription('Criar um novo ticket')
        .addStringOption(option =>
          option
            .setName('categoria')
            .setDescription('Categoria do ticket')
            .setRequired(true)
            .addChoices(
              { name: '🆘 Suporte', value: 'suporte' },
              { name: '⚠️ Denúncia', value: 'denuncia' },
              { name: '💰 Financeiro', value: 'financeiro' },
              { name: '👨‍💼 Administração', value: 'administracao' },
              { name: '⚖️ CGA', value: 'cga' },
              { name: '🔄 Recurso', value: 'recurso' },
              { name: '🤝 Parcerias', value: 'parcerias' }
            )
        )
        .addStringOption(option =>
          option
            .setName('titulo')
            .setDescription('Título do ticket')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('fechar')
        .setDescription('Fechar um ticket')
        .addStringOption(option =>
          option
            .setName('motivo')
            .setDescription('Motivo do fechamento')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('reabrir')
        .setDescription('Reabrir um ticket fechado')
    )
    .addSubcommand(sub =>
      sub
        .setName('atribuir')
        .setDescription('Atribuir o ticket a um staff')
        .addUserOption(option =>
          option
            .setName('staff')
            .setDescription('Staff responsável')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('listar')
        .setDescription('Listar todos os tickets')
    ),

  async execute(interaction, client) {
    const { options, user, guild } = interaction;
    const subcommand = options.getSubcommand();

    switch (subcommand) {
      case 'criar':
        return handleCriar(interaction, client);
      case 'fechar':
        return handleFechar(interaction);
      case 'reabrir':
        return handleReabrir(interaction);
      case 'atribuir':
        return handleAtribuir(interaction);
      case 'listar':
        return handleListar(interaction);
    }
  },
};

/**
 * Criar novo ticket
 */
async function handleCriar(interaction, client) {
  const { guild, user, options } = interaction;
  const categoria = options.getString('categoria');
  const titulo = options.getString('titulo');

  try {
    await interaction.deferReply({ ephemeral: true });

    // Obter configuração
    const config = await queryOne(
      'SELECT * FROM guild_config WHERE guild_id = $1',
      [guild.id]
    );

    // Encontrar a próxima numeração
    const lastTicket = await query(
      'SELECT ticket_number FROM tickets WHERE guild_id = $1 ORDER BY ticket_number DESC LIMIT 1',
      [guild.id]
    );

    const ticketNumber = (lastTicket[0]?.ticket_number || 0) + 1;
    const channelName = `ticket-${ticketNumber}-${titulo.toLowerCase().replace(/\s+/g, '-').substring(0, 20)}`;

    // Criar canal
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: config?.ticket_category_id,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: ['ViewChannel'],
        },
        {
          id: user.id,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
        },
      ],
    });

    // Criar registro no banco
    const ticket = await insert('tickets', {
      guild_id: guild.id,
      channel_id: channel.id,
      ticket_number: ticketNumber,
      user_id: user.id,
      category: categoria,
      status: 'open',
    });

    // Embed do ticket
    const embed = new EmbedBuilder()
      .setColor('#1a1a1a')
      .setTitle(`🎫 Ticket #${ticketNumber}`)
      .setDescription(titulo)
      .addFields(
        { name: 'Categoria', value: categoria, inline: true },
        { name: 'Status', value: '🟢 Aberto', inline: true },
        { name: 'Criador', value: user.toString(), inline: true }
      )
      .setFooter({ text: 'Grupo Legacy - Um legado que construímos juntos' });

    // Botões
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_fechar')
        .setLabel('Fechar')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
      new ButtonBuilder()
        .setCustomId('ticket_atribuir')
        .setLabel('Atribuir')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('👤')
    );

    await channel.send({
      embeds: [embed],
      components: [row],
    });

    await logAudit(guild.id, user.id, 'ticket_created', `Ticket #${ticketNumber} - ${titulo}`);

    await interaction.editReply({
      content: `✅ Ticket criado com sucesso! ${channel}`,
    });

    logger.success(`🎫 Ticket #${ticketNumber} criado por ${user.tag}`);
  } catch (error) {
    logger.error('Erro ao criar ticket:', error);
    await interaction.editReply({
      content: '❌ Erro ao criar o ticket. Tente novamente.',
    });
  }
}

/**
 * Fechar ticket
 */
async function handleFechar(interaction) {
  const { guild, channel, user, options } = interaction;
  const motivo = options.getString('motivo') || 'Sem motivo especificado';

  try {
    await interaction.deferReply({ ephemeral: true });

    // Verificar se é um canal de ticket
    const ticket = await queryOne(
      'SELECT * FROM tickets WHERE channel_id = $1',
      [channel.id]
    );

    if (!ticket) {
      return interaction.editReply('❌ Este canal não é um ticket.');
    }

    // Atualizar status
    await query(
      'UPDATE tickets SET status = $1, closed_at = NOW(), reason_closed = $2 WHERE id = $3',
      ['closed', motivo, ticket.id]
    );

    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('🔒 Ticket Fechado')
      .addFields(
        { name: 'Motivo', value: motivo },
        { name: 'Fechado por', value: user.toString() }
      )
      .setFooter({ text: 'Grupo Legacy' });

    await channel.send({ embeds: [embed] });

    // Arquivar e renomear canal
    await channel.edit({
      name: `ticket-${ticket.ticket_number}-fechado`,
      archived: true,
    });

    await logAudit(guild.id, user.id, 'ticket_closed', `Ticket #${ticket.ticket_number}`);

    await interaction.editReply('✅ Ticket fechado com sucesso.');

    logger.info(`🔒 Ticket #${ticket.ticket_number} fechado por ${user.tag}`);
  } catch (error) {
    logger.error('Erro ao fechar ticket:', error);
    await interaction.editReply('❌ Erro ao fechar o ticket.');
  }
}

/**
 * Reabrir ticket
 */
async function handleReabrir(interaction) {
  const { guild, channel, user } = interaction;

  try {
    await interaction.deferReply({ ephemeral: true });

    const ticket = await queryOne(
      'SELECT * FROM tickets WHERE channel_id = $1',
      [channel.id]
    );

    if (!ticket) {
      return interaction.editReply('❌ Este canal não é um ticket.');
    }

    if (ticket.status === 'open') {
      return interaction.editReply('⚠️ Este ticket já está aberto.');
    }

    // Atualizar status
    await query(
      'UPDATE tickets SET status = $1, closed_at = NULL WHERE id = $2',
      ['open', ticket.id]
    );

    // Renomear canal
    await channel.edit({
      name: `ticket-${ticket.ticket_number}-${ticket.category}`,
      archived: false,
    });

    await logAudit(guild.id, user.id, 'ticket_reopened', `Ticket #${ticket.ticket_number}`);

    await interaction.editReply('✅ Ticket reaberto com sucesso.');

    logger.info(`🔓 Ticket #${ticket.ticket_number} reaberto por ${user.tag}`);
  } catch (error) {
    logger.error('Erro ao reabrir ticket:', error);
    await interaction.editReply('❌ Erro ao reabrir o ticket.');
  }
}

/**
 * Atribuir ticket
 */
async function handleAtribuir(interaction) {
  const { guild, channel, user, options } = interaction;
  const staff = options.getUser('staff');

  try {
    await interaction.deferReply({ ephemeral: true });

    const ticket = await queryOne(
      'SELECT * FROM tickets WHERE channel_id = $1',
      [channel.id]
    );

    if (!ticket) {
      return interaction.editReply('❌ Este canal não é um ticket.');
    }

    // Atualizar atribuição
    await query(
      'UPDATE tickets SET assigned_to = $1 WHERE id = $2',
      [staff.id, ticket.id]
    );

    // Adicionar permissão ao staff
    await channel.permissionOverwrites.create(staff, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('👤 Ticket Atribuído')
      .setDescription(`${staff} foi atribuído a este ticket`)
      .setFooter({ text: 'Grupo Legacy' });

    await channel.send({ embeds: [embed] });

    await logAudit(guild.id, user.id, 'ticket_assigned', `Ticket #${ticket.ticket_number} -> ${staff.tag}`);

    await interaction.editReply(`✅ Ticket atribuído a ${staff.tag}`);

    logger.info(`👤 Ticket #${ticket.ticket_number} atribuído a ${staff.tag}`);
  } catch (error) {
    logger.error('Erro ao atribuir ticket:', error);
    await interaction.editReply('❌ Erro ao atribuir o ticket.');
  }
}

/**
 * Listar tickets
 */
async function handleListar(interaction) {
  const { guild } = interaction;

  try {
    const tickets = await query(
      'SELECT * FROM tickets WHERE guild_id = $1 ORDER BY created_at DESC LIMIT 10',
      [guild.id]
    );

    if (tickets.length === 0) {
      return interaction.reply({
        content: '📭 Nenhum ticket encontrado.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#1a1a1a')
      .setTitle('🎫 Tickets Ativos')
      .setDescription(tickets.map(t => `**#${t.ticket_number}** - ${t.category} - ${t.status === 'open' ? '🟢' : '🔴'}`).join('\n'))
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Erro ao listar tickets:', error);
    await interaction.reply({
      content: '❌ Erro ao listar tickets.',
      ephemeral: true,
    });
  }
}

export default command;
