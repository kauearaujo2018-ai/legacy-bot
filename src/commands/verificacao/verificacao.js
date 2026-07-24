import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Logger } from '../../utils/logger.js';
import { getGuildConfig, updateGuildConfig } from '../../utils/config.js';
import { query, queryOne } from '../../database/database.js';

const logger = new Logger('COMMAND');

const command = {
  data: new SlashCommandBuilder()
    .setName('verificacao')
    .setDescription('🔍 Sistema de Verificação Roblox')
    .addSubcommand(sub =>
      sub
        .setName('painel')
        .setDescription('Abre o painel de verificação Roblox')
    )
    .addSubcommand(sub =>
      sub
        .setName('minhaconta')
        .setDescription('Mostra informações da sua conta Roblox vinculada')
    )
    .addSubcommand(sub =>
      sub
        .setName('desvincular')
        .setDescription('Desvincula sua conta Roblox')
    )
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Informações sobre o sistema de verificação')
    ),

  async execute(interaction, client) {
    const { options, user, guild } = interaction;
    const subcommand = options.getSubcommand();
    const config = await getGuildConfig(guild.id);

    if (!config.enable_verification) {
      return interaction.reply({
        content: '❌ Verificação Roblox não está habilitada neste servidor.',
        ephemeral: true,
      });
    }

    switch (subcommand) {
      case 'painel':
        return handlePainel(interaction, client);
      case 'minhaconta':
        return handleMinhaconta(interaction, user.id);
      case 'desvincular':
        return handleDesvincular(interaction, user.id);
      case 'info':
        return handleInfo(interaction);
    }
  },
};

/**
 * Painel de Verificação
 */
async function handlePainel(interaction, client) {
  const { user, guild } = interaction;

  // Verificar se já está vinculado
  const verification = await queryOne(
    'SELECT * FROM roblox_verifications WHERE discord_id = $1 AND guild_id = $2',
    [user.id, guild.id]
  );

  const embed = new EmbedBuilder()
    .setColor('#1a1a1a')
    .setTitle('🔐 Verificação Roblox')
    .setDescription(
      verification
        ? `✅ Sua conta está vinculada a **@${verification.roblox_username}**`
        : '❌ Sua conta ainda não foi vinculada. Clique em "Verificar" para começar.'
    )
    .setFooter({
      text: 'Grupo Legacy - Um legado que construímos juntos',
    });

  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_roblox_start')
      .setLabel('Verificar')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId('verify_roblox_view')
      .setLabel('Minha Conta')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('👤')
      .setDisabled(!verification),
    new ButtonBuilder()
      .setCustomId('verify_roblox_unlink')
      .setLabel('Desvincular')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔗')
      .setDisabled(!verification)
  );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}

/**
 * Ver Informações da Conta
 */
async function handleMinhaonta(interaction, userId) {
  const { guild } = interaction;

  const verification = await queryOne(
    'SELECT * FROM roblox_verifications WHERE discord_id = $1 AND guild_id = $2',
    [userId, guild.id]
  );

  if (!verification) {
    return interaction.reply({
      content: '❌ Você ainda não tem uma conta Roblox vinculada.',
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('👤 Minha Conta Roblox')
    .addFields(
      { name: 'Username', value: `@${verification.roblox_username}`, inline: true },
      { name: 'Roblox ID', value: verification.roblox_id.toString(), inline: true },
      { name: 'Verificado em', value: new Date(verification.verified_at).toLocaleDateString('pt-BR'), inline: false }
    )
    .setFooter({
      text: 'Grupo Legacy',
    });

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/**
 * Desvincular Conta
 */
async function handleDesvincular(interaction, userId) {
  const { guild } = interaction;

  const verification = await queryOne(
    'SELECT * FROM roblox_verifications WHERE discord_id = $1 AND guild_id = $2',
    [userId, guild.id]
  );

  if (!verification) {
    return interaction.reply({
      content: '❌ Você não tem uma conta Roblox vinculada.',
      ephemeral: true,
    });
  }

  // Deletar verificação
  await query(
    'DELETE FROM roblox_verifications WHERE discord_id = $1 AND guild_id = $2',
    [userId, guild.id]
  );

  await interaction.reply({
    content: `✅ Sua conta Roblox (@${verification.roblox_username}) foi desvinculada com sucesso.`,
    ephemeral: true,
  });
}

/**
 * Informações do Sistema
 */
async function handleInfo(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#1a1a1a')
    .setTitle('ℹ️ Sistema de Verificação Roblox')
    .setDescription(
      'Este sistema permite vincular sua conta Discord à sua conta Roblox de forma segura.'
    )
    .addFields(
      {
        name: '🔒 Segurança',
        value: '✅ Nunca solicitamos sua senha\n✅ Nunca solicitamos seu cookie .ROBLOSECURITY\n✅ Apenas verificamos a propriedade da conta',
      },
      {
        name: '📋 Como Funciona',
        value: '1. Clique em "Verificar"\n2. Informe seu @username do Roblox\n3. Complete a verificação\n4. Pronto! Sua conta está vinculada',
      },
      {
        name: '✨ Benefícios',
        value: '✅ Cargo de Verificado\n✅ Acesso a áreas restritas\n✅ Integração com o grupo Roblox',
      }
    )
    .setFooter({
      text: 'Grupo Legacy - Um legado que construímos juntos',
    });

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

export default command;
