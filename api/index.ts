import express from 'express';
import { 
  getProductsAsync, 
  saveProductAsync, 
  deleteProductAsync, 
  getLogsAsync, 
  saveLogAsync 
} from './server-db';

const app = express();
app.use(express.json({ limit: '15mb' }));

app.get('/api/products', async (req, res) => {
  try { res.json(await getProductsAsync()); } 
  catch (err) { res.status(500).json({ error: err }); }
});

app.get('/api/logs', async (req, res) => {
  try { res.json(await getLogsAsync()); } 
  catch (err) { res.status(500).json({ error: err }); }
});

// Agrega aquí los app.post para saveProduct y saveLog si los necesitas

export default app;