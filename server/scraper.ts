import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';
import { getDb } from './db';

puppeteer.use(StealthPlugin());

interface ScrapedData {
  price: number;
  sellerName: string;
  reviewCount: number;
  rating: number;
  deliveryDate: string;
}

export async function crawlLink(url: string): Promise<ScrapedData | null> {
  const userAgent = new UserAgent({ deviceCategory: 'desktop' });
  
  // Launch browser with stealth settings
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(userAgent.toString());
    await page.setViewport({ width: 1920, height: 1080 });

    // Add headers to mimic real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    });

    // Go to URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for key elements (Coupang specific selectors)
    // Note: These selectors are based on common Coupang structures but may change.
    try {
      await page.waitForSelector('.total-price, .prod-sale-price, .prod-price', { timeout: 10000 });
    } catch (e) {
      console.log(`Timeout waiting for price selector on ${url}`);
    }

    const data = await page.evaluate(() => {
      const getPrice = () => {
        const priceEl = document.querySelector('.total-price strong') || 
                        document.querySelector('.prod-sale-price .total-price') ||
                        document.querySelector('.prod-sale-price .price') ||
                        document.querySelector('.prod-price .total-price');
        return priceEl ? parseInt(priceEl.textContent?.replace(/[^0-9]/g, '') || '0', 10) : 0;
      };

      const getSellerName = () => {
        const sellerEl = document.querySelector('.prod-sale-vendor-name') || 
                         document.querySelector('.prod-vendor-name');
        return sellerEl ? sellerEl.textContent?.trim() : 'Unknown';
      };

      const getReviewCount = () => {
        const reviewEl = document.querySelector('.prod-review-count') || 
                         document.querySelector('.count');
        return reviewEl ? parseInt(reviewEl.textContent?.replace(/[^0-9]/g, '') || '0', 10) : 0;
      };
      
      const getRating = () => {
          const ratingEl = document.querySelector('.rating-star-num');
          // e.g. "width: 90%;" -> 4.5
          if (ratingEl) {
              const style = ratingEl.getAttribute('style');
              const widthMatch = style?.match(/width:\s*(\d+)%/);
              if (widthMatch) {
                  return parseInt(widthMatch[1], 10) / 20; // 100% = 5 stars
              }
          }
          return 0;
      };

      const getDeliveryDate = () => {
        const deliveryEl = document.querySelector('.prod-txt-delivery') || 
                           document.querySelector('.delivery-arrival-date');
        return deliveryEl ? deliveryEl.textContent?.trim() : '';
      };

      return {
        price: getPrice(),
        sellerName: getSellerName(),
        reviewCount: getReviewCount(),
        rating: getRating(),
        deliveryDate: getDeliveryDate()
      };
    });

    return data;

  } catch (error) {
    console.error(`Failed to crawl ${url}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}

export async function runScheduledCrawl() {
  console.log('Starting scheduled crawl...');
  const db = await getDb();
  
  // Get all active links
  const links = await db.all('SELECT * FROM product_links WHERE active = 1');

  for (const link of links) {
    console.log(`Crawling link ${link.id}: ${link.url}`);
    
    // Random delay to avoid detection (2-5 seconds)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 2000));

    let data = await crawlLink(link.url);
    
    // Simple retry logic (1 retry)
    if (!data || data.price === 0) {
      console.log(`Retry crawling link ${link.id}...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      data = await crawlLink(link.url);
    }

    if (data && data.price > 0) {
      // Change Detection Logic
      const lastHistory = await db.get(
        'SELECT * FROM price_history WHERE link_id = ? ORDER BY timestamp DESC LIMIT 1',
        link.id
      );

      const hasChanged = !lastHistory || 
                         lastHistory.price !== data.price || 
                         lastHistory.seller_name !== data.sellerName ||
                         lastHistory.delivery_date !== data.deliveryDate;

      if (hasChanged) {
        console.log(`Change detected for link ${link.id}. Saving new history.`);
        await db.run(
          `INSERT INTO price_history (link_id, price, seller_name, review_count, rating, delivery_date)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            link.id,
            data.price,
            data.sellerName,
            data.reviewCount,
            data.rating,
            data.deliveryDate
          ]
        );
      } else {
        console.log(`No change for link ${link.id}. Skipping save.`);
      }
    } else {
      console.error(`Failed to get valid data for link ${link.id}`);
    }
  }
  console.log('Crawl completed.');
}
