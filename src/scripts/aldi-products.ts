import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

type Pagination = {
  offset?: number;
  limit?: number;
  totalCount?: number;
};

type AldiResponse = {
  meta?: {
    pagination?: Pagination;
  };
  data?: unknown[];
};

const BASE_URL = 'https://api.aldi.com.au/v3/product-search';
const DEFAULT_LIMIT = 60;
const DEFAULT_DELAY_MS = 1500;
const DEFAULT_OUTPUT_PATH = path.resolve(process.cwd(), 'aldi-products.json');
const INVALID_PAGE_OFFSET_MESSAGE = 'Invalid page offset supplied';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseNumberArg(flag: string, fallback: number): number {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return fallback;
  }

  const value = process.argv[index + 1];
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid value for ${flag}: ${value ?? 'missing'}`);
  }

  return parsed;
}

function parseStringArg(flag: string, fallback: string): string {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return fallback;
  }

  return process.argv[index + 1] ?? fallback;
}

function buildUrl(offset: number, limit: number): string {
  const url = new URL(BASE_URL);
  url.searchParams.set('currency', 'AUD');
  url.searchParams.set('serviceType', 'walk-in');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('sort', 'relevance');
  return url.toString();
}

async function fetchPage(offset: number, limit: number): Promise<AldiResponse | null> {
  const response = await fetch(buildUrl(offset, limit), {
    headers: {
      accept: 'application/json',
      'user-agent': 'playwright-test aldi paginator',
    },
  });

  if (!response.ok) {
    const bodyText = await response.text();

    if (response.status === 400 && bodyText.includes(INVALID_PAGE_OFFSET_MESSAGE)) {
      return null;
    }

    throw new Error(`Request failed with status ${response.status}: ${bodyText.slice(0, 300)}`);
  }

  const body = (await response.json()) as AldiResponse;
  if (!Array.isArray(body.data)) {
    throw new TypeError('Response did not contain a data array');
  }

  return body;
}

async function main(): Promise<void> {
  const limit = parseNumberArg('--limit', DEFAULT_LIMIT);
  const delayMs = parseNumberArg('--delay-ms', DEFAULT_DELAY_MS);
  const outputPath = path.resolve(parseStringArg('--output', DEFAULT_OUTPUT_PATH));

  const allItems: unknown[] = [];
  let offset = 0;
  let totalCount: number | null = null;
  let pageNumber = 0;

  while (true) {
    pageNumber += 1;
    const page = await fetchPage(offset, limit);

    if (page === null) {
      break;
    }

    const items = page.data ?? [];
    const pagination = page.meta?.pagination;

    if (typeof pagination?.totalCount === 'number') {
      totalCount = pagination.totalCount;
    }

    allItems.push(...items);

    console.log(
      JSON.stringify({
        page: pageNumber,
        offset,
        fetched: items.length,
        totalCollected: allItems.length,
        totalCount,
      }),
    );

    if (items.length === 0) {
      break;
    }

    offset += limit;

    if (totalCount !== null && allItems.length >= totalCount) {
      break;
    }

    await sleep(delayMs);
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(allItems, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify({
      outputPath,
      totalCollected: allItems.length,
      totalCount,
      delayMs,
      limit,
    }),
  );
}

process.on('unhandledRejection', (error: unknown) => {
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  console.error(message);
  process.exit(1);
});

// biome-ignore lint/style/useTopLevelAwait: This workspace runs scripts via ts-node in CommonJS mode.
void main();