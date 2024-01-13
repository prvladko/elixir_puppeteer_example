// puppeteer_script.js
const puppeteer = require('puppeteer');

async function scrapeProductDetails(searchQuery, maxResults) {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.goto('https://www.amazon.com/');
        await page.type('#twotabsearchtextbox', searchQuery);
        await page.click('input.nav-input[type="submit"]');
        await page.waitForSelector('.s-main-slot');

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
        return { success: false, error: error.message };
    }
}

const [searchQuery, maxResults] = process.argv.slice(2);
scrapeProductDetails(searchQuery, parseInt(maxResults, 10) || 10)
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => console.log(JSON.stringify({ success: false, error: error.message })));
