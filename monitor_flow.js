const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Iniciando navegador para monitoramento...');
  console.log('Por favor, realize o fluxo de pagamento manualmente no navegador que será aberto.');
  console.log('O script irá gravar as requisições de rede para entendermos como capturar a confirmação.');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];

  // Monitora requisições
  page.on('request', request => {
    if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
      logs.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        postData: request.postData()
      });
    }
  });

  // Monitora respostas
  page.on('response', async response => {
    const request = response.request();
    if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
      try {
        const body = await response.json();
        logs.push({
          type: 'response',
          url: response.url(),
          status: response.status(),
          body: body
        });
        
        // Verifica se parece ser uma confirmação
        if (JSON.stringify(body).toLowerCase().includes('success') || 
            JSON.stringify(body).toLowerCase().includes('approved')) {
          console.log(`[POTENCIAL SUCESSO DETECTADO] URL: ${response.url()}`);
        }
        
      } catch (e) {
        // Ignora respostas não-JSON
      }
    }
  });

  try {
    await page.goto('https://giving.7me.app/guest-donation/church/b02761a4-d529-4071-951c-c23e42a53c55');
    
    // Mantém o navegador aberto até o usuário fechar
    console.log('Aguardando interação do usuário... (Feche o navegador quando terminar)');
    await page.waitForEvent('close', { timeout: 0 });

  } catch (error) {
    console.log('Navegador fechado ou erro:', error.message);
  } finally {
    // Salva os logs
    fs.writeFileSync('network_log.json', JSON.stringify(logs, null, 2));
    console.log('Logs de rede salvos em network_log.json');
    if (browser.isConnected()) {
        await browser.close();
    }
  }
})();
