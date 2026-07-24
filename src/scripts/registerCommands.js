#!/usr/bin/env node

import dotenv from 'dotenv';
import { REST, Routes } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import { Logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const logger = new Logger('REGISTER');

const clientId = process.env.CLIENT_ID;
const token = process.env.DISCORD_TOKEN;

if (!clientId || !token) {
  logger.error('CLIENT_ID e DISCORD_TOKEN são obrigatórios no .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

/**
 * Carrega todos os comandos
 */
async function loadCommands() {
  const commands = [];
  const commandsDir = join(__dirname, '..', 'commands');
  const folders = readdirSync(commandsDir);

  for (const folder of folders) {
    const folderPath = join(commandsDir, folder);
    const files = readdirSync(folderPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
      try {
        const { default: command } = await import(`file://${join(folderPath, file)}`);
        if (command.data) {
          commands.push(command.data.toJSON());
          logger.info(`✅ Comando carregado: ${command.data.name}`);
        }
      } catch (error) {
        logger.error(`Erro ao carregar ${file}:`, error);
      }
    }
  }

  return commands;
}

/**
 * Registra os comandos globalmente
 */
async function registerCommands() {
  try {
    logger.info('🔄 Carregando comandos...');
    const commands = await loadCommands();

    logger.info(`📤 Registrando ${commands.length} comandos globalmente...`);
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );

    logger.success(`✅ ${commands.length} comandos registrados com sucesso!`);
  } catch (error) {
    logger.error('❌ Erro ao registrar comandos:', error);
    process.exit(1);
  }
}

registerCommands();
