import express from 'express';
import { createServer as createViteServer } from 'vite';
import cron from 'node-cron';
import { getDb } from './server/db';
import { runScheduledCrawl } from './server/scraper';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Routes

// 1. Get all products
app.get('/api/products', async (req, res) => {
  try {
    const db = await getDb();
    const products = await db.all('SELECT * FROM products ORDER BY created_at DESC');
    res.json(products);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// 2. Add a new product
app.post('/api/products', async (req, res) => {
  const { name, sku, targetPrice } = req.body;
  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO products (name, sku, target_price) VALUES (?, ?, ?)',
      name, sku, targetPrice
    );
    res.json({ id: result.lastID, message: 'Product added successfully' });
  } catch (error) {
    console.error('Failed to add product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// 3. Get links for a product
app.get('/api/products/:id/links', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const links = await db.all('SELECT * FROM product_links WHERE product_id = ?', id);
    res.json(links);
  } catch (error) {
    console.error('Failed to fetch links:', error);
    res.status(500).json({ error: 'Failed to fetch links' });
  }
});

// 4. Add a link to a product
app.post('/api/products/:id/links', async (req, res) => {
  const { id } = req.params;
  const { url, memo } = req.body;
  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO product_links (product_id, url, memo) VALUES (?, ?, ?)',
      id, url, memo
    );
    res.json({ id: result.lastID, message: 'Link added successfully' });
  } catch (error) {
    console.error('Failed to add link:', error);
    res.status(500).json({ error: 'Failed to add link' });
  }
});

// 5. Get history for a link (for chart)
app.get('/api/history/:linkId', async (req, res) => {
  const { linkId } = req.params;
  try {
    const db = await getDb();
    const history = await db.all(
      'SELECT * FROM price_history WHERE link_id = ? ORDER BY timestamp ASC',
      linkId
    );
    res.json(history);
  } catch (error) {
    console.error('Failed to fetch history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// 6. Manual Trigger for Crawl
app.post('/api/crawl/start', async (req, res) => {
  console.log('Manual crawl triggered');
  // Run in background
  runScheduledCrawl().catch(console.error);
  res.json({ message: 'Crawl started' });
});

// Schedule Crawler (Every hour)
cron.schedule('0 * * * *', () => {
  console.log('Running scheduled crawl...');
  runScheduledCrawl().catch(console.error);
});

async function startServer() {
  // Initialize DB
  await getDb();

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
