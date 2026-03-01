# Use a imagem oficial do Playwright que já vem com as dependências do navegador
# Isso evita erros de "bibliotecas faltando" no Linux
FROM mcr.microsoft.com/playwright:v1.41.2-jammy

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências do Node.js
RUN npm install

# Copia o restante do código fonte
COPY . .

# Define a variável de ambiente para produção
ENV NODE_ENV=production
ENV PORT=3000

# Expõe a porta que o servidor usa
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "server.js"]
