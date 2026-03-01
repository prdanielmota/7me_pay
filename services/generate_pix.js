const { chromium } = require('playwright');

// Get args
const name = process.argv[2];
const email = process.argv[3];

if (!name || !email) {
    console.log(JSON.stringify({ success: false, error: 'Missing name or email' }));
    process.exit(1);
}

(async () => {
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 800 }
        });
        const page = await context.newPage();

        let pixCode = null;
        let paymentId = null;

        // Setup response listeners
        page.on('response', async response => {
            const url = response.url();
            if (response.status() === 200 || response.status() === 201) {
                if (url.includes('/api/payments')) {
                    try {
                        const data = await response.json();
                        if (data.id) {
                            paymentId = data.id;
                        }
                    } catch (e) {}
                }
                if (url.includes('/api/cielo-pix')) {
                    try {
                        const data = await response.json();
                        if (data.pixCopyAndPaste) {
                            pixCode = data.pixCopyAndPaste;
                        }
                    } catch (e) {}
                }
            }
        });

        // Navigate
        await page.goto('https://7me.app/71/r8etv8', { waitUntil: 'networkidle' });

        // Fill Form
        const nameInput = page.locator('input[name="donorName"]:visible').first();
        await nameInput.waitFor({ state: 'visible', timeout: 15000 });
        await nameInput.fill(name);

        const emailInput = page.locator('input[name="donorEmail"]:visible').first();
        await emailInput.fill(email);

        // Click Continue
        const mainContinueBtn = page.locator('.p-buttom-blue-continue:visible').first();
        
        try {
            // Ensure button is enabled
            await mainContinueBtn.waitFor({ state: 'visible', timeout: 5000 });
            
            // Sometimes need to blur inputs to trigger validation
            await nameInput.press('Tab');
            await emailInput.press('Tab');
            await page.waitForTimeout(500);

            if (!await mainContinueBtn.isDisabled()) {
                await mainContinueBtn.click();
                await page.waitForTimeout(3000); // Wait for transition
            } else {
                // Try anonymous
                const anonBtn = page.locator('.continue-without-login-button:visible').first();
                if (await anonBtn.isVisible()) {
                    await anonBtn.click();
                    await page.waitForTimeout(3000);
                }
            }
        } catch (e) {
            // Ignore continue errors, might already be on next page?
        }

        // Scroll to ensure visibility
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);

        // Select PIX
        const pixOption = page.locator('text=/Pix/i').first(); 
        if (await pixOption.isVisible()) {
            await pixOption.click();
            
            // Wait for processing or "Please wait"
            // If "Please wait" appears, we just wait.
            // If not, look for a submit button.
            
            let attempts = 0;
            while (attempts < 60) {
                // We mainly need pixCode. paymentId is nice to have but not blocking.
                if (pixCode) break;
                
                const bodyText = await page.innerText('body');
                if (!bodyText.includes('Please wait while we process your payment')) {
                    // Try to click submit if visible and we are not waiting
                    const submitBtn = page.locator('button[type="submit"]:visible, button:has-text("Doar"):visible, button:has-text("Confirmar"):visible, button:has-text("Give"):visible').last();
                    
                    if (await submitBtn.isVisible()) {
                        const btnText = await submitBtn.textContent();
                        if (!btnText.includes('Previous')) {
                             // Only click if it's not "Previous"
                             // And maybe avoid clicking multiple times rapidly?
                             // But the loop is 1s, so it's fine.
                             try {
                                 await submitBtn.click({ timeout: 1000 });
                             } catch(e) {}
                        }
                    }
                }
                
                await page.waitForTimeout(1000);
                attempts++;
            }
        } else {
            // Try fallback: maybe PIX is an image or icon
             const pixImg = page.locator('img[alt*="Pix"]').first();
             if (await pixImg.isVisible()) {
                 await pixImg.click();
                 // Wait loop for fallback
                 let attempts = 0;
                 while (attempts < 60) {
                    if (pixCode) break;
                    await page.waitForTimeout(1000);
                    attempts++;
                 }
             } else {
                 throw new Error('PIX option not found');
             }
        }

        if (pixCode) {
            console.log(JSON.stringify({ success: true, pixCode, paymentId }));
        } else {
            console.log(JSON.stringify({ success: false, error: 'Timeout waiting for PIX code' }));
        }

    } catch (error) {
        console.log(JSON.stringify({ success: false, error: error.message }));
    } finally {
        if (browser) await browser.close();
    }
})();
