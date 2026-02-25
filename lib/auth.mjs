import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_DIR = join(homedir(), '.config', 'note-md-publisher');
const COOKIE_FILE = join(CONFIG_DIR, 'cookies.json');
const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const API_BASE = 'https://note.com/api';

/**
 * Authenticate with note.com. Loads saved cookies or performs Playwright login.
 * @returns {Promise<Record<string, string>>} Cookie dict { name: value }
 */
export async function authenticate() {
  const username = process.env.NOTE_USERNAME;
  if (!username) {
    throw new Error(
      'NOTE_USERNAME が未設定です。.env ファイルを確認してください'
    );
  }

  // Try loading saved cookies
  const saved = await loadCookies();
  if (saved) {
    const valid = await validateCookies(saved, username);
    if (valid) return saved;
    console.log('保存済みCookieが無効です。再ログインします...');
  }

  // Perform Playwright login
  const { cookies, rawCookies } = await loginWithPlaywright();
  await saveCookies(cookies, rawCookies);
  return cookies;
}

/**
 * Login to note.com using Playwright headless browser.
 */
async function loginWithPlaywright() {
  const email = process.env.NOTE_EMAIL;
  const password = process.env.NOTE_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'NOTE_EMAIL / NOTE_PASSWORD が未設定です。.env ファイルを確認してください'
    );
  }

  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
    const page = await context.newPage();

    await page.goto('https://note.com/login?redirectPath=%2F');
    await page.waitForLoadState('networkidle');

    // Fill login form — note.com uses id-based inputs (#email, #password)
    await page.fill('#email', email);
    await page.fill('#password', password);

    // Wait for login button to become enabled (disabled until fields are filled)
    const loginButton = page.getByRole('button', { name: 'ログイン' });
    await loginButton.waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForTimeout(500);
    await loginButton.click();

    // Wait for navigation away from login page
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 30000,
    });

    // Extract cookies
    const allCookies = await context.cookies();
    const noteCookies = allCookies.filter((c) =>
      c.domain.includes('note.com')
    );

    const cookieDict = {};
    for (const c of noteCookies) {
      cookieDict[c.name] = c.value;
    }

    if (Object.keys(cookieDict).length === 0) {
      throw new Error('ログイン後にCookieを取得できませんでした');
    }

    console.log('ログイン成功');
    return { cookies: cookieDict, rawCookies: noteCookies };
  } catch (err) {
    if (err.message.includes('未設定')) throw err;
    throw new Error(`ログインに失敗しました: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Authenticate and return both cookie dict and raw Playwright cookies.
 * Used by browser automation modules that need Playwright cookie format.
 * @returns {Promise<{cookies: Record<string, string>, rawCookies: Array}>}
 */
export async function authenticateWithRaw() {
  const username = process.env.NOTE_USERNAME;
  if (!username) {
    throw new Error(
      'NOTE_USERNAME が未設定です。.env ファイルを確認してください'
    );
  }

  // Try loading saved cookies (including rawCookies)
  const saved = await loadCookiesWithRaw();
  if (saved && saved.cookies) {
    const valid = await validateCookies(saved.cookies, username);
    if (valid && saved.rawCookies && saved.rawCookies.length > 0) {
      return { cookies: saved.cookies, rawCookies: saved.rawCookies };
    }
    if (valid && (!saved.rawCookies || saved.rawCookies.length === 0)) {
      console.log('rawCookies が保存されていません。再ログインします...');
    } else {
      console.log('保存済みCookieが無効です。再ログインします...');
    }
  }

  // Perform Playwright login to get both formats
  const { cookies, rawCookies } = await loginWithPlaywright();
  await saveCookies(cookies, rawCookies);
  return { cookies, rawCookies };
}

/**
 * Load cookies and rawCookies from disk.
 * @returns {Promise<{cookies: Record<string, string>, rawCookies: Array} | null>}
 */
async function loadCookiesWithRaw() {
  try {
    const data = JSON.parse(await readFile(COOKIE_FILE, 'utf-8'));
    const savedAt = new Date(data.savedAt).getTime();
    if (Date.now() - savedAt > COOKIE_MAX_AGE_MS) {
      console.log('保存済みCookieの有効期限が切れています');
      return null;
    }
    return {
      cookies: data.cookies || null,
      rawCookies: data.rawCookies || null,
    };
  } catch {
    return null;
  }
}

/**
 * Load cookies from disk.
 */
async function loadCookies() {
  const result = await loadCookiesWithRaw();
  return result ? result.cookies : null;
}

/**
 * Save cookies to disk with 0600 permissions.
 */
async function saveCookies(cookies, rawCookies) {
  await mkdir(CONFIG_DIR, { recursive: true });
  const data = JSON.stringify(
    { cookies, rawCookies, savedAt: new Date().toISOString() },
    null,
    2
  );
  await writeFile(COOKIE_FILE, data, { mode: 0o600 });
  await chmod(COOKIE_FILE, 0o600);
}

/**
 * Validate cookies by calling the creators API.
 */
async function validateCookies(cookies, username) {
  try {
    const cookieHeader = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    const response = await fetch(
      `${API_BASE}/v2/creators/${username}`,
      {
        headers: {
          Cookie: cookieHeader,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}
