import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { pool, testConnection } from './db.js';

const app = express();
const port = Number(process.env.PORT || 5002);

app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5177,http://localhost:3000')
    .split(',')
    .map(o => o.trim()),
  credentials: true
}));
app.use(express.json());

// 1. Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'hpp_ngolab', timestamp: new Date().toISOString() });
});

// 2. Cashflow (Buku Kas & Belanja Harian)
app.get('/api/cashflow', async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(`
      SELECT c.*, i.name as ingredient_name
      FROM hpp_cashflow c
      LEFT JOIN hpp_master_ingredients i ON c.ingredient_id = i.id
      ORDER BY c.entry_date DESC, c.id DESC
      LIMIT 200
    `);

    const [summaryRows]: any = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'cash_in' THEN total_amount ELSE 0 END), 0) AS total_cash_in,
        COALESCE(SUM(CASE WHEN type = 'cash_out' THEN total_amount ELSE 0 END), 0) AS total_cash_out
      FROM hpp_cashflow
    `);

    const totalCashIn = Number(summaryRows[0]?.total_cash_in || 0);
    const totalCashOut = Number(summaryRows[0]?.total_cash_out || 0);
    const balance = totalCashIn - totalCashOut;

    res.json({
      success: true,
      data: rows,
      summary: {
        total_cash_in: totalCashIn,
        total_cash_out: totalCashOut,
        balance: balance
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal mengambil buku kas', error: error.message });
  }
});

app.post('/api/cashflow', async (req: Request, res: Response) => {
  const { entry_date, type, description, ingredient_id, quantity, unit_price, total_amount, created_by } = req.body;
  if (!entry_date || !type || !description || total_amount === undefined) {
    return res.status(400).json({ success: false, message: 'Data tanggal, tipe, deskripsi, dan nominal wajib diisi.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const id = `cf-${Date.now()}`;
    await connection.query(
      `INSERT INTO hpp_cashflow (id, entry_date, type, description, ingredient_id, quantity, unit_price, total_amount, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, entry_date, type, description, ingredient_id || null, quantity || null, unit_price || null, total_amount, created_by || 'Admin']
    );

    // Otomatisasi: Update harga terkini dan hitung ulang AVCO jika belanja bahan
    if (type === 'cash_out' && ingredient_id && unit_price > 0) {
      const [ingRows]: any = await connection.query(
        'SELECT purchase_price, conversion_ratio, avco_price FROM hpp_master_ingredients WHERE id = ? FOR UPDATE',
        [ingredient_id]
      );
      if (ingRows.length) {
        const ing = ingRows[0];
        const newLatestPrice = Number(unit_price);
        const ratio = Number(ing.conversion_ratio || 1);
        const newCostPerUsageUnit = ratio > 0 ? (newLatestPrice / ratio) : newLatestPrice;
        
        // Rumus moving average sederhana: bobot 70% harga lama + 30% harga masuk terbaru
        const oldAvco = Number(ing.avco_price || newCostPerUsageUnit);
        const updatedAvco = Math.round(((oldAvco * 0.7) + (newCostPerUsageUnit * 0.3)) * 100) / 100;

        await connection.query(
          `UPDATE hpp_master_ingredients 
           SET purchase_price = ?, cost_per_usage_unit = ?, avco_price = ?, updated_at = NOW() 
           WHERE id = ?`,
          [newLatestPrice, newCostPerUsageUnit, updatedAvco, ingredient_id]
        );
      }
    }

    await connection.commit();
    res.status(201).json({ success: true, message: 'Transaksi kas berhasil dicatat', id });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ success: false, message: 'Gagal mencatat transaksi kas', error: error.message });
  } finally {
    connection.release();
  }
});

// 3. Master Bahan Baku (Master Ingredients)
app.get('/api/ingredients', async (_req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM hpp_master_ingredients ORDER BY category, name');
    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat master bahan', error: error.message });
  }
});

app.put('/api/ingredients/:id', async (req: Request, res: Response) => {
  const { purchase_price, yield_percentage } = req.body;
  try {
    const [ingRows]: any = await pool.query('SELECT conversion_ratio FROM hpp_master_ingredients WHERE id = ?', [req.params.id]);
    if (!ingRows.length) return res.status(404).json({ success: false, message: 'Bahan tidak ditemukan.' });

    const ratio = Number(ingRows[0].conversion_ratio || 1);
    const newPrice = Number(purchase_price);
    const costPerUsage = ratio > 0 ? (newPrice / ratio) : newPrice;

    await pool.query(
      `UPDATE hpp_master_ingredients 
       SET purchase_price = ?, cost_per_usage_unit = ?, yield_percentage = COALESCE(?, yield_percentage), updated_at = NOW()
       WHERE id = ?`,
      [newPrice, costPerUsage, yield_percentage, req.params.id]
    );

    res.json({ success: true, message: 'Harga bahan berhasil diperbarui.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui bahan', error: error.message });
  }
});

// 4. Resep 3-Tier & Kalkulasi HPP
app.get('/api/recipes', async (req: Request, res: Response) => {
  try {
    const categoryFilter = req.query.category as string;
    let query = `
      SELECT r.*, m.price AS pos_price
      FROM hpp_recipes r
      LEFT JOIN menus m ON r.menu_id = m.id
    `;
    const params: any[] = [];
    if (categoryFilter && categoryFilter !== 'all') {
      query += ' WHERE r.category = ?';
      params.push(categoryFilter);
    }
    query += ' ORDER BY r.category, r.name';

    const [recipes]: any = await pool.query(query, params);
    const [ingredients]: any = await pool.query(`
      SELECT ri.*, mi.name AS ingredient_name, mi.cost_per_usage_unit, mi.avco_price,
             sr.name AS subassembly_name
      FROM hpp_recipe_ingredients ri
      LEFT JOIN hpp_master_ingredients mi ON ri.ingredient_id = mi.id
      LEFT JOIN hpp_recipes sr ON ri.subassembly_recipe_id = sr.id
    `);

    // Kelompokkan bahan per resep
    const ingredientsByRecipe = new Map<string, any[]>();
    for (const ing of ingredients) {
      const list = ingredientsByRecipe.get(ing.recipe_id) || [];
      const costPerUnit = Number(ing.cost_per_usage_unit || 0);
      const subtotal = Math.round(Number(ing.quantity) * costPerUnit);
      list.push({ ...ing, cost_per_unit: costPerUnit, subtotal_cost: subtotal });
      ingredientsByRecipe.set(ing.recipe_id, list);
    }

    const calculatedRecipes = recipes.map((recipe: any) => {
      const recipeIngs = ingredientsByRecipe.get(recipe.id) || [];
      const totalRawCost = recipeIngs.reduce((sum: number, item: any) => sum + (item.subtotal_cost || 0), 0);
      const pkgCost = Number(recipe.packaging_cost || 0);
      const gasCost = Number(recipe.cooking_gas_cost || 0);
      const laborCost = Number(recipe.labor_cost || 0);
      const portionYield = Number(recipe.portion_yield || 1);
      
      const totalBatchHpp = totalRawCost + pkgCost + gasCost + laborCost;
      const hppPerPortion = portionYield > 0 ? Math.round(totalBatchHpp / portionYield) : totalBatchHpp;

      return {
        ...recipe,
        ingredients: recipeIngs,
        total_raw_cost: totalRawCost,
        total_hpp: hppPerPortion,
        pos_price: Number(recipe.pos_price || 0)
      };
    });

    res.json({ success: true, data: calculatedRecipes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat resep menu', error: error.message });
  }
});

// 5. Sinkronisasi Harga Baru ke Kasir POS & PointLab
app.post('/api/pricing/sync-pos', async (req: Request, res: Response) => {
  const { menu_id, new_price, applied_margin_percent, synced_by } = req.body;
  if (!menu_id || !new_price) {
    return res.status(400).json({ success: false, message: 'menu_id dan new_price wajib diisi.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [menuRows]: any = await connection.query('SELECT id, name, price FROM menus WHERE id = ? FOR UPDATE', [menu_id]);
    if (!menuRows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Menu tidak ditemukan di database POS.' });
    }

    const currentMenu = menuRows[0];
    const oldPrice = Number(currentMenu.price || 0);
    const targetPrice = Number(new_price);

    // Update harga di tabel master menus
    await connection.query('UPDATE menus SET price = ?, updated_at = NOW() WHERE id = ?', [targetPrice, menu_id]);

    // Catat log audit sinkronisasi
    await connection.query(
      `INSERT INTO hpp_price_sync_logs (menu_id, menu_name, old_price, new_price, applied_margin_percent, synced_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [menu_id, currentMenu.name, oldPrice, targetPrice, applied_margin_percent || 0, synced_by || 'Admin Finansial']
    );

    await connection.commit();
    res.json({
      success: true,
      message: `Harga '${currentMenu.name}' berhasil diperbarui ke Rp ${targetPrice.toLocaleString('id-ID')} pada Kasir POS & PointLab!`,
      old_price: oldPrice,
      new_price: targetPrice
    });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ success: false, message: 'Gagal sinkronisasi harga ke POS', error: error.message });
  } finally {
    connection.release();
  }
});

// Jalankan server
app.listen(port, '0.0.0.0', async () => {
  console.log(`[hpp_ngolab] Server berjalan di http://localhost:${port}`);
  await testConnection();
});
