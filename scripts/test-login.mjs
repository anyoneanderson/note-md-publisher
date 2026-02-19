#!/usr/bin/env node
/**
 * Playwright ログインテストスクリプト
 *
 * note.com への Playwright 自動ログインが動作するか検証する。
 * GCP インスタンスではサーバーサイドのボット検知で全滅したため、
 * ローカルマシンでの検証用に用意。
 *
 * 使い方:
 *   node scripts/test-login.mjs                    # デフォルト（headless）
 *   node scripts/test-login.mjs --headed           # ブラウザ表示あり
 *   node scripts/test-login.mjs --stealth          # stealth対策適用
 *   node scripts/test-login.mjs --headed --stealth # 両方
 *
 * 前提: .env に NOTE_EMAIL, NOTE_PASSWORD, NOTE_USERNAME を設定済み
 */
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

// --- CLI args ---
const { values: opts } = parseArgs({
  options: {
    headed: { type: 'boolean', default: false },
    stealth: { type: 'boolean', default: false },
  },
});

// --- Load .env ---
const envPath = resolve(import.meta.dirname || '.', '..', '.env');
const envContent = await readFile(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = value;
}

if (!process.env.NOTE_EMAIL || !process.env.NOTE_PASSWORD) {
  console.error('ERROR: .env に NOTE_EMAIL, NOTE_PASSWORD を設定してください');
  process.exit(1);
}

// --- Launch browser ---
const { chromium } = await import('playwright');
const mode = `${opts.headed ? 'headed' : 'headless'}${opts.stealth ? ' + stealth' : ''}`;
console.log(`[1/5] ブラウザ起動中（${mode}）...`);

const launchOpts = {
  headless: !opts.headed,
};
if (opts.stealth) {
  launchOpts.ignoreDefaultArgs = ['--enable-automation'];
  launchOpts.args = [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
  ];
}

const browser = await chromium.launch(launchOpts);

const contextOpts = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'ja-JP',
  timezoneId: 'Asia/Tokyo',
  viewport: { width: 1280, height: 720 },
};
const context = await browser.newContext(contextOpts);

if (opts.stealth) {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['ja', 'ja-JP', 'en-US', 'en'],
    });
    window.chrome = { runtime: {} };
  });
}

const page = await context.newPage();

// --- Login flow ---
console.log('[2/5] ログインページにアクセス中...');
await page.goto('https://note.com/login?redirectPath=%2F');
await page.waitForLoadState('networkidle');

console.log('[3/5] フォーム入力中...');
if (opts.stealth) {
  // Human-like typing
  await page.click('#email');
  await page.waitForTimeout(200);
  await page.type('#email', process.env.NOTE_EMAIL, { delay: 80 });
  await page.waitForTimeout(300);
  await page.click('#password');
  await page.waitForTimeout(200);
  await page.type('#password', process.env.NOTE_PASSWORD, { delay: 80 });
  await page.waitForTimeout(500);
} else {
  await page.fill('#email', process.env.NOTE_EMAIL);
  await page.fill('#password', process.env.NOTE_PASSWORD);
  await page.waitForTimeout(500);
}

const loginButton = page.getByRole('button', { name: 'ログイン' });
await loginButton.waitFor({ state: 'attached', timeout: 10000 });

console.log('[4/5] ログインボタンクリック...');
await loginButton.click();

console.log('[5/5] リダイレクト待機中...');
try {
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
  console.log('');
  console.log('=== 結果: ログイン成功 ===');
  console.log(`  URL: ${page.url()}`);

  const cookies = await context.cookies();
  const noteCookies = cookies.filter(c => c.domain.includes('note.com'));
  const hasSession = noteCookies.some(c => c.name === '_note_session_v5');
  console.log(`  Cookie数: ${noteCookies.length}`);
  console.log(`  セッションCookie (_note_session_v5): ${hasSession ? 'あり' : 'なし'}`);
  console.log(`  モード: ${mode}`);
} catch (e) {
  console.log('');
  console.log('=== 結果: ログイン失敗 ===');
  console.log(`  URL: ${page.url()}`);
  console.log(`  モード: ${mode}`);

  const errorEl = await page.$('.o-login__error, .error-message, [role="alert"]');
  if (errorEl) {
    const errorText = await errorEl.textContent();
    console.log(`  エラーメッセージ: ${errorText.trim()}`);
  } else {
    const bodyText = await page.textContent('body').catch(() => '');
    if (bodyText.includes('しばらく')) {
      console.log('  エラー: "しばらくたってからもう一度お試し下さい。"');
    } else {
      console.log('  ページテキスト(先頭200文字):', bodyText.trim().substring(0, 200));
    }
  }

  console.log('');
  console.log('--- 次のステップ ---');
  if (!opts.headed) {
    console.log('  --headed を試す:   node scripts/test-login.mjs --headed');
  }
  if (!opts.stealth) {
    console.log('  --stealth を試す:  node scripts/test-login.mjs --stealth');
  }
  if (!opts.headed || !opts.stealth) {
    console.log('  両方を試す:        node scripts/test-login.mjs --headed --stealth');
  }
}

await browser.close();
