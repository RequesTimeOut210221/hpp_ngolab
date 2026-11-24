import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { pool, testConnection } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const app = express();
const port = Number(process.env.PORT || 5002);

const allowedOrigins = (process.env.CORS_ORIGIN || 'https://hpp.ngolab.online,https://geasteats.ngolab.online,https://logistik.ngolab.online,https://point.ngolab.online,http://localhost:5177,http://localhost:3000,http://localhost:5173,http://localhost:5174')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*') || origin.endsWith('.ngolab.online')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());

// Serve static frontend assets from dist/ in production
app.use(express.static(distPath));

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
// 1.5. AUTENTIKASI KHUSUS HPP NGOLAB (STAFF & ADMIN ONLY)
// ==============================================================================
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password, identifier } = req.body;
  const loginUser = (identifier || email || '').trim();

  if (!loginUser || !password) {
    return res.status(400).json({ success: false, message: 'Email/Username dan Password wajib diisi.' });
  }

  try {
    // Hanya staff/admin yang bisa login (Super Admin, Admin, Kasir, Koki, Support)
    // Sesuai requirement: Sementara ini admin/superadmin dan semua staff bisa masuk.
    // Kedepannya: dapat dibatasi hanya role finance/logistik/manajerial.
    const [staffRows]: any = await pool.query(
      'SELECT id, name, role, email, phone, status, password_hash, password_plain FROM staff WHERE email = ? OR id = ? OR phone = ? LIMIT 1',
      [loginUser, loginUser, loginUser]
    );

    if (!staffRows.length) {
      return res.status(401).json({
        success: false,
        message: 'Akun tidak ditemukan atau tidak memiliki hak akses Staff/Admin di sistem Ngolab.'
      });
    }

    const staff = staffRows[0];

    if (staff.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Akun Anda dinonaktifkan. Hubungi Super Admin.' });
    }

    const ALLOWED_ROLES = ['Super Admin', 'Admin', 'Kasir', 'Koki', 'Support'];
    if (!ALLOWED_ROLES.includes(staff.role)) {
      return res.status(403).json({
        success: false,
        message: `Role "${staff.role}" tidak diizinkan mengakses modul HPP & Finansial.`
      });
    }

    // Password verification: bcrypt -> sha256 -> plaintext fallback
    let isMatch = false;
    const storedHash = staff.password_hash;

    if (storedHash) {
      if (/^\$2[aby]\$/.test(storedHash)) {
        isMatch = await bcrypt.compare(password, storedHash);
      } else {
        const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
        isMatch = (legacyHash === storedHash);
      }
    }

    if (!isMatch && staff.password_plain) {
      isMatch = (password === staff.password_plain);
    }

    // Default development / test superuser fallback
    if (!isMatch && (staff.email === 'admin@gmail.com' || staff.id === 'S001')) {
      if (password === 'admin123' || password === 'admin') {
        isMatch = true;
      }
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Password salah.' });
    }

    const token = `hpp-token-${staff.id}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

    res.json({
      success: true,
      message: `Selamat datang, ${staff.name}!`,
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role
      },
      token
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem saat autentikasi', error: error.message });
  }
});

app.get('/api/auth/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Belum login' });
  }

  // Token format: hpp-token-<staff_id>-<timestamp>-<hex>
  const token = authHeader.replace('Bearer ', '').trim();
  const parts = token.split('-');
  if (parts.length >= 3 && parts[1]) {
    const staffId = parts[1];
    try {
      const [rows]: any = await pool.query('SELECT id, name, role, email, status FROM staff WHERE id = ?', [staffId]);
      if (rows.length && rows[0].status === 'active') {
        return res.json({ success: true, user: rows[0] });
      }
    } catch {
      // fallback
    }
  }

  res.json({ success: false, message: 'Sesi berakhir atau token tidak valid' });
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
  const { id, name, category, purchase_unit, package_size, purchase_price, usage_unit, conversion_ratio, yield_percentage, current_stock, min_stock, source_link } = req.body;
  if (!name || !purchase_unit || !usage_unit || purchase_price === undefined || !conversion_ratio) {
    return res.status(400).json({ success: false, message: 'Nama, satuan beli, satuan pakai, harga, dan faktor konversi wajib diisi.' });
  }

  const ingredientId = id || `ing-${Date.now()}`;
  const price = Number(purchase_price);
  const ratio = Number(conversion_ratio);
  const costPerUsage = ratio > 0 ? price / ratio : price;
  const yieldPct = yield_percentage ? Number(yield_percentage) : 100.0;
  const pkgSize = package_size ? Number(package_size) : 1.0;
  const curStock = current_stock !== undefined ? Number(current_stock) : 50.0;
  const minStk = min_stock !== undefined ? Number(min_stock) : 10.0;

  try {
    await pool.query(
      `INSERT INTO hpp_master_ingredients 
       (id, name, category, purchase_unit, package_size, purchase_price, usage_unit, conversion_ratio, cost_per_usage_unit, avco_price, yield_percentage, current_stock, min_stock, source_link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ingredientId, name, category || 'bahan_baku', purchase_unit, pkgSize, price, usage_unit, ratio, costPerUsage, costPerUsage, yieldPct, curStock, minStk, source_link || null]
    );
    res.status(201).json({ success: true, message: 'Bahan baku baru berhasil ditambahkan.', id: ingredientId });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal menambah bahan baku', error: error.message });
  }
});

app.put('/api/ingredients/:id', async (req: Request, res: Response) => {
  const { purchase_price, conversion_ratio, yield_percentage, category, name, package_size, current_stock, min_stock, source_link } = req.body;
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
           package_size = COALESCE(?, package_size),
           current_stock = COALESCE(?, current_stock),
           min_stock = COALESCE(?, min_stock),
           source_link = COALESCE(?, source_link),
           updated_at = NOW()
       WHERE id = ?`,
      [
        name || null, 
        category || null, 
        newPrice, 
        newRatio, 
        costPerUsage, 
        newYield,
        package_size !== undefined ? Number(package_size) : null,
        current_stock !== undefined ? Number(current_stock) : null,
        min_stock !== undefined ? Number(min_stock) : null,
        source_link !== undefined ? source_link : null,
        req.params.id
      ]
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

app.post('/api/recipes', async (req: Request, res: Response) => {
  const { name, category, menu_id, portion_yield, is_subassembly, packaging_cost, cooking_gas_cost, labor_cost, ingredients } = req.body;
  if (!name || !category) {
    return res.status(400).json({ success: false, message: 'Nama resep dan kategori wajib diisi.' });
  }

  const recipeId = req.body.id || `REC-${Date.now()}`;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO hpp_recipes (id, menu_id, name, category, portion_yield, is_subassembly, packaging_cost, cooking_gas_cost, labor_cost)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recipeId,
        menu_id || null,
        name,
        category,
        Number(portion_yield || 1),
        is_subassembly ? 1 : 0,
        Number(packaging_cost || 0),
        Number(cooking_gas_cost || 0),
        Number(labor_cost || 0)
      ]
    );

    if (Array.isArray(ingredients) && ingredients.length > 0) {
      for (const ing of ingredients) {
        if (!ing.ingredient_id && !ing.subassembly_recipe_id) continue;
        await connection.query(
          `INSERT INTO hpp_recipe_ingredients (recipe_id, ingredient_id, subassembly_recipe_id, quantity, unit)
           VALUES (?, ?, ?, ?, ?)`,
          [
            recipeId,
            ing.ingredient_id || null,
            ing.subassembly_recipe_id || null,
            Number(ing.quantity || 0),
            ing.unit || 'satuan'
          ]
        );
      }
    }

    await connection.commit();
    res.status(201).json({ success: true, message: 'Resep baru berhasil diracik dan disimpan!', id: recipeId });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ success: false, message: 'Gagal membuat resep baru', error: error.message });
  } finally {
    connection.release();
  }
});

app.put('/api/recipes/:id', async (req: Request, res: Response) => {
  const { name, category, menu_id, portion_yield, is_subassembly, packaging_cost, cooking_gas_cost, labor_cost, ingredients } = req.body;
  const recipeId = req.params.id;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing]: any = await connection.query('SELECT * FROM hpp_recipes WHERE id = ?', [recipeId]);
    if (!existing.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Resep tidak ditemukan.' });
    }

    await connection.query(
      `UPDATE hpp_recipes 
       SET name = COALESCE(?, name),
           category = COALESCE(?, category),
           menu_id = ?,
           portion_yield = ?,
           is_subassembly = ?,
           packaging_cost = ?,
           cooking_gas_cost = ?,
           labor_cost = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        name || null,
        category || null,
        menu_id !== undefined ? menu_id : existing[0].menu_id,
        portion_yield !== undefined ? Number(portion_yield) : existing[0].portion_yield,
        is_subassembly !== undefined ? (is_subassembly ? 1 : 0) : existing[0].is_subassembly,
        packaging_cost !== undefined ? Number(packaging_cost) : existing[0].packaging_cost,
        cooking_gas_cost !== undefined ? Number(cooking_gas_cost) : existing[0].cooking_gas_cost,
        labor_cost !== undefined ? Number(labor_cost) : existing[0].labor_cost,
        recipeId
      ]
    );

    if (Array.isArray(ingredients)) {
      await connection.query('DELETE FROM hpp_recipe_ingredients WHERE recipe_id = ?', [recipeId]);
      for (const ing of ingredients) {
        if (!ing.ingredient_id && !ing.subassembly_recipe_id) continue;
        await connection.query(
          `INSERT INTO hpp_recipe_ingredients (recipe_id, ingredient_id, subassembly_recipe_id, quantity, unit)
           VALUES (?, ?, ?, ?, ?)`,
          [
            recipeId,
            ing.ingredient_id || null,
            ing.subassembly_recipe_id || null,
            Number(ing.quantity || 0),
            ing.unit || 'satuan'
          ]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Resep berhasil diperbarui!' });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ success: false, message: 'Gagal memperbarui resep', error: error.message });
  } finally {
    connection.release();
  }
});

app.delete('/api/recipes/:id', async (req: Request, res: Response) => {
  const recipeId = req.params.id;
  try {
    const [usage]: any = await pool.query(
      'SELECT r.name FROM hpp_recipe_ingredients ri JOIN hpp_recipes r ON ri.recipe_id = r.id WHERE ri.subassembly_recipe_id = ?',
      [recipeId]
    );
    if (usage.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Resep tidak dapat dihapus karena digunakan sebagai bahan olahan subassembly di resep "${usage[0].name}".` 
      });
    }

    await pool.query('DELETE FROM hpp_recipe_ingredients WHERE recipe_id = ?', [recipeId]);
    await pool.query('DELETE FROM hpp_recipes WHERE id = ?', [recipeId]);
    res.json({ success: true, message: 'Resep berhasil dihapus.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal menghapus resep', error: error.message });
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
// 7. RENCANA BATCH PRODUKSI & DAFTAR BELANJA PASAR (BATCH PRODUCTION PLANS)
// ==============================================================================
app.get('/api/plans', async (_req: Request, res: Response) => {
  try {
    const [plans]: any = await pool.query('SELECT * FROM hpp_production_plans ORDER BY plan_date DESC, created_at DESC');
    const [items]: any = await pool.query(`
      SELECT pi.*, r.name AS recipe_name, r.category AS recipe_category
      FROM hpp_production_plan_items pi
      LEFT JOIN hpp_recipes r ON pi.recipe_id = r.id
      ORDER BY pi.id ASC
    `);

    const itemsByPlan = new Map<string, any[]>();
    for (const it of items) {
      const list = itemsByPlan.get(it.plan_id) || [];
      list.push(it);
      itemsByPlan.set(it.plan_id, list);
    }

    const result = plans.map((p: any) => ({
      ...p,
      items: itemsByPlan.get(p.id) || []
    }));

    res.json({ success: true, data: result, total: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat rencana produksi', error: error.message });
  }
});

app.get('/api/plans/:id/shopping-list', async (req: Request, res: Response) => {
  try {
    const planId = req.params.id;
    const [items]: any = await pool.query('SELECT * FROM hpp_production_plan_items WHERE plan_id = ?', [planId]);
    if (!items.length) {
      return res.status(404).json({ success: false, message: 'Rencana produksi tidak memiliki item menu.' });
    }

    const [recipes]: any = await pool.query('SELECT * FROM hpp_recipes');
    const [ingredients]: any = await pool.query('SELECT * FROM hpp_master_ingredients');
    const [recipeIngs]: any = await pool.query('SELECT * FROM hpp_recipe_ingredients');

    const ingMap = new Map<string, any>(ingredients.map((i: any) => [i.id, i]));
    const recipeMap = new Map<string, any>(recipes.map((r: any) => [r.id, r]));

    const rawMaterialMap = new Map<string, { 
      ingredient_id: string; 
      name: string; 
      category: string; 
      total_usage_qty: number; 
      usage_unit: string; 
      purchase_unit: string; 
      conversion_ratio: number;
      unit_price: number; 
      source_link?: string; 
      current_stock: number;
    }>();

    const addMaterial = (ingId: string, usageQty: number) => {
      const ing = ingMap.get(ingId);
      if (!ing) return;
      const current = rawMaterialMap.get(ingId) || {
        ingredient_id: ingId,
        name: ing.name,
        category: ing.category,
        total_usage_qty: 0,
        usage_unit: ing.usage_unit,
        purchase_unit: ing.purchase_unit,
        conversion_ratio: Number(ing.conversion_ratio || 1),
        unit_price: Number(ing.purchase_price || 0),
        source_link: ing.source_link || null,
        current_stock: Number(ing.current_stock || 0)
      };
      current.total_usage_qty += usageQty;
      rawMaterialMap.set(ingId, current);
    };

    for (const item of items) {
      const targetQty = Number(item.quantity || 0);
      const subIngs = recipeIngs.filter((ri: any) => ri.recipe_id === item.recipe_id);
      for (const ri of subIngs) {
        if (ri.ingredient_id) {
          addMaterial(ri.ingredient_id, Number(ri.quantity) * targetQty);
        } else if (ri.subassembly_recipe_id) {
          const subRec = recipeMap.get(ri.subassembly_recipe_id);
          const subYield = Number(subRec?.portion_yield || 1);
          const piecesNeeded = Number(ri.quantity) * targetQty;
          const batchesNeeded = subYield > 0 ? piecesNeeded / subYield : piecesNeeded;

          const deepIngs = recipeIngs.filter((di: any) => di.recipe_id === ri.subassembly_recipe_id);
          for (const di of deepIngs) {
            if (di.ingredient_id) {
              addMaterial(di.ingredient_id, Number(di.quantity) * batchesNeeded);
            }
          }
        }
      }
    }

    const shoppingList = Array.from(rawMaterialMap.values()).map(m => {
      const purchaseQty = m.conversion_ratio > 0 ? (m.total_usage_qty / m.conversion_ratio) : m.total_usage_qty;
      const estimatedCost = Math.round(purchaseQty * m.unit_price);
      return {
        ...m,
        purchase_qty: Math.round(purchaseQty * 100) / 100,
        estimated_cost: estimatedCost
      };
    }).sort((a, b) => b.estimated_cost - a.estimated_cost);

    const totalEstimatedCost = shoppingList.reduce((sum, item) => sum + item.estimated_cost, 0);

    res.json({
      success: true,
      plan_id: planId,
      total_estimated_cost: totalEstimatedCost,
      items_count: shoppingList.length,
      shopping_list: shoppingList
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal menyusun daftar belanja', error: error.message });
  }
});

app.post('/api/plans', async (req: Request, res: Response) => {
  const { title, plan_date, global_margin, global_fee_type, global_fee_value, notes, created_by, items } = req.body;
  if (!title || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Judul dan minimal 1 item menu wajib diisi.' });
  }

  const planId = `plan-${Date.now()}`;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let grandCost = 0;
    let grandRevenue = 0;

    for (const it of items) {
      grandCost += Number(it.total_cost || 0);
      grandRevenue += Number(it.total_revenue || 0);
    }

    await connection.query(
      `INSERT INTO hpp_production_plans 
       (id, title, plan_date, status, global_margin, global_fee_type, global_fee_value, total_cost, total_revenue, notes, created_by)
       VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)`,
      [
        planId,
        title,
        plan_date || new Date().toISOString().split('T')[0],
        Number(global_margin || 50),
        global_fee_type || 'percent',
        Number(global_fee_value || 0),
        grandCost,
        grandRevenue,
        notes || null,
        created_by || 'Admin Tangolab'
      ]
    );

    for (const it of items) {
      await connection.query(
        `INSERT INTO hpp_production_plan_items 
         (plan_id, recipe_id, quantity, margin_percent, fee_type, fee_value, cost_per_unit, total_cost, suggested_price, total_revenue)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          planId,
          it.recipe_id,
          Number(it.quantity || 1),
          Number(it.margin_percent || 50),
          it.fee_type || 'percent',
          Number(it.fee_value || 0),
          Number(it.cost_per_unit || 0),
          Number(it.total_cost || 0),
          Number(it.suggested_price || 0),
          Number(it.total_revenue || 0)
        ]
      );
    }

    await connection.commit();
    res.status(201).json({ success: true, message: 'Rencana produksi baru berhasil disimpan!', id: planId });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ success: false, message: 'Gagal membuat rencana produksi', error: error.message });
  } finally {
    connection.release();
  }
});

app.put('/api/plans/:id', async (req: Request, res: Response) => {
  const planId = req.params.id;
  const { title, plan_date, global_margin, global_fee_type, global_fee_value, notes, items } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let grandCost = 0;
    let grandRevenue = 0;
    if (Array.isArray(items)) {
      for (const it of items) {
        grandCost += Number(it.total_cost || 0);
        grandRevenue += Number(it.total_revenue || 0);
      }
    }

    await connection.query(
      `UPDATE hpp_production_plans 
       SET title = COALESCE(?, title),
           plan_date = COALESCE(?, plan_date),
           global_margin = COALESCE(?, global_margin),
           global_fee_type = COALESCE(?, global_fee_type),
           global_fee_value = COALESCE(?, global_fee_value),
           total_cost = ?,
           total_revenue = ?,
           notes = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        title || null,
        plan_date || null,
        global_margin !== undefined ? Number(global_margin) : null,
        global_fee_type || null,
        global_fee_value !== undefined ? Number(global_fee_value) : null,
        grandCost,
        grandRevenue,
        notes !== undefined ? notes : null,
        planId
      ]
    );

    if (Array.isArray(items) && items.length > 0) {
      await connection.query('DELETE FROM hpp_production_plan_items WHERE plan_id = ?', [planId]);
      for (const it of items) {
        await connection.query(
          `INSERT INTO hpp_production_plan_items 
           (plan_id, recipe_id, quantity, margin_percent, fee_type, fee_value, cost_per_unit, total_cost, suggested_price, total_revenue)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            planId,
            it.recipe_id,
            Number(it.quantity || 1),
            Number(it.margin_percent || 50),
            it.fee_type || 'percent',
            Number(it.fee_value || 0),
            Number(it.cost_per_unit || 0),
            Number(it.total_cost || 0),
            Number(it.suggested_price || 0),
            Number(it.total_revenue || 0)
          ]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Rencana produksi berhasil diperbarui!' });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ success: false, message: 'Gagal memperbarui rencana produksi', error: error.message });
  } finally {
    connection.release();
  }
});

app.delete('/api/plans/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM hpp_production_plans WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Rencana produksi berhasil dihapus.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal menghapus rencana', error: error.message });
  }
});

app.post('/api/plans/:id/toggle-status', async (req: Request, res: Response) => {
  const planId = req.params.id;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [plans]: any = await connection.query('SELECT * FROM hpp_production_plans WHERE id = ? FOR UPDATE', [planId]);
    if (!plans.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Rencana tidak ditemukan.' });
    }

    const currentPlan = plans[0];
    const isExecuting = currentPlan.status !== 'completed';
    const newStatus = isExecuting ? 'completed' : 'draft';

    const [items]: any = await connection.query('SELECT * FROM hpp_production_plan_items WHERE plan_id = ?', [planId]);
    const [recipeIngs]: any = await connection.query('SELECT * FROM hpp_recipe_ingredients');
    const [ingredients]: any = await connection.query('SELECT id, conversion_ratio, current_stock FROM hpp_master_ingredients');
    const ingRatioMap = new Map<string, number>(ingredients.map((i: any) => [i.id, Number(i.conversion_ratio || 1)]));

    const deductions = new Map<string, number>();
    for (const it of items) {
      const targetQty = Number(it.quantity || 0);
      const subIngs = recipeIngs.filter((ri: any) => ri.recipe_id === it.recipe_id);
      for (const ri of subIngs) {
        if (ri.ingredient_id) {
          const ratio = ingRatioMap.get(ri.ingredient_id) || 1;
          const usageQty = Number(ri.quantity) * targetQty;
          const purchaseUnitDeduction = ratio > 0 ? usageQty / ratio : usageQty;
          const cur = deductions.get(ri.ingredient_id) || 0;
          deductions.set(ri.ingredient_id, cur + purchaseUnitDeduction);
        }
      }
    }

    for (const [ingId, qtyDeducted] of deductions.entries()) {
      if (isExecuting) {
        await connection.query('UPDATE hpp_master_ingredients SET current_stock = GREATEST(0, current_stock - ?), updated_at = NOW() WHERE id = ?', [qtyDeducted, ingId]);
      } else {
        await connection.query('UPDATE hpp_master_ingredients SET current_stock = current_stock + ?, updated_at = NOW() WHERE id = ?', [qtyDeducted, ingId]);
      }
    }

    await connection.query('UPDATE hpp_production_plans SET status = ?, updated_at = NOW() WHERE id = ?', [newStatus, planId]);

    await connection.commit();
    res.json({
      success: true,
      status: newStatus,
      message: isExecuting 
        ? `Rencana "${currentPlan.title}" ditandai TERLAKSANA. Stok bahan baku telah otomatis dikurangi.`
        : `Pelaksanaan rencana dibatalkan (Undo). Stok bahan baku telah dikembalikan.`
    });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ success: false, message: 'Gagal mengubah status rencana', error: error.message });
  } finally {
    connection.release();
  }
});

app.post('/api/plans/:id/copy-to-cashflow', async (req: Request, res: Response) => {
  const planId = req.params.id;
  const { pic_name = 'Admin Tangolab' } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [plans]: any = await connection.query('SELECT * FROM hpp_production_plans WHERE id = ?', [planId]);
    if (!plans.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Rencana tidak ditemukan.' });
    }
    const plan = plans[0];

    const [items]: any = await connection.query('SELECT * FROM hpp_production_plan_items WHERE plan_id = ?', [planId]);
    const [recipeIngs]: any = await connection.query('SELECT * FROM hpp_recipe_ingredients');
    const [ingredients]: any = await connection.query('SELECT * FROM hpp_master_ingredients');
    const ingMap = new Map<string, any>(ingredients.map((i: any) => [i.id, i]));

    const aggregated = new Map<string, { id: string; name: string; purchase_qty: number; purchase_unit: string; unit_price: number; total_amount: number }>();

    for (const it of items) {
      const targetQty = Number(it.quantity || 0);
      const subIngs = recipeIngs.filter((ri: any) => ri.recipe_id === it.recipe_id);
      for (const ri of subIngs) {
        if (ri.ingredient_id) {
          const ing = ingMap.get(ri.ingredient_id);
          if (!ing) continue;
          const ratio = Number(ing.conversion_ratio || 1);
          const usageQty = Number(ri.quantity) * targetQty;
          const purchaseQty = ratio > 0 ? usageQty / ratio : usageQty;
          const unitPrice = Number(ing.purchase_price || 0);

          const cur = aggregated.get(ri.ingredient_id) || {
            id: ri.ingredient_id,
            name: ing.name,
            purchase_qty: 0,
            purchase_unit: ing.purchase_unit,
            unit_price: unitPrice,
            total_amount: 0
          };
          cur.purchase_qty += purchaseQty;
          cur.total_amount = Math.round(cur.purchase_qty * cur.unit_price);
          aggregated.set(ri.ingredient_id, cur);
        }
      }
    }

    let insertedCount = 0;
    let grandSpent = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const mat of aggregated.values()) {
      if (mat.total_amount <= 0) continue;
      const cashflowId = `CF-PLAN-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const desc = `Belanja Bahan: ${mat.name} (${Math.round(mat.purchase_qty * 100) / 100} ${mat.purchase_unit}) - Rencana "${plan.title}"`;
      
      await connection.query(
        `INSERT INTO hpp_cashflow 
         (id, entry_date, type, description, ingredient_id, quantity, unit_price, total_amount, created_by)
         VALUES (?, ?, 'cash_out', ?, ?, ?, ?, ?, ?)`,
        [
          cashflowId,
          today,
          desc,
          mat.id,
          Math.round(mat.purchase_qty * 100) / 100,
          mat.unit_price,
          mat.total_amount,
          pic_name
        ]
      );
      insertedCount++;
      grandSpent += mat.total_amount;
    }

    await connection.commit();
    res.json({
      success: true,
      message: `Berhasil menyalin ${insertedCount} item belanja bahan baku senilai Rp ${grandSpent.toLocaleString('id-ID')} ke Buku Kas Belanja Harian!`,
      inserted_count: insertedCount,
      total_amount: grandSpent
    });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ success: false, message: 'Gagal menyalin belanja ke buku kas', error: error.message });
  } finally {
    connection.release();
  }
});

// ==============================================================================
// 8. CEK KAPASITAS DAPUR & DETEKSI BAHAN KRITIS (KITCHEN CAPACITY & BOTTLENECK)
// ==============================================================================
app.get('/api/kitchen-capacity', async (_req: Request, res: Response) => {
  try {
    const [recipes]: any = await pool.query(`
      SELECT r.*, m.price AS pos_price 
      FROM hpp_recipes r 
      LEFT JOIN menus m ON r.menu_id = m.id 
      WHERE r.is_subassembly = 0
      ORDER BY r.category, r.name
    `);

    const [ingredients]: any = await pool.query('SELECT * FROM hpp_master_ingredients');
    const [recipeIngs]: any = await pool.query('SELECT * FROM hpp_recipe_ingredients');

    const ingMap = new Map<string, any>(ingredients.map((i: any) => [i.id, i]));

    const capacityList = recipes.map((recipe: any) => {
      const ings = recipeIngs.filter((ri: any) => ri.recipe_id === recipe.id);
      let maxPossible = Infinity;
      let bottleneck = {
        name: '-',
        stock: 0,
        needed: 0,
        unit: ''
      };

      for (const ri of ings) {
        if (ri.ingredient_id) {
          const ing = ingMap.get(ri.ingredient_id);
          if (ing) {
            const ratio = Number(ing.conversion_ratio || 1);
            const stockInUsage = Number(ing.current_stock || 0) * ratio;
            const neededPerPortion = Number(ri.quantity || 1);
            const possible = neededPerPortion > 0 ? Math.floor(stockInUsage / neededPerPortion) : Infinity;

            if (possible < maxPossible) {
              maxPossible = possible;
              bottleneck = {
                name: ing.name,
                stock: Math.round(Number(ing.current_stock || 0) * 10) / 10,
                needed: neededPerPortion,
                unit: ing.usage_unit
              };
            }
          }
        }
      }

      if (maxPossible === Infinity) maxPossible = 0;

      return {
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        category: recipe.category,
        selling_price: Number(recipe.pos_price || 0),
        max_possible: maxPossible,
        bottleneck_ingredient: bottleneck.name,
        bottleneck_stock: bottleneck.stock,
        bottleneck_needed: bottleneck.needed,
        bottleneck_unit: bottleneck.unit,
        is_ready: maxPossible >= 10
      };
    });

    const lowStockIngredients = ingredients.filter((i: any) => Number(i.current_stock || 0) <= Number(i.min_stock || 10));

    res.json({
      success: true,
      total_recipes: capacityList.length,
      capacity_list: capacityList,
      low_stock_ingredients: lowStockIngredients
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal menghitung kapasitas dapur', error: error.message });
  }
});

// ==============================================================================
// 6. SPA FALLBACK FOR FRONTEND CLIENT ROUTING
// ==============================================================================
app.use((req: Request, res: Response, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  next();
});

// ==============================================================================
// START SERVER
// ==============================================================================
app.listen(port, '0.0.0.0', async () => {
  console.log(`[hpp_ngolab] API Server aktif di http://localhost:${port}`);
  await testConnection();
});
