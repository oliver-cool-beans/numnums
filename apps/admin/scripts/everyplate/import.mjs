import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeEveryPlateMediaUrl } from './media.mjs';
import { fetchEveryPlateRecipes } from './fetch.mjs';
import {
  chunk,
  createAdminSupabaseClient,
  createImportRun,
  finishImportRun,
  formatSummary,
  normalizeIngredientHandle,
  parseArgs,
  readJsonFile,
  resolveRepoPath,
  upsertRows
} from '../shared/import-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMPORT_TYPE = 'everyplate_recipes';
const SOURCE = 'everyplate';
const DEFAULT_INPUT_PATH = resolveRepoPath('src', 'scripts', 'output', 'ep-recipes-raw.json');
const OVERRIDES_PATH = path.resolve(__dirname, 'ingredient-overrides.json');

const ALLOWED_UNITS = new Set(['g', 'ml', 'l', 'tbs', 'tsp', 'cup']);
const UNRECOGNISED_UNITS_LOG = path.resolve(__dirname, 'unrecognised-units.log');

const unrecognisedUnits = new Set();

function buildOverrideLookup(overrides) {
  const lookup = new Map();

  for (const override of overrides) {
    const handle = override.ingredient_handle;
    const sourceUnit = (override.source_unit ?? '').toLowerCase();

    if (!lookup.has(handle)) {
      lookup.set(handle, new Map());
    }

    lookup.get(handle).set(sourceUnit, {
      sourceQuantity: override.source_quantity,
      quantity: override.quantity,
      unit: override.unit
    });
  }

  return lookup;
}

function applyOverride(handle, quantity, unit, overrideLookup) {
  const handleOverrides = overrideLookup.get(handle);
  if (!handleOverrides) return { quantity, unit };

  const sourceUnit = (unit ?? '').toLowerCase();
  const override = handleOverrides.get(sourceUnit);
  if (!override) return { quantity, unit };

  const ratio = (quantity ?? override.sourceQuantity) / override.sourceQuantity;

  return {
    quantity: ratio * override.quantity,
    unit: override.unit
  };
}

function validateUnit(handle, unit) {
  if (unit === null) return true;
  if (ALLOWED_UNITS.has(unit)) return true;

  console.warn(`[import-everyplate] Unrecognised unit "${unit}" for ingredient "${handle}" — no override found, setting unit to null`);
  unrecognisedUnits.add(`${unit}\t${handle}`);
  return false;
}

function formatBatchLabel(metadata) {
  if (!metadata?.page) {
    return 'file import';
  }

  return `page ${metadata.page}`;
}

function logImportStage(metadata, message) {
  console.error(`[import-everyplate] ${formatBatchLabel(metadata)}: ${message}`);
}

function buildRecipeIngredientKey(row) {
  return `${row.recipe_id}::${row.handle}`;
}

function buildIngredientKey(row) {
  return `${row.source}::${row.handle}`;
}

function countIngredientDetails(row) {
  return [
    row.image_url,
    row.unit,
    row.quantity
  ].filter((value) => value !== null && value !== undefined && value !== '').length;
}

function choosePreferredIngredientRow(currentRow, nextRow) {
  const currentScore = countIngredientDetails(currentRow);
  const nextScore = countIngredientDetails(nextRow);

  if (nextScore > currentScore) {
    return nextRow;
  }

  return currentRow;
}

function dedupeIngredientRows(rows) {
  const rowsByKey = new Map();

  for (const row of rows) {
    const key = buildRecipeIngredientKey(row);
    const currentRow = rowsByKey.get(key);

    if (!currentRow) {
      rowsByKey.set(key, row);
      continue;
    }

    rowsByKey.set(key, choosePreferredIngredientRow(currentRow, row));
  }

  return [...rowsByKey.values()];
}

function buildCanonicalIngredientRows(rows) {
  const rowsByKey = new Map();

  for (const row of rows) {
    const key = buildIngredientKey(row);
    const currentRow = rowsByKey.get(key);

    if (!currentRow) {
      rowsByKey.set(key, {
        source: row.source,
        handle: row.handle,
        image_url: row.image_url ?? null
      });
      continue;
    }

    if (!currentRow.image_url && row.image_url) {
      currentRow.image_url = row.image_url;
    }
  }

  return [...rowsByKey.values()];
}

const DIETARY_TAG_PATTERNS = [
  { tag: 'vegetarian', slugs: ['vegetarian', 'veggie', 'vegetarisch'], names: ['vegetarian', 'veggie'] },
  { tag: 'vegan', slugs: ['vegan', 'plant-based', 'plant_based'], names: ['vegan'] },
  { tag: 'gluten-free', slugs: ['gluten-free', 'gluten_free', 'glutenfree'], names: ['gluten free', 'gluten-free'] },
  { tag: 'dairy-free', slugs: ['dairy-free', 'dairy_free', 'dairyfree', 'lactose-free'], names: ['dairy free', 'dairy-free'] },
];

function shouldImportRecipe(recipe) {
  if (!recipe.headline) return false;
  if (!recipe.description) return false;

  const steps = recipe.steps ?? [];
  if (steps.length === 0) return false;
  return steps.every(
    (step) => Array.isArray(step.imageAssets) && step.imageAssets.length > 0
  );
}

function deriveDietaryTags(recipe) {
  const facets = recipe.tags ?? [];
  const result = [];

  for (const pattern of DIETARY_TAG_PATTERNS) {
    const slugSet = new Set(pattern.slugs);
    const nameSet = new Set(pattern.names);

    const matches = facets.some((facet) => {
      const slug = (facet.slug ?? '').toLowerCase();
      const name = (facet.name ?? '').toLowerCase();
      return slugSet.has(slug) || nameSet.has(name);
    });

    if (matches) {
      result.push(pattern.tag);
    }
  }

  return result;
}

function mapRecipe(recipe) {
  return {
    source: SOURCE,
    external_id: String(recipe.id),
    name: recipe.name,
    slug: recipe.slug ?? null,
    headline: recipe.headline ?? null,
    description: recipe.description ?? null,
    image_url: normalizeEveryPlateMediaUrl(recipe.imageUrl),
    website_url: recipe.websiteUrl ?? null,
    servings: Number.isFinite(recipe.servings) ? recipe.servings : null,
    prep_minutes: Number.isFinite(recipe.prepMinutes) ? recipe.prepMinutes : null,
    total_minutes: Number.isFinite(recipe.totalMinutes) ? recipe.totalMinutes : null,
    difficulty: Number.isFinite(recipe.difficulty) ? recipe.difficulty : null,
    serving_size: Number.isFinite(recipe.servingSize) ? recipe.servingSize : null,
    dietary_tags: deriveDietaryTags(recipe)
  };
}

function mapIngredient(recipeId, ingredient, overrideLookup) {
  const name = String(ingredient.name ?? '').trim();
  const handle = normalizeIngredientHandle(name);

  if (!handle) {
    return null;
  }

  const rawQuantity = typeof ingredient.quantity === 'number' ? ingredient.quantity : null;
  const rawUnit = ingredient.unit ?? null;

  const { quantity, unit } = applyOverride(handle, rawQuantity, rawUnit, overrideLookup);
  const validUnit = validateUnit(handle, unit) ? unit : null;

  return {
    recipe_id: recipeId,
    source: SOURCE,
    handle,
    image_url: normalizeEveryPlateMediaUrl(ingredient.imageUrl),
    quantity,
    unit: validUnit
  };
}

function mapStep(recipeId, step, index) {
  const instructions = String(step.instructions ?? '').trim();

  if (!instructions) {
    return null;
  }

  return {
    recipe_id: recipeId,
    step_number: Number.isFinite(step.stepNumber) ? step.stepNumber : index + 1,
    instructions,
    image_assets: Array.isArray(step.imageAssets)
      ? step.imageAssets.map((asset) => ({
          ...asset,
          url: normalizeEveryPlateMediaUrl(asset?.url)
        }))
      : [],
    video_assets: Array.isArray(step.videoAssets)
      ? step.videoAssets.map((asset) => ({
          ...asset,
          url: normalizeEveryPlateMediaUrl(asset?.url)
        }))
      : []
  };
}

function buildChildRows(recipes, recipeIdMap, overrideLookup) {
  const ingredientRows = [];
  const stepRows = [];

  for (const recipe of recipes) {
    const recipeId = recipeIdMap.get(String(recipe.id));

    if (!recipeId) {
      throw new Error(`Missing recipe ID after upsert for external recipe ${recipe.id}`);
    }

    for (const ingredient of recipe.ingredients ?? []) {
      const row = mapIngredient(recipeId, ingredient, overrideLookup);
      if (row) ingredientRows.push(row);
    }

    for (const [index, step] of (recipe.steps ?? []).entries()) {
      const row = mapStep(recipeId, step, index);
      if (row) stepRows.push(row);
    }
  }

  return { ingredientRows, stepRows };
}

function resolveIngredientLinkRow(row, ingredientIdMap) {
  const ingredientId = ingredientIdMap.get(row.handle);

  if (!ingredientId) {
    throw new Error(`Missing ingredient ID after upsert for ${row.handle}`);
  }

  return {
    recipe_id: row.recipe_id,
    ingredient_id: ingredientId,
    quantity: row.quantity,
    unit: row.unit
  };
}

async function replaceRecipeChildren(supabase, table, recipeIds, rows, onConflict) {
  for (const recipeIdBatch of chunk(recipeIds)) {
    const { error: deleteError } = await supabase.from(table).delete().in('recipe_id', recipeIdBatch);

    if (deleteError) {
      throw deleteError;
    }
  }

  if (rows.length > 0) {
    await upsertRows(supabase, table, rows, onConflict);
  }
}

async function loadExistingRecipes(supabase, externalIds) {
  const existingRecipes = new Map();

  for (const batch of chunk(externalIds)) {
    const { data, error } = await supabase
      .from('recipes')
      .select('id, external_id')
      .eq('source', SOURCE)
      .in('external_id', batch);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      existingRecipes.set(row.external_id, row);
    }
  }

  return existingRecipes;
}

async function loadIngredientIdMap(supabase, handles) {
  const ingredientIdMap = new Map();

  for (const batch of chunk([...new Set(handles)])) {
    const { data, error } = await supabase
      .from('ingredients')
      .select('id, handle')
      .eq('source', SOURCE)
      .in('handle', batch);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      ingredientIdMap.set(row.handle, row.id);
    }
  }

  return ingredientIdMap;
}

async function loadRecipeIdMap(supabase, externalIds) {
  const recipeIdMap = new Map();

  for (let index = 0; index < externalIds.length; index += 200) {
    const batch = externalIds.slice(index, index + 200);
    const { data, error } = await supabase
      .from('recipes')
      .select('id, external_id')
      .eq('source', SOURCE)
      .in('external_id', batch);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      recipeIdMap.set(row.external_id, row.id);
    }
  }

  return recipeIdMap;
}

async function importRecipeBatch(supabase, rawRecipes, overrideLookup, metadata = null) {
  const eligibleRecipes = rawRecipes.filter(shouldImportRecipe);
  const recipesSkippedFiltered = rawRecipes.length - eligibleRecipes.length;

  if (recipesSkippedFiltered > 0) {
    logImportStage(metadata, `skipping ${recipesSkippedFiltered} recipes (missing headline, description, or incomplete step images)`);
  }

  if (eligibleRecipes.length === 0) {
    return {
      recipesSeen: rawRecipes.length,
      recipesInserted: 0,
      recipesUpdated: 0,
      ingredientsUpserted: 0,
      recipeIngredientLinksReplaced: 0,
      recipeStepsReplaced: 0,
      recipesSkippedFiltered,
    };
  }

  const recipeRows = eligibleRecipes.map(mapRecipe);
  const externalIds = recipeRows.map((row) => row.external_id);

  logImportStage(metadata, `checking ${recipeRows.length} existing recipes`);
  const existingRecipes = await loadExistingRecipes(supabase, externalIds);
  logImportStage(metadata, `upserting ${recipeRows.length} recipes`);
  await upsertRows(supabase, 'recipes', recipeRows, 'source,external_id');

  logImportStage(metadata, `reloading ${externalIds.length} recipe ids`);
  const recipeIdMap = await loadRecipeIdMap(supabase, externalIds);
  const { ingredientRows, stepRows } = buildChildRows(eligibleRecipes, recipeIdMap, overrideLookup);

  const dedupedIngredientRows = dedupeIngredientRows(ingredientRows);
  const duplicateIngredientCount = ingredientRows.length - dedupedIngredientRows.length;
  const canonicalIngredientRows = buildCanonicalIngredientRows(dedupedIngredientRows);

  const duplicateSuffix = duplicateIngredientCount > 0
    ? `, collapsed ${duplicateIngredientCount} duplicate ingredients`
    : '';
  logImportStage(
    metadata,
    `prepared ${canonicalIngredientRows.length} canonical ingredients, ${dedupedIngredientRows.length} recipe ingredient links, ${stepRows.length} steps${duplicateSuffix}`
  );

  logImportStage(metadata, `upserting ${canonicalIngredientRows.length} ingredients`);
  await upsertRows(supabase, 'ingredients', canonicalIngredientRows, 'source,handle');

  logImportStage(metadata, `reloading ${canonicalIngredientRows.length} ingredient ids`);
  const ingredientIdMap = await loadIngredientIdMap(
    supabase,
    canonicalIngredientRows.map((row) => row.handle)
  );
  const recipeIngredientLinkRows = dedupedIngredientRows.map((row) =>
    resolveIngredientLinkRow(row, ingredientIdMap)
  );

  logImportStage(metadata, `replacing ${recipeIngredientLinkRows.length} recipe ingredient links`);
  await replaceRecipeChildren(
    supabase,
    'recipe_ingredient_links',
    [...recipeIdMap.values()],
    recipeIngredientLinkRows,
    'recipe_id,ingredient_id'
  );
  logImportStage(metadata, `replacing ${stepRows.length} recipe steps`);
  await replaceRecipeChildren(supabase, 'recipe_steps', [...recipeIdMap.values()], stepRows, 'recipe_id,step_number');

  const insertedCount = recipeRows.filter((row) => !existingRecipes.has(row.external_id)).length;
  const updatedCount = recipeRows.length - insertedCount;

  logImportStage(metadata, `batch complete: ${insertedCount} inserted, ${updatedCount} updated`);

  return {
    recipesSeen: rawRecipes.length,
    recipesInserted: insertedCount,
    recipesUpdated: updatedCount,
    ingredientsUpserted: canonicalIngredientRows.length,
    recipeIngredientLinksReplaced: recipeIngredientLinkRows.length,
    recipeStepsReplaced: stepRows.length,
    recipesSkippedUnchanged: 0
  };
}

function createEmptyImportTotals() {
  return {
    recipesSeen: 0,
    recipesInserted: 0,
    recipesUpdated: 0,
    ingredientsUpserted: 0,
    recipeIngredientLinksReplaced: 0,
    recipeStepsReplaced: 0,
    recipesSkippedUnchanged: 0
  };
}

function addImportTotals(target, batch) {
  for (const key of Object.keys(target)) {
    target[key] += batch[key] ?? 0;
  }

  return target;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args['--input'] ?? DEFAULT_INPUT_PATH);
  const supabase = await createAdminSupabaseClient();
  const importRunId = await createImportRun(supabase, IMPORT_TYPE);
  const totals = createEmptyImportTotals();

  const rawOverrides = await readJsonFile(OVERRIDES_PATH);
  const overrideLookup = buildOverrideLookup(rawOverrides);

  try {
    if (args['--fetch'] === 'true') {
      await fetchEveryPlateRecipes({
        limit: args['--limit'] ? Number(args['--limit']) : null,
        take: args['--take'] ? Number(args['--take']) : null,
        writeOutput: false,
        async onBatch(batch, metadata) {
          const batchTotals = await importRecipeBatch(supabase, batch, overrideLookup, metadata);
          addImportTotals(totals, batchTotals);

          console.error(
            `[import-everyplate] Imported page ${metadata.page}: ${totals.recipesSeen}/${metadata.total} recipes, ${totals.recipeIngredientLinksReplaced} ingredient links, ${totals.recipeStepsReplaced} steps`
          );
        }
      });
    } else {
      const rawRecipes = await readJsonFile(inputPath);

      if (!Array.isArray(rawRecipes)) {
        throw new TypeError('Expected EveryPlate input file to contain an array of recipes.');
      }

      addImportTotals(totals, await importRecipeBatch(supabase, rawRecipes, overrideLookup));
    }

    await finishImportRun(supabase, importRunId, {
      status: 'completed',
      recordsSeen: totals.recipesSeen,
      recordsInserted: totals.recipesInserted,
      recordsUpdated: totals.recipesUpdated
    });

    if (unrecognisedUnits.size > 0) {
      const lines = [...unrecognisedUnits].sort();
      await fs.writeFile(UNRECOGNISED_UNITS_LOG, `unit\tingredient\n${lines.join('\n')}\n`);
      console.error(`[import-everyplate] ${unrecognisedUnits.size} unrecognised unit(s) logged to ${UNRECOGNISED_UNITS_LOG}`);
    }

    console.log(
      formatSummary({
        importType: IMPORT_TYPE,
        inputPath,
        recipesSeen: totals.recipesSeen,
        recipesInserted: totals.recipesInserted,
        recipesUpdated: totals.recipesUpdated,
        ingredientsUpserted: totals.ingredientsUpserted,
        recipeIngredientLinksReplaced: totals.recipeIngredientLinksReplaced,
        recipeStepsReplaced: totals.recipeStepsReplaced,
        recipesSkippedUnchanged: totals.recipesSkippedUnchanged
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);

    await finishImportRun(supabase, importRunId, {
      status: 'failed',
      recordsSeen: totals.recipesSeen,
      recordsInserted: 0,
      recordsUpdated: 0,
      errorMessage: message
    });

    throw error;
  }
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
