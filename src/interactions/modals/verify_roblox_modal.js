import { Logger } from '../../utils/logger.js';
import { query, insert } from '../../database/database.js';
import { EmbedBuilder } from 'discord.js';
import axios from 'axios';

const logger = new Logger('MODAL');

const modal = {
  customId: 'verify_roblox_modal',
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const { user, guild } = interaction;
    const username = interaction.fields.getTextInputValue('roblox_username');

    try {
      // Buscar usuário Roblox
      const response = await axios.get(
        `https://users.roblox.com/v1/users/by-username?username=${encodeURIComponent(username)}`
      );

      if (!response.data.id) {
        return interaction.editReply({
          content: `❌ Usuário Roblox "@${username}" não encontrado.`,
        });
      }

      const robloxId = response.data.id;
      const robloxUsername = response.data.name;

      // Verificar se essa conta Roblox já está vinculada
      const existing = await query(
        'SELECT * FROM roblox_verifications WHERE roblox_id = $1',
        [robloxId]
      );

      if (existing.length > 0) {
        return interaction.editReply({
          content: '❌ Esta conta Roblox já está vinculada a outra conta Discord.',
        });
      }

      // Verificar se o usuário Discord já tem uma verificação neste servidor
      const userVerification = await query(
        'SELECT * FROM roblox_verifications WHERE discord_id = $1 AND guild_id = $2',
        [user.id, guild.id]
      );

      if (userVerification.length > 0) {
        return interaction.editReply({
          content: '❌ Você já tem uma conta Roblox vinculada neste servidor. Use /verificacao desvincular primeiro.',
        });
      }

      // Criar verificação
      const verification = await insert('roblox_verifications', {
        discord_id: user.id,
        guild_id: guild.id,
        roblox_id: robloxId,
        roblox_username: robloxUsername,
        verification_method: 'manual',
      });

      // Atribuir cargo se configurado
      const config = await query('SELECT * FROM guild_config WHERE guild_id = $1', [guild.id]);
      if (config[0]?.auto_assign_verified_role && config[0]?.verified_role_id) {
        try {
          const member = await guild.members.fetch(user.id);
          await member.roles.add(config[0].verified_role_id);
        } catch (error) {
          logger.warn('Erro ao atribuir cargo:', error);
        }
      }

      // Alterar nick se configurado
      if (config[0]?.auto_change_nickname) {
        try {
          const member = await guild.members.fetch(user.id);
          await member.setNickname(`@${robloxUsername}`);
        } catch (error) {
          logger.warn('Erro ao alterar nickname:', error);
        }
      }

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Verificação Concluída!')
        .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${robloxId}&width=420&height=420&format=png`)
        .addFields(
          { name: 'Username Roblox', value: `@${robloxUsername}`, inline: true },
          { name: 'Roblox ID', value: robloxId.toString(), inline: true },
          { name: 'Status', value: '✅ Verificado', inline: true }
        )
        .setFooter({
          text: 'Grupo Legacy - Um legado que construímos juntos',
        });

      await interaction.editReply({
        embeds: [embed],
      });

      logger.success(`✅ Verificação concluída: ${user.tag} -> @${robloxUsername}`);
    } catch (error) {
      logger.error('Erro ao verificar Roblox:', error);
      await interaction.editReply({
        content: '❌ Erro ao verificar sua conta Roblox. Tente novamente mais tarde.',
      });
    }
  },
};

export default modal;
