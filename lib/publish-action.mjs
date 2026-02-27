/**
 * Publish and draft save actions for note.com editor.
 * @module publish-action
 */

import { SELECTORS, TIMEOUTS } from './selectors.mjs';
import { getLocator } from './browser.mjs';

/**
 * Publish an article from the note.com publish settings page.
 * Clicks "投稿する" (new article) or "更新する" (published article) button.
 * @param {import('playwright').Page} page - Playwright page instance on the publish page
 * @returns {Promise<void>}
 * @throws {Error} If neither publish nor update button is found
 */
export async function publishArticle(page) {
  let button = getLocator(page, SELECTORS.PUBLISH_BUTTON);
  let isVisible = await button.isVisible().catch(() => false);

  if (!isVisible) {
    button = getLocator(page, SELECTORS.UPDATE_BUTTON);
    isVisible = await button.isVisible().catch(() => false);
  }

  if (!isVisible) {
    throw new Error(
      '投稿/更新ボタンが見つかりません。note.comのUI変更の可能性があります'
    );
  }

  await button.click();

  // Wait for publish completion (URL change or network idle)
  await page
    .waitForLoadState('networkidle', { timeout: TIMEOUTS.NAVIGATION })
    .catch(() => {
      // networkidle may not always fire; fall back to a brief wait
    });

  await page.waitForTimeout(2000);
}

/**
 * Save the current article as a draft from the editor page.
 * Clicks "下書き保存" button on the editor page.
 * @param {import('playwright').Page} page - Playwright page instance on the editor page
 * @returns {Promise<void>}
 * @throws {Error} If the draft save button is not found
 */
export async function saveDraft(page) {
  const draftButton = getLocator(page, SELECTORS.DRAFT_SAVE_BUTTON);

  await draftButton.waitFor({
    state: 'visible',
    timeout: TIMEOUTS.ELEMENT_WAIT,
  });

  await draftButton.click();

  // Wait for save completion
  await page
    .waitForLoadState('networkidle', { timeout: TIMEOUTS.NAVIGATION })
    .catch(() => {
      // networkidle may not always fire; fall back to a brief wait
    });

  await page.waitForTimeout(1000);
}
