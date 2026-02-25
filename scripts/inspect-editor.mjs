#!/usr/bin/env node
/**
 * UI inspection tool for note.com editor.
 * Run with --check to verify selectors, or without flags for interactive inspection.
 *
 * Usage:
 *   node scripts/inspect-editor.mjs <articleKey>           # Interactive mode
 *   node scripts/inspect-editor.mjs <articleKey> --check   # Selector health check
 */

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { authenticateWithRaw } from '../lib/auth.mjs';
import { SELECTORS, TIMEOUTS, URLS } from '../lib/selectors.mjs';

// Load .env file
await loadEnv();

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    check: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});

if (options.help || positionals.length === 0) {
  printUsage();
  process.exit(options.help ? 0 : 1);
}

const articleKey = positionals[0];

let browser = null;

try {
  // Authenticate to get rawCookies
  console.log('認証中...');
  const { rawCookies } = await authenticateWithRaw();

  const { chromium } = await import('playwright');

  if (options.check) {
    // --check mode: headless selector health check
    console.log('セレクタヘルスチェックを実行中...');
    console.log('');

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    await context.addCookies(rawCookies);

    const page = await context.newPage();

    let allOk = true;
    const results = [];

    // Check editor page selectors
    const editUrl = URLS.EDIT_PAGE(articleKey);
    console.log('エディタページ: ' + editUrl);
    await page.goto(editUrl, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUTS.NAVIGATION,
    });
    await page.waitForTimeout(3000);

    const editorSelectors = [
      'EDITOR_TITLE_INPUT',
      'DRAFT_SAVE_BUTTON',
      'PUBLISH_NEXT_BUTTON',
    ];

    for (const name of editorSelectors) {
      const spec = SELECTORS[name];
      if (spec === null) {
        results.push({ name, status: 'SKIP', detail: 'null (uses keyboard)' });
        continue;
      }
      try {
        const locator = page.getByRole(spec.role, { name: spec.name });
        const visible = await locator.isVisible().catch(() => false);
        if (visible) {
          results.push({ name, status: 'OK', detail: `${spec.role}[name="${spec.name}"]` });
        } else {
          results.push({ name, status: 'NG', detail: `${spec.role}[name="${spec.name}"]` });
          allOk = false;
        }
      } catch (err) {
        results.push({ name, status: 'NG', detail: `${spec.role}[name="${spec.name}"] (${err.message})` });
        allOk = false;
      }
    }

    // Check publish page selectors
    const publishUrl = URLS.PUBLISH_PAGE(articleKey);
    console.log('公開設定ページ: ' + publishUrl);
    await page.goto(publishUrl, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUTS.NAVIGATION,
    });
    await page.waitForTimeout(3000);

    const publishSelectors = [
      'HASHTAG_INPUT',
      'HASHTAG_CONFIRM',
      'PUBLISH_BUTTON',
      'CANCEL_BUTTON',
    ];

    for (const name of publishSelectors) {
      const spec = SELECTORS[name];
      if (spec === null) {
        results.push({ name, status: 'SKIP', detail: 'null (uses keyboard)' });
        continue;
      }
      try {
        const locator = page.getByRole(spec.role, { name: spec.name });
        const visible = await locator.isVisible().catch(() => false);
        if (visible) {
          results.push({ name, status: 'OK', detail: `${spec.role}[name="${spec.name}"]` });
        } else {
          results.push({ name, status: 'NG', detail: `${spec.role}[name="${spec.name}"]` });
          allOk = false;
        }
      } catch (err) {
        results.push({ name, status: 'NG', detail: `${spec.role}[name="${spec.name}"] (${err.message})` });
        allOk = false;
      }
    }

    // Display results
    console.log('');
    for (const r of results) {
      const icon = r.status === 'OK' ? 'OK' : r.status === 'SKIP' ? '--' : 'NG';
      console.log('  [' + icon + '] ' + r.name + ': ' + r.detail);
    }

    console.log('');
    if (allOk) {
      console.log('全セレクタが有効です');
      process.exit(0);
    } else {
      console.log('無効なセレクタがあります。lib/selectors.mjs を更新してください');
      process.exit(1);
    }
  } else {
    // Interactive mode: headless: false + page.pause()
    const editUrl = URLS.EDIT_PAGE(articleKey);
    console.log('インタラクティブモードで起動中...');
    console.log('エディタURL: ' + editUrl);
    console.log('公開設定URL: ' + URLS.PUBLISH_PAGE(articleKey));
    console.log('');
    console.log('Playwright Inspector が開きます。');
    console.log('エディタのUI要素を調査し、セレクタを確認してください。');
    console.log('終了するには Playwright Inspector を閉じてください。');
    console.log('');

    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    await context.addCookies(rawCookies);

    const page = await context.newPage();
    await page.goto(editUrl, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUTS.NAVIGATION,
    });

    // Open Playwright Inspector for manual investigation
    await page.pause();
  }
} catch (err) {
  console.error('');
  console.error('エラー: ' + err.message);
  process.exit(1);
} finally {
  if (browser) {
    await browser.close();
  }
}

/**
 * Load .env file into process.env.
 */
async function loadEnv() {
  try {
    const { readFile } = await import('node:fs/promises');
    const envPath = resolve(
      import.meta.dirname || new URL('.', import.meta.url).pathname,
      '..',
      '.env'
    );
    const content = await readFile(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env file not found — that's OK
  }
}

function printUsage() {
  console.log(
    '使い方: node scripts/inspect-editor.mjs <articleKey> [options]\n' +
    '\n' +
    '引数:\n' +
    '  <articleKey>        記事キー（例: n1a2b3c4d5e6）\n' +
    '\n' +
    'オプション:\n' +
    '  --check             セレクタヘルスチェック（headless）\n' +
    '  --help              ヘルプを表示\n' +
    '\n' +
    'モード:\n' +
    '  通常モード          headless: false でブラウザを開き、\n' +
    '                      Playwright Inspector でUI要素を調査\n' +
    '  --check モード      headless: true で全セレクタの存在を検証\n' +
    '\n' +
    '例:\n' +
    '  node scripts/inspect-editor.mjs n1a2b3c4d5e6\n' +
    '  node scripts/inspect-editor.mjs n1a2b3c4d5e6 --check'
  );
}
