import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Ensure screenshots directory exists
  const screenshotsDir = '/workspace/artifacts/screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Screenshot 1: Homepage desktop with cards
  console.log('Capturing homepage desktop cards...');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.screenshot({
    path: path.join(screenshotsDir, 'homepage-cards-desktop.png'),
    fullPage: true
  });
  console.log('✓ Saved homepage-cards-desktop.png');

  // Screenshot 2: Homepage mobile with stacked cards
  console.log('Capturing homepage mobile cards...');
  await page.setViewport({ width: 375, height: 667 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.screenshot({
    path: path.join(screenshotsDir, 'homepage-cards-mobile.png'),
    fullPage: true
  });
  console.log('✓ Saved homepage-cards-mobile.png');

  await browser.close();
  console.log('\n✅ All screenshots captured successfully!');
})();
