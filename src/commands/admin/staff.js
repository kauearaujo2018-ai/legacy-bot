import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Logger } from '../../utils/logger.js';
import { insert, query, queryOne, update } from '../../database/database.js';
import { logAudit } from '../../utils/audit.js';

const logger = new Logger('COMMAND');

const command = {
  data: new SlashCommandBuilder()
    .setName('staff')
    .setDescription('👥 Gerenciador de Staff')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('contratar')
        .setDescription('Contratar um novo membro para o staff')
        .addUserOption(option =>
          option
            .setName('membro')
            .setDescription('Membro a contratar')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('cargo')
            .setDescription('Cargo/Posição')
            .setRequired(true)
            .addChoices(
              { name: '🛡️ Moderador', value: 'moderador' },
              { name: '👮 Administrador', value: 'administrador' },
              { name: '🔍 Investigador', value: 'investigador' },
              { name: '📊 Gerenciador', value: 'gerenciador' },
              { name: '🏆 Diretor', value: 'diretor' }
            )
        )
        .addIntegerOption(option =>
          option
            .setName('nivel')
            .setDescription('Nível hierárquico (1-5)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(5)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('promover')
        .setDescription('Promover um membro do staff')
        .addUserOption(option =>
          option
            .setName('membro')
            .setDescription('Membro a promover')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('novo-cargo')
            .setDescription('Novo cargo')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('motivo')
            .setDescription('Motivo da promoção')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('rebaixar')
        .setDescription('Rebaixar um membro do staff')
        .addUserOption(option =>
          option
            .setName('membro')
            .setDescription('Membro a rebaixar')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('motivo')
            .setDescription('Motivo do rebaixamento')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('listar')
        .setDescription('Listar todos os membros do staff')
    )
    .addSubcommand(sub =>
      sub
        .setName('ficha')
        .setDescription('Ver ficha de um membro do staff')
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
      case 'contratar':
        return handleContratar(interaction);
      case 'promover':
        return handlePromover(interaction);
      case 'rebaixar':
        return handleRebaixar(interaction);
      case 'listar':
        return handleListar(interaction);
      case 'ficha':
        return handleFicha(interaction);
    }
  },
};

/**
 * Contratar novo membro
 */
async function handleContratar(interaction) {
  const { guild, user, options } = interaction;
  const membro = options.getUser('membro');
  const cargo = options.getString('cargo');
  const nivel = options.getInteger('nivel') || 1;

  try {
    // Verificar se já é staff
    const existing = await queryOne(
      'SELECT * FROM staff_profiles WHERE guild_id = $1 AND user_id = $2',
      [guild.id, membro.id]
    );

    if (existing) {
      return interaction.reply({
        content: '⚠️ Este membro já é staff!',
        ephemeral: true,
      });
    }

    // Contratar
    const profile = await insert('staff_profiles', {
      guild_id: guild.id,
      user_id: membro.id,
      position: cargo,
      hierarchy_level: nivel,
      status: 'active',
    });

    // Registrar histórico
    await insert('staff_history', {
      user_id: membro.id,
      guild_id: guild.id,
      action: 'contratacao',
      reason: `Contratado como ${cargo}`,
      responsible_id: user.id,
    });

    await logAudit(guild.id, user.id, 'staff_hired', `${membro.tag} - ${cargo}`, membro.id);

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Membro Contratado')
      .addFields(
        { name: 'Membro', value: membro.tag, inline: true },
        { name: 'Cargo', value: cargo, inline: true },
        { name: 'Nível', value: nivel.toString(), inline: true },
        { name: 'Contratado por', value: user.tag, inline: true }
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });

    logger.success(`👥 ${membro.tag} contratado como ${cargo}`);
  } catch (error) {
    logger.error('Erro ao contratar:', error);
    await interaction.reply({
      content: '❌ Erro ao contratar o membro.',
      ephemeral: true,
    });
  }
}

/**
 * Promover membro
 */
async function handlePromover(interaction) {
  const { guild, user, options } = interaction;
  const membro = options.getUser('membro');
  const novoCargo = options.getString('novo-cargo');
  const motivo = options.getString('motivo') || 'Sem motivo especificado';

  try {
    // Buscar perfil
    const profile = await queryOne(
      'SELECT * FROM staff_profiles WHERE guild_id = $1 AND user_id = $2',
      [guild.id, membro.id]
    );

    if (!profile) {
      return interaction.reply({
        content: '❌ Este membro não é staff!',
        ephemeral: true,
      });
    }

    const oldCargo = profile.position;

    // Atualizar
    await update('staff_profiles', { position: novoCargo }, { id: profile.id });

    // Registrar histórico
    await insert('staff_history', {
      user_id: membro.id,
      guild_id: guild.id,
      action: 'promocao',
      reason: `${oldCargo} → ${novoCargo}: ${motivo}`,
      responsible_id: user.id,
    });

    await logAudit(guild.id, user.id, 'staff_promoted', `${membro.tag} - ${oldCargo} → ${novoCargo}`, membro.id);

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('🎉 Promoção')
      .addFields(
        { name: 'Membro', value: membro.tag, inline: true },
        { name: 'Cargo Anterior', value: oldCargo, inline: true },
        { name: 'Novo Cargo', value: novoCargo, inline: true },
        { name: 'Motivo', value: motivo, inline: false }
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });

    logger.success(`🎉 ${membro.tag} promovido para ${novoCargo}`);
  } catch (error) {
    logger.error('Erro ao promover:', error);
    await interaction.reply({
      content: '❌ Erro ao promover o membro.',
      ephemeral: true,
    });
  }
}

/**
 * Rebaixar membro
 */
async function handleRebaixar(interaction) {
  const { guild, user, options } = interaction;
  const membro = options.getUser('membro');
  const motivo = options.getString('motivo');

  try {
    // Buscar perfil
    const profile = await queryOne(
      'SELECT * FROM staff_profiles WHERE guild_id = $1 AND user_id = $2',
      [guild.id, membro.id]
    );

    if (!profile) {
      return interaction.reply({
        content: '❌ Este membro não é staff!',
        ephemeral: true,
      });
    }

    // Atualizar
    await update('staff_profiles', { status: 'demoted' }, { id: profile.id });

    // Registrar histórico
    await insert('staff_history', {
      user_id: membro.id,
      guild_id: guild.id,
      action: 'rebaixamento',
      reason: motivo,
      responsible_id: user.id,
    });

    await logAudit(guild.id, user.id, 'staff_demoted', `${membro.tag}: ${motivo}`, membro.id);

    const embed = new EmbedBuilder()
      .setColor('#ff6600')
      .setTitle('📉 Rebaixamento')
      .addFields(
        { name: 'Membro', value: membro.tag, inline: true },
        { name: 'Cargo Anterior', value: profile.position, inline: true },
        { name: 'Motivo', value: motivo, inline: false }
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });

    logger.info(`📉 ${membro.tag} rebaixado`);
  } catch (error) {
    logger.error('Erro ao rebaixar:', error);
    await interaction.reply({
      content: '❌ Erro ao rebaixar o membro.',
      ephemeral: true,
    });
  }
}

/**
 * Listar staff
 */
async function handleListar(interaction) {
  const { guild } = interaction;

  try {
    const staffMembers = await query(
      'SELECT * FROM staff_profiles WHERE guild_id = $1 AND status = $2 ORDER BY hierarchy_level DESC',
      [guild.id, 'active']
    );

    if (staffMembers.length === 0) {
      return interaction.reply({
        content: '📭 Nenhum membro ativo no staff.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#1a1a1a')
      .setTitle('👥 Equipe de Staff')
      .setDescription(
        staffMembers
          .map(
            s =>
              `• <@${s.user_id}> - **${s.position}** (Nível ${s.hierarchy_level})`
          )
          .join('\n')
      )
      .setFooter({ text: `Total: ${staffMembers.length} membros` });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Erro ao listar staff:', error);
    await interaction.reply({
      content: '❌ Erro ao listar staff.',
      ephemeral: true,
    });
  }
}

/**
 * Ver ficha de staff
 */
async function handleFicha(interaction) {
  const { guild, options } = interaction;
  const membro = options.getUser('membro');

  try {
    const profile = await queryOne(
      'SELECT * FROM staff_profiles WHERE guild_id = $1 AND user_id = $2',
      [guild.id, membro.id]
    );

    if (!profile) {
      return interaction.reply({
        content: '❌ Este membro não é staff!',
        ephemeral: true,
      });
    }

    const history = await query(
      'SELECT * FROM staff_history WHERE guild_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 5',
      [guild.id, membro.id]
    );

    const embed = new EmbedBuilder()
      .setColor('#1a1a1a')
      .setTitle(`📋 Ficha de ${membro.username}`)
      .setThumbnail(membro.displayAvatarURL())
      .addFields(
        { name: 'Cargo', value: profile.position, inline: true },
        { name: 'Nível', value: profile.hierarchy_level.toString(), inline: true },
        { name: 'Status', value: profile.status, inline: true },
        { name: 'Contratado em', value: new Date(profile.hired_at).toLocaleDateString('pt-BR'), inline: true },
        {
          name: 'Histórico Recente',
          value: history.length > 0
            ? history.map(h => `• ${h.action}: ${h.reason}`).join('\n')
            : 'Sem histórico',
          inline: false,
        }
      )
      .setFooter({ text: 'Grupo Legacy' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Erro ao obter ficha:', error);
    await interaction.reply({
      content: '❌ Erro ao obter ficha.',
      ephemeral: true,
    });
  }
}

export default command;
