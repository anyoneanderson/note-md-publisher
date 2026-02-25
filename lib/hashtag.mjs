/**
 * Hashtag input automation for note.com editor.
 * @module hashtag
 */

import { SELECTORS, TIMEOUTS } from './selectors.mjs';

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
 * Set hashtags on the note.com editor page via Playwright browser automation.
 * Each tag is typed into the input field and confirmed with Enter (or a confirm button).
 * @param {import('playwright').Page} page - Playwright page instance on the editor
 * @param {string[]} tags - Array of tag strings to input
 * @returns {Promise<void>}
 * @throws {Error} If the hashtag input field is not found
 */
export async function setHashtags(page, tags) {
  if (!tags || tags.length === 0) {
    return;
  }

  const inputSelector = SELECTORS.HASHTAG_INPUT;
  const inputElement = await page.$(inputSelector);
  if (!inputElement) {
    throw new Error(
      'ハッシュタグ入力欄が見つかりません。note.comのUI変更の可能性があります'
    );
  }

  for (const tag of tags) {
    // Focus the input field
    await page.click(inputSelector);

    // Type the tag string with a small delay to simulate human input
    await page.type(inputSelector, tag, { delay: TIMEOUTS.TAG_INPUT_DELAY });

    // Confirm the tag: use a confirm button if available, otherwise press Enter
    if (SELECTORS.HASHTAG_CONFIRM) {
      await page.click(SELECTORS.HASHTAG_CONFIRM);
    } else {
      await page.keyboard.press('Enter');
    }

    // Brief pause between tags to let the UI settle
    await page.waitForTimeout(200);
  }
}
