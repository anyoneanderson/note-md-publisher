/**
 * Publish and draft save actions for note.com editor.
 * @module publish-action
 */

import { SELECTORS, TIMEOUTS } from './selectors.mjs';
import { getLocator } from './browser.mjs';

/**
 * Publish an article from the note.com publish settings page.
 * Clicks the "投稿する" button to publish.
 * @param {import('playwright').Page} page - Playwright page instance on the publish page
 * @returns {Promise<void>}
 * @throws {Error} If the publish button is not found or the operation fails
 */
export async function publishArticle(page) {
  const publishButton = getLocator(page, SELECTORS.PUBLISH_BUTTON);

  const isVisible = await publishButton.isVisible().catch(() => false);
  if (!isVisible) {
    throw new Error(
      '投稿ボタンが見つかりません。note.comのUI変更の可能性があります'
    );
  }

  await publishButton.click();

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
