import { Logger } from './logger.js';
import { query, queryOne } from '../database/database.js';

const logger = new Logger('CONFIG');

/**
 * Obtém configurações de um servidor
 */
export async function getGuildConfig(guildId) {
  try {
    const config = await queryOne(
      'SELECT * FROM guild_config WHERE guild_id = $1',
      [guildId]
    );
    return config || createDefaultConfig(guildId);
  } catch (error) {
    logger.error('Erro ao obter configuração:', error);
    return null;
  }
}

/**
 * Cria configuração padrão
 */
export async function createDefaultConfig(guildId) {
  try {
    const config = {
      guild_id: guildId,
      admin_role_id: null,
      verified_role_id: null,
      log_channel_id: null,
      welcome_channel_id: null,
      ticket_category_id: null,
      bot_nickname: 'Legacy Bot',
      embed_color: '#1a1a1a',
      embed_footer_text: 'Grupo Legacy - Um legado que construímos juntos',
      embed_thumbnail_url: null,
      enable_verification: true,
      auto_assign_verified_role: false,
      auto_change_nickname: false,
    };
    
    return config;
  } catch (error) {
    logger.error('Erro ao criar configuração padrão:', error);
    return null;
  }
}

/**
 * Atualiza configuração de um servidor
 */
export async function updateGuildConfig(guildId, updates) {
  try {
    const query_str = `
      INSERT INTO guild_config (guild_id, ${Object.keys(updates).join(', ')})
      VALUES ($1, ${Object.keys(updates).map((_, i) => `$${i + 2}`).join(', ')})
      ON CONFLICT (guild_id) DO UPDATE SET
      ${Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(', ')}
      RETURNING *
    `;
    
    const values = [guildId, ...Object.values(updates)];
    const result = await queryOne(query_str, values);
    return result;
  } catch (error) {
    logger.error('Erro ao atualizar configuração:', error);
    return null;
  }
}

/**
 * Obtém permissão de um cargo
 */
export async function checkPermission(guildId, roleId, permission) {
  try {
    const result = await queryOne(
      'SELECT * FROM permissions WHERE guild_id = $1 AND role_id = $2 AND permission_name = $3',
      [guildId, roleId, permission]
    );
    return result?.granted || false;
  } catch (error) {
    logger.error('Erro ao verificar permissão:', error);
    return false;
  }
}

/**
 * Define permissão de um cargo
 */
export async function setPermission(guildId, roleId, permission, granted = true) {
  try {
    const query_str = `
      INSERT INTO permissions (guild_id, role_id, permission_name, granted)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (guild_id, role_id, permission_name) DO UPDATE SET granted = $4
      RETURNING *
    `;
    
    const result = await queryOne(query_str, [guildId, roleId, permission, granted]);
    return result;
  } catch (error) {
    logger.error('Erro ao definir permissão:', error);
    return null;
  }
}

export default {
  getGuildConfig,
  createDefaultConfig,
  updateGuildConfig,
  checkPermission,
  setPermission,
};
