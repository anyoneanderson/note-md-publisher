import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { convert } from '../../lib/markdown-converter.mjs';

describe('MarkdownConverter', () => {
  describe('見出し変換', () => {
    it('h1 → <h1>', async () => {
      const html = await convert('# 見出し1');
      assert.ok(html.includes('<h1>見出し1</h1>'));
    });

    it('h2 → <h2>', async () => {
      const html = await convert('## 見出し2');
      assert.ok(html.includes('<h2>見出し2</h2>'));
    });

    it('h3 → <h3>', async () => {
      const html = await convert('### 見出し3');
      assert.ok(html.includes('<h3>見出し3</h3>'));
    });
  });

  describe('段落・インライン要素', () => {
    it('段落 → <p>', async () => {
      const html = await convert('これは段落です。');
      assert.ok(html.includes('<p>これは段落です。</p>'));
    });

    it('太字 → <strong>', async () => {
      const html = await convert('**太字テスト**');
      assert.ok(html.includes('<strong>太字テスト</strong>'));
    });

    it('斜体 → <em>', async () => {
      const html = await convert('*斜体テスト*');
      assert.ok(html.includes('<em>斜体テスト</em>'));
    });

    it('リンク → <a>', async () => {
      const html = await convert('[テスト](https://example.com)');
      assert.ok(html.includes('<a href="https://example.com">テスト</a>'));
    });
  });

  describe('リスト変換', () => {
    it('箇条書き → <ul><li>', async () => {
      const html = await convert('- 項目1\n- 項目2');
      assert.ok(html.includes('<ul>'));
      assert.ok(html.includes('<li>項目1</li>'));
      assert.ok(html.includes('<li>項目2</li>'));
    });

    it('番号付きリスト → <ol><li>', async () => {
      const html = await convert('1. 項目1\n2. 項目2');
      assert.ok(html.includes('<ol>'));
      assert.ok(html.includes('<li>項目1</li>'));
      assert.ok(html.includes('<li>項目2</li>'));
    });
  });

  describe('コードブロック・引用', () => {
    it('コードブロック → <pre><code>', async () => {
      const html = await convert('```\nconst x = 1;\n```');
      assert.ok(html.includes('<pre><code>'));
      assert.ok(html.includes('const x = 1;'));
    });

    it('言語指定付きコードブロック', async () => {
      const html = await convert('```javascript\nconst x = 1;\n```');
      assert.ok(html.includes('<code'));
      assert.ok(html.includes('const x = 1;'));
    });

    it('引用 → <blockquote>', async () => {
      const html = await convert('> これは引用です');
      assert.ok(html.includes('<blockquote>'));
      assert.ok(html.includes('これは引用です'));
    });
  });

  describe('水平線', () => {
    it('--- → <hr>', async () => {
      const html = await convert('---');
      assert.ok(html.includes('<hr>') || html.includes('<hr />') || html.includes('<hr/>'));
    });
  });

  describe('MDXフィルタ', () => {
    it('import文をフィルタする', async () => {
      const html = await convert('import { Comp } from "./comp"\n\n# タイトル');
      assert.ok(!html.includes('import'));
      assert.ok(html.includes('<h1>タイトル</h1>'));
    });

    it('自己閉じJSXタグをフィルタする', async () => {
      const html = await convert('# タイトル\n\n<Component prop="value" />\n\n段落');
      assert.ok(!html.includes('Component'));
      assert.ok(html.includes('<h1>タイトル</h1>'));
      assert.ok(html.includes('<p>段落</p>'));
    });

    it('画像参照をフィルタする', async () => {
      const html = await convert('テスト\n\n![alt](image.png)\n\n続き');
      assert.ok(!html.includes('image.png'));
      assert.ok(!html.includes('<img'));
    });
  });

  describe('エッジケース', () => {
    it('空文字列でエラーにならない', async () => {
      const html = await convert('');
      assert.ok(typeof html === 'string');
    });

    it('空行のみでエラーにならない', async () => {
      const html = await convert('\n\n\n');
      assert.ok(typeof html === 'string');
    });
  });

  describe('サンプルファイル変換', () => {
    it('sample-article.mdを変換できる', async () => {
      const { readFile } = await import('node:fs/promises');
      const md = await readFile(
        new URL('../fixtures/sample-article.md', import.meta.url),
        'utf-8'
      );
      const html = await convert(md);
      assert.ok(html.includes('<h1>サンプル記事</h1>'));
      assert.ok(html.includes('<h2>見出し2</h2>'));
      assert.ok(html.includes('<strong>太字</strong>'));
      assert.ok(html.includes('<em>斜体</em>'));
      assert.ok(html.includes('<pre><code'));
    });
  });
});
