const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Iniciando navegador para captura de logs...');
  console.log('Uma janela do Chromium deve abrir. Por favor, realize a doação nela.');

  // Configuração para capturar logs de rede
  const browser = await chromium.launch({ headless: false }); 
  const page = await browser.newPage();
  const logs = [];

  // Intercepta e loga todas as requisições API relevantes
  page.on('request', request => {
    const url = request.url();
    if (url.includes('api-payment-gateway') || url.includes('api-seven-me') || url.includes('/api/')) {
        const data = {
            type: 'REQUEST',
            timestamp: new Date().toISOString(),
            url: url,
            method: request.method(),
            headers: request.headers(),
            postData: request.postData()
        };
        logs.push(data);
        console.log(`[REQ] ${request.method()} ${url}`);
    }
  });

  // Intercepta respostas
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('api-payment-gateway') || url.includes('api-seven-me') || url.includes('/api/')) {
        try {
            let body = {};
            try {
                body = await response.json();
            } catch (e) {
                body = { error: 'Could not parse JSON' };
            }

            const data = {
                type: 'RESPONSE',
                timestamp: new Date().toISOString(),
                url: url,
                status: response.status(),
                headers: response.headers(),
                body: body
            };
            logs.push(data);
            console.log(`[RES] ${response.status()} ${url}`);
        } catch (e) {
            console.log(`[RES ERROR] ${url} - ${e.message}`);
        }
    }
  });

  console.log('Navegando para: https://7me.app/71/ju5rqx');
  await page.goto('https://7me.app/71/ju5rqx');
  
  console.log('\n AGUARDANDO INTERAÇÃO DO USUÁRIO...');
  console.log('1. Preencha os dados (Nome, Email).');
  console.log('2. Escolha PIX ou Cartão.');
  console.log('3. Prossiga até gerar o código ou finalizar.');
  console.log('4. Quando terminar, feche a janela do navegador ou aguarde o tempo acabar.\n');

  // Aguarda até o navegador ser fechado pelo usuário ou 5 minutos
  try {
      await page.waitForEvent('close', { timeout: 300000 }); 
  } catch (e) {
      console.log('Tempo limite atingido ou navegador fechado.');
  }

  fs.writeFileSync('api_logs.json', JSON.stringify(logs, null, 2));
  console.log('\nLogs salvos com sucesso em "api_logs.json".');
  console.log('Pode analisar o arquivo agora.');
  
  await browser.close().catch(() => {});
})();