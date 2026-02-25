/**
 * note.com editor UI selectors — centralized for easy maintenance.
 *
 * IMPORTANT: These selectors are placeholders.
 * Run `node scripts/inspect-editor.mjs` with headless:false to identify
 * the actual selectors, then update this file.
 *
 * @module selectors
 */

/** @type {Record<string, string | null>} UI element selectors for note.com editor */
export const SELECTORS = {
  // Editor page load indicator
  EDITOR_PAGE_LOADED: '[data-note-editor]', // placeholder — confirm via TP01

  // Hashtag input
  HASHTAG_INPUT: 'input[placeholder*="\u30bf\u30b0"]', // placeholder — confirm via TP01
  HASHTAG_CONFIRM: null, // null = use Enter key; set to selector if button exists

  // Publish flow
  PUBLISH_SETTINGS_BUTTON: 'button:has-text("\u516c\u958b\u8a2d\u5b9a")', // placeholder
  PUBLISH_BUTTON: 'button:has-text("\u516c\u958b")', // placeholder
  DRAFT_SAVE_BUTTON: 'button:has-text("\u4e0b\u66f8\u304d\u4fdd\u5b58")', // placeholder
  PUBLISH_CONFIRM: 'button:has-text("\u516c\u958b\u3059\u308b")', // placeholder — confirm dialog button
};

/** @type {Record<string, number>} Timeout values in milliseconds */
export const TIMEOUTS = {
  PAGE_LOAD: 30000,
  ELEMENT_WAIT: 10000,
  TAG_INPUT_DELAY: 300,
  NAVIGATION: 30000,
};

/** @type {{ EDIT_PAGE: (articleKey: string) => string }} URL builders */
export const URLS = {
  EDIT_PAGE: (articleKey) => `https://note.com/notes/${articleKey}/edit`,
};
