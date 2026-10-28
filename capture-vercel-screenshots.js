import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Ensure artifacts directory exists
  const artifactsDir = '/workspace/artifacts';
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // Screenshot 1: Desktop homepage
  console.log('Capturing desktop homepage...');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  
  // Wait a bit for any videos or elements to load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await page.screenshot({
    path: path.join(artifactsDir, 'desktop-homepage.png'),
    fullPage: true
  });
  console.log('✓ Saved desktop-homepage.png');

  // Screenshot 2: Mobile homepage
  console.log('Capturing mobile homepage...');
  await page.setViewport({ width: 375, height: 667 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  
  // Wait a bit for layout to settle
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await page.screenshot({
    path: path.join(artifactsDir, 'mobile-homepage.png'),
    fullPage: true
  });
  console.log('✓ Saved mobile-homepage.png');

  await browser.close();
  console.log('\n✅ All screenshots captured successfully!');
})();
