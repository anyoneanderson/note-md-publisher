/**
 * Playwright-based article publisher for note.com.
 *
 * Uses browser automation to interact with the note.com editor directly,
 * enabling body image uploads which the REST API does not support.
 *
 * Flow:
 *   1. Login via Playwright
 *   2. Create new article or open existing draft
 *   3. Set header image and title
 *   4. Paste body text as HTML via clipboard, uploading images via editor UI
 *   5. Save as draft
 *
 * @module playwright-publisher
 */

import { resolve } from 'node:path';
import { splitAtImages } from './md-splitter.mjs';
import { mdToHtml } from './md-to-html.mjs';

/**
 * Publish an article with body images to note.com via Playwright.
 *
 * @param {object} params
 * @param {string} params.title - Article title
 * @param {string} params.body - Markdown body (frontmatter stripped)
 * @param {string|null} params.headerImagePath - Absolute path to header image
 * @param {string} params.imageBase - Base directory for resolving body image paths
 * @param {string|null} [params.draftUrl] - Existing draft URL to update
 * @returns {Promise<{ noteUrl: string, editorUrl: string }>}
 */
export async function publishWithImages({
  title,
  body,
  headerImagePath,
  imageBase,
  draftUrl = null,
}) {
  const email = process.env.NOTE_EMAIL;
  const password = process.env.NOTE_PASSWORD;
  const username = process.env.NOTE_USERNAME;

  if (!email || !password) {
    throw new Error('NOTE_EMAIL / NOTE_PASSWORD が未設定です');
  }
  if (!username) {
    throw new Error('NOTE_USERNAME が未設定です');
  }

  const sections = splitAtImages(body, imageBase);
  const imageCount = sections.filter((s) => s.type === 'image').length;
  console.log(
    `${sections.length} セクション（画像 ${imageCount} 枚）を処理します`
  );

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // --- Login ---
    console.log('ログイン中...');
    await page.goto('https://note.com/login');
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('textbox', { name: 'mail@example.com or note ID' })
      .fill(email);
    await page.getByRole('textbox', { name: 'パスワード' }).fill(password);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'ログイン' }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 30000,
    });
    console.log('ログイン完了');

    // --- Navigate ---
    if (draftUrl) {
      console.log(`既存の下書きを開きます: ${draftUrl}`);
      await page.goto(draftUrl);
    } else {
      console.log('新規記事を作成します...');
      await page.goto('https://note.com/notes/new');
      await page.waitForURL(/editor\.note\.com/);
    }
    await page.waitForTimeout(3000);

    // --- Header image (new articles only) ---
    if (!draftUrl && headerImagePath) {
      console.log('ヘッダー画像をアップロード中...');
      await page.getByRole('button', { name: '画像を追加' }).click();
      await page.waitForTimeout(500);
      const [headerChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: '画像をアップロード' }).click(),
      ]);
      await headerChooser.setFiles(headerImagePath);
      await page.waitForTimeout(1000);

      // Handle crop dialog
      try {
        const saveBtn = page.getByRole('button', { name: '保存' });
        await saveBtn.waitFor({ state: 'visible', timeout: 3000 });
        await saveBtn.click();
        await page.waitForTimeout(1000);
      } catch {
        // No crop dialog appeared
      }
      console.log('ヘッダー画像アップロード完了');
    }

    // --- Title (new articles only) ---
    if (!draftUrl && title) {
      await page.getByRole('textbox', { name: '記事タイトル' }).fill(title);
      console.log(`タイトル設定: ${title}`);
    }

    // --- Body ---
    const bodyTextbox = page.locator('[role="textbox"]').last();
    await bodyTextbox.click();
    await page.waitForTimeout(500);

    // Clear existing body
    await page.keyboard.press('Meta+a');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);

    let imageIdx = 0;
    for (let idx = 0; idx < sections.length; idx++) {
      const section = sections[idx];

      if (section.type === 'text') {
        const html = mdToHtml(section.content);
        if (html.trim() === '') continue;

        const preview = section.content.trim().slice(0, 40).replace(/\n/g, ' ');
        console.log(
          `[${idx + 1}/${sections.length}] テキスト: "${preview}..."`
        );

        await page.evaluate(async (h) => {
          const blob = new Blob([h], { type: 'text/html' });
          const item = new ClipboardItem({ 'text/html': blob });
          await navigator.clipboard.write([item]);
        }, html);
        await page.keyboard.press('Meta+v');
        await page.waitForTimeout(800);
      } else if (section.type === 'image') {
        imageIdx++;
        console.log(
          `[${idx + 1}/${sections.length}] 画像 ${imageIdx}/${imageCount}: ${section.alt || section.path}`
        );

        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        const menuBtn = page.getByRole('button', { name: 'メニューを開く' });
        await menuBtn.waitFor({ state: 'visible', timeout: 5000 });
        await menuBtn.click();
        await page.waitForTimeout(500);

        const imageBtn = page.locator('button:has-text("画像")').first();
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser'),
          imageBtn.click(),
        ]);
        await fileChooser.setFiles(section.path);
        await page.waitForTimeout(2000);

        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('End');
        await page.waitForTimeout(300);
      }
    }

    // --- Save draft ---
    console.log('下書き保存中...');
    await page.getByRole('button', { name: '下書き保存' }).click();
    await page.waitForTimeout(3000);

    const editorUrl = page.url();
    const noteKey = editorUrl.match(/notes\/(n[a-f0-9]+)/)?.[1];
    const noteUrl = noteKey
      ? `https://note.com/${username}/n/${noteKey}`
      : editorUrl;

    return { noteUrl, editorUrl };
  } finally {
    await browser.close();
  }
}
