import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API_BASE = 'https://note.com/api';
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Contract tests for note.com Image Upload API.
 * Requires .env with valid credentials.
 */

// Load .env
async function loadEnv() {
  try {
    const { resolve } = await import('node:path');
    const envPath = resolve(process.cwd(), '.env');
    const content = await readFile(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // no .env
  }
}

await loadEnv();

const hasCredentials = !!(
  process.env.NOTE_EMAIL &&
  process.env.NOTE_PASSWORD &&
  process.env.NOTE_USERNAME
);

async function getCookies() {
  const { authenticate } = await import('../../lib/auth.mjs');
  return authenticate();
}

describe('note.com Image API Contract Tests', { skip: !hasCredentials && '.env未設定のためスキップ' }, () => {
  let cookies;

  before(async () => {
    cookies = await getCookies();
  });

  describe('POST /api/v1/upload_image', () => {
    it('画像アップロードでdata.keyとdata.urlが返る', async () => {
      const testImagePath = join(__dirname, '..', 'fixtures', 'test-image.png');
      const buffer = await readFile(testImagePath);

      const blob = new Blob([buffer], { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', blob, 'test-image.png');

      const cookieStr = Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');

      const res = await fetch(`${API_BASE}/v1/upload_image`, {
        method: 'POST',
        headers: {
          Cookie: cookieStr,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: formData,
      });

      assert.equal(res.status, 200, `ステータス200を期待: got ${res.status}`);
      const json = await res.json();
      assert.ok(json.data, 'data オブジェクトが存在する');
      assert.ok(typeof json.data.key === 'string', 'data.key は文字列');
      assert.ok(typeof json.data.url === 'string', 'data.url は文字列');
    });
  });
});
