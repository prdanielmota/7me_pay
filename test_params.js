const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Tentar alguns padrões comuns de query params
    const baseUrl = 'https://7me.app/71/r8etv8';
    const params = '?donorName=TesteAuto&email=teste@auto.com&name=TesteAuto&emailAddress=teste@auto.com';
    const url = baseUrl + params;
    
    console.log(`Navegando para: ${url}`);
    
    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        console.log('Página carregada.');
        
        // Espera um pouco para ver se scripts processam a URL
        await page.waitForTimeout(3000);
        
        // Tenta capturar valores dos inputs
        const nameVal = await page.inputValue('input[name="donorName"]').catch(() => 'N/A');
        const emailVal = await page.inputValue('input[name="email"]').catch(() => 'N/A');
        
        console.log('--- RESULTADO ---');
        console.log(`Valor no input Nome: "${nameVal}"`);
        console.log(`Valor no input Email: "${emailVal}"`);
        
        if (nameVal === 'TesteAuto' || emailVal === 'teste@auto.com') {
            console.log('SUCESSO: Parâmetros de URL funcionam!');
        } else {
            console.log('FALHA: Parâmetros de URL ignorados.');
        }
        
    } catch (e) {
        console.error('Erro:', e.message);
    }
    
    await browser.close();
})();
