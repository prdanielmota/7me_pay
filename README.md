# Conectados Run 2026 - Sistema de Inscrição e Pagamento

Este projeto é um sistema de inscrição e pagamento para a corrida "Conectados Run 2026", integrado com o sistema 7me (não oficial) para gerar PIX e gerenciar participantes.

## Funcionalidades

- **Inscrição de Participantes:** Coleta nome, e-mail, WhatsApp e tamanho de camiseta.
- **Integração PIX:** Gera automaticamente um código PIX para pagamento via API (simulação de navegador).
- **QR Code:** Exibe o QR Code para pagamento na tela.
- **Dashboard Administrativo:** Painel protegido por senha para visualizar inscritos e status de pagamento.
- **Banco de Dados Local:** Armazena dados em SQLite (`registrations.db`).

## Como Rodar

### Pré-requisitos

- Node.js (v18 ou superior)
- Navegador (para teste local)

### Instalação

1. Clone o repositório:
   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd 7me_pay
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor:
   ```bash
   node server.js
   # ou
   npm start
   ```

4. Acesse no navegador:
   - Aplicação: `http://localhost:3000`
   - Dashboard: `http://localhost:3000/dashboard.html`

### Senha do Dashboard

A senha padrão para acessar o dashboard é configurada no arquivo `server.js`.
Atualmente definida como: `184470x7`

## Estrutura do Projeto

- `server.js`: Servidor Express principal.
- `database.js`: Configuração do banco de dados SQLite.
- `services/generate_pix.js`: Script de automação (Playwright) para gerar o PIX no 7me.
- `public/`: Arquivos estáticos (HTML, CSS, JS do frontend).
- `registrations.db`: Arquivo do banco de dados (criado automaticamente na primeira execução).

## Docker

O projeto inclui um `Dockerfile` para facilitar o deploy.

```bash
docker build -t 7me-pay .
docker run -p 3000:3000 7me-pay
```

**Nota:** Ao usar Docker, lembre-se de montar um volume para persistir o banco de dados `registrations.db` se necessário.
