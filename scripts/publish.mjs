#!/usr/bin/env node

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { loadContent } from '../lib/content-loader.mjs';
import { convert } from '../lib/markdown-converter.mjs';
import { postArticle } from '../lib/note-api.mjs';
import { uploadImage } from '../lib/image-uploader.mjs';
import { authenticate } from '../lib/auth.mjs';

// Load .env file
await loadEnv();

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    image: { type: 'string' },
    publish: { type: 'boolean', default: false },
    yes: { type: 'boolean', default: false },
    cookie: { type: 'string' },
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
  let cookies;
  if (options.cookie) {
    // Manual cookie mode (MVP): parse "key=value; key2=value2" format
    cookies = parseCookieString(options.cookie);
  } else {
    cookies = await authenticate();
  }

  // Step 2: Load content
  const content = await loadContent(inputPath);
  const title = content.metadata.title;
  console.log(`記事: ${title}`);
  console.log(`ファイル: ${content.filePath}`);

  // Step 3: Convert markdown to HTML
  const htmlContent = await convert(content.body);

  // Step 4: Upload image if specified
  const imagePath = options.image
    ? resolve(options.image)
    : content.metadata.imagePath;
  let imageKey = null;
  if (imagePath) {
    console.log(`画像アップロード中: ${imagePath}`);
    const result = await uploadImage(imagePath, cookies);
    imageKey = result.imageKey;
    console.log(`画像アップロード完了: ${result.imageUrl}`);
  }

  // Step 5: Determine publish status
  const shouldPublish = options.publish || content.metadata.publish;
  const status = shouldPublish ? 'published' : 'draft';

  // Step 6: Post article
  const username = process.env.NOTE_USERNAME;
  if (!username) {
    throw new Error('NOTE_USERNAME が未設定です。.env ファイルを確認してください');
  }

  console.log(`投稿中... (${status})`);
  const result = await postArticle({
    htmlContent,
    title,
    imageKey,
    status,
    cookies,
    username,
  });

  // Step 7: Output result
  if (result.success) {
    console.log('');
    console.log(`✓ 記事を${status === 'draft' ? '下書き保存' : '公開'}しました`);
    console.log(`  URL: ${result.noteUrl}`);
    console.log(`  ステータス: ${result.status}`);
    console.log(`  記事ID: ${result.articleId}`);
  }
} catch (err) {
  console.error('');
  console.error(`✗ 記事の投稿に失敗しました`);
  console.error(`  エラー: ${err.message}`);
  process.exit(1);
}

/**
 * Parse manual cookie string "key=value; key2=value2" into dict.
 */
function parseCookieString(str) {
  const cookies = {};
  for (const pair of str.split(';')) {
    const [key, ...rest] = pair.trim().split('=');
    if (key) cookies[key.trim()] = rest.join('=').trim();
  }
  return cookies;
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
  --publish           公開状態で投稿（デフォルトは下書き）
  --yes               確認プロンプトをスキップ
  --cookie <string>   手動Cookie指定（"key=value; key2=value2"形式）
  --help              ヘルプを表示`);
}
