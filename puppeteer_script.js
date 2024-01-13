// puppeteer_script.js
const puppeteer = require('puppeteer');

async function scrapeProductDetails(searchQuery, maxResults) {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'], 
        headless: true 
    });

    const page = await browser.newPage();
    try {
        await page.goto('https://www.amazon.com/', { waitUntil: 'networkidle2', timeout: 30000 });
        await page.type('#twotabsearchtextbox', searchQuery);
        await page.click('input.nav-input[type="submit"]');
        await page.waitForSelector('.s-main-slot', { timeout: 30000 });

        const products = await page.evaluate(maxResults => {
            const items = [];
            document.querySelectorAll('.s-result-item').forEach((item, index) => {
                if (index >= maxResults) return;
                const name = item.querySelector('h2 .a-link-normal')?.innerText;
                const price = item.querySelector('.a-price > .a-offscreen')?.innerText;
                const url = item.querySelector('h2 .a-link-normal')?.href;
                if (name && price && url) {
                    items.push({ name, price, url });
                }
            });
            return items;
        }, maxResults);

        await browser.close();
        return { success: true, data: products };
    } catch (error) {
        console.error('Scraping error:', error);
        await browser.close();
        return { success: false, error: error.message };
    }
}

const [searchQuery, maxResults] = process.argv.slice(2);
scrapeProductDetails(searchQuery, parseInt(maxResults, 10) || 10)
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => console.log(JSON.stringify({ success: false, error: error.message })));
