/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { 
  getProductsAsync, 
  saveProductAsync, 
  deleteProductAsync, 
  getLogsAsync, 
  saveLogAsync 
} from './server-db.js';
import { Product, InventoryLog, ProductCategory } from './src/types.js';

// Setup Express
const app = express();
const PORT = 3000;

// Configure body-parser to support base64 images
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// --- API ROUTES ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET all products (with optional search filter)
app.get('/api/products', async (req, res) => {
  try {
    const products = await getProductsAsync();
    const query = (req.query.q as string || '').toLowerCase().trim();
    
    if (!query) {
      // Sort by newest first
      return res.json([...products].reverse());
    }

    const filtered = products.filter(p => {
      const matchName = p.name.toLowerCase().includes(query);
      const matchBrand = p.brand.toLowerCase().includes(query);
      const matchCategory = p.category.toLowerCase().includes(query);
      const matchType = p.type ? p.type.toLowerCase().includes(query) : false;
      const matchMeasure = p.measure ? p.measure.toLowerCase().includes(query) : false;
      const matchDesc = p.description ? p.description.toLowerCase().includes(query) : false;
      
      return matchName || matchBrand || matchCategory || matchType || matchMeasure || matchDesc;
    });

    res.json(filtered.reverse());
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Error al obtener los productos" });
  }
});

// GET a single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const products = await getProductsAsync();
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Error al obtener el producto" });
  }
});

// POST a new product
app.post('/api/products', async (req, res) => {
  try {
    const newProductData = req.body as Partial<Product>;
    
    if (!newProductData.name || !newProductData.brand || !newProductData.category) {
      return res.status(400).json({ error: "Nombre, Marca y Categoría son requeridos" });
    }

    const now = new Date().toISOString();
    const id = `prod-${Date.now()}`;

    const newProduct: Product = {
      id,
      name: newProductData.name.trim(),
      brand: newProductData.brand.trim(),
      category: newProductData.category as ProductCategory,
      type: newProductData.type?.trim() || undefined,
      measure: newProductData.measure?.trim() || undefined,
      description: newProductData.description?.trim() || undefined,
      hasVariants: !!newProductData.hasVariants,
      createdAt: now,
      updatedAt: now,
    };

    if (newProduct.hasVariants) {
      // It's a product with variants (e.g. Helmets)
      newProduct.variants = (newProductData.variants || []).map((v, idx) => ({
        id: v.id || `var-${id}-${Date.now()}-${idx}`,
        image: v.image || undefined,
        thumbnail: v.thumbnail || undefined,
        sizes: v.sizes || []
      }));
    } else {
      // Simple product
      newProduct.singleQuantity = Number(newProductData.singleQuantity) || 0;
      newProduct.image = newProductData.image || undefined;
      newProduct.thumbnail = newProductData.thumbnail || undefined;
    }

    await saveProductAsync(newProduct);

    // Create an initial entry log if stock is > 0
    let initialQty = 0;
    if (!newProduct.hasVariants && newProduct.singleQuantity && newProduct.singleQuantity > 0) {
      initialQty = newProduct.singleQuantity;
      const logId = `log-${Date.now()}`;
      const log: InventoryLog = {
        id: logId,
        productId: id,
        productName: newProduct.name,
        brand: newProduct.brand,
        category: newProduct.category,
        type: 'entry',
        quantity: initialQty,
        previousQuantity: 0,
        newQuantity: initialQty,
        timestamp: now,
        operator: "Registro Inicial"
      };
      await saveLogAsync(log);
    } else if (newProduct.hasVariants && newProduct.variants) {
      // Add logs for variants if any size has stock initially
      for (let vIdx = 0; vIdx < newProduct.variants.length; vIdx++) {
        const v = newProduct.variants[vIdx];
        for (let sIdx = 0; sIdx < v.sizes.length; sIdx++) {
          const s = v.sizes[sIdx];
          if (s.quantity > 0) {
            const logId = `log-${Date.now()}-${vIdx}-${sIdx}`;
            const log: InventoryLog = {
              id: logId,
              productId: id,
              productName: `${newProduct.name} (${vIdx + 1})`,
              brand: newProduct.brand,
              category: newProduct.category,
              type: 'entry',
              variantId: v.id,
              size: s.size,
              quantity: s.quantity,
              previousQuantity: 0,
              newQuantity: s.quantity,
              timestamp: now,
              operator: "Registro Inicial"
            };
            await saveLogAsync(log);
          }
        }
      }
    }

    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Error al registrar el producto" });
  }
});

// PUT/Update a product
app.put('/api/products/:id', async (req, res) => {
  try {
    const products = await getProductsAsync();
    const existingProduct = products.find(p => p.id === req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const updateData = req.body as Partial<Product>;
    const now = new Date().toISOString();

    const updatedProduct: Product = {
      ...existingProduct,
      name: updateData.name?.trim() || existingProduct.name,
      brand: updateData.brand?.trim() || existingProduct.brand,
      category: (updateData.category || existingProduct.category) as ProductCategory,
      type: updateData.type !== undefined ? updateData.type.trim() || undefined : existingProduct.type,
      measure: updateData.measure !== undefined ? updateData.measure.trim() || undefined : existingProduct.measure,
      description: updateData.description !== undefined ? updateData.description.trim() || undefined : existingProduct.description,
      updatedAt: now,
    };

    if (existingProduct.hasVariants) {
      if (updateData.variants) {
        // Update variants (allow editing visual variants, adding new ones, etc.)
        updatedProduct.variants = updateData.variants.map(v => ({
          id: v.id || `var-${existingProduct.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          image: v.image || undefined,
          thumbnail: v.thumbnail || undefined,
          sizes: v.sizes || []
        }));
      }
    } else {
      if (updateData.singleQuantity !== undefined) {
        updatedProduct.singleQuantity = Number(updateData.singleQuantity);
      }
      if (updateData.image !== undefined) {
        updatedProduct.image = updateData.image || undefined;
      }
      if (updateData.thumbnail !== undefined) {
        updatedProduct.thumbnail = updateData.thumbnail || undefined;
      }
    }

    await saveProductAsync(updatedProduct);
    res.json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Error al actualizar el producto" });
  }
});

// DELETE a product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const products = await getProductsAsync();
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    await deleteProductAsync(req.params.id);
    res.json({ success: true, message: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Error al eliminar el producto" });
  }
});

// POST transaction (Entry or Exit of stock)
app.post('/api/inventory/transaction', async (req, res) => {
  try {
    const products = await getProductsAsync();
    const { productId, type, variantId, size, quantity, operator } = req.body as {
      productId: string;
      type: 'entry' | 'exit';
      variantId?: string;
      size?: string;
      quantity: number;
      operator: string;
    };

    if (!productId || !type || !quantity || quantity <= 0) {
      return res.status(400).json({ error: "Datos de transacción inválidos" });
    }

    const product = products.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const now = new Date().toISOString();
    let previousQuantity = 0;
    let newQuantity = 0;

    if (!product.hasVariants) {
      // Simple product stock update
      previousQuantity = product.singleQuantity || 0;
      if (type === 'entry') {
        newQuantity = previousQuantity + quantity;
      } else {
        if (previousQuantity < quantity) {
          return res.status(400).json({ error: `Inventario insuficiente. Solo quedan ${previousQuantity} unidades disponibles.` });
        }
        newQuantity = previousQuantity - quantity;
      }
      product.singleQuantity = newQuantity;
    } else {
      // Product with variants
      if (!variantId) {
        return res.status(400).json({ error: "ID de variante es requerido para cascos" });
      }
      if (!size) {
        return res.status(400).json({ error: "Talla es requerida para cascos" });
      }

      const variant = product.variants?.find(v => v.id === variantId);
      if (!variant) {
        return res.status(404).json({ error: "Variante visual no encontrada" });
      }

      let sizeStockIdx = variant.sizes.findIndex(s => s.size.toUpperCase() === size.toUpperCase());
      if (sizeStockIdx === -1) {
        // If the size is new, add it
        variant.sizes.push({ size: size.toUpperCase(), quantity: 0 });
        sizeStockIdx = variant.sizes.length - 1;
      }

      const sizeStock = variant.sizes[sizeStockIdx];
      previousQuantity = sizeStock.quantity;

      if (type === 'entry') {
        newQuantity = previousQuantity + quantity;
      } else {
        if (previousQuantity < quantity) {
          return res.status(400).json({ error: `Inventario insuficiente. Solo quedan ${previousQuantity} unidades en talla ${size.toUpperCase()} de esta variante.` });
        }
        newQuantity = previousQuantity - quantity;
      }
      sizeStock.quantity = newQuantity;
    }

    product.updatedAt = now;
    await saveProductAsync(product);

    // Create the transaction log
    const logId = `log-${Date.now()}`;
    const log: InventoryLog = {
      id: logId,
      productId,
      productName: product.name,
      brand: product.brand,
      category: product.category,
      type,
      variantId,
      size,
      quantity,
      previousQuantity,
      newQuantity,
      timestamp: now,
      operator: operator?.trim() || "Bodega Movil"
    };

    await saveLogAsync(log);

    res.json({
      success: true,
      product,
      log
    });
  } catch (error) {
    console.error("Error processing transaction:", error);
    res.status(500).json({ error: "Error al registrar movimiento de inventario" });
  }
});

// GET logs
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await getLogsAsync();
    // Sort logs newest first, limit to 200 for performance
    const sorted = [...logs].reverse().slice(0, 200);
    res.json(sorted);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: "Error al obtener la bitácora" });
  }
});

// --- VITE MIDDLEWARE FOR DEVELOPMENT AND STATIC SERVING FOR PRODUCTION ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
