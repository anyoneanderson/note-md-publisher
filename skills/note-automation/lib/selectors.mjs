/**
 * note.com editor UI selectors — centralized for easy maintenance.
 *
 * Verified via TP01 UI inspection (2026-02-25).
 * Editor is hosted at editor.note.com with a separate publish page.
 *
 * @module selectors
 */

/**
 * Playwright role-based locator specs for note.com editor UI elements.
 * Each entry has { role, name } used with page.getByRole(role, { name }).
 * @type {Record<string, {role: string, name: string} | null>}
 */
export const SELECTORS = {
  // Editor page (/notes/{key}/edit/)
  EDITOR_TITLE_INPUT: { role: 'textbox', name: '記事タイトル' },
  DRAFT_SAVE_BUTTON: { role: 'button', name: '下書き保存' },
  PUBLISH_NEXT_BUTTON: { role: 'button', name: '公開に進む' },

  // Publish page (/notes/{key}/publish/)
  HASHTAG_INPUT: { role: 'combobox', name: 'ハッシュタグを追加する' },
  HASHTAG_CONFIRM: null, // null = use Enter key
  PUBLISH_BUTTON: { role: 'button', name: '投稿する' },
  CANCEL_BUTTON: { role: 'button', name: 'キャンセル' },
};

/** @type {Record<string, number>} Timeout values in milliseconds */
export const TIMEOUTS = {
  PAGE_LOAD: 30000,
  ELEMENT_WAIT: 10000,
  TAG_INPUT_DELAY: 300,
  NAVIGATION: 30000,
};

/** @type {{ EDIT_PAGE: (articleKey: string) => string, PUBLISH_PAGE: (articleKey: string) => string }} URL builders */
export const URLS = {
  EDIT_PAGE: (articleKey) => `https://editor.note.com/notes/${articleKey}/edit/`,
  PUBLISH_PAGE: (articleKey) => `https://editor.note.com/notes/${articleKey}/publish/`,
};
