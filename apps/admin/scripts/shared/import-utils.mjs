import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminDir = path.resolve(__dirname, '..', '..');
const repoRoot = path.resolve(adminDir, '..', '..');

const DEFAULT_ENV_FILES = [
  path.join(adminDir, '.env.local'),
  path.join(adminDir, '.env')
];

const BATCH_SIZE = 200;

function parseEnvFile(content) {
  const values = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

export async function loadAdminEnv() {
  const loaded = {};

  for (const filePath of DEFAULT_ENV_FILES) {
    try {
      const content = await readFile(filePath, 'utf8');
      Object.assign(loaded, parseEnvFile(content));
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        continue;
      }

      throw error;
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? loaded.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? loaded.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in apps/admin/.env.local or environment.'
    );
  }

  return { url, secretKey };
}

export async function createAdminSupabaseClient() {
  const { url, secretKey } = await loadAdminEnv();

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function resolveRepoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

export async function readJsonFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

export function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('--')) {
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[token] = 'true';
      continue;
    }

    args[token] = next;
    index += 1;
  }

  return args;
}

export function chunk(items, size = BATCH_SIZE) {
  const batches = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

export async function createImportRun(supabase, importType) {
  const { data, error } = await supabase
    .from('import_runs')
    .insert({
      import_type: importType,
      status: 'running'
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function finishImportRun(
  supabase,
  importRunId,
  { status, recordsSeen, recordsInserted, recordsUpdated, errorMessage = null }
) {
  const { error } = await supabase
    .from('import_runs')
    .update({
      status,
      records_seen: recordsSeen,
      records_inserted: recordsInserted,
      records_updated: recordsUpdated,
      error_message: errorMessage,
      completed_at: new Date().toISOString()
    })
    .eq('id', importRunId);

  if (error) {
    throw error;
  }
}

export async function fetchExistingExternalIds(supabase, table, source, externalIds) {
  const existing = new Set();

  for (const batch of chunk(externalIds)) {
    const { data, error } = await supabase
      .from(table)
      .select('external_id')
      .eq('source', source)
      .in('external_id', batch);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      existing.add(row.external_id);
    }
  }

  return existing;
}

export async function upsertRows(supabase, table, rows, onConflict) {
  for (const batch of chunk(rows)) {
    const { error } = await supabase.from(table).upsert(batch, { onConflict });

    if (error) {
      throw error;
    }
  }
}

export function normalizeIngredientHandle(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function formatSummary(summary) {
  return JSON.stringify(summary, null, 2);
}
