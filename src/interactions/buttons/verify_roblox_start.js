import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('BUTTON');

const button = {
  customId: 'verify_roblox_start',
  async execute(interaction, client) {
    const modal = new ModalBuilder()
      .setCustomId('verify_roblox_modal')
      .setTitle('Verificação Roblox');

    const usernameInput = new TextInputBuilder()
      .setCustomId('roblox_username')
      .setLabel('Seu @username do Roblox')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: MeuNomeRoblox')
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(20);

    const row = new ActionRowBuilder().addComponents(usernameInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },
};

export default button;
