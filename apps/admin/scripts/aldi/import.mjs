import path from 'node:path';

import {
  createAdminSupabaseClient,
  createImportRun,
  fetchExistingExternalIds,
  finishImportRun,
  formatSummary,
  parseArgs,
  readJsonFile,
  resolveRepoPath,
  upsertRows
} from '../shared/import-utils.mjs';

const IMPORT_TYPE = 'aldi_products';
const SOURCE = 'aldi';
const DEFAULT_INPUT_PATH = resolveRepoPath('src', 'scripts', 'output', 'aldi-products.json');

function buildImageUrl(product) {
  const asset = Array.isArray(product.assets)
    ? product.assets.find((candidate) => candidate.assetType === 'FR01') ?? product.assets[0]
    : null;

  if (!asset?.url) {
    return null;
  }

  return asset.url
    .replace('{width}', '1200')
    .replace('{slug}', product.urlSlugText || product.sku || 'product');
}

function parseSellingSize(value) {
  if (typeof value !== 'string') {
    return { size: null, unit: null };
  }

  const match = /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(kg|g|mg|l|ml)\b/iu.exec(value.trim());

  if (!match) {
    return { size: null, unit: null };
  }

  const parsedSize = Number.parseFloat(match[1].replaceAll(',', ''));

  return {
    size: Number.isFinite(parsedSize) ? parsedSize : null,
    unit: match[2]?.trim().toLowerCase() ?? null
  };
}

function hasNotForSaleReason(product) {
  return typeof product.notForSaleReason === 'string' && product.notForSaleReason.trim().length > 0;
}

function mapProduct(product) {
  const category = Array.isArray(product.categories) && product.categories.length > 0
    ? product.categories[product.categories.length - 1].name
    : null;
  const sellingSize = parseSellingSize(product.sellingSize);

  return {
    source: SOURCE,
    external_id: String(product.sku),
    name: product.name,
    brand: typeof product.brandName === 'string' ? product.brandName.trim().toLowerCase() : null,
    category,
    price_cents: Number.isFinite(product.price?.amount) ? product.price.amount : null,
    selling_size: sellingSize.size,
    selling_unit: sellingSize.unit,
    image_url: buildImageUrl(product),
    website_url: product.urlSlugText
      ? `https://www.aldi.com.au/product/${product.urlSlugText}-${String(product.sku)}`
      : null,
    available: !hasNotForSaleReason(product),
    discontinued: product.discontinued === true
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args['--input'] ?? DEFAULT_INPUT_PATH);
  const rawProducts = await readJsonFile(inputPath);

  if (!Array.isArray(rawProducts)) {
    throw new TypeError('Expected ALDI input file to contain an array of products.');
  }

  const rows = rawProducts.map(mapProduct);
  const supabase = await createAdminSupabaseClient();
  const importRunId = await createImportRun(supabase, IMPORT_TYPE);

  try {
    const externalIds = rows.map((row) => row.external_id);
    const existingExternalIds = await fetchExistingExternalIds(supabase, 'products', SOURCE, externalIds);

    await upsertRows(supabase, 'products', rows, 'source,external_id');

    const insertedCount = rows.filter((row) => !existingExternalIds.has(row.external_id)).length;
    const updatedCount = rows.length - insertedCount;

    await finishImportRun(supabase, importRunId, {
      status: 'completed',
      recordsSeen: rows.length,
      recordsInserted: insertedCount,
      recordsUpdated: updatedCount
    });

    console.log(
      formatSummary({
        importType: IMPORT_TYPE,
        inputPath,
        recordsSeen: rows.length,
        recordsInserted: insertedCount,
        recordsUpdated: updatedCount
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);

    await finishImportRun(supabase, importRunId, {
      status: 'failed',
      recordsSeen: rows.length,
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
