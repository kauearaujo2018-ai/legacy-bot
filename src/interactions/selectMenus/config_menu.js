import { Logger } from '../utils/logger.js';
import { query, queryOne } from '../database/database.js';

const logger = new Logger('MENU');

const selectMenu = {
  customId: 'config_menu',
  async execute(interaction, client) {
    const { guild, values } = interaction;
    const option = values[0];

    const config = await queryOne(
      'SELECT * FROM guild_config WHERE guild_id = $1',
      [guild.id]
    );

    switch (option) {
      case 'admin_role':
        return await showRoleModal(interaction, 'admin');
      case 'verified_role':
        return await showRoleModal(interaction, 'verified');
      case 'log_channel':
        return await showChannelModal(interaction, 'log');
      case 'welcome_channel':
        return await showChannelModal(interaction, 'welcome');
      case 'toggle_verification':
        return await toggleVerification(interaction, config);
      case 'embed_color':
        return await showColorModal(interaction);
      case 'auto_role':
        return await toggleAutoRole(interaction, config);
      case 'auto_nickname':
        return await toggleAutoNickname(interaction, config);
    }
  },
};

async function showRoleModal(interaction, type) {
  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');

  const modal = new ModalBuilder()
    .setCustomId(`config_role_${type}`)
    .setTitle(`Definir Cargo ${type === 'admin' ? 'Admin' : 'Verificado'}`);

  const roleIdInput = new TextInputBuilder()
    .setCustomId(`role_id_${type}`)
    .setLabel('ID do Cargo (copie e cole)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('123456789')
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(roleIdInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function showChannelModal(interaction, type) {
  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');

  const modal = new ModalBuilder()
    .setCustomId(`config_channel_${type}`)
    .setTitle(`Definir Canal ${type === 'log' ? 'de Logs' : 'de Boas-vindas'}`);

  const channelIdInput = new TextInputBuilder()
    .setCustomId(`channel_id_${type}`)
    .setLabel('ID do Canal (copie e cole)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('123456789')
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(channelIdInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function showColorModal(interaction) {
  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');

  const modal = new ModalBuilder()
    .setCustomId('config_color')
    .setTitle('Alterar Cor dos Embeds');

  const colorInput = new TextInputBuilder()
    .setCustomId('embed_color')
    .setLabel('Cor em Hexadecimal (Ex: #1a1a1a)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('#1a1a1a')
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(colorInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function toggleVerification(interaction, config) {
  const { guild } = interaction;
  const newState = !config.enable_verification;

  await query(
    'UPDATE guild_config SET enable_verification = $1 WHERE guild_id = $2',
    [newState, guild.id]
  );

  const { EmbedBuilder } = await import('discord.js');
  const embed = new EmbedBuilder()
    .setColor(newState ? '#00ff00' : '#ff0000')
    .setTitle('✅ Configuração Atualizada')
    .setDescription(
      `Verificação Roblox: ${newState ? '✅ Ativada' : '❌ Desativada'}`
    );

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

async function toggleAutoRole(interaction, config) {
  const { guild } = interaction;
  const newState = !config.auto_assign_verified_role;

  await query(
    'UPDATE guild_config SET auto_assign_verified_role = $1 WHERE guild_id = $2',
    [newState, guild.id]
  );

  const { EmbedBuilder } = await import('discord.js');
  const embed = new EmbedBuilder()
    .setColor(newState ? '#00ff00' : '#ff0000')
    .setTitle('✅ Configuração Atualizada')
    .setDescription(
      `Auto-atribuição de Cargo: ${newState ? '✅ Ativada' : '❌ Desativada'}`
    );

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

async function toggleAutoNickname(interaction, config) {
  const { guild } = interaction;
  const newState = !config.auto_change_nickname;

  await query(
    'UPDATE guild_config SET auto_change_nickname = $1 WHERE guild_id = $2',
    [newState, guild.id]
  );

  const { EmbedBuilder } = await import('discord.js');
  const embed = new EmbedBuilder()
    .setColor(newState ? '#00ff00' : '#ff0000')
    .setTitle('✅ Configuração Atualizada')
    .setDescription(
      `Auto-alterar Nickname: ${newState ? '✅ Ativado' : '❌ Desativado'}`
    );

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

export default selectMenu;
