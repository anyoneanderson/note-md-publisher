import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const API_BASE = 'https://note.com/api';

/**
 * Contract tests for note.com API.
 * These validate the API response STRUCTURE (not values) to detect breaking changes.
 *
 * Requires .env with NOTE_EMAIL, NOTE_PASSWORD, NOTE_USERNAME.
 * Skipped if credentials are not available.
 */

// Load .env
async function loadEnv() {
  try {
    const { readFile } = await import('node:fs/promises');
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

const username = process.env.NOTE_USERNAME;
const hasManualCookie = !!process.env.NOTE_COOKIE;
const hasCredentials = hasManualCookie || !!(
  process.env.NOTE_EMAIL &&
  process.env.NOTE_PASSWORD &&
  username
);

// Helper: get cookies via NOTE_COOKIE env var or Playwright authenticate
async function getCookies() {
  if (process.env.NOTE_COOKIE) {
    // Parse manual cookie string "key=value; key2=value2"
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

function buildHeaders(cookies) {
  const cookieStr = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  return {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    Cookie: cookieStr,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
}

describe('note.com API Contract Tests', { skip: !hasCredentials && '.env未設定のためスキップ' }, () => {
  let cookies;
  let createdArticleId;

  before(async () => {
    cookies = await getCookies();
  });

  after(async () => {
    // Cleanup: try to delete the test article
    if (createdArticleId && cookies) {
      try {
        const headers = buildHeaders(cookies);
        await fetch(`${API_BASE}/v1/text_notes/${createdArticleId}`, {
          method: 'DELETE',
          headers,
        });
      } catch {
        console.log(
          `⚠ テスト記事(${createdArticleId})の削除に失敗しました。手動で削除してください`
        );
      }
    }
  });

  describe('GET /api/v2/creators/{username}', () => {
    it('レスポンスにdataオブジェクトが存在する', async () => {
      const headers = buildHeaders(cookies);
      const res = await fetch(`${API_BASE}/v2/creators/${username}`, {
        headers,
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.data, 'data オブジェクトが存在する');
    });

    it('data内にid, urlnameフィールドが存在する', async () => {
      const headers = buildHeaders(cookies);
      const res = await fetch(`${API_BASE}/v2/creators/${username}`, {
        headers,
      });
      const json = await res.json();
      assert.ok(typeof json.data.id === 'number', 'data.id は数値');
      assert.ok(typeof json.data.urlname === 'string', 'data.urlname は文字列');
    });
  });

  describe('POST /api/v1/text_notes', () => {
    it('記事作成でdata.id(数値)とdata.key(文字列)が返る', async () => {
      const headers = buildHeaders(cookies);
      const res = await fetch(`${API_BASE}/v1/text_notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          body: '<p>コントラクトテスト用記事</p>',
          name: '[テスト] コントラクトテスト記事（自動削除予定）',
          template_key: null,
        }),
      });

      assert.ok(
        res.status === 200 || res.status === 201,
        `ステータス200or201を期待: got ${res.status}`
      );
      const json = await res.json();
      assert.ok(json.data, 'data オブジェクトが存在する');
      assert.ok(typeof json.data.id === 'number', 'data.id は数値');
      assert.ok(typeof json.data.key === 'string', 'data.key は文字列');

      createdArticleId = json.data.id;
    });
  });

  describe('POST /api/v1/text_notes/draft_save', () => {
    it('記事更新でステータス200or201が返る', async () => {
      // This test depends on the POST test having run first
      if (!createdArticleId) {
        assert.fail('記事IDが未取得（POST テストが先に失敗した可能性）');
      }

      const headers = buildHeaders(cookies);
      const res = await fetch(
        `${API_BASE}/v1/text_notes/draft_save?id=${createdArticleId}&is_temp_saved=false`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            body: '<p>コントラクトテスト更新済み</p>',
            name: '[テスト] コントラクトテスト記事（更新済み・自動削除予定）',
            status: 'draft',
          }),
        }
      );

      assert.ok(
        res.status === 200 || res.status === 201,
        `ステータス200or201を期待: got ${res.status}`
      );
    });
  });

  describe('エラーケース', () => {
    it('無効なCookieでstats APIがnot_loginエラーを返す', async () => {
      const headers = {
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: 'invalid_cookie=invalid_value',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };
      const res = await fetch(`${API_BASE}/v1/stats/pv?filter=weekly`, {
        headers,
      });
      const json = await res.json();
      assert.ok(
        json.error?.code === 'auth' || json.error?.message === 'not_login',
        `認証エラーを期待: got ${JSON.stringify(json)}`
      );
    });
  });
});
