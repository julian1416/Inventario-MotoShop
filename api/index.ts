import express from 'express';
import { 
  getProductsAsync, 
  getLogsAsync 
} from './server-db.js'; // IMPORTANTE el .js

const app = express();
app.use(express.json());

// Ruta para productos
app.get('/api/products', async (req, res) => {
  try {
    const products = await getProductsAsync();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno en productos' });
  }
});

// Ruta para logs
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await getLogsAsync();
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno en logs' });
  }
});

export default app;