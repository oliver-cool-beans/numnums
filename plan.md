# NumNums Storage Rewrite Plan

## Goal

Rebuild the recipe and ingredient storage model to minimize database size, keep product and recipe images, remove all `raw_*` ingredient fields, and simplify linking so the admin app operates comfortably within a tight storage budget.

The database has already been wiped, so this plan assumes a destructive schema rewrite is acceptable.

## Required Outcomes

1. Keep product images and recipe step images.
2. Drop all ingredient `raw_*` fields.
3. Drop `recipe_facets` entirely.
4. Drop unused EveryPlate ingredient metadata columns:
   - `external_id`
   - `external_uuid`
   - `ingredient_type`
   - `ingredient_slug`
   - `ingredient_country`
   - `shipped`
   - `family_name`
   - `family_slug`
   - `family_type`
5. Normalize ingredient identity so it is stored once.
6. Replace text-based ingredient-product links with `ingredient_id` foreign keys.
7. Update EveryPlate and ALDI import flows to match the new schema.
8. Remove query paths that depend on raw ingredient text or recipe facets.

## Target Schema

### `products`

Keep the existing normalized product model.

Columns retained:

- `id`
- `source`
- `external_id`
- `name`
- `brand`
- `category`
- `price_cents`
- `selling_size`
- `selling_unit`
- `image_url`
- `website_url`
- `available`
- `discontinued`
- timestamps

### `recipes`

Keep the current recipe-level metadata and the main `image_url`.

Columns retained:

- `id`
- `source`
- `external_id`
- `name`
- `slug`
- `headline`
- `description`
- `category`
- `country`
- `image_url`
- `website_url`
- `servings`
- `prep_minutes`
- `total_minutes`
- `difficulty`
- `average_rating`
- `ratings_count`
- `favorites_count`
- `serving_size`
- `unique_recipe_code`
- `is_active`
- `is_published`
- `is_addon`
- `source_created_at`
- `source_updated_at`
- timestamps

### `ingredients`

Create a canonical ingredient table.

Columns:

- `id`
- `source`
- `handle`
- `image_url`
- timestamps

Constraints:

- unique `(source, handle)`

Purpose:

- Store each ingredient identity once.
- Preserve ingredient images without repeating them on recipe usage rows.

### `recipe_ingredient_links`

Replace `recipe_ingredients` with a compact usage table.

Columns:

- `id`
- `recipe_id`
- `ingredient_id`
- `quantity`
- `unit`
- timestamps

Constraints:

- unique `(recipe_id, ingredient_id)`

Purpose:

- Record recipe usage without repeating ingredient identity data.

### `ingredient_product_links`

Rewrite to point at canonical ingredients.

Columns:

- `id`
- `ingredient_id`
- `product_id`
- `priority`
- `notes`
- `created_by_user_id`
- timestamps

Constraints:

- unique `(ingredient_id, product_id)`

Purpose:

- Avoid storing repeated `ingredient_source` and `ingredient_handle` text.

### `recipe_steps`

Keep this table.

Reason:

- It stores required instructions and recipe images or videos.

### Tables to Drop

1. `recipe_ingredients`
2. `recipe_facets`
3. Any indexes, grants, or RLS policies attached to those dropped tables

## Query Model Changes

### Ingredient review queue

Current behavior:

- groups unmatched items using `recipe_ingredients.source`, `recipe_ingredients.handle`, and `raw_name`

New behavior:

- group unmatched items using canonical `ingredients.source` and `ingredients.handle`
- derive counts from `recipe_ingredient_links`
- use the handle as the display label
- stop showing alternate raw names

### Ingredient review detail

Current behavior:

- loads recipe examples from `recipe_ingredients`
- creates product links from `(source, handle)`

New behavior:

- resolve the canonical ingredient row by `(source, handle)`
- load recipe examples from `recipe_ingredient_links`
- create product links using `ingredient_id`
- keep route params as `source` and `handle` so URLs remain stable

### Recipe list and recipe detail

Current behavior:

- reads recipe ingredient rows directly from `recipe_ingredients`
- reads facet badges from `recipe_facets`
- shows raw ingredient text and extra ingredient metadata

New behavior:

- join `recipe_ingredient_links` to `ingredients`
- drop facets from the detail page entirely
- display handle-based ingredient labels
- keep ingredient images via `ingredients.image_url`

### Product detail and ingredient-link management

Current behavior:

- computes recipe coverage from `ingredient_source` and `ingredient_handle`

New behavior:

- compute usage from `ingredient_id`
- join to canonical `ingredients` only when source and handle are needed for display or routing

## Importer Rewrite

### EveryPlate importer

Current behavior:

- writes recipes
- writes wide `recipe_ingredients` rows
- writes `recipe_steps`
- writes `recipe_facets`

New behavior:

1. Upsert recipes as before.
2. Build canonical ingredients from normalized handles.
3. Upsert into `ingredients` using `(source, handle)`.
4. Resolve `ingredient_id` for each imported ingredient.
5. Upsert compact `recipe_ingredient_links` with:
   - `recipe_id`
   - `ingredient_id`
   - `quantity`
   - `unit`
6. Replace `recipe_steps` as before.
7. Stop generating `recipe_facets` rows.
8. Stop writing all dropped ingredient metadata columns.

Notes:

- Ingredient images must be retained on canonical `ingredients.image_url`.
- Duplicate handles inside a single recipe must still collapse before writing.

### ALDI importer

Current behavior:

- writes normalized `products`

New behavior:

- keep the same `products` import path
- no ingredient schema writes are needed
- verify product records still satisfy downstream `ingredient_product_links.product_id` references

## Admin App Updates

### Server modules to rewrite

1. `apps/admin/server/db/types.ts`
2. `apps/admin/server/ingredients/get-ingredient-review.ts`
3. `apps/admin/server/ingredients/ingredient-links.ts`
4. `apps/admin/server/ingredients/list-unmatched-ingredients.ts`
5. `apps/admin/server/products/list-products.ts`
6. `apps/admin/server/recipes/list-recipes.ts`

### UI modules to simplify

1. `apps/admin/app/(dashboard)/page.tsx`
2. `apps/admin/app/(dashboard)/ingredients/unmatched/review-queue-table.tsx`
3. `apps/admin/app/(dashboard)/ingredients/unmatched/[source]/[handle]/recipe-mentions-table.tsx`
4. `apps/admin/app/(dashboard)/recipes/[recipeId]/page.tsx`
5. Any other page that still expects `rawName`, `rawNames`, facet lists, or dropped ingredient metadata

### Behavioral changes to preserve

1. Ingredient review routes remain `/ingredients/unmatched/[source]/[handle]`.
2. Product detail pages still show linked handles and recipe coverage.
3. Recipe detail pages still show step media.
4. Ingredient images remain available wherever they are useful.

## Migration Strategy

Because the database is already empty, use a destructive migration instead of a backfill-heavy compatibility layer.

### Phase 1: Drop and recreate the ingredient model

1. Drop `ingredient_product_links`.
2. Drop `recipe_ingredients`.
3. Drop `recipe_facets`.
4. Create `ingredients`.
5. Create `recipe_ingredient_links`.
6. Recreate `ingredient_product_links` with `ingredient_id`.
7. Recreate required indexes, grants, and RLS policies.

### Phase 2: Update importers

1. Rewrite EveryPlate import to populate `ingredients` and `recipe_ingredient_links`.
2. Keep ALDI import aligned to unchanged `products` schema.
3. Remove all dropped ingredient-field writes.
4. Remove all facet writes.

### Phase 3: Update admin reads

1. Replace all `recipe_ingredients` reads with link-table plus ingredient-table reads.
2. Replace all `ingredient_product_links` `(source, handle)` logic with `ingredient_id` logic.
3. Remove all facet reads.
4. Remove all raw-name UI and handle the display with canonical handle text.

### Phase 4: Re-import data

1. Import ALDI products.
2. Import EveryPlate recipes.
3. Verify `ingredients`, `recipe_ingredient_links`, and `ingredient_product_links` contain expected row counts.

## Index Plan

### Keep

1. `products(source, external_id)` unique path
2. `recipes(source, external_id)` unique path
3. `ingredients(source, handle)` unique index
4. `recipe_ingredient_links(recipe_id)`
5. `recipe_ingredient_links(ingredient_id)`
6. `ingredient_product_links(ingredient_id)`
7. `ingredient_product_links(product_id)`
8. `recipe_steps(recipe_id)`
9. `updated_at` support only where a real request path still needs it

### Drop

1. `recipe_ingredients_handle_idx`
2. `recipe_ingredients_raw_name_idx`
3. `recipe_ingredients_external_id_idx`
4. `recipe_ingredients_slug_idx`
5. `recipe_ingredients_recipe_source_external_id_unique_idx`
6. `recipe_ingredients_recipe_source_handle_unique_idx`
7. `recipe_facets_recipe_id_idx`
8. `recipe_facets_kind_slug_idx`

## Storage Wins

This rewrite reduces storage by:

1. storing canonical ingredient identity once
2. removing all raw ingredient text columns
3. removing unused EveryPlate ingredient metadata columns
4. dropping `recipe_facets`
5. shrinking `ingredient_product_links` from text keys to `ingredient_id`
6. removing redundant ingredient indexes

## Validation Checklist

### Schema

1. Fresh migration run succeeds against an empty database.
2. RLS policies still allow admin reads and writes.
3. Expected tables exist and dropped tables do not.

### Importers

1. ALDI import succeeds.
2. EveryPlate import succeeds.
3. Ingredient count matches unique `(source, handle)` pairs.
4. Recipe ingredient link count matches expected per-recipe usage count.
5. No facet rows are created.

### Admin app

1. Products list loads.
2. Product detail loads.
3. Recipes list loads.
4. Recipe detail loads without facets.
5. Unmatched ingredient queue loads.
6. Ingredient review detail loads.
7. Creating or deleting ingredient-product links still works.

### Focused commands

1. `node --check apps/admin/scripts/import-everyplate-recipes.mjs`
2. `node --check apps/admin/scripts/import-aldi-products.mjs`
3. `pnpm --filter @numnums/admin typecheck`

## Execution Order

1. Add the destructive schema migration.
2. Rewrite `apps/admin/server/db/types.ts`.
3. Rewrite EveryPlate importer.
4. Confirm ALDI importer still matches the retained product schema.
5. Rewrite ingredient-linking server modules.
6. Rewrite recipe and product usage queries.
7. Remove raw-name and facet UI dependencies.
8. Run focused validation.
9. Re-import ALDI and EveryPlate data.

## Out of Scope for This Rewrite

1. Converting UUID primary keys to bigint across the app
2. Reworking product schema beyond the current normalized fields
3. Reintroducing any suggestion or review-queue storage tables

These can be considered later if the storage budget remains too tight after the main normalization.
