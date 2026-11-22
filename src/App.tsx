import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import CashflowTab from './components/CashflowTab';
import VarianceReportTab from './components/VarianceReportTab';
import PricingSimulatorTab from './components/PricingSimulatorTab';
import RecipesTab from './components/RecipesTab';
import IngredientsTab from './components/IngredientsTab';
import { CashflowEntry, Recipe, Ingredient } from './types';
import { motion, AnimatePresence } from 'motion/react';

// Default Master Dataset from ngolab_dataset.xlsx (used as instant fallback if API is starting or cold)
const DEFAULT_INGREDIENTS: Ingredient[] = [
  { id: 'ING-01', name: 'Biji Kopi House Blend (70:30)', category: 'Kopi & Bubuk', purchase_unit: 'kg', usage_unit: 'gr', conversion_rate: 1000, cost_price: 165000, valuation_method: 'AVCO' },
  { id: 'ING-02', name: 'Fresh Milk Diamond Pasteurisasi', category: 'Susu & Dairy', purchase_unit: 'L', usage_unit: 'ml', conversion_rate: 1000, cost_price: 19500, valuation_method: 'AVCO' },
  { id: 'ING-03', name: 'Oatside Oat Milk Barista Edition', category: 'Susu & Dairy', purchase_unit: 'L', usage_unit: 'ml', conversion_rate: 1000, cost_price: 38000, valuation_method: 'AVCO' },
  { id: 'ING-04', name: 'Gula Aren Cair Premium Organik', category: 'Sirup & Pemanis', purchase_unit: 'L', usage_unit: 'ml', conversion_rate: 1000, cost_price: 36000, valuation_method: 'AVCO' },
  { id: 'ING-05', name: 'Sirup Pandan Ngolab Simple', category: 'Sirup & Pemanis', purchase_unit: 'L', usage_unit: 'ml', conversion_rate: 1000, cost_price: 42000, valuation_method: 'AVCO' },
  { id: 'ING-06', name: 'Sirup Karamel Gourmet 700ml', category: 'Sirup & Pemanis', purchase_unit: 'btl', usage_unit: 'ml', conversion_rate: 700, cost_price: 135000, valuation_method: 'AVCO' },
  { id: 'ING-07', name: 'Bubuk Matcha Premium Uji', category: 'Kopi & Bubuk', purchase_unit: 'kg', usage_unit: 'gr', conversion_rate: 1000, cost_price: 240000, valuation_method: 'AVCO' },
  { id: 'ING-08', name: 'Bubuk Dark Chocolate Belgia', category: 'Kopi & Bubuk', purchase_unit: 'kg', usage_unit: 'gr', conversion_rate: 1000, cost_price: 150000, valuation_method: 'AVCO' },
  { id: 'ING-09', name: 'Teh Hitam Loose Leaf Signature', category: 'Teh & Buah', purchase_unit: 'kg', usage_unit: 'gr', conversion_rate: 1000, cost_price: 75000, valuation_method: 'AVCO' },
  { id: 'ING-10', name: 'Sirup Leci Concentrate', category: 'Teh & Buah', purchase_unit: 'btl', usage_unit: 'ml', conversion_rate: 750, cost_price: 95000, valuation_method: 'AVCO' },
  { id: 'ING-11', name: 'Cup Dingin PP Injection 16oz', category: 'Kemasan', purchase_unit: 'slop', usage_unit: 'pcs', conversion_rate: 50, cost_price: 37500, valuation_method: 'Harga Pasar' },
  { id: 'ING-12', name: 'Strawless Flat Lid Transparan', category: 'Kemasan', purchase_unit: 'slop', usage_unit: 'pcs', conversion_rate: 50, cost_price: 15000, valuation_method: 'Harga Pasar' },
  { id: 'ING-13', name: 'Sedotan Steril Bungkus Kertas', category: 'Kemasan', purchase_unit: 'pack', usage_unit: 'pcs', conversion_rate: 100, cost_price: 12000, valuation_method: 'Harga Pasar' },
  { id: 'ING-14', name: 'Paper Bag Kraft Sablon Ngolab', category: 'Kemasan', purchase_unit: 'pack', usage_unit: 'pcs', conversion_rate: 50, cost_price: 35000, valuation_method: 'Harga Pasar' },
  { id: 'ING-15', name: 'Es Batu Kristal Tube Higienis', category: 'Operasional', purchase_unit: 'karung', usage_unit: 'kg', conversion_rate: 10, cost_price: 15000, valuation_method: 'Harga Pasar' }
];

const DEFAULT_RECIPES: Recipe[] = [
  {
    id: 'REC-01',
    menu_id: 1,
    menu_name: 'Kopi Susu Gula Aren (Signature)',
    category: 'Espresso Based',
    calculated_hpp: 5920,
    selling_price: 18000,
    portion_yield: 1,
    packaging_cost: 1170,
    cooking_gas_cost: 0,
    labor_cost: 500,
    ingredients: [
      { ingredient_name: 'Biji Kopi House Blend', ingredient_category: 'Kopi & Bubuk', quantity_needed: 18, unit: 'gr', cost_per_unit: 165, subtotal_cost: 2970 },
      { ingredient_name: 'Fresh Milk Diamond', ingredient_category: 'Susu & Dairy', quantity_needed: 100, unit: 'ml', cost_per_unit: 19.5, subtotal_cost: 1950 },
      { ingredient_name: 'Gula Aren Cair Premium', ingredient_category: 'Sirup & Pemanis', quantity_needed: 25, unit: 'ml', cost_per_unit: 36, subtotal_cost: 900 },
      { ingredient_name: 'Cup PP Injection 16oz', ingredient_category: 'Kemasan', quantity_needed: 1, unit: 'pcs', cost_per_unit: 750, subtotal_cost: 750 },
      { ingredient_name: 'Strawless Flat Lid', ingredient_category: 'Kemasan', quantity_needed: 1, unit: 'pcs', cost_per_unit: 300, subtotal_cost: 300 },
      { ingredient_name: 'Sedotan Kertas Steril', ingredient_category: 'Kemasan', quantity_needed: 1, unit: 'pcs', cost_per_unit: 120, subtotal_cost: 120 }
    ]
  },
  {
    id: 'REC-02',
    menu_id: 2,
    menu_name: 'Americano Iced (Double Shot)',
    category: 'Espresso Based',
    calculated_hpp: 3840,
    selling_price: 15000,
    portion_yield: 1,
    packaging_cost: 1170,
    cooking_gas_cost: 0,
    labor_cost: 500,
    ingredients: [
      { ingredient_name: 'Biji Kopi House Blend', ingredient_category: 'Kopi & Bubuk', quantity_needed: 18, unit: 'gr', cost_per_unit: 165, subtotal_cost: 2970 },
      { ingredient_name: 'Air Mineral RO Filter', ingredient_category: 'Operasional', quantity_needed: 120, unit: 'ml', cost_per_unit: 2, subtotal_cost: 240 },
      { ingredient_name: 'Cup PP Injection 16oz', ingredient_category: 'Kemasan', quantity_needed: 1, unit: 'pcs', cost_per_unit: 750, subtotal_cost: 750 },
      { ingredient_name: 'Strawless Flat Lid', ingredient_category: 'Kemasan', quantity_needed: 1, unit: 'pcs', cost_per_unit: 300, subtotal_cost: 300 },
      { ingredient_name: 'Sedotan Kertas Steril', ingredient_category: 'Kemasan', quantity_needed: 1, unit: 'pcs', cost_per_unit: 120, subtotal_cost: 120 }
    ]
  },
  {
    id: 'REC-03',
    menu_id: 3,
    menu_name: 'Caffe Latte Iced',
    category: 'Espresso Based',
    calculated_hpp: 6360,
    selling_price: 20000,
    portion_yield: 1,
    packaging_cost: 1170,
    cooking_gas_cost: 0,
    labor_cost: 500,
    ingredients: [
      { ingredient_name: 'Biji Kopi House Blend', ingredient_category: 'Kopi & Bubuk', quantity_needed: 18, unit: 'gr', cost_per_unit: 165, subtotal_cost: 2970 },
      { ingredient_name: 'Fresh Milk Diamond', ingredient_category: 'Susu & Dairy', quantity_needed: 140, unit: 'ml', cost_per_unit: 19.5, subtotal_cost: 2730 },
      { ingredient_name: 'Cup PP Injection 16oz', ingredient_category: 'Kemasan', quantity_needed: 1, unit: 'pcs', cost_per_unit: 750, subtotal_cost: 750 },
      { ingredient_name: 'Strawless Flat Lid', ingredient_category: 'Kemasan', quantity_needed: 1, unit: 'pcs', cost_per_unit: 300, subtotal_cost: 300 },
      { ingredient_name: 'Sedotan Kertas Steril', ingredient_category: 'Kemasan', quantity_needed: 1, unit: 'pcs', cost_per_unit: 120, subtotal_cost: 120 }
    ]
  },
  {
    id: 'REC-04',
    menu_id: 4,
    menu_name: 'Matcha Oat Latte (Uji Premium)',
    category: 'Non-Coffee',
    calculated_hpp: 7850,
    selling_price: 24000,
    portion_yield: 1,
    packaging_cost: 1170,
    cooking_gas_cost: 0,
    labor_cost: 500,
    ingredients: [
      { ingredient_name: 'Bubuk Matcha Premium Uji', ingredient_category: 'Kopi & Bubuk', quantity_needed: 12, unit: 'gr', cost_per_unit: 240, subtotal_cost: 2880 },
      { ingredient_name: 'Oatside Oat Milk Barista', ingredient_category: 'Susu & Dairy', quantity_needed: 120, unit: 'ml', cost_per_unit: 38, subtotal_cost: 4560 },
      { ingredient_name: 'Cup PP Injection 16oz', ingredient_category: 'Kemasan', quantity_needed: 1, unit: 'pcs', cost_per_unit: 750, subtotal_cost: 750 },
      { ingredient_name: 'Strawless Flat Lid', ingredient_category: 'Kemasan', quantity_needed: 1, unit: 'pcs', cost_per_unit: 300, subtotal_cost: 300 }
    ]
  },
  {
    id: 'REC-05',
    menu_id: 5,
    menu_name: 'Pandan Latte Ngolab',
    category: 'Signature',
    calculated_hpp: 6980,
    selling_price: 22000,
    portion_yield: 1,
    packaging_cost: 1170,
    cooking_gas_cost: 0,
    labor_cost: 500,
    ingredients: [
      { ingredient_name: 'Biji Kopi House Blend', ingredient_category: 'Kopi & Bubuk', quantity_needed: 18, unit: 'gr', cost_per_unit: 165, subtotal_cost: 2970 },
      { ingredient_name: 'Fresh Milk Diamond', ingredient_category: 'Susu & Dairy', quantity_needed: 120, unit: 'ml', cost_per_unit: 19.5, subtotal_cost: 2340 },
      { ingredient_name: 'Sirup Pandan Ngolab Simple', ingredient_category: 'Sirup & Pemanis', quantity_needed: 25, unit: 'ml', cost_per_unit: 42, subtotal_cost: 1050 },
      { ingredient_name: 'Cup PP Injection 16oz', ingredient_category: 'Kemasan', quantity_needed: 1, unit: 'pcs', cost_per_unit: 750, subtotal_cost: 750 },
      { ingredient_name: 'Strawless Flat Lid', ingredient_category: 'Kemasan', quantity_needed: 1, unit: 'pcs', cost_per_unit: 300, subtotal_cost: 300 }
    ]
  },
  {
    id: 'REC-06',
    menu_id: 6,
    menu_name: 'Lychee Tea Artisan',
    category: 'Teh & Buah',
    calculated_hpp: 4250,
    selling_price: 16000,
    portion_yield: 1,
    packaging_cost: 1170,
    cooking_gas_cost: 0,
    labor_cost: 500,
    ingredients: [
      { ingredient_name: 'Teh Hitam Loose Leaf', ingredient_category: 'Teh & Buah', quantity_needed: 10, unit: 'gr', cost_per_unit: 75, subtotal_cost: 750 },
      { ingredient_name: 'Sirup Leci Concentrate', ingredient_category: 'Teh & Buah', quantity_needed: 25, unit: 'ml', cost_per_unit: 126, subtotal_cost: 3150 },
      { ingredient_name: 'Cup PP Injection 16oz', ingredient_category: 'Kemasan', quantity_needed: 1, unit: 'pcs', cost_per_unit: 750, subtotal_cost: 750 },
      { ingredient_name: 'Strawless Flat Lid', ingredient_category: 'Kemasan', quantity_needed: 1, unit: 'pcs', cost_per_unit: 300, subtotal_cost: 300 }
    ]
  }
];

const DEFAULT_CASHFLOW: CashflowEntry[] = [
  { id: 'CF-101', date: '2026-11-22', type: 'expense', category: 'Bahan Baku', description: 'Restock Fresh Milk Diamond Pasteurisasi 12L', amount: 234000, payment_method: 'Tunai Kasir', pic_name: 'Rian (Barista)' },
  { id: 'CF-102', date: '2026-11-22', type: 'expense', category: 'Bahan Baku', description: 'Restock Biji Kopi House Blend 70:30 (5 kg)', amount: 825000, payment_method: 'Transfer Mandiri', pic_name: 'Admin Ngolab' },
  { id: 'CF-103', date: '2026-11-21', type: 'expense', category: 'Kemasan', description: 'Beli Cup PP 16oz Sablon & Strawless Flat Lid 20 Slop', amount: 1050000, payment_method: 'Transfer Mandiri', pic_name: 'Logistik HQ' },
  { id: 'CF-104', date: '2026-11-21', type: 'expense', category: 'Operasional', description: 'Es Batu Kristal Tube 3 Karung & Air Galon RO', amount: 65000, payment_method: 'Tunai Kasir', pic_name: 'Siti (Kasir Pagi)' },
  { id: 'CF-105', date: '2026-11-20', type: 'income', category: 'Pemasukan', description: 'Modal Kas Awal Shift Pagi Outlet Ngolab', amount: 500000, payment_method: 'Tunai Kasir', pic_name: 'Supervisor Shift' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('cashflow');
  const [cashflowEntries, setCashflowEntries] = useState<CashflowEntry[]>(DEFAULT_CASHFLOW);
  const [recipes, setRecipes] = useState<Recipe[]>(DEFAULT_RECIPES);
  const [ingredients, setIngredients] = useState<Ingredient[]>(DEFAULT_INGREDIENTS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [costBasis, setCostBasis] = useState<'avco' | 'latest'>('avco');

  // Fetch real data from backend API
  const loadData = useCallback(async (basis: 'avco' | 'latest' = costBasis) => {
    setIsLoading(true);
    try {
      // 1. Fetch cashflow
      const cfRes = await fetch('/api/cashflow').catch(() => null);
      if (cfRes && cfRes.ok) {
        const json = await cfRes.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: CashflowEntry[] = json.data.map((row: any) => ({
            id: String(row.id),
            date: row.entry_date?.split('T')[0] || row.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            type: row.type === 'cash_in' ? 'income' : 'expense',
            category: row.category || (row.type === 'cash_in' ? 'Pemasukan' : 'Bahan Baku'),
            description: row.description || 'Transaksi Kas',
            amount: Number(row.total_amount || 0),
            payment_method: row.payment_method || 'Tunai',
            pic_name: row.created_by || 'Admin',
            receipt_url: row.receipt_url,
            notes: row.notes
          }));
          setCashflowEntries(mapped);
        }
      }

      // 2. Fetch recipes with specific cost basis
      const recRes = await fetch(`/api/recipes?cost_basis=${basis}`).catch(() => null);
      if (recRes && recRes.ok) {
        const json = await recRes.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: Recipe[] = json.data.map((r: any) => ({
            id: String(r.id),
            menu_id: r.menu_id,
            menu_name: r.name || r.menu_name,
            category: r.category || 'Menu Ngolab',
            calculated_hpp: Number(r.total_hpp || 0),
            selling_price: Number(r.pos_price || r.price || 0),
            portion_yield: Number(r.portion_yield || 1),
            packaging_cost: Number(r.packaging_cost || 0),
            cooking_gas_cost: Number(r.cooking_gas_cost || 0),
            labor_cost: Number(r.labor_cost || 0),
            ingredients: (r.ingredients || []).map((ing: any) => ({
              ingredient_name: ing.ingredient_name || ing.name || 'Bahan',
              ingredient_category: ing.ingredient_category || ing.category || 'Bahan',
              quantity_needed: Number(ing.quantity || ing.quantity_needed || 0),
              unit: ing.unit || 'satuan',
              cost_per_unit: Number(ing.cost_per_unit || 0),
              subtotal_cost: Number(ing.subtotal_cost || 0)
            }))
          }));
          setRecipes(mapped);
        }
      }

      // 3. Fetch ingredients
      const ingRes = await fetch('/api/ingredients').catch(() => null);
      if (ingRes && ingRes.ok) {
        const json = await ingRes.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: Ingredient[] = json.data.map((i: any) => ({
            id: String(i.id),
            name: i.name,
            category: i.category || 'Bahan Baku',
            purchase_unit: i.purchase_unit || 'kg',
            usage_unit: i.usage_unit || 'gr',
            conversion_rate: Number(i.conversion_ratio || 1),
            cost_price: Number(i.purchase_price || 0),
            avco_price: Number(i.avco_price || 0),
            valuation_method: 'AVCO'
          }));
          setIngredients(mapped);
        }
      }
    } catch (e) {
      console.warn('API sync fallback to default local dataset:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler for adding cashflow entry
  const handleAddCashflow = async (entry: Omit<CashflowEntry, 'id'>) => {
    try {
      const response = await fetch('/api/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: entry.date,
          type: entry.type === 'income' ? 'cash_in' : 'cash_out',
          description: entry.description,
          total_amount: entry.amount,
          created_by: entry.pic_name,
          category: entry.category,
          payment_method: entry.payment_method,
          receipt_url: entry.receipt_url,
          notes: entry.notes
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Gagal menyimpan transaksi ke database.');
      }

      const resJson = await response.json().catch(() => ({}));
      const newEntry: CashflowEntry = {
        ...entry,
        id: resJson.id || `cf-${Date.now()}`
      };

      setCashflowEntries(prev => [newEntry, ...prev]);
    } catch (err: any) {
      // If server is not responding, save locally
      const localEntry: CashflowEntry = {
        ...entry,
        id: `cf-${Date.now()}`
      };
      setCashflowEntries(prev => [localEntry, ...prev]);
      console.warn('Saved entry in local state:', err);
    }
  };

  // Handler for syncing price to POS
  const handleSyncPOS = async (recipeId: string | number, newPrice: number, costPrice: number) => {
    const targetRecipe = recipes.find(r => r.id === recipeId);
    const menuId = targetRecipe?.menu_id;
    if (!menuId) {
      throw new Error(`Resep "${targetRecipe?.menu_name || recipeId}" belum memiliki relasi menu_id di POS.`);
    }

    try {
      const response = await fetch('/api/pricing/sync-pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_id: menuId,
          new_price: newPrice,
          applied_margin_percent: Math.round(((newPrice - costPrice) / newPrice) * 100),
          synced_by: 'Admin Finansial (hpp_ngolab)'
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Gagal sinkronisasi POS');
      }

      // Update recipe in local state
      setRecipes(prev => prev.map(r => {
        if (r.id === recipeId) {
          return { ...r, selling_price: newPrice, calculated_hpp: costPrice };
        }
        return r;
      }));
    } catch (err: any) {
      // Local fallback
      setRecipes(prev => prev.map(r => {
        if (r.id === recipeId) {
          return { ...r, selling_price: newPrice, calculated_hpp: costPrice };
        }
        return r;
      }));
      console.warn('Synced in local state:', err);
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'cashflow':
        return (
          <CashflowTab
            entries={cashflowEntries}
            onAddEntry={handleAddCashflow}
            isLoading={isLoading}
            searchTerm={searchTerm}
          />
        );
      case 'variance':
        return (
          <VarianceReportTab />
        );
      case 'pricing':
        return (
          <PricingSimulatorTab
            recipes={recipes}
            onSyncPOS={handleSyncPOS}
            isLoading={isLoading}
            searchTerm={searchTerm}
            costBasis={costBasis}
            onCostBasisChange={(basis) => {
              setCostBasis(basis);
              loadData(basis);
            }}
          />
        );
      case 'recipes':
        return (
          <RecipesTab
            recipes={recipes}
            isLoading={isLoading}
            searchTerm={searchTerm}
          />
        );
      case 'ingredients':
        return (
          <IngredientsTab
            ingredients={ingredients}
            isLoading={isLoading}
            searchTerm={searchTerm}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Exact Sidebar from backend_ngolab design system */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onRefresh={loadData}
          isLoading={isLoading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />

        {/* Content Area with smooth motion animations */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="max-w-7xl mx-auto w-full"
            >
              {renderActiveTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
