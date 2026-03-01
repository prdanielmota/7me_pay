const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('Navegando para a página...');
    await page.goto('https://giving.7me.app/guest-donation/church/b02761a4-d529-4071-951c-c23e42a53c55');
    
    // Aguarda o carregamento inicial (ajustar conforme necessário)
    await page.waitForTimeout(5000); 

    console.log('Página carregada. Inspecionando elementos...');

    // Captura inputs visíveis
    const inputs = await page.$$eval('input', elements => elements.map(el => ({
      id: el.id,
      name: el.name,
      placeholder: el.placeholder,
      type: el.type,
      class: el.className
    })));

    console.log('Inputs encontrados:', JSON.stringify(inputs, null, 2));

    // Captura botões visíveis
    const buttons = await page.$$eval('button', elements => elements.map(el => ({
      id: el.id,
      text: el.innerText,
      type: el.type,
      class: el.className
    })));

    console.log('Botões encontrados:', JSON.stringify(buttons, null, 2));

    // Captura selects visíveis
    const selects = await page.$$eval('select', elements => elements.map(el => ({
      id: el.id,
      name: el.name,
      class: el.className
    })));
    
    console.log('Selects encontrados:', JSON.stringify(selects, null, 2));

  } catch (error) {
    console.error('Erro durante a inspeção:', error);
  } finally {
    await browser.close();
  }
})();
