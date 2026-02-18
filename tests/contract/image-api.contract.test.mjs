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

const hasManualCookie = !!process.env.NOTE_COOKIE;
const hasCredentials = hasManualCookie || !!(
  process.env.NOTE_EMAIL &&
  process.env.NOTE_PASSWORD &&
  process.env.NOTE_USERNAME
);

async function getCookies() {
  if (process.env.NOTE_COOKIE) {
    const cookies = {};
    for (const pair of process.env.NOTE_COOKIE.split(';')) {
      const [key, ...rest] = pair.trim().split('=');
      if (key) cookies[key.trim()] = rest.join('=').trim();
    }
    return cookies;
  }
  const { authenticate } = await import('../../lib/auth.mjs');
  return authenticate();
}

describe('note.com Image API Contract Tests', { skip: !hasCredentials && '.env未設定のためスキップ' }, () => {
  let cookies;
  let testNoteId;

  before(async () => {
    cookies = await getCookies();

    // Create a temporary article to get a note_id for image upload
    const cookieStr = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    const res = await fetch(`${API_BASE}/v1/text_notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: cookieStr,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        body: '',
        name: '[テスト] 画像テスト用記事（自動削除予定）',
        template_key: null,
      }),
    });
    const json = await res.json();
    testNoteId = json.data?.id;
  });

  describe('POST /api/v1/image_upload/note_eyecatch', () => {
    it('画像アップロードでdata.urlが返る', async () => {
      if (!testNoteId) {
        assert.fail('テスト用記事IDが未取得');
      }

      const testImagePath = join(__dirname, '..', 'fixtures', 'test-image.png');
      const buffer = await readFile(testImagePath);

      const blob = new Blob([buffer], { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', blob, 'test-image.png');
      formData.append('note_id', String(testNoteId));

      const cookieStr = Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');

      const res = await fetch(`${API_BASE}/v1/image_upload/note_eyecatch`, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Cookie: cookieStr,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: formData,
      });

      assert.ok(
        res.status === 200 || res.status === 201,
        `ステータス200or201を期待: got ${res.status}`
      );
      const json = await res.json();
      assert.ok(json.data, 'data オブジェクトが存在する');
      assert.ok(typeof json.data.url === 'string', 'data.url は文字列');
    });
  });
});
