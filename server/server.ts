import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { pool, testConnection } from './db.js';

const app = express();
const port = Number(process.env.PORT || 5002);

app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5177,http://localhost:3000,http://localhost:5173,http://localhost:5174')
    .split(',')
    .map(o => o.trim()),
  credentials: true
}));
app.use(express.json());

// ==============================================================================
// 1. HEALTH CHECK & STATUS
// ==============================================================================
app.get('/api/health', async (_req: Request, res: Response) => {
  const isConnected = await testConnection();
  res.json({
    status: isConnected ? 'ok' : 'error',
    service: 'hpp_ngolab',
    port,
    database: process.env.DB_NAME || 'ngola_geasture_adm',
    connected: isConnected,
    timestamp: new Date().toISOString()
  });
});

// ==============================================================================
// 2. BUKU KAS BELANJA & ARUS KAS (CASHFLOW)
// ==============================================================================
app.get('/api/cashflow', async (req: Request, res: Response) => {
  try {
    const { category, type, limit = 200 } = req.query;
    let query = `
      SELECT c.*, i.name as ingredient_name
      FROM hpp_cashflow c
      LEFT JOIN hpp_master_ingredients i ON c.ingredient_id = i.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (category && category !== 'Semua') {
      conditions.push('c.description LIKE ? OR i.category = ?');
      params.push(`%${category}%`, category);
    }
    if (type && (type === 'cash_in' || type === 'cash_out')) {
      conditions.push('c.type = ?');
      params.push(type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY c.entry_date DESC, c.id DESC LIMIT ?';
    params.push(Number(limit));

    const [rows]: any = await pool.query(query, params);

    // Summary calculations
    const [summaryRows]: any = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'cash_in' THEN total_amount ELSE 0 END), 0) AS total_cash_in,
        COALESCE(SUM(CASE WHEN type = 'cash_out' THEN total_amount ELSE 0 END), 0) AS total_cash_out,
        COALESCE(SUM(CASE WHEN type = 'cash_out' AND (description LIKE '%bahan%' OR description LIKE '%kopi%' OR description LIKE '%susu%' OR description LIKE '%ayam%' OR description LIKE '%beras%' OR description LIKE '%telur%' OR description LIKE '%pasar%') THEN total_amount ELSE 0 END), 0) AS raw_material_expense,
        COALESCE(SUM(CASE WHEN type = 'cash_out' AND (description LIKE '%cup%' OR description LIKE '%lid%' OR description LIKE '%kemasan%' OR description LIKE '%packaging%') THEN total_amount ELSE 0 END), 0) AS packaging_expense,
        COALESCE(SUM(CASE WHEN type = 'cash_out' AND (description LIKE '%es%' OR description LIKE '%gas%' OR description LIKE '%operasional%' OR description LIKE '%atk%') THEN total_amount ELSE 0 END), 0) AS operational_expense
      FROM hpp_cashflow
    `);

    const totalIn = Number(summaryRows[0]?.total_cash_in || 0);
    const totalOut = Number(summaryRows[0]?.total_cash_out || 0);

    res.json({
      success: true,
      data: rows,
      summary: {
        total_cash_in: totalIn,
        total_cash_out: totalOut,
        balance: totalIn - totalOut,
        raw_material_expense: Number(summaryRows[0]?.raw_material_expense || 0),
        packaging_expense: Number(summaryRows[0]?.packaging_expense || 0),
        operational_expense: Number(summaryRows[0]?.operational_expense || 0),
        count: rows.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal mengambil buku kas', error: error.message });
  }
});

app.post('/api/cashflow', async (req: Request, res: Response) => {
  const { entry_date, type, description, ingredient_id, quantity, unit_price, total_amount, created_by, receipt_url, payment_method, notes } = req.body;
  if (!entry_date || !type || !description || total_amount === undefined) {
    return res.status(400).json({ success: false, message: 'Tanggal, jenis transaksi, deskripsi, dan nominal total wajib diisi.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const id = `cf-${Date.now()}`;
    await connection.query(
      `INSERT INTO hpp_cashflow (id, entry_date, type, description, ingredient_id, quantity, unit_price, total_amount, receipt_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        entry_date, 
        type, 
        notes ? `${description} (${notes})` : description, 
        ingredient_id || null, 
        quantity || null, 
        unit_price || null, 
        total_amount, 
        receipt_url || null, 
        created_by || 'Admin'
      ]
    );

    // Otomatisasi HPP: Jika cash_out terkait bahan baku dengan harga unit baru, update moving average AVCO
    if (type === 'cash_out' && ingredient_id && unit_price > 0) {
      const [ingRows]: any = await connection.query(
        'SELECT purchase_price, conversion_ratio, avco_price FROM hpp_master_ingredients WHERE id = ? FOR UPDATE',
        [ingredient_id]
      );
      if (ingRows.length > 0) {
        const ing = ingRows[0];
        const newLatestPrice = Number(unit_price);
        const ratio = Number(ing.conversion_ratio || 1);
        const newCostPerUsageUnit = ratio > 0 ? (newLatestPrice / ratio) : newLatestPrice;

        // Formula AVCO Moving Average: bobot 70% saldo lama + 30% pembelian baru
        const oldAvco = Number(ing.avco_price || newCostPerUsageUnit);
        const updatedAvco = Math.round(((oldAvco * 0.70) + (newCostPerUsageUnit * 0.30)) * 100) / 100;

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

app.delete('/api/cashflow/:id', async (req: Request, res: Response) => {
  try {
    const [result]: any = await pool.query('DELETE FROM hpp_cashflow WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Transaksi kas tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Transaksi kas berhasil dihapus.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal menghapus transaksi kas', error: error.message });
  }
});

// ==============================================================================
// 3. MASTER BAHAN BAKU & KONVERSI SATUAN
// ==============================================================================
app.get('/api/ingredients', async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;
    let query = 'SELECT * FROM hpp_master_ingredients';
    const conditions: string[] = [];
    const params: any[] = [];

    if (category && category !== 'Semua') {
      conditions.push('category = ?');
      params.push(category);
    }
    if (search) {
      conditions.push('(name LIKE ? OR id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY category, name';

    const [rows]: any = await pool.query(query, params);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat master bahan', error: error.message });
  }
});

app.get('/api/ingredients/:id', async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM hpp_master_ingredients WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bahan baku tidak ditemukan.' });
    }

    // Riwayat pembelian dari cashflow
    const [purchases]: any = await pool.query(
      'SELECT entry_date, description, quantity, unit_price, total_amount, created_by FROM hpp_cashflow WHERE ingredient_id = ? ORDER BY entry_date DESC LIMIT 10',
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...rows[0],
        purchase_history: purchases
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat detail bahan', error: error.message });
  }
});

app.post('/api/ingredients', async (req: Request, res: Response) => {
  const { id, name, category, purchase_unit, purchase_price, usage_unit, conversion_ratio, yield_percentage } = req.body;
  if (!name || !purchase_unit || !usage_unit || purchase_price === undefined || !conversion_ratio) {
    return res.status(400).json({ success: false, message: 'Nama, satuan beli, satuan pakai, harga, dan faktor konversi wajib diisi.' });
  }

  const ingredientId = id || `ing-${Date.now()}`;
  const price = Number(purchase_price);
  const ratio = Number(conversion_ratio);
  const costPerUsage = ratio > 0 ? price / ratio : price;
  const yieldPct = yield_percentage ? Number(yield_percentage) : 100.0;

  try {
    await pool.query(
      `INSERT INTO hpp_master_ingredients 
       (id, name, category, purchase_unit, purchase_price, usage_unit, conversion_ratio, cost_per_usage_unit, avco_price, yield_percentage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ingredientId, name, category || 'bahan_baku', purchase_unit, price, usage_unit, ratio, costPerUsage, costPerUsage, yieldPct]
    );
    res.status(201).json({ success: true, message: 'Bahan baku baru berhasil ditambahkan.', id: ingredientId });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal menambah bahan baku', error: error.message });
  }
});

app.put('/api/ingredients/:id', async (req: Request, res: Response) => {
  const { purchase_price, conversion_ratio, yield_percentage, category, name } = req.body;
  try {
    const [ingRows]: any = await pool.query('SELECT * FROM hpp_master_ingredients WHERE id = ?', [req.params.id]);
    if (!ingRows.length) return res.status(404).json({ success: false, message: 'Bahan tidak ditemukan.' });

    const current = ingRows[0];
    const newPrice = purchase_price !== undefined ? Number(purchase_price) : Number(current.purchase_price);
    const newRatio = conversion_ratio !== undefined ? Number(conversion_ratio) : Number(current.conversion_ratio);
    const newYield = yield_percentage !== undefined ? Number(yield_percentage) : Number(current.yield_percentage);
    const costPerUsage = newRatio > 0 ? (newPrice / newRatio) : newPrice;

    await pool.query(
      `UPDATE hpp_master_ingredients 
       SET name = COALESCE(?, name),
           category = COALESCE(?, category),
           purchase_price = ?, 
           conversion_ratio = ?,
           cost_per_usage_unit = ?, 
           yield_percentage = ?, 
           updated_at = NOW()
       WHERE id = ?`,
      [name || null, category || null, newPrice, newRatio, costPerUsage, newYield, req.params.id]
    );

    res.json({ success: true, message: 'Master bahan baku berhasil diperbarui.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui bahan', error: error.message });
  }
});

app.delete('/api/ingredients/:id', async (req: Request, res: Response) => {
  try {
    // Cek apakah bahan sedang dipakai di resep aktif
    const [usage]: any = await pool.query('SELECT COUNT(*) as count FROM hpp_recipe_ingredients WHERE ingredient_id = ?', [req.params.id]);
    if (usage[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Bahan tidak dapat dihapus karena digunakan pada ${usage[0].count} komposisi resep.` 
      });
    }

    await pool.query('DELETE FROM hpp_master_ingredients WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Bahan baku berhasil dihapus.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal menghapus bahan baku', error: error.message });
  }
});

// ==============================================================================
// 4. RESEP BERTINGKAT 3-TIER & KALKULASI HPP (DUAL COST BASIS ENGINE)
// ==============================================================================
app.get('/api/recipes', async (req: Request, res: Response) => {
  try {
    const { category, cost_basis = 'avco' } = req.query;
    const isAvco = cost_basis === 'avco';

    let query = `
      SELECT r.*, m.name AS pos_menu_name, m.price AS pos_price, m.category AS pos_category
      FROM hpp_recipes r
      LEFT JOIN menus m ON r.menu_id = m.id
    `;
    const params: any[] = [];
    if (category && category !== 'all' && category !== 'Semua') {
      query += ' WHERE r.category = ?';
      params.push(category);
    }
    query += ' ORDER BY r.is_subassembly DESC, r.category, r.name';

    const [recipes]: any = await pool.query(query, params);

    // Ambil detail bahan dan sub-assembly
    const [ingredients]: any = await pool.query(`
      SELECT ri.*, mi.name AS ingredient_name, mi.category AS ingredient_category,
             mi.cost_per_usage_unit, mi.avco_price,
             sr.name AS subassembly_name, sr.portion_yield AS sub_portion_yield
      FROM hpp_recipe_ingredients ri
      LEFT JOIN hpp_master_ingredients mi ON ri.ingredient_id = mi.id
      LEFT JOIN hpp_recipes sr ON ri.subassembly_recipe_id = sr.id
    `);

    // 1. Hitung biaya subassembly terlebih dahulu (Level 2)
    const subassemblyCosts = new Map<string, number>();
    for (const r of recipes) {
      if (r.is_subassembly) {
        const subIngs = ingredients.filter((i: any) => i.recipe_id === r.id);
        const subRawCost = subIngs.reduce((sum: number, item: any) => {
          const unitCost = isAvco ? Number(item.avco_price || item.cost_per_usage_unit || 0) : Number(item.cost_per_usage_unit || 0);
          return sum + (Number(item.quantity) * unitCost);
        }, 0);
        const totalBatch = subRawCost + Number(r.packaging_cost || 0) + Number(r.cooking_gas_cost || 0) + Number(r.labor_cost || 0);
        const yieldPortion = Number(r.portion_yield || 1);
        const costPerPiece = yieldPortion > 0 ? (totalBatch / yieldPortion) : totalBatch;
        subassemblyCosts.set(r.id, costPerPiece);
      }
    }

    // 2. Kelompokkan bahan per resep dan hitung total HPP Level 1
    const ingredientsByRecipe = new Map<string, any[]>();
    for (const ing of ingredients) {
      const list = ingredientsByRecipe.get(ing.recipe_id) || [];
      let costPerUnit = isAvco ? Number(ing.avco_price || ing.cost_per_usage_unit || 0) : Number(ing.cost_per_usage_unit || 0);

      // Jika komponen adalah subassembly, gunakan biaya terhitung dari subassemblyCosts
      if (ing.subassembly_recipe_id && subassemblyCosts.has(ing.subassembly_recipe_id)) {
        costPerUnit = subassemblyCosts.get(ing.subassembly_recipe_id) || costPerUnit;
      }

      const subtotal = Math.round(Number(ing.quantity) * costPerUnit);
      list.push({
        ...ing,
        cost_basis_used: isAvco ? 'avco' : 'latest_price',
        cost_per_unit: costPerUnit,
        subtotal_cost: subtotal
      });
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
      const currentPosPrice = Number(recipe.pos_price || 0);
      const grossProfit = currentPosPrice > 0 ? currentPosPrice - hppPerPortion : 0;
      const grossMarginPct = currentPosPrice > 0 ? ((grossProfit / currentPosPrice) * 100) : 0;

      return {
        ...recipe,
        menu_name: recipe.name,
        cost_basis: isAvco ? 'avco' : 'latest',
        ingredients: recipeIngs,
        total_raw_cost: totalRawCost,
        total_hpp: hppPerPortion,
        pos_price: currentPosPrice,
        gross_profit: grossProfit,
        gross_margin_percent: Math.round(grossMarginPct * 10) / 10
      };
    });

    res.json({
      success: true,
      cost_basis: isAvco ? 'avco' : 'latest',
      data: calculatedRecipes,
      total: calculatedRecipes.length
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat resep menu', error: error.message });
  }
});

// ==============================================================================
// 5. SINKRONISASI HARGA KE POS & POINTLAB + AUDIT LOGS
// ==============================================================================
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
      return res.status(404).json({ success: false, message: `Menu dengan ID "${menu_id}" tidak ditemukan di database POS.` });
    }

    const currentMenu = menuRows[0];
    const oldPrice = Number(currentMenu.price || 0);
    const targetPrice = Number(new_price);

    // Update harga di tabel master menus
    await connection.query('UPDATE menus SET price = ?, updated_at = NOW() WHERE id = ?', [targetPrice, menu_id]);

    // Catat audit log perubahan harga
    await connection.query(
      `INSERT INTO hpp_price_sync_logs (menu_id, menu_name, old_price, new_price, applied_margin_percent, synced_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        menu_id, 
        currentMenu.name, 
        oldPrice, 
        targetPrice, 
        applied_margin_percent || 0, 
        synced_by || 'Admin Finansial (hpp_ngolab)'
      ]
    );

    await connection.commit();
    res.json({
      success: true,
      message: `Harga '${currentMenu.name}' berhasil diperbarui ke Rp ${targetPrice.toLocaleString('id-ID')} pada Kasir POS & PointLab!`,
      menu_id,
      menu_name: currentMenu.name,
      old_price: oldPrice,
      new_price: targetPrice,
      delta: targetPrice - oldPrice
    });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ success: false, message: 'Gagal sinkronisasi harga ke POS', error: error.message });
  } finally {
    connection.release();
  }
});

app.get('/api/pricing/sync-logs', async (_req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM hpp_price_sync_logs ORDER BY synced_at DESC LIMIT 100');
    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat log audit harga POS', error: error.message });
  }
});

// ==============================================================================
// 6. LAPORAN REKONSILIASI & VARIANS REALISASI LABA KOTOR (RETROSPECTIVE VARIANCE)
// ==============================================================================
app.get('/api/reports/variance', async (_req: Request, res: Response) => {
  try {
    // 1. Agregasi penjualan riil dari order_items dan orders
    const [salesRows]: any = await pool.query(`
      SELECT 
        oi.menu_id, 
        oi.menu_name, 
        SUM(oi.quantity) AS total_sold_qty,
        SUM(oi.quantity * oi.price) AS total_revenue,
        r.id AS recipe_id,
        r.name AS recipe_name,
        r.packaging_cost,
        r.cooking_gas_cost,
        r.labor_cost,
        r.portion_yield
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN hpp_recipes r ON oi.menu_id = r.menu_id
      GROUP BY oi.menu_id, oi.menu_name, r.id, r.name, r.packaging_cost, r.cooking_gas_cost, r.labor_cost, r.portion_yield
      ORDER BY total_sold_qty DESC
    `);

    // 2. Ambil master bahan untuk kalkulasi HPP teoretis
    const [ingredients]: any = await pool.query(`
      SELECT ri.recipe_id, ri.quantity, mi.avco_price, mi.cost_per_usage_unit
      FROM hpp_recipe_ingredients ri
      JOIN hpp_master_ingredients mi ON ri.ingredient_id = mi.id
    `);

    const recipeHppMap = new Map<string, number>();
    for (const ing of ingredients) {
      const current = recipeHppMap.get(ing.recipe_id) || 0;
      const unitCost = Number(ing.avco_price || ing.cost_per_usage_unit || 0);
      recipeHppMap.set(ing.recipe_id, current + (Number(ing.quantity) * unitCost));
    }

    let theoreticalFoodCost = 0;
    let totalRevenue = 0;

    const itemVariances = salesRows.map((item: any) => {
      const rawCost = recipeHppMap.get(item.recipe_id) || 0;
      const pkg = Number(item.packaging_cost || 0);
      const gas = Number(item.cooking_gas_cost || 0);
      const hppSingle = Math.round(rawCost + pkg + gas);
      const qty = Number(item.total_sold_qty || 0);
      const rev = Number(item.total_revenue || 0);
      const itemTheoreticalCost = hppSingle * qty;

      theoreticalFoodCost += itemTheoreticalCost;
      totalRevenue += rev;

      return {
        menu_id: item.menu_id,
        menu_name: item.menu_name,
        total_sold: qty,
        unit_hpp: hppSingle,
        total_theoretical_cost: itemTheoreticalCost,
        total_revenue: rev,
        theoretical_gross_profit: rev - itemTheoreticalCost,
        theoretical_margin_pct: rev > 0 ? Math.round(((rev - itemTheoreticalCost) / rev) * 1000) / 10 : 0
      };
    });

    // 3. Ambil total realisasi belanja bahan riil dari hpp_cashflow
    const [cashflowSummary]: any = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'cash_out' THEN total_amount ELSE 0 END), 0) AS actual_cash_spent,
        COALESCE(SUM(CASE WHEN type = 'cash_in' THEN total_amount ELSE 0 END), 0) AS total_cash_in
      FROM hpp_cashflow
    `);

    const actualCashSpent = Number(cashflowSummary[0]?.actual_cash_spent || 0);
    const varianceRp = actualCashSpent - theoreticalFoodCost;
    const variancePct = theoreticalFoodCost > 0 ? (varianceRp / theoreticalFoodCost) * 100 : 0;

    res.json({
      success: true,
      summary: {
        total_revenue: totalRevenue,
        theoretical_food_cost: theoreticalFoodCost,
        actual_cash_spent: actualCashSpent,
        variance_amount: varianceRp,
        variance_percent: Math.round(variancePct * 10) / 10,
        status: varianceRp <= 0 ? 'Optimal / Hemat' : 'Overbudget / Perlu Audit Dapur',
        realized_gross_profit: totalRevenue - actualCashSpent,
        theoretical_gross_profit: totalRevenue - theoreticalFoodCost
      },
      sales_breakdown: itemVariances
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal menghitung laporan varians', error: error.message });
  }
});

// ==============================================================================
// START SERVER
// ==============================================================================
app.listen(port, '0.0.0.0', async () => {
  console.log(`[hpp_ngolab] API Server aktif di http://localhost:${port}`);
  await testConnection();
});
