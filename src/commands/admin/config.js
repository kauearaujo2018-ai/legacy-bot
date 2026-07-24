import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Logger } from '../../utils/logger.js';
import { getGuildConfig, updateGuildConfig } from '../../utils/config.js';
import { query } from '../../database/database.js';

const logger = new Logger('COMMAND');

const command = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('⚙️ Configurar o bot no servidor')
    .setDefaultMemberPermissions('ADMINISTRATOR')
    .addSubcommand(sub =>
      sub
        .setName('painel')
        .setDescription('Abre o painel de configuração')
    )
    .addSubcommand(sub =>
      sub
        .setName('admin')
        .setDescription('Define o cargo administrativo')
        .addRoleOption(option =>
          option
            .setName('cargo')
            .setDescription('Cargo administrativo do servidor')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('verificado')
        .setDescription('Define o cargo de usuário verificado')
        .addRoleOption(option =>
          option
            .setName('cargo')
            .setDescription('Cargo para usuários verificados')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('logs')
        .setDescription('Define o canal de logs')
        .addChannelOption(option =>
          option
            .setName('canal')
            .setDescription('Canal para registrar eventos')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('boas-vindas')
        .setDescription('Define o canal de boas-vindas')
        .addChannelOption(option =>
          option
            .setName('canal')
            .setDescription('Canal para mensagem de boas-vindas')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Mostra as configurações atuais')
    ),

  permissions: ['ADMINISTRATOR'],

  async execute(interaction, client) {
    const { options, guild, user } = interaction;
    const subcommand = options.getSubcommand();

    switch (subcommand) {
      case 'painel':
        return handlePainel(interaction);
      case 'admin':
        return handleAdmin(interaction);
      case 'verificado':
        return handleVerificado(interaction);
      case 'logs':
        return handleLogs(interaction);
      case 'boas-vindas':
        return handleBoasVindas(interaction);
      case 'info':
        return handleInfo(interaction);
    }
  },
};

/**
 * Painel interativo de configuração
 */
async function handlePainel(interaction) {
  const { guild } = interaction;
  const config = await getGuildConfig(guild.id);

  const embed = new EmbedBuilder()
    .setColor('#1a1a1a')
    .setTitle('⚙️ Painel de Configuração')
    .setDescription('Selecione uma opção para configurar')
    .addFields(
      {
        name: '🛡️ Cargo Admin',
        value: config.admin_role_id ? `<@&${config.admin_role_id}>` : '❌ Não configurado',
        inline: true,
      },
      {
        name: '✅ Cargo Verificado',
        value: config.verified_role_id ? `<@&${config.verified_role_id}>` : '❌ Não configurado',
        inline: true,
      },
      {
        name: '📝 Canal de Logs',
        value: config.log_channel_id ? `<#${config.log_channel_id}>` : '❌ Não configurado',
        inline: true,
      },
      {
        name: '👋 Boas-vindas',
        value: config.welcome_channel_id ? `<#${config.welcome_channel_id}>` : '❌ Não configurado',
        inline: true,
      },
      {
        name: '🎫 Verificação Roblox',
        value: config.enable_verification ? '✅ Ativada' : '❌ Desativada',
        inline: true,
      },
      {
        name: '🎨 Cor dos Embeds',
        value: `${config.embed_color}`,
        inline: true,
      }
    )
    .setFooter({
      text: 'Grupo Legacy',
    });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('config_menu')
    .setPlaceholder('Selecione uma opção')
    .addOptions(
      { label: 'Cargo Administrativo', value: 'admin_role', emoji: '🛡️' },
      { label: 'Cargo Verificado', value: 'verified_role', emoji: '✅' },
      { label: 'Canal de Logs', value: 'log_channel', emoji: '📝' },
      { label: 'Canal de Boas-vindas', value: 'welcome_channel', emoji: '👋' },
      { label: 'Ativar/Desativar Verificação', value: 'toggle_verification', emoji: '🔄' },
      { label: 'Alterar Cor dos Embeds', value: 'embed_color', emoji: '🎨' },
      { label: 'Auto-atribuir Cargo Verificado', value: 'auto_role', emoji: '🤖' },
      { label: 'Auto-alterar Nickname', value: 'auto_nickname', emoji: '📝' }
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}

/**
 * Definir cargo admin
 */
async function handleAdmin(interaction) {
  const { guild, options } = interaction;
  const role = options.getRole('cargo');

  await updateGuildConfig(guild.id, {
    admin_role_id: role.id,
  });

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('✅ Configuração Atualizada')
    .setDescription(`Cargo administrativo definido para ${role}`);

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/**
 * Definir cargo verificado
 */
async function handleVerificado(interaction) {
  const { guild, options } = interaction;
  const role = options.getRole('cargo');

  await updateGuildConfig(guild.id, {
    verified_role_id: role.id,
  });

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('✅ Configuração Atualizada')
    .setDescription(`Cargo de verificado definido para ${role}`);

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/**
 * Definir canal de logs
 */
async function handleLogs(interaction) {
  const { guild, options } = interaction;
  const channel = options.getChannel('canal');

  await updateGuildConfig(guild.id, {
    log_channel_id: channel.id,
  });

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('✅ Configuração Atualizada')
    .setDescription(`Canal de logs definido para ${channel}`);

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/**
 * Definir canal de boas-vindas
 */
async function handleBoasVindas(interaction) {
  const { guild, options } = interaction;
  const channel = options.getChannel('canal');

  await updateGuildConfig(guild.id, {
    welcome_channel_id: channel.id,
  });

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('✅ Configuração Atualizada')
    .setDescription(`Canal de boas-vindas definido para ${channel}`);

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/**
 * Mostrar informações de configuração
 */
async function handleInfo(interaction) {
  const { guild } = interaction;
  const config = await getGuildConfig(guild.id);

  const embed = new EmbedBuilder()
    .setColor('#1a1a1a')
    .setTitle('⚙️ Configurações Atuais')
    .addFields(
      { name: '🛡️ Cargo Admin', value: config.admin_role_id ? `<@&${config.admin_role_id}>` : '❌ Não configurado' },
      { name: '✅ Cargo Verificado', value: config.verified_role_id ? `<@&${config.verified_role_id}>` : '❌ Não configurado' },
      { name: '📝 Canal de Logs', value: config.log_channel_id ? `<#${config.log_channel_id}>` : '❌ Não configurado' },
      { name: '👋 Boas-vindas', value: config.welcome_channel_id ? `<#${config.welcome_channel_id}>` : '❌ Não configurado' },
      { name: '🎫 Verificação Roblox', value: config.enable_verification ? '✅ Ativada' : '❌ Desativada' },
      { name: '🤖 Auto-atribuir Verificado', value: config.auto_assign_verified_role ? '✅ Ativado' : '❌ Desativado' },
      { name: '📝 Auto-alterar Nick', value: config.auto_change_nickname ? '✅ Ativado' : '❌ Desativado' },
      { name: '🎨 Cor dos Embeds', value: config.embed_color },
      { name: '🤖 Nome do Bot', value: config.bot_nickname || 'Legacy Bot' }
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
