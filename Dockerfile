# Use a imagem oficial do Playwright que já vem com as dependências do navegador
# Atualizado para v1.49.0 (a imagem v1.58.2 ainda não está no Docker Hub oficial como 'jammy', 
# então vamos instalar manualmente as dependências ou usar a versão focal.
# O log pede especificamente: "Please update docker image as well... required: v1.58.2"
# Como a imagem exata pode variar, vamos forçar a instalação dos browsers.
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências do Node.js
# E força a instalação dos browsers do Playwright da versão local
RUN npm install
RUN npx playwright install chromium

# Copia o restante do código fonte
COPY . .

# Garante permissões para o banco de dados
RUN touch registrations.db && chmod 777 registrations.db

# Define a variável de ambiente para produção
ENV NODE_ENV=production
ENV PORT=3020

# Expõe a porta que o servidor usa
EXPOSE 3020

# Comando para iniciar o servidor
CMD ["node", "server.js"]
