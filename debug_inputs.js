const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        console.log('Acessando página...');
        await page.goto('https://giving.7me.app/guest-donation/church/b02761a4-d529-4071-951c-c23e42a53c55');
        
        console.log('Aguardando carregamento...');
        await page.waitForTimeout(5000);
        
        console.log('Dump dos inputs e seus containers:');
        
        const inputs = await page.$$eval('input', els => els.map(el => {
            return {
                type: el.type,
                name: el.name,
                id: el.id,
                placeholder: el.placeholder,
                inputmode: el.inputmode,
                visible: el.offsetParent !== null,
                value: el.value,
                outerHTML: el.outerHTML,
                parentHTML: el.parentElement ? el.parentElement.outerHTML : 'no parent'
            };
        }));
        
        console.log(JSON.stringify(inputs, null, 2));
        
        // Dump da estrutura de categorias
        const categories = await page.$$eval('.category-item, .field-checkbox, .p-field-checkbox', els => els.map(el => ({
            class: el.className,
            text: el.innerText,
            html: el.outerHTML
        })));
        
        console.log('Categorias encontradas:', JSON.stringify(categories, null, 2));
        
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();