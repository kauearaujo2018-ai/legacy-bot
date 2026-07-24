import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('COMMAND');

const command = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('ℹ️ Informações sobre o bot'),

  async execute(interaction, client) {
    const { guild } = interaction;

    const embed = new EmbedBuilder()
      .setColor('#1a1a1a')
      .setTitle('🤖 Legacy Bot')
      .setDescription('Um legado que construímos juntos.\nOrdem, disciplina e tecnologia.')
      .addFields(
        {
          name: '📊 Estatísticas',
          value: `👥 Servidores: ${client.guilds.cache.size}\n💻 Usuários: ${client.users.cache.size}`,
          inline: true,
        },
        {
          name: '📚 Recursos',
          value: '✅ Verificação Roblox\n✅ Sistema CGA\n✅ Tickets\n✅ Moderação',
          inline: true,
        },
        {
          name: '🔗 Links Úteis',
          value: '[GitHub](https://github.com/kauearaujo2018-ai/legacy-bot) | [Grupo Roblox](https://www.roblox.com/groups)',
          inline: false,
        },
        {
          name: '👨‍💼 Desenvolvedores',
          value: 'Grupo Legacy Team',
          inline: true,
        },
        {
          name: '📦 Versão',
          value: '1.0.0 Beta',
          inline: true,
        }
      )
      .setFooter({
        text: 'Grupo Legacy - Um legado que construímos juntos',
      });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });
  },
};

export default command;
