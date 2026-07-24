import { Logger } from '../../utils/logger.js';
import { queryOne } from '../../database/database.js';
import { EmbedBuilder } from 'discord.js';

const logger = new Logger('BUTTON');

const button = {
  customId: 'verify_roblox_view',
  async execute(interaction, client) {
    const { user, guild } = interaction;

    const verification = await queryOne(
      'SELECT * FROM roblox_verifications WHERE discord_id = $1 AND guild_id = $2',
      [user.id, guild.id]
    );

    if (!verification) {
      return interaction.reply({
        content: '❌ Você não tem uma conta Roblox vinculada.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('👤 Informações da Conta Roblox')
      .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${verification.roblox_id}&width=420&height=420&format=png`)
      .addFields(
        { name: 'Username', value: `@${verification.roblox_username}`, inline: true },
        { name: 'ID Roblox', value: verification.roblox_id.toString(), inline: true },
        { name: 'Verificado em', value: new Date(verification.verified_at).toLocaleDateString('pt-BR'), inline: false },
        { name: 'Perfil Roblox', value: `[Abrir Perfil](https://www.roblox.com/users/${verification.roblox_id}/profile)`, inline: false }
      )
      .setFooter({
        text: 'Grupo Legacy',
      });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};

export default button;
