import { Logger } from './logger.js';
import { insert } from '../database/database.js';

const logger = new Logger('AUDIT');

/**
 * Registra uma ação no log de auditoria
 */
export async function logAudit(guildId, userId, action, reason = null, targetUserId = null, details = null) {
  try {
    const auditLog = await insert('audit_logs', {
      guild_id: guildId,
      user_id: userId,
      target_user_id: targetUserId,
      action,
      reason,
      details: details ? JSON.stringify(details) : null,
    });
    
    logger.debug(`📋 Ação registrada: ${action} por ${userId}`);
    return auditLog;
  } catch (error) {
    logger.error('Erro ao registrar auditoria:', error);
    return null;
  }
}

/**
 * Registra um aviso
 */
export async function addWarning(guildId, userId, moderatorId, reason, expiresAt = null) {
  try {
    const warning = await insert('warnings', {
      guild_id: guildId,
      user_id: userId,
      moderator_id: moderatorId,
      reason,
      expires_at: expiresAt,
    });
    
    await logAudit(guildId, moderatorId, 'warn', reason, userId);
    logger.info(`⚠️ Aviso adicionado para ${userId}: ${reason}`);
    return warning;
  } catch (error) {
    logger.error('Erro ao adicionar aviso:', error);
    return null;
  }
}

/**
 * Registra uma punição
 */
export async function addPunishment(guildId, userId, moderatorId, type, reason, duration = null) {
  try {
    const expiresAt = duration ? new Date(Date.now() + duration) : null;
    
    const punishment = await insert('punishments', {
      guild_id: guildId,
      user_id: userId,
      type,
      moderator_id: moderatorId,
      reason,
      duration,
      expires_at: expiresAt,
    });
    
    await logAudit(guildId, moderatorId, `punish_${type}`, reason, userId);
    logger.info(`🔨 Punição ${type} adicionada para ${userId}`);
    return punishment;
  } catch (error) {
    logger.error('Erro ao adicionar punição:', error);
    return null;
  }
}

export default {
  logAudit,
  addWarning,
  addPunishment,
};
