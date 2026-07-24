import { Logger } from '../utils/logger.js';
import pg from 'pg';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logger = new Logger('DATABASE');

let db = null;
let connectionPool = null;

/**
 * Inicializa o banco de dados (PostgreSQL ou SQLite)
 */
export async function initializeDatabase() {
  try {
    const dbType = process.env.DATABASE_TYPE || 'postgresql';

    if (dbType === 'postgresql') {
      connectionPool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        host: process.env.DATABASE_HOST,
        port: process.env.DATABASE_PORT,
        database: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
      });

      // Teste de conexão
      const client = await connectionPool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.success('PostgreSQL conectado com sucesso');
    } else if (dbType === 'sqlite') {
      const dbPath = process.env.DATABASE_PATH || './data/legacy_bot.db';
      const dir = dirname(dbPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
      logger.success(`SQLite conectado: ${dbPath}`);
    }

    // Criar tabelas
    await createTables();
    logger.success('✅ Banco de dados inicializado com sucesso');
  } catch (error) {
    logger.error('❌ Erro ao inicializar banco de dados:', error);
    throw error;
  }
}

/**
 * Cria todas as tabelas necessárias
 */
async function createTables() {
  const dbType = process.env.DATABASE_TYPE || 'postgresql';

  const tables = {
    // Tabelas de Configuração
    guild_config: `
      CREATE TABLE IF NOT EXISTS guild_config (
        guild_id BIGINT PRIMARY KEY,
        admin_role_id BIGINT,
        verified_role_id BIGINT,
        log_channel_id BIGINT,
        welcome_channel_id BIGINT,
        ticket_category_id BIGINT,
        bot_nickname VARCHAR(255),
        embed_color VARCHAR(7) DEFAULT '#1a1a1a',
        embed_footer_text VARCHAR(255),
        embed_thumbnail_url TEXT,
        enable_verification BOOLEAN DEFAULT TRUE,
        auto_assign_verified_role BOOLEAN DEFAULT FALSE,
        auto_change_nickname BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,

    // Tabela de Permissões
    permissions: `
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        guild_id BIGINT NOT NULL,
        role_id BIGINT NOT NULL,
        permission_name VARCHAR(255) NOT NULL,
        granted BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, role_id, permission_name),
        FOREIGN KEY(guild_id) REFERENCES guild_config(guild_id) ON DELETE CASCADE
      );
    `,

    // Tabela de Verificação Roblox
    roblox_verifications: `
      CREATE TABLE IF NOT EXISTS roblox_verifications (
        id SERIAL PRIMARY KEY,
        discord_id BIGINT NOT NULL UNIQUE,
        guild_id BIGINT NOT NULL,
        roblox_id BIGINT NOT NULL,
        roblox_username VARCHAR(255) NOT NULL UNIQUE,
        verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verification_method VARCHAR(50) DEFAULT 'manual',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(guild_id) REFERENCES guild_config(guild_id) ON DELETE CASCADE
      );
    `,

    // Tabela de Logs Gerais
    audit_logs: `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        guild_id BIGINT NOT NULL,
        user_id BIGINT,
        target_user_id BIGINT,
        action VARCHAR(100) NOT NULL,
        reason TEXT,
        details JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(guild_id) REFERENCES guild_config(guild_id) ON DELETE CASCADE
      );
    `,

    // Tabela de Advertências
    warnings: `
      CREATE TABLE IF NOT EXISTS warnings (
        id SERIAL PRIMARY KEY,
        guild_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        moderator_id BIGINT NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        FOREIGN KEY(guild_id) REFERENCES guild_config(guild_id) ON DELETE CASCADE
      );
    `,

    // Tabela de Punições
    punishments: `
      CREATE TABLE IF NOT EXISTS punishments (
        id SERIAL PRIMARY KEY,
        guild_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        type VARCHAR(50) NOT NULL,
        moderator_id BIGINT NOT NULL,
        reason TEXT,
        duration BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        removed_at TIMESTAMP,
        FOREIGN KEY(guild_id) REFERENCES guild_config(guild_id) ON DELETE CASCADE
      );
    `,

    // Tabela de Fichas de Staff
    staff_profiles: `
      CREATE TABLE IF NOT EXISTS staff_profiles (
        id SERIAL PRIMARY KEY,
        guild_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        position VARCHAR(100),
        hierarchy_level INT DEFAULT 1,
        hired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        UNIQUE(guild_id, user_id),
        FOREIGN KEY(guild_id) REFERENCES guild_config(guild_id) ON DELETE CASCADE
      );
    `,

    // Tabela de Tickets
    tickets: `
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        guild_id BIGINT NOT NULL,
        channel_id BIGINT UNIQUE,
        ticket_number INT,
        user_id BIGINT NOT NULL,
        category VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        priority VARCHAR(50) DEFAULT 'normal',
        assigned_to BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        reason_closed TEXT,
        UNIQUE(guild_id, ticket_number),
        FOREIGN KEY(guild_id) REFERENCES guild_config(guild_id) ON DELETE CASCADE
      );
    `,

    // Tabela de Mensagens de Tickets
    ticket_messages: `
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INT NOT NULL,
        user_id BIGINT NOT NULL,
        message_id BIGINT UNIQUE,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
      );
    `,

    // Tabela de Processos Administrativos
    administrative_processes: `
      CREATE TABLE IF NOT EXISTS administrative_processes (
        id SERIAL PRIMARY KEY,
        guild_id BIGINT NOT NULL,
        protocol_number VARCHAR(50) UNIQUE,
        investigator_id BIGINT NOT NULL,
        target_user_id BIGINT NOT NULL,
        reason TEXT NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'open',
        decision TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        FOREIGN KEY(guild_id) REFERENCES guild_config(guild_id) ON DELETE CASCADE
      );
    `,

    // Tabela de Evidências de Processos
    process_evidence: `
      CREATE TABLE IF NOT EXISTS process_evidence (
        id SERIAL PRIMARY KEY,
        process_id INT NOT NULL,
        user_id BIGINT NOT NULL,
        description TEXT,
        file_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(process_id) REFERENCES administrative_processes(id) ON DELETE CASCADE
      );
    `,

    // Tabela de Histórico de Staff
    staff_history: `
      CREATE TABLE IF NOT EXISTS staff_history (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        guild_id BIGINT NOT NULL,
        action VARCHAR(100) NOT NULL,
        reason TEXT,
        responsible_id BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(guild_id) REFERENCES guild_config(guild_id) ON DELETE CASCADE
      );
    `,

    // Tabela de Embeds Salvos
    saved_embeds: `
      CREATE TABLE IF NOT EXISTS saved_embeds (
        id SERIAL PRIMARY KEY,
        guild_id BIGINT NOT NULL,
        name VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        created_by BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, name),
        FOREIGN KEY(guild_id) REFERENCES guild_config(guild_id) ON DELETE CASCADE
      );
    `,

    // Tabela de Cargos Automáticos
    autoroles: `
      CREATE TABLE IF NOT EXISTS autoroles (
        id SERIAL PRIMARY KEY,
        guild_id BIGINT NOT NULL,
        role_id BIGINT NOT NULL,
        trigger_type VARCHAR(50),
        trigger_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, role_id),
        FOREIGN KEY(guild_id) REFERENCES guild_config(guild_id) ON DELETE CASCADE
      );
    `,

    // Tabela de Denúncias
    reports: `
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        guild_id BIGINT NOT NULL,
        reporter_id BIGINT,
        target_user_id BIGINT,
        anonymous BOOLEAN DEFAULT FALSE,
        reason TEXT NOT NULL,
        evidence TEXT,
        status VARCHAR(50) DEFAULT 'open',
        assigned_to BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        FOREIGN KEY(guild_id) REFERENCES guild_config(guild_id) ON DELETE CASCADE
      );
    `,

    // Tabela de Ausências
    absences: `
      CREATE TABLE IF NOT EXISTS absences (
        id SERIAL PRIMARY KEY,
        guild_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        reason TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        approved_by BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(guild_id) REFERENCES guild_config(guild_id) ON DELETE CASCADE
      );
    `,

    // Tabela de Convocações
    convocations: `
      CREATE TABLE IF NOT EXISTS convocations (
        id SERIAL PRIMARY KEY,
        guild_id BIGINT NOT NULL,
        creator_id BIGINT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        scheduled_for TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(guild_id) REFERENCES guild_config(guild_id) ON DELETE CASCADE
      );
    `,

    // Tabela de Respostas a Convocações
    convocation_responses: `
      CREATE TABLE IF NOT EXISTS convocation_responses (
        id SERIAL PRIMARY KEY,
        convocation_id INT NOT NULL,
        user_id BIGINT NOT NULL,
        response VARCHAR(50) NOT NULL,
        justification TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(convocation_id, user_id),
        FOREIGN KEY(convocation_id) REFERENCES convocations(id) ON DELETE CASCADE
      );
    `,
  };

  try {
    if (dbType === 'postgresql') {
      for (const [name, sql] of Object.entries(tables)) {
        await connectionPool.query(sql);
      }
    } else if (dbType === 'sqlite') {
      for (const [name, sql] of Object.entries(tables)) {
        // Converter SQL PostgreSQL para SQLite
        const sqliteSql = sql
          .replace(/SERIAL/g, 'INTEGER')
          .replace(/BIGINT/g, 'INTEGER')
          .replace(/JSONB/g, 'TEXT')
          .replace(/CURRENT_TIMESTAMP/g, "datetime('now')")
          .replace(/DEFAULT CURRENT_TIMESTAMP/g, "DEFAULT datetime('now')")
          .replace(/CURRENT_DATE/g, "date('now')")
          .replace(/FOREIGN KEY\((.*?)\) REFERENCES (.*?) ON DELETE CASCADE/g,
            'FOREIGN KEY($1) REFERENCES $2');
        
        db.exec(sqliteSql);
      }
    }
    logger.success('✅ Todas as tabelas criadas/verificadas');
  } catch (error) {
    logger.error('❌ Erro ao criar tabelas:', error);
    throw error;
  }
}

/**
 * Executa uma query no banco de dados
 */
export async function query(sql, params = []) {
  try {
    const dbType = process.env.DATABASE_TYPE || 'postgresql';
    
    if (dbType === 'postgresql') {
      const result = await connectionPool.query(sql, params);
      return result.rows;
    } else if (dbType === 'sqlite') {
      const stmt = db.prepare(sql);
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        return stmt.all(...params);
      } else {
        return stmt.run(...params);
      }
    }
  } catch (error) {
    logger.error('❌ Erro ao executar query:', { sql, params, error });
    throw error;
  }
}

/**
 * Obtém uma única linha
 */
export async function queryOne(sql, params = []) {
  const result = await query(sql, params);
  return result[0] || null;
}

/**
 * Insere dados
 */
export async function insert(table, data) {
  const dbType = process.env.DATABASE_TYPE || 'postgresql';
  const columns = Object.keys(data);
  const values = Object.values(data);
  
  if (dbType === 'postgresql') {
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    return queryOne(sql, values);
  } else if (dbType === 'sqlite') {
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    await query(sql, values);
    return queryOne(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 1`);
  }
}

/**
 * Atualiza dados
 */
export async function update(table, data, where) {
  const dbType = process.env.DATABASE_TYPE || 'postgresql';
  const columns = Object.keys(data);
  const values = Object.values(data);
  const whereColumns = Object.keys(where);
  const whereValues = Object.values(where);
  
  if (dbType === 'postgresql') {
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    const whereClause = whereColumns.map((col, i) => `${col} = $${columns.length + i + 1}`).join(' AND ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
    return queryOne(sql, [...values, ...whereValues]);
  } else if (dbType === 'sqlite') {
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const whereClause = whereColumns.map(col => `${col} = ?`).join(' AND ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    await query(sql, [...values, ...whereValues]);
    
    const selectSql = `SELECT * FROM ${table} WHERE ${whereClause}`;
    return queryOne(selectSql, whereValues);
  }
}

/**
 * Deleta dados
 */
export async function deleteRecord(table, where) {
  const dbType = process.env.DATABASE_TYPE || 'postgresql';
  const whereColumns = Object.keys(where);
  const whereValues = Object.values(where);
  
  if (dbType === 'postgresql') {
    const whereClause = whereColumns.map((col, i) => `${col} = $${i + 1}`).join(' AND ');
    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    return query(sql, whereValues);
  } else if (dbType === 'sqlite') {
    const whereClause = whereColumns.map(col => `${col} = ?`).join(' AND ');
    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    return query(sql, whereValues);
  }
}

/**
 * Obtém conexão para operações avançadas
 */
export function getDatabase() {
  return { connectionPool, db };
}

export default {
  initializeDatabase,
  query,
  queryOne,
  insert,
  update,
  deleteRecord,
  getDatabase,
};
