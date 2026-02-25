/**
 * Hashtag input automation for note.com publish page.
 * @module hashtag
 */

import { SELECTORS, TIMEOUTS } from './selectors.mjs';
import { getLocator } from './browser.mjs';

/**
 * Parse a comma-separated tag string into a cleaned array of tag names.
 * - Splits on commas
 * - Trims whitespace from each tag
 * - Strips leading "#" prefix
 * - Removes empty strings
 * @param {string} input - Comma-separated tag string (e.g. "#AI, programming, #note")
 * @returns {string[]} Cleaned tag array (e.g. ["AI", "programming", "note"])
 */
export function parseTags(input) {
  if (!input || typeof input !== 'string') {
    return [];
  }

  return input
    .split(',')
    .map((tag) => tag.trim())
    .map((tag) => (tag.startsWith('#') ? tag.slice(1) : tag))
    .filter((tag) => tag.length > 0);
}

/**
 * Set hashtags on the note.com publish page via Playwright browser automation.
 * Uses the combobox input: type tag text, press Enter to confirm.
 * @param {import('playwright').Page} page - Playwright page instance on the publish page
 * @param {string[]} tags - Array of tag strings to input
 * @returns {Promise<void>}
 * @throws {Error} If the hashtag input field is not found
 */
export async function setHashtags(page, tags) {
  if (!tags || tags.length === 0) {
    return;
  }

  const input = getLocator(page, SELECTORS.HASHTAG_INPUT);

  const isVisible = await input.isVisible().catch(() => false);
  if (!isVisible) {
    throw new Error(
      'ハッシュタグ入力欄が見つかりません。note.comのUI変更の可能性があります'
    );
  }

  for (const tag of tags) {
    // Click the combobox to focus it
    await input.click();

    // Type the tag with a small delay to trigger autocomplete
    await input.pressSequentially(tag, { delay: TIMEOUTS.TAG_INPUT_DELAY });

    // Brief pause to let autocomplete settle
    await page.waitForTimeout(500);

    // Confirm the tag with Enter
    await page.keyboard.press('Enter');

    // Brief pause between tags to let the UI settle
    await page.waitForTimeout(300);
  }
}
