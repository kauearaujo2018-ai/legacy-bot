import { Events } from 'discord.js';
import { Logger } from '../utils/logger.js';
import { query } from '../database/database.js';

const logger = new Logger('GUILD');

export default {
  name: Events.GuildCreate,
  async execute(client, guild) {
    logger.info(`✨ Bot adicionado ao servidor: ${guild.name} (${guild.id})`);
    
    // Verificar se a configuração já existe
    const existing = await query('SELECT * FROM guild_config WHERE guild_id = $1', [guild.id]);
    
    if (existing.length === 0) {
      // Criar configuração padrão
      await query(
        `INSERT INTO guild_config (guild_id, bot_nickname) VALUES ($1, $2)`,
        [guild.id, 'Legacy Bot']
      );
      logger.success(`✅ Configuração criada para ${guild.name}`);
    }
  },
};
