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
const UNRECOGNISED_UNITS_LOG = resolveRepoPath('src', 'scripts', 'output', 'ep-unrecognised-units.log');

const unrecognisedUnits = new Set();

function buildOverrideLookup(overrides) {
  const lookup = new Map();

  for (const override of overrides) {
    const handle = override.ingredient_handle;

    if (!lookup.has(handle)) {
      lookup.set(handle, { isPantry: false, unitOverrides: new Map() });
    }

    const entry = lookup.get(handle);

    if (override.is_pantry === true) {
      entry.isPantry = true;
    }

    if (override.source_unit !== undefined) {
      const sourceUnit = (override.source_unit ?? '').toLowerCase();
      entry.unitOverrides.set(sourceUnit, {
        sourceQuantity: override.source_quantity,
        quantity: override.quantity,
        unit: override.unit
      });
    }
  }

  return lookup;
}

function applyOverride(handle, quantity, unit, overrideLookup) {
  const entry = overrideLookup.get(handle);
  if (!entry) return { quantity, unit };

  const sourceUnit = (unit ?? '').toLowerCase();
  const override = entry.unitOverrides.get(sourceUnit);
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
      const canonical = {
        source: row.source,
        handle: row.handle,
        image_url: row.image_url ?? null
      };
      if (row.is_pantry) canonical.is_pantry = true;
      rowsByKey.set(key, canonical);
      continue;
    }

    if (!currentRow.image_url && row.image_url) {
      currentRow.image_url = row.image_url;
    }
    if (row.is_pantry && !currentRow.is_pantry) {
      currentRow.is_pantry = true;
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
  if (!recipe.slug) return false;
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

  const isPantry = overrideLookup.get(handle)?.isPantry ?? false;

  return {
    recipe_id: recipeId,
    source: SOURCE,
    handle,
    image_url: normalizeEveryPlateMediaUrl(ingredient.imageUrl),
    quantity,
    unit: validUnit,
    is_pantry: isPantry
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
    const recipeId = recipeIdMap.get(recipe.slug);

    if (!recipeId) {
      throw new Error(`Missing recipe ID after upsert for recipe slug ${recipe.slug}`);
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

async function fetchExistingChildRows(supabase, table, recipeIds, columns) {
  const results = await Promise.all(
    chunk(recipeIds).map(async (batch) => {
      const { data, error } = await supabase.from(table).select(columns).in('recipe_id', batch);
      if (error) throw error;
      return data ?? [];
    })
  );
  return results.flat();
}

function rowChanged(existing, incoming, compareFields) {
  return compareFields.some((field) => JSON.stringify(existing[field]) !== JSON.stringify(incoming[field]));
}

async function filterToChangedRows(supabase, table, recipeIds, incomingRows, naturalKey, compareFields) {
  const columns = ['recipe_id', naturalKey, ...compareFields].join(', ');
  const existingRows = await fetchExistingChildRows(supabase, table, recipeIds, columns);
  // Composite key: step_number and ingredient_id both repeat across recipes
  const existingByKey = new Map(existingRows.map((row) => [`${row.recipe_id}::${row[naturalKey]}`, row]));
  return incomingRows.filter((row) => {
    const existing = existingByKey.get(`${row.recipe_id}::${row[naturalKey]}`);
    return !existing || rowChanged(existing, row, compareFields);
  });
}

async function deleteRecipeChildStragglers(supabase, table, recipeIds, rows, childKey) {
  const retainByRecipe = new Map(recipeIds.map((id) => [id, []]));
  for (const row of rows) retainByRecipe.get(row.recipe_id)?.push(row[childKey]);

  await Promise.all(
    [...retainByRecipe].map(async ([recipeId, retainValues]) => {
      let query = supabase.from(table).delete().eq('recipe_id', recipeId);
      if (retainValues.length > 0) {
        query = query.not(childKey, 'in', `(${retainValues.join(',')})`);
      }
      const { error } = await query;
      if (error) throw error;
    })
  );
}

const CHILD_TABLE_CHANGE_CONFIG = {
  recipe_steps: { naturalKey: 'step_number', compareFields: ['instructions', 'image_assets', 'video_assets'] },
  recipe_ingredient_links: { naturalKey: 'ingredient_id', compareFields: ['quantity', 'unit'] },
};

async function replaceRecipeChildren(supabase, table, recipeIds, rows, onConflict) {
  const childKey = onConflict.split(',')[1];
  const changeConfig = CHILD_TABLE_CHANGE_CONFIG[table];

  let rowsToUpsert = rows;
  if (changeConfig) {
    rowsToUpsert = await filterToChangedRows(supabase, table, recipeIds, rows, changeConfig.naturalKey, changeConfig.compareFields);
  }

  if (rowsToUpsert.length > 0) {
    await upsertRows(supabase, table, rowsToUpsert, onConflict);
  }

  await deleteRecipeChildStragglers(supabase, table, recipeIds, rows, childKey);
}

async function upsertAndSelectRows(supabase, table, rows, onConflict, selectColumns) {
  const results = [];
  for (const batch of chunk(rows)) {
    const { data, error } = await supabase.from(table).upsert(batch, { onConflict }).select(selectColumns);
    if (error) throw error;
    results.push(...(data ?? []));
  }
  return results;
}

async function loadExistingRecipes(supabase, slugs) {
  const existingRecipes = new Map();

  for (const batch of chunk(slugs)) {
    const { data, error } = await supabase
      .from('recipes')
      .select('id, slug')
      .eq('source', SOURCE)
      .in('slug', batch);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      existingRecipes.set(row.slug, row);
    }
  }

  return existingRecipes;
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
  const slugs = recipeRows.map((row) => row.slug);

  logImportStage(metadata, `upserting ${recipeRows.length} recipes`);
  const [existingRecipes, upsertedRecipes] = await Promise.all([
    loadExistingRecipes(supabase, slugs),
    upsertAndSelectRows(supabase, 'recipes', recipeRows, 'source,slug', 'id, slug'),
  ]);
  const recipeIdMap = new Map(upsertedRecipes.map((row) => [row.slug, row.id]));

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
  const upsertedIngredients = await upsertAndSelectRows(supabase, 'ingredients', canonicalIngredientRows, 'source,handle', 'id, handle');
  const ingredientIdMap = new Map(upsertedIngredients.map((row) => [row.handle, row.id]));

  const recipeIngredientLinkRows = dedupedIngredientRows.map((row) =>
    resolveIngredientLinkRow(row, ingredientIdMap)
  );

  const recipeIds = [...recipeIdMap.values()];
  logImportStage(metadata, `replacing ${recipeIngredientLinkRows.length} ingredient links and ${stepRows.length} steps`);
  await Promise.all([
    replaceRecipeChildren(supabase, 'recipe_ingredient_links', recipeIds, recipeIngredientLinkRows, 'recipe_id,ingredient_id'),
    replaceRecipeChildren(supabase, 'recipe_steps', recipeIds, stepRows, 'recipe_id,step_number'),
  ]);

  const insertedCount = recipeRows.filter((row) => !existingRecipes.has(row.slug)).length;
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
      const lines = [...unrecognisedUnits].sort((a, b) => a.localeCompare(b)).map((entry) => {
        const [unit, handle] = entry.split('\t');
        return `${handle}\t${unit}`;
      });
      await fs.mkdir(path.dirname(UNRECOGNISED_UNITS_LOG), { recursive: true });
      await fs.writeFile(UNRECOGNISED_UNITS_LOG, lines.join('\n') + '\n');
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
