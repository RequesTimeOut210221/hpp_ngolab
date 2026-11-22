export type IngredientCategory = 'bahan_baku' | 'bumbu' | 'kemasan' | 'operasional' | string;

export interface Ingredient {
  id: string;
  item_id?: string | null;
  name: string;
  category: string;
  purchase_unit: string;
  usage_unit: string;
  conversion_rate: number;
  cost_price: number;
  avco_price?: number;
  valuation_method?: string;
  created_at?: string;
  updated_at?: string;
}

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

export interface RecipeIngredient {
  id?: number;
  recipe_id?: string;
  ingredient_id?: string | null;
  ingredient_name: string;
  ingredient_category?: string;
  quantity_needed: number;
  unit: string;
  cost_per_unit: number;
  subtotal_cost: number;
  notes?: string | null;
}

export interface Recipe {
  id: string;
  menu_id?: number | null;
  menu_name: string;
  category: string;
  calculated_hpp: number;
  selling_price: number;
  portion_yield: number;
  packaging_cost: number;
  cooking_gas_cost: number;
  labor_cost: number;
  is_subassembly?: boolean;
  ingredients: RecipeIngredient[];
  created_at?: string;
  updated_at?: string;
}

export interface CashflowEntry {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  payment_method?: string;
  pic_name?: string;
  receipt_url?: string;
  notes?: string;
}

export interface CashflowSummary {
  total_cash_in: number;
  total_cash_out: number;
  balance: number;
}
