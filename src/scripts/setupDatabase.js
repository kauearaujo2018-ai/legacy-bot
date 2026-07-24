#!/usr/bin/env node

import dotenv from 'dotenv';
import { initializeDatabase } from '../database/database.js';
import { Logger } from '../utils/logger.js';

dotenv.config();

const logger = new Logger('SETUP');

/**
 * Script de configuração do banco de dados
 */
async function setupDatabase() {
  try {
    logger.info('🔧 Iniciando configuração do banco de dados...');
    await initializeDatabase();
    logger.success('✅ Banco de dados configurado com sucesso!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Erro ao configurar banco de dados:', error);
    process.exit(1);
  }
}

setupDatabase();
