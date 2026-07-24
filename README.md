# 🏆 Legacy Bot - Discord Bot Profissional

> Um legado que construímos juntos. Ordem, disciplina e tecnologia.

## 📋 Sobre

Legacy Bot é um Discord Bot **profissional e completo** desenvolvido especificamente para o **Grupo Legacy**, com recursos administrativos avançados, sistema de verificação Roblox, tickets, módulo CGA e muito mais.

## 🚀 Características Principais

### ✅ Implementadas (Fase 1)
- ✅ Infraestrutura base multi-servidor
- ✅ Sistema de configuração por servidor
- ✅ Banco de dados PostgreSQL/SQLite
- ✅ Logger profissional
- ✅ Carregamento dinâmico de comandos
- ✅ Sistema de permissões
- ✅ Variáveis de ambiente seguras

### 🔄 Em Desenvolvimento
- 🔄 Verificação Roblox
- 🔄 Módulo CGA
- 🔄 Sistema de Tickets
- 🔄 Comandos de Moderação
- 🔄 Sistema de Staff
- 🔄 Painéis e Embeds
- 🔄 Auditoria e Logs

## 📦 Pré-requisitos

- **Node.js** v20+
- **npm** ou **yarn**
- **PostgreSQL** 12+ ou **SQLite**
- **Conta Discord Developer**

## 🛠️ Instalação Rápida

### 1. Clonar o Repositório
```bash
git clone https://github.com/kauearaujo2018-ai/legacy-bot.git
cd legacy-bot
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
```bash
cp .env.example .env
```
Edite o arquivo `.env` com suas credenciais.

### 4. Configurar Banco de Dados
```bash
npm run setup-db
```

### 5. Registrar Comandos
```bash
npm run register-commands
```

### 6. Iniciar o Bot
```bash
npm start
```

## 📖 Configuração no Discord Developer Portal

### Passo 1: Criar Aplicação
1. Vá para [Discord Developer Portal](https://discord.com/developers/applications)
2. Clique em "New Application"
3. Dê um nome (ex: "Legacy Bot")
4. Copie o **CLIENT_ID** → `.env`

### Passo 2: Criar Bot User
1. Vá para a aba "Bot"
2. Clique em "Add Bot"
3. Copie o **TOKEN** → `.env` como `DISCORD_TOKEN`

### Passo 3: Habilitar Intents
1. Na aba "Bot", procure "PRIVILEGED GATEWAY INTENTS"
2. Habilite:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent

### Passo 4: Definir Scopes
1. Vá para "OAuth2" → "URL Generator"
2. Selecione escopos:
   - ✅ bot
   - ✅ applications.commands
3. Selecione permissões:
   - ✅ Administrator (ou permissões específicas)
4. Copie a URL gerada e convide o bot para seu servidor

## 📝 Variáveis de Ambiente

```env
# Discord
DISCORD_TOKEN=seu_token_aqui
CLIENT_ID=1530041420579340400
BOT_OWNER_ID=seu_discord_id

# Database
DATABASE_TYPE=postgresql # ou sqlite
DATABASE_URL=postgresql://user:password@localhost:5432/legacy_bot

# Ambiente
NODE_ENV=development
LOG_LEVEL=info
```

## 📂 Estrutura do Projeto

```
legacy-bot/
├── src/
│   ├── index.js                 # Arquivo principal
│   ├── commands/                # Slash Commands
│   │   ├── admin/
│   │   ├── moderacao/
│   │   ├── verificacao/
│   │   └── uteis/
│   ├── events/                  # Eventos Discord
│   ├── interactions/            # Modais, Botões, Select Menus
│   │   ├── modals/
│   │   ├── buttons/
│   │   └── selectMenus/
│   ├── database/                # Camada de Banco de Dados
│   ├── modules/                 # Módulos funcionais
│   │   ├── roblox/
│   │   ├── cga/
│   │   ├── tickets/
│   │   ├── staff/
│   │   └── logs/
│   ├── utils/                   # Utilitários
│   └── config/                  # Configurações
├── web/                         # Dashboard Web (Futuro)
├── .env.example                 # Exemplo de variáveis
├── package.json
└── README.md
```

## 🎮 Primeiros Comandos

Depois de iniciar o bot, teste os comandos:

```
/config painel       - Abre painel de configuração
/help                - Lista todos os comandos
/info                - Informações do bot
```

## 📚 Documentação Completa

- [Configuração Multi-Servidor](./docs/multi-servidor.md) - 📄 Planejado
- [Verificação Roblox](./docs/roblox.md) - 📄 Planejado
- [Sistema CGA](./docs/cga.md) - 📄 Planejado
- [Tickets e Suporte](./docs/tickets.md) - 📄 Planejado
- [API de Logs](./docs/logs.md) - 📄 Planejado

## 🔐 Segurança

- ✅ Validação de permissões em todos os comandos
- ✅ Rate limiting implementado
- ✅ Anti-spam automático
- ✅ Criptografia de senhas (bcryptjs)
- ✅ Tokens em variáveis de ambiente
- ✅ Auditoria de todas as ações
- ✅ Nunca solicita senha/cookies de usuários

## 🐛 Troubleshooting

### Bot não conecta
- [ ] Verificar `DISCORD_TOKEN` em `.env`
- [ ] Verificar conexão com internet
- [ ] Verificar permissões no Discord Developer Portal

### Comandos não aparecem
- [ ] Executar `npm run register-commands`
- [ ] Esperar até 1 hora para sincronização
- [ ] Verificar permissões do bot

### Erro de banco de dados
- [ ] Verificar `DATABASE_URL` em `.env`
- [ ] Executar `npm run setup-db`
- [ ] Verificar servidor PostgreSQL/SQLite

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Verifique a documentação
2. Abra uma issue no repositório
3. Entre em contato com o time do Grupo Legacy

## 📄 Licença

MIT © Grupo Legacy

---

**Última atualização:** 24 de Julho, 2026  
**Versão:** 1.0.0 (Beta)
