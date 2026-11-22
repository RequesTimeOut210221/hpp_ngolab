export type IngredientCategory = 'bahan_baku' | 'bumbu' | 'kemasan' | 'operasional';

export interface MasterIngredient {
  id: string;
  item_id?: string | null;
  name: string;
  purchase_unit: string;
  purchase_price: number;
  usage_unit: string;
  conversion_ratio: number;
  cost_per_usage_unit: number;
  avco_price: number;
  yield_percentage: number;
  category: IngredientCategory;
  created_at?: string;
  updated_at?: string;
}

export type MenuCategory = 'makanan_berat' | 'camilan' | 'minuman' | 'bakso_mie' | 'subassembly';

export interface RecipeIngredient {
  id?: number;
  recipe_id?: string;
  ingredient_id?: string | null;
  subassembly_recipe_id?: string | null;
  quantity: number;
  unit: string;
  notes?: string | null;
  ingredient_name?: string;
  cost_per_unit?: number;
  subtotal_cost?: number;
}

export interface Recipe {
  id: string;
  menu_id?: number | null;
  name: string;
  category: MenuCategory;
  portion_yield: number;
  packaging_cost: number;
  cooking_gas_cost: number;
  labor_cost: number;
  is_subassembly: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  ingredients?: RecipeIngredient[];
  total_raw_cost?: number;
  total_hpp?: number;
  pos_price?: number | null;
}

export interface CashflowEntry {
  id: string;
  entry_date: string;
  type: 'cash_in' | 'cash_out';
  description: string;
  ingredient_id?: string | null;
  ingredient_name?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_amount: number;
  receipt_url?: string | null;
  created_by: string;
  created_at?: string;
}

export interface PriceSyncLog {
  id: number;
  menu_id: number;
  menu_name: string;
  old_price: number;
  new_price: number;
  applied_margin_percent: number;
  synced_by: string;
  synced_at: string;
}

export interface PricingSimulationResult {
  recipe_id: string;
  menu_name: string;
  category: MenuCategory;
  cost_basis: 'latest' | 'avco';
  portion_yield: number;
  raw_material_cost: number;
  packaging_cost: number;
  cooking_gas_cost: number;
  labor_cost: number;
  total_hpp: number;
  current_pos_price: number;
  target_gross_margin_percent: number;
  recommended_price: number;
  current_gross_margin_percent: number;
  food_cost_ratio_percent: number;
  net_profit_per_portion: number;
}
