/**
 * Publish and draft save actions for note.com editor.
 * @module publish-action
 */

import { SELECTORS, TIMEOUTS } from './selectors.mjs';

/**
 * Publish an article on the note.com editor page.
 * Clicks through the publish settings flow and confirms publication.
 * @param {import('playwright').Page} page - Playwright page instance on the editor
 * @returns {Promise<void>}
 * @throws {Error} If publish buttons are not found or the operation fails
 */
export async function publishArticle(page) {
  // Step 1: Click the publish settings button to open publish options
  const settingsButton = await page.$(SELECTORS.PUBLISH_SETTINGS_BUTTON);
  if (!settingsButton) {
    throw new Error(
      '公開設定ボタンが見つかりません。note.comのUI変更の可能性があります'
    );
  }
  await settingsButton.click();

  // Step 2: Wait for the publish settings panel to load
  await page.waitForTimeout(1000);

  // Step 3: Click the publish button
  const publishButton = await page.waitForSelector(SELECTORS.PUBLISH_BUTTON, {
    timeout: TIMEOUTS.ELEMENT_WAIT,
  }).catch(() => null);

  if (!publishButton) {
    throw new Error(
      '公開ボタンが見つかりません。note.comのUI変更の可能性があります'
    );
  }
  await publishButton.click();

  // Step 4: Handle the confirmation dialog if it appears
  if (SELECTORS.PUBLISH_CONFIRM) {
    const confirmButton = await page.waitForSelector(
      SELECTORS.PUBLISH_CONFIRM,
      { timeout: TIMEOUTS.ELEMENT_WAIT }
    ).catch(() => null);

    if (confirmButton) {
      await confirmButton.click();
    }
  }

  // Step 5: Wait for publish completion (URL change or network idle)
  await page.waitForLoadState('networkidle', {
    timeout: TIMEOUTS.NAVIGATION,
  }).catch(() => {
    // networkidle may not always fire; fall back to a brief wait
  });

  await page.waitForTimeout(2000);
}

/**
 * Save the current article as a draft on the note.com editor page.
 * @param {import('playwright').Page} page - Playwright page instance on the editor
 * @returns {Promise<void>}
 * @throws {Error} If the draft save button is not found
 */
export async function saveDraft(page) {
  const draftButton = await page.$(SELECTORS.DRAFT_SAVE_BUTTON);
  if (!draftButton) {
    throw new Error(
      '下書き保存ボタンが見つかりません。note.comのUI変更の可能性があります'
    );
  }

  await draftButton.click();

  // Wait for save completion
  await page.waitForLoadState('networkidle', {
    timeout: TIMEOUTS.NAVIGATION,
  }).catch(() => {
    // networkidle may not always fire; fall back to a brief wait
  });

  await page.waitForTimeout(1000);
}
