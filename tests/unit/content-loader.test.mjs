import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from '../../lib/content-loader.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'fixtures');

describe('ContentLoader', () => {
  describe('フロントマター解析', () => {
    it('フロントマターからtitleを抽出できる', async () => {
      const result = await loadContent(
        join(fixturesDir, 'sample-with-frontmatter.md')
      );
      assert.equal(result.metadata.title, 'フロントマター付き記事');
    });

    it('フロントマターからtagsを抽出できる', async () => {
      const result = await loadContent(
        join(fixturesDir, 'sample-with-frontmatter.md')
      );
      assert.deepEqual(result.metadata.tags, ['AI', 'プログラミング']);
    });

    it('フロントマターからimagePathを解決できる', async () => {
      const result = await loadContent(
        join(fixturesDir, 'sample-with-frontmatter.md')
      );
      assert.ok(result.metadata.imagePath.endsWith('header.png'));
      assert.ok(result.metadata.imagePath.includes('fixtures'));
    });
  });

  describe('タイトル自動抽出', () => {
    it('フロントマター未指定時にh1からtitleを抽出できる', async () => {
      const result = await loadContent(
        join(fixturesDir, 'sample-article.md')
      );
      assert.equal(result.metadata.title, 'サンプル記事');
    });
  });

  describe('本文分離', () => {
    it('フロントマターを除いた本文を返す', async () => {
      const result = await loadContent(
        join(fixturesDir, 'sample-with-frontmatter.md')
      );
      assert.ok(!result.body.includes('title:'));
      assert.ok(result.body.includes('# 本文の見出し'));
    });
  });

  describe('MDXファイル', () => {
    it('MDXファイルを読み込める', async () => {
      const result = await loadContent(
        join(fixturesDir, 'sample-mdx.mdx')
      );
      assert.equal(result.metadata.title, 'MDXサンプル');
      assert.ok(result.body.includes('# MDXの記事'));
    });
  });

  describe('ディレクトリ指定', () => {
    it('ディレクトリからMDファイルを自動検出する', async () => {
      const result = await loadContent(fixturesDir);
      assert.ok(result.filePath.endsWith('.md') || result.filePath.endsWith('.mdx'));
      assert.ok(result.metadata.title);
    });
  });

  describe('デフォルト値', () => {
    it('tags未指定時は空配列', async () => {
      const result = await loadContent(
        join(fixturesDir, 'sample-article.md')
      );
      assert.deepEqual(result.metadata.tags, []);
    });

    it('image未指定時はnull', async () => {
      const result = await loadContent(
        join(fixturesDir, 'sample-article.md')
      );
      assert.equal(result.metadata.imagePath, null);
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないファイルでエラー', async () => {
      await assert.rejects(
        () => loadContent('/nonexistent/file.md'),
        { code: 'ENOENT' }
      );
    });
  });
});
