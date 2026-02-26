#!/usr/bin/env node

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { loadContent } from '../lib/content-loader.mjs';
import { convert } from '../lib/markdown-converter.mjs';
import { createArticle, updateArticle } from '../lib/note-api.mjs';
import { uploadImage } from '../lib/image-uploader.mjs';
import { authenticate } from '../lib/auth.mjs';

// Load .env file
await loadEnv();

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    image: { type: 'string' },
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
  // Step 1: Authenticate
  const cookies = await authenticate();

  // Step 2: Load content
  const content = await loadContent(inputPath);
  const title = content.metadata.title;
  console.log(`記事: ${title}`);
  console.log(`ファイル: ${content.filePath}`);

  // Step 3: Convert markdown to HTML
  const htmlContent = await convert(content.body);

  // Step 4: Get username
  const username = process.env.NOTE_USERNAME;
  if (!username) {
    throw new Error('NOTE_USERNAME が未設定です。.env ファイルを確認してください');
  }

  // Step 5: Create article (gets article ID needed for image upload)
  console.log(`記事作成中...`);
  const { articleId, articleKey } = await createArticle({ title, cookies });

  // Step 6: Upload image if specified (requires article ID)
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

  // Step 7: Update article with body and image
  console.log(`記事更新中...`);
  await updateArticle({
    articleId,
    htmlContent,
    title,
    imageUrl,
    cookies,
  });

  const noteUrl = `https://note.com/${username}/n/${articleKey}`;

  // Step 8: Output result
  console.log('');
  console.log(`✓ 記事を下書き保存しました`);
  console.log(`  URL: ${noteUrl}`);
  console.log(`  記事ID: ${articleId}`);
} catch (err) {
  console.error('');
  console.error(`✗ 記事の投稿に失敗しました`);
  console.error(`  エラー: ${err.message}`);
  process.exit(1);
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
  <path>              MDファイルまたはディレクトリのパス

オプション:
  --image <path>      ヘッダー画像のパス
  --yes               確認プロンプトをスキップ
  --help              ヘルプを表示

※ 記事は常に下書きとして保存されます。公開はnote.comのWebUIから行ってください。`);
}
