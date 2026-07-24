import { Events } from 'discord.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('EVENT');

export default {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.success(`✅ Bot conectado como ${client.user.tag}`);
    logger.info(`📊 Total de servidores: ${client.guilds.cache.size}`);
    
    client.user.setPresence({
      activities: [
        {
          name: '/help para ajuda',
          type: 'WATCHING',
        },
      ],
      status: 'online',
    });
  },
};
