const { chromium } = require('playwright');

(async () => {
  // Configurações (Substitua pelos dados reais ou use variáveis de ambiente)
  const DONATION_URL = 'https://giving.7me.app/guest-donation/church/b02761a4-d529-4071-951c-c23e42a53c55';
  const AMOUNT = '10.00'; // Valor da doação
  const DONOR_NAME = 'Test User';
  const DONOR_EMAIL = 'test@example.com';
  
  // Inicia o browser (headless: false para ver o processo)
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Monitorar requisições de rede para detectar sucesso na API
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('/api/') && response.request().method() === 'POST') {
        try {
          const json = await response.json();
          console.log(`Resposta da API (${url}):`, JSON.stringify(json, null, 2));
          
          // Verifica se há indícios de sucesso no JSON
          if (json.status === 'success' || json.approved === true || json.message === 'Payment processed successfully') {
            console.log('>>> CONFIRMAÇÃO DE SUCESSO DETECTADA NA RESPOSTA DA API <<<');
          }
        } catch (e) {
          // Ignora respostas que não são JSON
        }
      }
    });

    console.log(`Acessando ${DONATION_URL}...`);
    await page.goto(DONATION_URL);
    await page.waitForLoadState('networkidle');

    // Passo 1: Inserir valor
    console.log('Tentando inserir valor...');
    
    // Tenta encontrar um input de valor por ID
    let valueInput = await page.waitForSelector('#categoryInputId', { state: 'attached', timeout: 10000 }).catch(() => null);
    
    if (!valueInput) {
        // Tenta pelo total-donation
        valueInput = await page.waitForSelector('#total-donation', { state: 'attached', timeout: 5000 }).catch(() => null);
    }
    
    if (valueInput) {
      // Garante que está visível antes de interagir
      await valueInput.scrollIntoViewIfNeeded();
      if (await valueInput.isVisible()) {
          await valueInput.fill(AMOUNT);
          console.log(`Valor ${AMOUNT} inserido no input ${await valueInput.getAttribute('id')}.`);
      } else {
          console.log('Input encontrado mas não está visível. Tentando forçar visibilidade...');
          await valueInput.evaluate(el => el.style.display = 'block');
          await valueInput.fill(AMOUNT);
      }
    } else {
      console.log('Nenhum input de valor encontrado pelos IDs conhecidos.');
    }

    // Passo 2: Clicar em Continue
    console.log('Clicando em Continue...');
    
    await page.waitForTimeout(1000); // Espera a UI reagir ao valor

    // Tenta encontrar o botão continue
    const continueBtn = page.locator('button:has-text("Continue")').locator('visible=true').first();
    
    if (await continueBtn.count() > 0) {
        await continueBtn.click();
    } else {
        console.log('Nenhum botão Continue visível encontrado. Tentando forçar clique no primeiro disponível...');
        await page.click('button:has-text("Continue")');
    }
    
    // Aguarda transição
    await page.waitForTimeout(2000);

    // Passo 3: Identificação (Nome/Email) ou Anônimo
    // Vamos tentar preencher os dados se os campos estiverem visíveis
    const nameInput = await page.$('input[name="donorName"]');
    const emailInput = await page.$('input[name="donorEmail"]');

    if (nameInput && emailInput) {
      console.log('Preenchendo dados do doador...');
      await nameInput.fill(DONOR_NAME);
      await emailInput.fill(DONOR_EMAIL);
      
      // Clica em Continue novamente
      console.log('Clicando em Continue (após dados)...');
      // Pode haver múltiplos botões Continue, tenta clicar no visível
      const continueButtons = await page.$$('button:has-text("Continue")');
      for (const btn of continueButtons) {
        if (await btn.isVisible()) {
          await btn.click();
          break;
        }
      }
    } else {
        console.log('Campos de doador não encontrados ou pulados.');
        // Tenta clicar em "Continue without identifying me" se existir
        const anonymousBtn = await page.$('button:has-text("Continue without identifying me")');
        if (anonymousBtn && await anonymousBtn.isVisible()) {
            console.log('Seguindo como anônimo...');
            await anonymousBtn.click();
        }
    }

    await page.waitForTimeout(2000);

    // Passo 4: Seleção de Pagamento
    console.log('Selecionando método de pagamento...');
    // Exemplo: Cartão de Crédito
    const creditCardBtn = await page.$('button:has-text("Credit Card")');
    if (creditCardBtn) {
        await creditCardBtn.click();
        console.log('Método Cartão de Crédito selecionado.');
    }

    // AQUI O SCRIPT PARA, POIS NÃO TEMOS DADOS DE CARTÃO REAIS
    // Para confirmar o sucesso, você precisaria preencher os dados do cartão e submeter.
    
    console.log('--- AGUARDANDO DADOS DE PAGAMENTO ---');
    console.log('Para processar o pagamento real, o script precisa preencher os dados do cartão.');
    
    // Simulação de verificação de sucesso (hipotética)
    // Após submeter o pagamento, espere por um elemento de sucesso:
    /*
    try {
        await page.waitForSelector('text=Thank you', { timeout: 15000 });
        console.log('PAGAMENTO PROCESSADO COM SUCESSO! (Confirmado pela mensagem "Thank you")');
    } catch (e) {
        console.log('Não foi possível confirmar o sucesso automaticamente.');
    }
    */

    // Tira um screenshot do estado atual
    await page.screenshot({ path: 'payment_state.png' });
    console.log('Screenshot salvo em payment_state.png');

  } catch (error) {
    console.error('Erro durante o fluxo:', error);
    await page.screenshot({ path: 'error_state.png' });
  } finally {
    // await browser.close(); // Comentado para deixar o browser aberto para inspeção visual se rodar localmente
    console.log('Script finalizado. Browser mantido aberto para verificação (se headless: false).');
    // Para fechar em produção:
    await browser.close();
  }
})();
