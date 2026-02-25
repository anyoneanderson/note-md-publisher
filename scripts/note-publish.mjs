#!/usr/bin/env node
/**
 * Publish/tag note.com articles via browser automation.
 * Usage: node scripts/note-publish.mjs <article> [options]
 *
 * <article> can be:
 *   - Article key (e.g. n1a2b3c4d5e6)
 *   - Article URL (e.g. https://note.com/username/n/n1a2b3c4d5e6)
 */

import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { authenticateWithRaw } from '../lib/auth.mjs';
import { loadContent } from '../lib/content-loader.mjs';
import { openArticleEditor, closeBrowser } from '../lib/browser.mjs';
import { parseTags, setHashtags } from '../lib/hashtag.mjs';
import { publishArticle, saveDraft } from '../lib/publish-action.mjs';

// Load .env file
await loadEnv();

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    tags: { type: 'string' },
    md: { type: 'string' },
    publish: { type: 'boolean', default: false },
    yes: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});

if (options.help || positionals.length === 0) {
  printUsage();
  process.exit(options.help ? 0 : 1);
}

const articleInput = positionals[0];
const username = process.env.NOTE_USERNAME;
let shouldPublish = options.publish;

let session = null;

try {
  // Step 1: Resolve tags
  let tags = [];
  if (options.tags) {
    tags = parseTags(options.tags);
  } else if (options.md) {
    const content = await loadContent(resolve(options.md));
    tags = content.metadata.tags || [];
  }

  // Step 2: Confirm publish if --yes is not specified
  if (shouldPublish && !options.yes) {
    const confirmed = await confirmAction(
      '記事を公開しますか？ (y/N): '
    );
    if (!confirmed) {
      console.log('公開をスキップし、下書きとして保存します。');
      shouldPublish = false;
    }
  }

  // Step 3: Authenticate (get rawCookies for Playwright)
  console.log('認証中...');
  const { rawCookies } = await authenticateWithRaw();

  // Step 4: Open browser and navigate to editor
  console.log('記事編集ページを開いています...');
  session = await openArticleEditor(articleInput, rawCookies);

  // Step 5: Set hashtags if any
  if (tags.length > 0) {
    console.log(`ハッシュタグを設定中: ${tags.map((t) => '#' + t).join(', ')}`);
    await setHashtags(session.page, tags);
  }

  // Step 6: Publish or save draft
  if (shouldPublish) {
    console.log('記事を公開中...');
    await publishArticle(session.page);
  } else {
    console.log('下書きを保存中...');
    await saveDraft(session.page);
  }

  // Step 7: Output result
  const noteUrl = username
    ? 'https://note.com/' + username + '/n/' + session.articleKey
    : 'https://note.com/notes/' + session.articleKey;

  console.log('');
  if (shouldPublish && tags.length > 0) {
    console.log('✓ ハッシュタグを設定し、記事を公開しました');
  } else if (shouldPublish) {
    console.log('✓ 記事を公開しました');
  } else if (tags.length > 0) {
    console.log('✓ ハッシュタグを設定しました（下書き）');
  } else {
    console.log('✓ 下書きを保存しました');
  }

  console.log('  URL: ' + noteUrl);
  if (tags.length > 0) {
    console.log('  タグ: ' + tags.map((t) => '#' + t).join(', '));
  }
  console.log('  ステータス: ' + (shouldPublish ? 'published' : 'draft'));
} catch (err) {
  console.error('');
  console.error('✗ 操作に失敗しました');
  console.error('  エラー: ' + err.message);
  console.error('  対処: note.comのWebUIから手動で操作してください');
  process.exit(1);
} finally {
  if (session) {
    await closeBrowser(session);
  }
}

/**
 * Prompt the user for confirmation via stdin.
 * @param {string} message - Prompt message to display
 * @returns {Promise<boolean>} true if the user answers 'y' or 'Y'
 */
function confirmAction(message) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
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
  console.log(
    '使い方: node scripts/note-publish.mjs <article> [options]\n' +
    '\n' +
    '引数:\n' +
    '  <article>           記事URLまたは記事キー（例: n1a2b3c4d5e6）\n' +
    '\n' +
    'オプション:\n' +
    '  --tags <csv>        カンマ区切りのハッシュタグ（例: "AI,プログラミング"）\n' +
    '  --md <path>         MDファイルパス（フロントマターからタグ読取）\n' +
    '  --publish           記事を公開する（未指定時は下書き保存）\n' +
    '  --yes               確認プロンプトをスキップ\n' +
    '  --help              ヘルプを表示\n' +
    '\n' +
    '例:\n' +
    '  node scripts/note-publish.mjs n1a2b3c4d5e6 --tags "AI,プログラミング" --publish\n' +
    '  node scripts/note-publish.mjs https://note.com/user/n/n1a2b3c4d5e6 --tags "AI"\n' +
    '  node scripts/note-publish.mjs n1a2b3c4d5e6 --md path/to/article.md'
  );
}
