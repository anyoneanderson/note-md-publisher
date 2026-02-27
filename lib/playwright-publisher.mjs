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
      await page.goto('https://note.com/notes/new', { waitUntil: 'domcontentloaded' });
      // Wait for redirect: /new → /notes/{key}/edit/ (client-side routing)
      for (let i = 0; i < 60; i++) {
        await page.waitForTimeout(1000);
        const url = page.url();
        if (/\/notes\/[^/]+\/edit/.test(url)) break;
        if (i === 59) throw new Error(`エディタへのリダイレクトがタイムアウト: ${url}`);
      }
    }
    // Wait for editor to fully load (title textbox appears)
    await page.getByRole('textbox', { name: '記事タイトル' })
      .waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(1000);
    console.log(`エディタURL: ${page.url()}`);

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
      const titleBox = page.getByRole('textbox', { name: '記事タイトル' });
      await titleBox.waitFor({ state: 'visible', timeout: 15000 });
      await titleBox.fill(title);
      console.log(`タイトル設定: ${title}`);
    }

    // --- Body ---
    const bodyTextbox = page.locator('[role="textbox"]').last();
    await bodyTextbox.waitFor({ state: 'visible', timeout: 15000 });
    await bodyTextbox.click();
    await page.waitForTimeout(500);

    // Clear existing body
    await page.keyboard.press('Meta+a');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);

    // Count body images already in editor (to track new uploads)
    const bodyImgSelector = '[role="textbox"] figure img';
    let bodyImgCountBefore = await page.locator(bodyImgSelector).count();
    console.log(`エディタ内の既存画像数: ${bodyImgCountBefore}`);

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

        // Move cursor to the very end of the editor before pasting
        await page.evaluate(() => {
          const textbox = document.querySelector('[role="textbox"][contenteditable]');
          if (!textbox) return;
          const range = document.createRange();
          range.selectNodeContents(textbox);
          range.collapse(false); // collapse to end
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        });
        await page.waitForTimeout(300);

        await page.evaluate(async (h) => {
          const blob = new Blob([h], { type: 'text/html' });
          const item = new ClipboardItem({ 'text/html': blob });
          await navigator.clipboard.write([item]);
        }, html);
        await page.keyboard.press('Meta+v');
        await page.waitForTimeout(1000);
      } else if (section.type === 'image') {
        imageIdx++;
        console.log(
          `[${idx + 1}/${sections.length}] 画像 ${imageIdx}/${imageCount}: ${section.alt || section.path}`
        );

        // Move cursor to the very end of the editor
        await page.evaluate(() => {
          const textbox = document.querySelector('[role="textbox"][contenteditable]');
          if (!textbox) return;
          const range = document.createRange();
          range.selectNodeContents(textbox);
          range.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        });
        await page.waitForTimeout(300);

        // Press Enter to create insertion point
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Open insert menu
        const menuBtn = page.getByRole('button', { name: 'メニューを開く' });
        await menuBtn.waitFor({ state: 'visible', timeout: 5000 });
        await menuBtn.click();
        await page.waitForTimeout(500);

        // Click image button (exact match to avoid hitting "画像を追加" eyecatch button)
        const imageBtn = page.getByRole('button', { name: '画像', exact: true });
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser'),
          imageBtn.click(),
        ]);

        const { existsSync } = await import('node:fs');
        const fileExists = existsSync(section.path);
        console.log(`  ファイル: ${section.path} (exists: ${fileExists})`);
        if (!fileExists) {
          console.log('  ⚠ ファイルが存在しません — スキップ');
          continue;
        }

        await fileChooser.setFiles(section.path);
        console.log('  ファイル設定完了');

        // Wait for upload to complete by monitoring image count increase
        const expectedCount = bodyImgCountBefore + 1;
        let uploadSuccess = false;
        for (let retry = 0; retry < 30; retry++) {
          await page.waitForTimeout(1000);
          const currentCount = await page.locator(bodyImgSelector).count();
          const uploading = await page.locator('text=画像をアップロードしています').count();
          console.log(`  [${retry + 1}s] 画像数: ${currentCount} (期待: ${expectedCount}), アップロード中: ${uploading > 0}`);
          if (currentCount >= expectedCount) {
            uploadSuccess = true;
            bodyImgCountBefore = currentCount;
            console.log('  ✓ 画像がエディタに挿入されました');
            break;
          }
          if (retry > 10 && uploading === 0) {
            console.log('  ⚠ アップロードメッセージが消えたが画像数が増えていない');
            break;
          }
        }

        if (!uploadSuccess) {
          console.log('  ✗ 画像アップロード失敗 — タイムアウト');
          try {
            await page.screenshot({ path: `/tmp/debug-img-${imageIdx}.png` });
            console.log(`  デバッグスクリーンショット: /tmp/debug-img-${imageIdx}.png`);
          } catch { /* ignore */ }
        }

        // Move cursor out of figure element to ensure next paste goes after the image
        await page.evaluate(() => {
          const textbox = document.querySelector('[role="textbox"][contenteditable]');
          if (!textbox) return;
          // Find the last element and position cursor after it
          const lastChild = textbox.lastElementChild || textbox.lastChild;
          if (lastChild) {
            const range = document.createRange();
            range.setStartAfter(lastChild);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          }
        });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
    }

    // --- Save draft ---
    console.log('下書き保存中...');
    // Wait for any pending image uploads to complete
    await page.waitForTimeout(3000);

    await page.getByRole('button', { name: '下書き保存' }).click();

    // Wait for save confirmation ("下書きを保存しました" message or "保存済み" icon)
    try {
      await page.locator('text=下書きを保存しました').waitFor({ state: 'visible', timeout: 30000 });
      console.log('保存確認メッセージを検出');
    } catch {
      console.log('保存確認メッセージがタイムアウト — フォールバック待機');
    }
    // Extra wait to ensure save is fully committed
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
