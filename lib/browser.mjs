/**
 * Browser context management for note.com editor automation.
 * @module browser
 */

import { SELECTORS, TIMEOUTS, URLS } from './selectors.mjs';

const ARTICLE_KEY_FROM_URL = /\/n\/([a-z0-9]+)/;
const ARTICLE_KEY_PATTERN = /^n[a-z0-9]+$/;

/**
 * Parse article input (URL or key) and extract the article key.
 * @param {string} input - Article URL or article key (e.g. "n1a2b3c4d5e6")
 * @returns {string} The extracted article key
 * @throws {Error} If the input format is invalid
 */
export function parseArticleInput(input) {
  if (!input || typeof input !== 'string') {
    throw new Error(`記事の指定形式が不正です: ${input}`);
  }

  const trimmed = input.trim();

  // URL format: extract key from /n/{key}
  const urlMatch = trimmed.match(ARTICLE_KEY_FROM_URL);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Key format: starts with 'n' followed by lowercase alphanumeric
  if (ARTICLE_KEY_PATTERN.test(trimmed)) {
    return trimmed;
  }

  throw new Error(`記事の指定形式が不正です: ${input}`);
}

/**
 * Open a Playwright browser, set cookies, and navigate to the article editor.
 * @param {string} articleInput - Article URL or article key
 * @param {Array} rawCookies - Playwright-format cookies from authenticateWithRaw()
 * @returns {Promise<{browser: import('playwright').Browser, context: import('playwright').BrowserContext, page: import('playwright').Page, articleKey: string}>}
 */
export async function openArticleEditor(articleInput, rawCookies) {
  const articleKey = parseArticleInput(articleInput);
  const editUrl = URLS.EDIT_PAGE(articleKey);

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });

  try {
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

    await page.waitForSelector(SELECTORS.EDITOR_PAGE_LOADED, {
      timeout: TIMEOUTS.PAGE_LOAD,
    });

    return { browser, context, page, articleKey };
  } catch (err) {
    await browser.close();
    throw new Error(
      `記事編集ページの読み込みに失敗しました (${articleKey}): ${err.message}`
    );
  }
}

/**
 * Close the browser session.
 * @param {{browser: import('playwright').Browser}} session - Browser session from openArticleEditor
 * @returns {Promise<void>}
 */
export async function closeBrowser(session) {
  if (session && session.browser) {
    await session.browser.close();
  }
}
