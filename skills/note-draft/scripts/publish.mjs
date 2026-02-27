#!/usr/bin/env node

import { resolve, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { loadContent } from '../lib/content-loader.mjs';
import { convert } from '../lib/markdown-converter.mjs';
import { createArticle, updateArticle } from '../lib/note-api.mjs';
import { uploadImage } from '../lib/image-uploader.mjs';
import { authenticate } from '../lib/auth.mjs';
import { hasBodyImages } from '../lib/md-splitter.mjs';
import { publishWithImages } from '../lib/playwright-publisher.mjs';

// Load .env file
await loadEnv();

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    image: { type: 'string' },
    'image-base': { type: 'string' },
    'draft-url': { type: 'string' },
    'no-images': { type: 'boolean', default: false },
    yes: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});

if (options.help || positionals.length === 0) {
  printUsage();
  process.exit(options.help ? 0 : 1);
}

const inputPath = resolve(positionals[0]);

try {
  // Step 1: Load content
  const content = await loadContent(inputPath);
  const title = content.metadata.title;
  console.log(`記事: ${title}`);
  console.log(`ファイル: ${content.filePath}`);

  // Step 2: Detect body images and choose publishing method
  const bodyHasImages = !options['no-images'] && hasBodyImages(content.body);

  if (bodyHasImages) {
    // --- Playwright mode: handles body images via editor UI ---
    console.log('本文に画像を検出 → Playwright モードで投稿します');

    const imageBase =
      options['image-base'] ||
      guessImageBase(content.filePath, content.metadata.imagePath);

    const result = await publishWithImages({
      title,
      body: content.body,
      headerImagePath: options.image
        ? resolve(options.image)
        : content.metadata.imagePath,
      imageBase,
      draftUrl: options['draft-url'] || null,
    });

    console.log('');
    console.log('✓ 記事を下書き保存しました');
    console.log(`  URL: ${result.noteUrl}`);
    console.log(`  Editor: ${result.editorUrl}`);
  } else {
    // --- API mode: fast, no body images ---
    console.log('API モードで投稿します');

    const cookies = await authenticate();
    const htmlContent = await convert(content.body);

    const username = process.env.NOTE_USERNAME;
    if (!username) {
      throw new Error(
        'NOTE_USERNAME が未設定です。.env ファイルを確認してください'
      );
    }

    console.log('記事作成中...');
    const { articleId, articleKey } = await createArticle({ title, cookies });

    const imagePath = options.image
      ? resolve(options.image)
      : content.metadata.imagePath;
    let imageUrl = null;
    if (imagePath) {
      console.log(`画像アップロード中: ${imagePath}`);
      const result = await uploadImage(imagePath, cookies, articleId);
      imageUrl = result.imageUrl;
      console.log(`画像アップロード完了: ${imageUrl}`);
    }

    console.log('記事更新中...');
    await updateArticle({ articleId, htmlContent, title, imageUrl, cookies });

    const noteUrl = `https://note.com/${username}/n/${articleKey}`;
    console.log('');
    console.log('✓ 記事を下書き保存しました');
    console.log(`  URL: ${noteUrl}`);
    console.log(`  記事ID: ${articleId}`);
  }
} catch (err) {
  console.error('');
  console.error('✗ 記事の投稿に失敗しました');
  console.error(`  エラー: ${err.message}`);
  process.exit(1);
}

/**
 * Guess the base directory for resolving body image paths.
 *
 * For Next.js projects with images in public/, the frontmatter image path
 * (e.g. /images/media/foo/bar.png) and the file's directory can be used
 * to infer the public/ directory.
 *
 * @param {string} filePath - Absolute path to the MDX file
 * @param {string|null} imagePath - Resolved header image path from frontmatter
 * @returns {string} Absolute path to use as image base
 */
function guessImageBase(filePath, imagePath) {
  if (imagePath) {
    // Walk up from imagePath looking for a directory that,
    // when combined with typical image subpaths, contains the file.
    // Common pattern: <project>/public/images/... → base is <project>/public
    const idx = imagePath.indexOf('/images/');
    if (idx >= 0) return imagePath.slice(0, idx);
  }

  // Fallback: assume <project>/content/blog/article.mdx → <project>/public
  const contentIdx = filePath.indexOf('/content/');
  if (contentIdx >= 0) {
    return resolve(filePath.slice(0, contentIdx), 'public');
  }

  return dirname(filePath);
}

/**
 * Load .env file into process.env.
 */
async function loadEnv() {
  try {
    const { readFile } = await import('node:fs/promises');
    const envPath = resolve(
      import.meta.dirname || new URL('.', import.meta.url).pathname,
      '..',
      '.env'
    );
    const content = await readFile(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env file not found — that's OK
  }
}

function printUsage() {
  console.log(`使い方: node scripts/publish.mjs <path> [options]

引数:
  <path>                MDファイルまたはディレクトリのパス

オプション:
  --image <path>        ヘッダー画像のパス
  --image-base <path>   本文画像の基準ディレクトリ（自動推定あり）
  --draft-url <url>     既存の下書きURL（更新時に使用）
  --no-images           本文の画像を無視してAPIモードで投稿
  --yes                 確認プロンプトをスキップ
  --help                ヘルプを表示

動作モード:
  本文に画像がある場合 → Playwright モード（エディタ直接操作）
  本文に画像がない場合 → API モード（高速・軽量）

※ 記事は常に下書きとして保存されます。`);
}
