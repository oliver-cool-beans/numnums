import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { load } from 'cheerio';

import { normalizeEveryPlateMediaUrl } from './media.mjs';
import { parseArgs, resolveRepoPath } from '../shared/import-utils.mjs';

const EVERYPLATE_BASE_URL = 'https://www.everyplate.com.au';
const EVERYPLATE_RECIPES_URL = `${EVERYPLATE_BASE_URL}/recipes`;
const EVERYPLATE_RECIPES_API_URL = `${EVERYPLATE_BASE_URL}/gw/recipes/recipes`;
const EVERYPLATE_COUNTRY = 'AO';
const EVERYPLATE_LOCALE = 'en-AU';
const EVERYPLATE_PAGE_SIZE = 200;
const DEFAULT_OUTPUT_PATH = resolveRepoPath('src', 'scripts', 'output', 'ep-recipes-raw.json');
const REQUEST_HEADERS = {
  'accept-language': 'en-AU,en;q=0.9',
  'user-agent': 'Mozilla/5.0 (compatible; NumNumsAdmin/1.0)'
};

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeText(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  return normalizeWhitespace(value);
}

function mapStepMediaAsset(asset) {
  if (!asset || typeof asset !== 'object') {
    return null;
  }

  const url = normalizeEveryPlateMediaUrl(asset.link) ?? normalizeEveryPlateMediaUrl(asset.path);

  if (!url) {
    return null;
  }

  return {
    url,
    path: normalizeText(asset.path),
    caption: normalizeText(asset.caption)
  };
}

function parseNextData(html, pageUrl) {
  const $ = load(html);
  const nextDataText = $('#__NEXT_DATA__').text();

  if (!nextDataText) {
    throw new Error(`Unable to parse __NEXT_DATA__ payload from ${pageUrl}`);
  }

  try {
    return JSON.parse(nextDataText);
  } catch (error) {
    throw new Error(
      `Unable to parse __NEXT_DATA__ payload from ${pageUrl}: ${error instanceof Error ? error.message : 'invalid JSON'}`
    );
  }
}

export function parseEveryPlateServerAuth(html, pageUrl = EVERYPLATE_RECIPES_URL) {
  const nextData = parseNextData(html, pageUrl);
  const serverAuth = nextData.props?.pageProps?.ssrPayload?.serverAuth;

  if (typeof serverAuth?.access_token !== 'string' || !serverAuth.access_token.trim()) {
    throw new Error(`Unable to parse server auth token from ${pageUrl}`);
  }

  return {
    accessToken: serverAuth.access_token,
    expiresIn: Number.isFinite(serverAuth.expires_in) ? serverAuth.expires_in : null,
    issuedAt: Number.isFinite(serverAuth.issued_at) ? serverAuth.issued_at : null,
    tokenType:
      typeof serverAuth.token_type === 'string' && serverAuth.token_type.trim()
        ? serverAuth.token_type.trim()
        : 'Bearer'
  };
}

export async function fetchEveryPlateServerAuth() {
  const html = await fetchHtml(EVERYPLATE_RECIPES_URL);

  return parseEveryPlateServerAuth(html, EVERYPLATE_RECIPES_URL);
}

async function fetchHtml(url) {
  const response = await fetch(url, { headers: REQUEST_HEADERS });

  if (!response.ok) {
    throw new Error(`EveryPlate request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchJson(url, headers) {
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`EveryPlate request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function parseRecipeDurationMinutes(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/i.exec(value.trim());

  if (!match) {
    return null;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);

  return hours * 60 + minutes;
}

function buildRecipesApiUrl(take, skip) {
  const url = new URL(EVERYPLATE_RECIPES_API_URL);
  url.searchParams.set('country', EVERYPLATE_COUNTRY);
  url.searchParams.set('locale', EVERYPLATE_LOCALE);
  url.searchParams.set('take', String(take));
  url.searchParams.set('skip', String(skip));
  return url;
}

function buildAuthorizationHeaders(serverAuth) {
  return {
    ...REQUEST_HEADERS,
    accept: 'application/json',
    authorization: `${serverAuth.tokenType} ${serverAuth.accessToken}`
  };
}

async function fetchEveryPlateRecipesPage(serverAuth, take, skip) {
  const url = buildRecipesApiUrl(take, skip);
  return fetchJson(url, buildAuthorizationHeaders(serverAuth));
}

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return '0s';
  }

  const totalSeconds = Math.max(1, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function mapIngredient(ingredient, ingredientAmounts) {
  const ingredientAmount = ingredientAmounts.get(ingredient.id);
  const quantityCandidate = ingredientAmount?.amount ?? ingredient.quantity ?? ingredient.amount ?? null;

  return {
    externalId: ingredient.id ?? null,
    externalUuid: ingredient.uuid ?? null,
    name: normalizeWhitespace(String(ingredient.name ?? '')),
    type: normalizeText(ingredient.type),
    slug: normalizeText(ingredient.slug),
    country: normalizeText(ingredient.country),
    imageUrl: normalizeEveryPlateMediaUrl(ingredient.imageLink) ?? normalizeEveryPlateMediaUrl(ingredient.imagePath),
    shipped: typeof ingredient.shipped === 'boolean' ? ingredient.shipped : false,
    family:
      ingredient.family && typeof ingredient.family === 'object'
        ? {
            name: normalizeText(ingredient.family.name),
            slug: normalizeText(ingredient.family.slug),
            type: normalizeText(ingredient.family.type)
          }
        : null,
    quantity: typeof quantityCandidate === 'number' ? quantityCandidate : null,
    unit:
      typeof ingredientAmount?.unit === 'string' && ingredientAmount.unit.trim()
        ? ingredientAmount.unit.trim()
        : typeof ingredient.unit === 'string' && ingredient.unit.trim()
          ? ingredient.unit.trim()
          : null
  };
}

function mapRecipeStep(step, index) {
  const instructions = normalizeText(step.instructions);

  if (!instructions) {
    return null;
  }

  return {
    stepNumber: Number.isFinite(step.index) ? step.index : index + 1,
    instructions,
    imageAssets: (step.images ?? []).map(mapStepMediaAsset).filter(Boolean),
    videoAssets: (step.videos ?? []).map(mapStepMediaAsset).filter(Boolean)
  };
}

function mapRecipeFacet(facet) {
  if (!facet || typeof facet !== 'object') {
    return null;
  }

  const externalId = normalizeText(facet.id);
  const name = normalizeText(facet.name);

  if (!externalId || !name) {
    return null;
  }

  return {
    externalId,
    type: normalizeText(facet.type),
    name,
    slug: normalizeText(facet.slug),
    iconUrl: normalizeEveryPlateMediaUrl(facet.iconLink) ?? normalizeEveryPlateMediaUrl(facet.iconPath),
    colorHandle: normalizeText(facet.colorHandle),
    displayLabel: typeof facet.displayLabel === 'boolean' ? facet.displayLabel : null,
    tracesOf: typeof facet.tracesOf === 'boolean' ? facet.tracesOf : null,
    triggersTracesOf: typeof facet.triggersTracesOf === 'boolean' ? facet.triggersTracesOf : null
  };
}

function isRecipeItemValid(recipe) {
  return Boolean(recipe?.id && recipe?.name && Array.isArray(recipe.ingredients));
}

function mapRecipeItem(recipe) {
  const primaryYield = Array.isArray(recipe.yields) ? recipe.yields[0] : null;
  const ingredientAmounts = new Map(
    Array.isArray(primaryYield?.ingredients)
      ? primaryYield.ingredients.map((ingredient) => [ingredient.id, ingredient])
      : []
  );
  const ingredients = recipe.ingredients.map((ingredient) => mapIngredient(ingredient, ingredientAmounts)).filter((ingredient) => ingredient.name);

  return {
    id: recipe.id,
    name: normalizeWhitespace(recipe.name),
    slug: normalizeText(recipe.slug),
    headline: normalizeText(recipe.headline),
    description: normalizeText(recipe.description),
    imageUrl: normalizeEveryPlateMediaUrl(recipe.imageLink) ?? normalizeEveryPlateMediaUrl(recipe.imagePath),
    websiteUrl: normalizeText(recipe.websiteUrl) ?? normalizeText(recipe.canonicalLink) ?? null,
    prepMinutes: parseRecipeDurationMinutes(recipe.prepTime),
    totalMinutes: parseRecipeDurationMinutes(recipe.totalTime),
    difficulty: typeof recipe.difficulty === 'number' ? recipe.difficulty : null,
    servings: typeof primaryYield?.yields === 'number' ? primaryYield.yields : null,
    servingSize: typeof recipe.servingSize === 'number' ? recipe.servingSize : null,
    ingredients,
    steps: (recipe.steps ?? []).map(mapRecipeStep).filter(Boolean),
    allergens: (recipe.allergens ?? []).map(mapRecipeFacet).filter(Boolean),
    cuisines: (recipe.cuisines ?? []).map(mapRecipeFacet).filter(Boolean),
    tags: (recipe.tags ?? []).map(mapRecipeFacet).filter(Boolean)
  };
}

export async function fetchEveryPlateRecipes(options = {}) {
  const outputPath = path.resolve(options.outputPath ?? DEFAULT_OUTPUT_PATH);
  const limit = Number.isFinite(options.limit) ? options.limit : Number(options.limit ?? 0);
  const pageSize = Number.isFinite(options.take) ? Number(options.take) : EVERYPLATE_PAGE_SIZE;
  const shouldWriteOutput = options.writeOutput ?? true;
  const serverAuth = await fetchEveryPlateServerAuth();

  const recipes = [];
  const startedAt = Date.now();
  let skip = 0;
  let total = null;
  let page = 0;

  while (true) {
    const remaining = limit > 0 ? limit - recipes.length : null;

    if (remaining !== null && remaining <= 0) {
      break;
    }

    const take = remaining === null ? pageSize : Math.min(pageSize, remaining);
    const response = await fetchEveryPlateRecipesPage(serverAuth, take, skip);

    if (!Array.isArray(response.items) || !Number.isFinite(response.total)) {
      throw new Error('Unexpected EveryPlate recipes response shape.');
    }

    total = response.total;
    page += 1;
    const validItems = response.items.filter(isRecipeItemValid);
    const skippedItems = response.items.length - validItems.length;
    const mappedItems = validItems.map(mapRecipeItem);

    if (typeof options.onBatch === 'function' && mappedItems.length > 0) {
      await options.onBatch(mappedItems, {
        page,
        skip,
        take,
        total: response.total,
        skippedItems
      });
    }

    recipes.push(...mappedItems);
    skip += response.items.length;

    const targetTotal = limit > 0 ? Math.min(total, limit) : total;
    const elapsed = Date.now() - startedAt;
    const remainingRecipes = Math.max(targetTotal - recipes.length, 0);
    const estimatedRemainingMs = recipes.length > 0 ? (elapsed / recipes.length) * remainingRecipes : 0;

    console.error(
      `[fetch-everyplate] Page ${page} fetched ${recipes.length}/${targetTotal} recipes${skippedItems > 0 ? `, skipped ${skippedItems} invalid items` : ''}, estimated remaining ${formatDuration(estimatedRemainingMs)}`
    );

    if (response.items.length === 0 || recipes.length >= targetTotal) {
      break;
    }
  }

  const selectedRecipes = limit > 0 ? recipes.slice(0, limit) : recipes;

  if (shouldWriteOutput) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(selectedRecipes, null, 2)}\n`, 'utf8');
    console.error(`[fetch-everyplate] Wrote ${selectedRecipes.length} recipes to ${outputPath}`);
  }

  return { outputPath, recipeCount: selectedRecipes.length, totalAvailable: total ?? selectedRecipes.length };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  await fetchEveryPlateRecipes({
    outputPath: args['--output'] ?? DEFAULT_OUTPUT_PATH,
    limit: args['--limit'] ? Number(args['--limit']) : null,
    take: args['--take'] ? Number(args['--take']) : EVERYPLATE_PAGE_SIZE
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
