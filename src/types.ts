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
  package_size?: number;
  purchase_price: number;
  usage_unit: string;
  conversion_ratio: number;
  cost_per_usage_unit: number;
  avco_price: number;
  yield_percentage: number;
  category: IngredientCategory;
  current_stock?: number;
  min_stock?: number;
  source_link?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RecipeIngredient {
  id?: number;
  recipe_id?: string;
  ingredient_id?: string | null;
  subassembly_recipe_id?: string | null;
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

export interface ProductionPlanItem {
  id?: number;
  plan_id?: string;
  recipe_id: string;
  recipe_name?: string;
  recipe_category?: string;
  quantity: number;
  margin_percent: number;
  fee_type: 'percent' | 'flat';
  fee_value: number;
  cost_per_unit: number;
  total_cost: number;
  suggested_price: number;
  total_revenue: number;
}

export interface ProductionPlan {
  id: string;
  title: string;
  plan_date: string;
  status: 'draft' | 'completed';
  global_margin: number;
  global_fee_type: 'percent' | 'flat';
  global_fee_value: number;
  total_cost: number;
  total_revenue: number;
  notes?: string;
  created_by?: string;
  items: ProductionPlanItem[];
  created_at?: string;
  updated_at?: string;
}

export interface AggregatedMaterial {
  ingredient_id: string;
  name: string;
  category: string;
  total_usage_qty: number;
  usage_unit: string;
  purchase_unit: string;
  purchase_qty: number;
  unit_price: number;
  estimated_cost: number;
  source_link?: string;
  current_stock?: number;
}

export interface KitchenCapacityItem {
  recipe_id: string;
  recipe_name: string;
  category: string;
  selling_price: number;
  hpp: number;
  max_possible: number;
  bottleneck_ingredient: string;
  bottleneck_stock: number;
  bottleneck_needed: number;
  bottleneck_unit: string;
  is_ready: boolean;
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

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Kasir' | 'Koki' | 'Support' | string;
  token?: string;
}
