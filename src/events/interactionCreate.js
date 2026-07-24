import { Events, PermissionFlagsBits } from 'discord.js';
import { Logger } from '../utils/logger.js';
import { logAudit } from '../utils/audit.js';

const logger = new Logger('INTERACTION');
const cooldowns = new Map();
const COOLDOWN_DEFAULT = 3000; // 3 segundos

export default {
  name: Events.InteractionCreate,
  async execute(client, interaction) {
    try {
      // Slash Commands
      if (interaction.isChatInputCommand()) {
        await handleCommand(client, interaction);
      }
      // Modals
      else if (interaction.isModalSubmit()) {
        await handleModal(client, interaction);
      }
      // Buttons
      else if (interaction.isButton()) {
        await handleButton(client, interaction);
      }
      // Select Menus
      else if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(client, interaction);
      }
    } catch (error) {
      logger.error('Erro ao processar interação:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Ocorreu um erro ao processar sua solicitação.',
          ephemeral: true,
        }).catch(() => {});
      }
    }
  },
};

/**
 * Handler de Slash Commands
 */
async function handleCommand(client, interaction) {
  const { commandName, user, guild } = interaction;
  const command = client.commands.get(commandName);

  if (!command) {
    logger.warn(`Comando não encontrado: ${commandName}`);
    return;
  }

  // Verificar cooldown
  if (hasCooldown(user.id, commandName)) {
    await interaction.reply({
      content: '⏱️ Você está usando comandos muito rápido. Aguarde alguns segundos.',
      ephemeral: true,
    });
    return;
  }

  // Verificar permissões
  if (command.permissions && !user.id === client.config.ownerId) {
    const member = interaction.member;
    const hasPermission = command.permissions.every(perm => {
      return member.permissions.has(perm) || member.roles.cache.some(role => role.permissions.has(perm));
    });

    if (!hasPermission) {
      await interaction.reply({
        content: '❌ Você não tem permissão para usar este comando.',
        ephemeral: true,
      });
      await logAudit(guild.id, user.id, 'command_denied', `Acesso negado: ${commandName}`);
      return;
    }
  }

  // Executar comando
  try {
    logger.info(`📝 Comando executado: ${commandName} por ${user.tag}`);
    await command.execute(interaction, client);
    setCooldown(user.id, commandName);
    await logAudit(guild.id, user.id, 'command_executed', commandName);
  } catch (error) {
    logger.error(`Erro ao executar comando ${commandName}:`, error);
    await interaction.reply({
      content: '❌ Erro ao executar o comando. Tente novamente mais tarde.',
      ephemeral: true,
    });
  }
}

/**
 * Handler de Modais
 */
async function handleModal(client, interaction) {
  const customId = interaction.customId;
  const modal = client.modals.get(customId);

  if (!modal) {
    logger.warn(`Modal não encontrado: ${customId}`);
    return;
  }

  try {
    logger.info(`📋 Modal processado: ${customId} por ${interaction.user.tag}`);
    await modal.execute(interaction, client);
  } catch (error) {
    logger.error(`Erro ao processar modal ${customId}:`, error);
    await interaction.reply({
      content: '❌ Erro ao processar o formulário. Tente novamente.',
      ephemeral: true,
    });
  }
}

/**
 * Handler de Botões
 */
async function handleButton(client, interaction) {
  const customId = interaction.customId;
  const button = client.buttons.get(customId);

  if (!button) {
    logger.warn(`Botão não encontrado: ${customId}`);
    return;
  }

  try {
    logger.info(`🔘 Botão clicado: ${customId} por ${interaction.user.tag}`);
    await button.execute(interaction, client);
  } catch (error) {
    logger.error(`Erro ao processar botão ${customId}:`, error);
    await interaction.reply({
      content: '❌ Erro ao processar o botão. Tente novamente.',
      ephemeral: true,
    });
  }
}

/**
 * Handler de Select Menus
 */
async function handleSelectMenu(client, interaction) {
  const customId = interaction.customId;
  const menu = client.selectMenus.get(customId);

  if (!menu) {
    logger.warn(`Select Menu não encontrado: ${customId}`);
    return;
  }

  try {
    logger.info(`📋 Select Menu utilizado: ${customId} por ${interaction.user.tag}`);
    await menu.execute(interaction, client);
  } catch (error) {
    logger.error(`Erro ao processar select menu ${customId}:`, error);
    await interaction.reply({
      content: '❌ Erro ao processar a seleção. Tente novamente.',
      ephemeral: true,
    });
  }
}

/**
 * Sistema de Cooldown
 */
function hasCooldown(userId, commandName) {
  const key = `${userId}-${commandName}`;
  const now = Date.now();
  const expirationTime = cooldowns.get(key) || 0;
  return now < expirationTime;
}

function setCooldown(userId, commandName) {
  const key = `${userId}-${commandName}`;
  const expirationTime = Date.now() + COOLDOWN_DEFAULT;
  cooldowns.set(key, expirationTime);

  setTimeout(() => cooldowns.delete(key), COOLDOWN_DEFAULT);
}
