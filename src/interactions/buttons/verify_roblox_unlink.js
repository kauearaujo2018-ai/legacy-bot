import { Logger } from '../../utils/logger.js';
import { query } from '../../database/database.js';

const logger = new Logger('BUTTON');

const button = {
  customId: 'verify_roblox_unlink',
  async execute(interaction, client) {
    const { user, guild } = interaction;

    const verification = await query(
      'SELECT * FROM roblox_verifications WHERE discord_id = $1 AND guild_id = $2',
      [user.id, guild.id]
    );

    if (verification.length === 0) {
      return interaction.reply({
        content: '❌ Você não tem uma conta Roblox vinculada.',
        ephemeral: true,
      });
    }

    // Deletar verificação
    await query(
      'DELETE FROM roblox_verifications WHERE discord_id = $1 AND guild_id = $2',
      [user.id, guild.id]
    );

    // Remover cargo se foi atribuído
    const config = await query('SELECT * FROM guild_config WHERE guild_id = $1', [guild.id]);
    if (config[0]?.verified_role_id) {
      try {
        const member = await guild.members.fetch(user.id);
        await member.roles.remove(config[0].verified_role_id);
      } catch (error) {
        logger.warn('Erro ao remover cargo:', error);
      }
    }

    await interaction.reply({
      content: `✅ Sua conta Roblox (@${verification[0].roblox_username}) foi desvinculada com sucesso.`,
      ephemeral: true,
    });

    logger.info(`🔗 Desvinculação: ${user.tag} -> @${verification[0].roblox_username}`);
  },
};

export default button;
