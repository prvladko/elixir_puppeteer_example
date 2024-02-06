// puppeteer_script.js
const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });

    const [searchQuery, maxResults] = process.argv.slice(2);
    const result = await scrapeProductDetails(browser, searchQuery, parseInt(maxResults, 10) || 10);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('Launcher error:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();

async function scrapeProductDetails(browser, searchQuery, maxResults) {
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

    await page.close();
    return { success: true, data: products };
  } catch (error) {
    console.error('Scraping error:', error.message);
    await page.close();
    return { success: false, error: error.message };
  }
}
