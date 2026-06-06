export type ProductRow = {
  id: string;
  source: string;
  external_id: string;
  name: string;
  brand: string | null;
  category: string | null;
  price_cents: number | null;
  selling_size: number | null;
  selling_unit: string | null;
  image_url: string | null;
  website_url: string | null;
  available: boolean | null;
  discontinued: boolean;
  created_at: string;
  updated_at: string;
};

export type RecipeRow = {
  id: string;
  source: string;
  external_id: string;
  name: string;
  slug: string | null;
  headline: string | null;
  description: string | null;
  image_url: string | null;
  website_url: string | null;
  servings: number | null;
  prep_minutes: number | null;
  total_minutes: number | null;
  difficulty: number | null;
  serving_size: number | null;
  created_at: string;
  updated_at: string;
};

export type RecipeStepRow = {
  id: string;
  recipe_id: string;
  step_number: number;
  instructions: string;
  image_assets: Array<{
    url: string;
    path: string | null;
    caption: string | null;
  }> | null;
  video_assets: Array<{
    url: string;
    path: string | null;
    caption: string | null;
  }> | null;
  created_at: string;
  updated_at: string;
};

export type IngredientRow = {
  id: string;
  source: string;
  handle: string;
  image_url: string | null;
  is_pantry: boolean;
  created_at: string;
  updated_at: string;
};

export type RecipeFacetRow = never;

export type UserRow = {
  id: string;
  name: string | null;
  plan: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
};

export type IngredientReviewQueueRow = {
  id: string;
  source: string;
  raw_name: string;
  handle: string;
  created_at: string;
  updated_at: string;
};

export type RecipeIngredientRow = {
  id: string;
  recipe_id: string;
  source: string;
  external_id?: string | null;
  external_uuid?: string | null;
  raw_name: string;
  handle: string;
  ingredient_type?: string | null;
  ingredient_slug?: string | null;
  ingredient_image_url?: string | null;
  ingredient_country?: string | null;
  shipped?: boolean;
  family_name?: string | null;
  family_slug?: string | null;
  family_type?: string | null;
  quantity: number | null;
  unit: string | null;
  created_at: string;
  updated_at: string;
};

export type RecipeIngredientLinkRow = {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number | null;
  unit: string | null;
  created_at: string;
  updated_at: string;
};

export type IngredientProductLinkRow = {
  id: string;
  ingredient_id: string;
  ingredient_source?: string;
  ingredient_handle?: string;
  product_id: string;
  priority: number;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ImportRunRow = {
  id: string;
  import_type: string;
  status: string;
  records_seen: number | null;
  records_inserted: number | null;
  records_updated: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

export type ProductSummary = {
  id: string;
  source: string;
  externalId: string;
  name: string;
  brand: string | null;
  category: string | null;
  priceCents: number | null;
  sellingSize: number | null;
  sellingUnit: string | null;
  imageUrl: string | null;
  websiteUrl: string | null;
  available: boolean;
  linkCount: number;
  updatedAt: string;
};

export type RecipeSummary = {
  id: string;
  source: string;
  externalId: string;
  name: string;
  slug: string | null;
  headline: string | null;
  description: string | null;
  servings: number | null;
  prepMinutes: number | null;
  totalMinutes: number | null;
  difficulty: number | null;
  servingSize: number | null;
  createdAt: string;
  ingredientCount: number;
  linkedIngredients: number;
  unlinkedIngredients: number;
  updatedAt: string;
};

export type AdminUserSummary = {
  id: string;
  name: string | null;
  authRole: string | null;
  plan: string | null;
  createdAt: string;
  lastSeenAt: string | null;
};

export type IngredientReviewQueueItem = {
  id: string;
  source: string;
  rawName: string;
  handle: string;
  updatedAt: string;
};

export type IngredientReviewGroupItem = {
  source: string;
  handle: string;
  rawName: string;
  rawNames: string[];
  pendingCount: number;
  updatedAt: string;
};

export type IngredientRecipeExample = {
  id: string;
  recipeId: string;
  recipeName: string;
  recipeSlug: string | null;
  externalIngredientId: string | null;
  ingredientType: string | null;
  ingredientSlug: string | null;
  ingredientCountry: string | null;
  familyName: string | null;
  shipped: boolean;
  rawName: string;
  quantity: number | null;
  unit: string | null;
};

export type IngredientLinkedProduct = {
  linkId: string;
  productId: string;
  name: string;
  brand: string | null;
  source: string;
  available: boolean;
  linkable: boolean;
  priority: number;
  createdByUserId: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  imageUrl: string | null;
  websiteUrl: string | null;
};

export type IngredientLinkSummary = {
  linkId: string;
  ingredientSource: string;
  ingredientHandle: string;
  productId: string;
  productName: string;
  productBrand: string | null;
  productSource: string;
  productImageUrl: string | null;
  productWebsiteUrl: string | null;
  productAvailable: boolean;
  productLinkable: boolean;
  priority: number;
  recipeCount: number;
  notes: string | null;
  createdByUserId: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ImportRunSummary = {
  id: string;
  importType: string;
  status: string;
  recordsSeen: number | null;
  recordsInserted: number | null;
  recordsUpdated: number | null;
  errorMessage: string | null;
  completedAt: string | null;
};