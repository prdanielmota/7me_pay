const { chromium } = require('playwright');
const fs = require('fs');

// Configurações via Argumentos
const args = process.argv.slice(2);
const DONOR_NAME = args[0] || 'Automacao Teste';
const DONOR_EMAIL = args[1] || 'teste@exemplo.com';
const PAYMENT_METHOD = (args[2] || 'PIX').toUpperCase(); // PIX ou CARD

const DONATION_URL = 'https://7me.app/71/r8etv8';
const AMOUNT = '2.00';

console.log(`Iniciando automação com:
- Nome: ${DONOR_NAME}
- Email: ${DONOR_EMAIL}
- Método: ${PAYMENT_METHOD}
`);

(async () => {
  console.log('Iniciando automação de geração de PIX...');
  const browser = await chromium.launch({ headless: false }); // Headless false para visualizarmos
  const page = await browser.newPage();

  let paymentId = null;
  let pixCode = null;

  page.on('request', request => {
     if (request.url().includes('/api/payments') && request.method() === 'POST') {
         console.log('[PAYMENT REQUEST] URL:', request.url());
         console.log('[PAYMENT REQUEST] Data:', request.postData());
     }
   });
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/')) {
        console.log(`[API Response] ${response.status()} ${response.request().method()} ${url}`);
    }
    
    if (url.includes('/api/cielo-pix') && response.request().method() === 'POST') {
        console.log(`[PIX API] Status: ${response.status()} URL: ${url}`);
        try {
            const json = await response.json();
            console.log('[PIX BODY]', JSON.stringify(json, null, 2));
            if (json.paymentLink || json.pixCopyAndPaste) {
                console.log('\n>>> PIX GERADO COM SUCESSO! (Via Cielo) <<<');
                pixCode = json.paymentLink || json.pixCopyAndPaste;
                console.log('Código PIX:', pixCode);
            }
        } catch (e) {
            console.log('[PIX ERROR] Não foi possível ler JSON:', e.message);
        }
     }

     if (url.includes('/api/payments') && response.request().method() === 'POST') {
       console.log(`[PAYMENT API] Status: ${response.status()} URL: ${url}`);
       try {
         const json = await response.json();
         console.log('[PAYMENT BODY]', JSON.stringify(json, null, 2));
         // Verifica se é a resposta com o PIX
         if (json.notes && json.notes.includes('br.gov.bcb.pix')) {
            console.log('\n>>> PIX GERADO COM SUCESSO! <<<');
            paymentId = json.id;
            pixCode = json.notes;
            console.log('Payment ID:', paymentId);
            console.log('Código PIX:', pixCode);
        }
      } catch (e) {
        console.log('[PAYMENT ERROR] Não foi possível ler JSON:', e.message);
      }
    }
  });

  try {
    console.log(`Acessando ${DONATION_URL}...`);
    await page.goto(DONATION_URL);
    
    // 2. Preencher valor (Verificar se já vem preenchido)
    console.log('Aguardando carregamento da página e verificando valor...');
    
    // Tenta seletor específico por ID encontrado no debug
    const amountInput = page.locator('#categoryInputId').first();
    
    try {
        await amountInput.waitFor({ state: 'attached', timeout: 15000 });
        console.log('Input #categoryInputId encontrado.');
        
        // Verifica se o total já tem valor
        const totalInput = page.locator('input[name="total"]').first();
        let totalValue = '0.00';
        
        if (await totalInput.count() > 0) {
            totalValue = await totalInput.inputValue();
            console.log(`Valor Total na tela: ${totalValue}`);
        }
        
        // Se o valor já estiver preenchido (diferente de zero), pulamos o preenchimento
        if (totalValue !== 'R$ 0.00' && totalValue !== '0.00' && totalValue !== '') {
            console.log('Valor já veio preenchido pelo link! Pulando etapa de digitação.');
        } else {
            console.log('Valor não veio preenchido. Tentando preencher...');
            
             // Garante visibilidade
             await amountInput.evaluate(el => {
                 el.style.display = 'block';
                 el.style.visibility = 'visible';
                 el.style.opacity = '1';
                 if (el.parentElement) el.parentElement.style.display = 'block';
             });
             
             console.log('Clicando no input...');
             await amountInput.click({ force: true, timeout: 5000 });
             
             console.log('Limpando input...');
             // Limpa usando evaluate para garantir
             await amountInput.evaluate(el => el.value = '');
             
             console.log('Digitando 200...');
             await amountInput.type('200', { delay: 200 });
             await page.keyboard.press('Tab');
             
             const val = await amountInput.inputValue();
             console.log(`Valor no input após digitação: ${val}`);
             
             // Fallback agressivo se o valor não pegou
             if (val === '' || val === '0.00' || val === 'R$ 0.00') {
                  console.log('Valor não pegou. Tentando manipulação direta do Angular/DOM...');
                  await amountInput.evaluate(el => {
                      // Tenta simular eventos de teclado reais
                      el.focus();
                      el.value = '2.00';
                      el.dispatchEvent(new Event('input', { bubbles: true }));
                      el.dispatchEvent(new Event('change', { bubbles: true }));
                      el.dispatchEvent(new Event('blur', { bubbles: true }));
                  });
             }
        }
        
    } catch (e) {
        console.log('Erro ao verificar/preencher input:', e.message);
    }

    // 2. Clicar Continue (Footer)
    console.log('Clicando em Continue...');
    // As vezes o botão demora para habilitar ou aparecer a barra
    await page.waitForTimeout(1000);
    const continueBtn1 = page.locator('button.category-value-continue-button-footer');
    
    // Tenta forçar clique mesmo se oculto
    await continueBtn1.waitFor({ state: 'attached', timeout: 5000 });
    
    if (await continueBtn1.isVisible()) {
        await continueBtn1.click();
    } else {
        console.log('Botão Continue oculto. Forçando visibilidade e clique...');
        await continueBtn1.evaluate(el => {
            el.style.display = 'block';
            el.style.visibility = 'visible';
            el.style.opacity = '1';
            el.disabled = false;
            el.click(); // Dispara evento de clique nativo do DOM
        });
        console.log('Clique disparado via DOM.');
    }

    // 3. Tela de Identificação
    console.log('Aguardando opções de identificação...');
    
    try {
        const donorNameInput = page.locator('input[name="donorName"]');
        await donorNameInput.first().waitFor({ state: 'attached', timeout: 10000 });
        
        // Estratégia: Encontrar qual dos inputs está visível ou forçar no último
        const count = await donorNameInput.count();
        console.log(`Encontrados ${count} elementos para input[name="donorName"]`);
        
        let filled = false;
        for (let i = 0; i < count; i++) {
            const input = donorNameInput.nth(i);
            if (await input.isVisible()) {
                console.log(`Elemento ${i} está visível. Preenchendo...`);
                await input.fill(DONOR_NAME);
                filled = true;
                break;
            }
        }
        
        if (!filled) {
            console.log('Nenhum elemento visível para input[name="donorName"]. Forçando no último via JS...');
            await donorNameInput.last().evaluate((el, val) => {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
            }, DONOR_NAME);
            console.log('Valor preenchido via JS em input[name="donorName"]');
        }

        // Email
        const donorEmailInput = page.locator('input[name="donorEmail"]');
        const countEmail = await donorEmailInput.count();
        console.log(`Encontrados ${countEmail} elementos para input[name="donorEmail"]`);
        
        let filledEmail = false;
        for (let i = 0; i < countEmail; i++) {
            const input = donorEmailInput.nth(i);
            if (await input.isVisible()) {
                console.log(`Elemento ${i} está visível. Preenchendo...`);
                await input.fill(DONOR_EMAIL);
                filledEmail = true;
                break;
            }
        }
        
        if (!filledEmail) {
            console.log('Nenhum elemento visível para input[name="donorEmail"]. Forçando no último via JS...');
            await donorEmailInput.last().evaluate((el, val) => {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
            }, DONOR_EMAIL);
            console.log('Valor preenchido via JS em input[name="donorEmail"]');
        }
        
    } catch (e) {
        console.log('Erro ao preencher identificação:', e.message);
    }

    console.log('Clicando em Continue (Identificação)...');
    // Pode haver múltiplos, vamos tentar o último já que os inputs foram no último
    const continueBtn2 = page.locator('button.p-buttom-blue-continue').last(); 
    
    // Tenta forçar clique mesmo se oculto
    if (await continueBtn2.isVisible()) {
        await continueBtn2.click();
    } else {
        console.log('Botão Continue (Identificação) oculto. Forçando visibilidade e clique...');
        await continueBtn2.evaluate(el => {
            el.style.display = 'block';
            el.style.visibility = 'visible';
            el.style.opacity = '1';
            el.disabled = false;
            el.click(); // Dispara evento de clique nativo do DOM
        });
        console.log('Clique disparado via DOM (Identificação).');
    }

    // 5. Selecionar Forma de Pagamento
    console.log('Aguardando opções de pagamento...');
    
    if (PAYMENT_METHOD === 'PIX') {
        console.log('Selecionando PIX...');
        const pixBtn = page.locator('button:has-text("Pix")').last();
        
        // Tenta esperar até que um dos botões esteja visível
        try {
            await pixBtn.waitFor({ state: 'attached', timeout: 10000 });
            
            if (await pixBtn.isVisible()) {
                await pixBtn.click();
            } else {
                console.log('Botão PIX oculto. Forçando visibilidade e clique...');
                await pixBtn.evaluate(el => {
                    el.style.display = 'block';
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                    el.click(); // Dispara evento de clique nativo do DOM
                });
                console.log('Clique disparado via DOM (PIX).');
            }
        } catch (e) {
            console.log('Erro ao selecionar PIX:', e.message);
        }
    } else if (PAYMENT_METHOD === 'CARD') {
        console.log('Selecionando Cartão de Crédito...');
        // Procura botão que contenha "Credit Card" ou "Cartão de Crédito"
        const cardBtn = page.locator('button:has-text("Credit Card"), button:has-text("Cartão de Crédito")').last();
        
        try {
            await cardBtn.waitFor({ state: 'attached', timeout: 10000 });
            
            if (await cardBtn.isVisible()) {
                await cardBtn.click();
            } else {
                console.log('Botão Cartão oculto. Forçando visibilidade e clique...');
                await cardBtn.evaluate(el => {
                    el.style.display = 'block';
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                    el.click(); // Dispara evento de clique nativo do DOM
                });
                console.log('Clique disparado via DOM (Cartão).');
            }
            
            console.log('Aguardando formulário de cartão...');
            // Aqui apenas verificamos se campos de cartão aparecem
            await page.waitForTimeout(2000);
            const cardInputs = await page.locator('input[name="cardNumber"], input[name="cardHolderName"]').count();
            if (cardInputs > 0) {
                console.log('Formulário de cartão detectado!');
                console.log('NOTA: Preenchimento de cartão não implementado (requer dados sensíveis).');
            } else {
                console.log('Aviso: Formulário de cartão não detectado imediatamente.');
            }
            
        } catch (e) {
            console.log('Erro ao selecionar Cartão:', e.message);
        }
    } else {
        console.log(`Método de pagamento não reconhecido: ${PAYMENT_METHOD}. Usando padrão (PIX) se disponível.`);
    }

    // 6. Confirmar (Se for PIX gera o código, se for Cartão tentaria processar)
     console.log('Verificando se há botão "Next" para confirmar...');
     await page.waitForTimeout(2000); // Dá um tempo para a UI atualizar
     const nextBtn = page.locator('button:has-text("Next")').first();
     
     try {
         await nextBtn.waitFor({ state: 'attached', timeout: 5000 });
         
         const isVisible = await nextBtn.isVisible();
         const isEnabled = await nextBtn.isEnabled();
         console.log(`Botão Next encontrado. Visível: ${isVisible}, Habilitado: ${isEnabled}`);
         
         if (isVisible) {
             await nextBtn.click();
         } else {
             console.log('Botão Next oculto/desabilitado. Forçando...');
             await nextBtn.evaluate(el => {
                 el.style.display = 'block';
                 el.style.visibility = 'visible';
                 el.style.opacity = '1';
                 el.disabled = false;
                 el.classList.remove('p-disabled');
                 el.click();
             });
             console.log('Clique disparado via DOM (Next).');
         }
     } catch (e) {
         console.log('Nenhum botão Next encontrado. Procurando botão de gerar PIX...');
         
         // Tenta encontrar o botão específico que apareceu nos logs
          const pixButton = page.locator('button:has-text("GENERATE_PIX_COPY_AND_PASTE")').first();
          
          if (await pixButton.count() > 0) {
             console.log('Botão GENERATE_PIX encontrado! Forçando clique...');
             
             await pixButton.evaluate(el => {
                 el.style.display = 'block';
                 el.style.visibility = 'visible';
                 el.style.opacity = '1';
                 el.click(); // Dispatch click event directly
             });
             
             // Also try standard click just in case
             try {
                 await pixButton.click({ force: true, timeout: 2000 });
             } catch (e) {
                 console.log('Click padrão falhou, mas evento DOM já foi disparado.');
             }
             
          } else {
             console.log('Nenhum botão de ação final encontrado.');
          }
     }

    // 6. Aguardar Geração do PIX
    console.log('Aguardando resposta da API de PIX...');
    await page.waitForTimeout(10000); // Dá tempo para a API responder
    
    if (pixCode) {
        console.log('\n==========================================');
        console.log('CÓDIGO PIX CAPTURADO:');
        console.log(pixCode);
        console.log('==========================================\n');
    } else {
        console.log('Não foi possível capturar o código PIX.');
    }

  } catch (error) {
    console.error('Erro na automação:', error);
  } finally {
    // Não fecha o browser imediatamente se tiver sucesso, para ver o resultado
    // await browser.close();
  }
})();
