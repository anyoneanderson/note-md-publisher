import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseArticleInput } from '../../lib/browser.mjs';

describe('parseArticleInput', () => {
  describe('URL形式', () => {
    it('note.com記事URLからarticleKeyを抽出する', () => {
      const result = parseArticleInput('https://note.com/user/n/n1a2b3c4d5e6');
      assert.equal(result, 'n1a2b3c4d5e6');
    });

    it('末尾スラッシュ付きURLを処理する', () => {
      const result = parseArticleInput('https://note.com/user/n/n1a2b3c4d5e6/');
      assert.equal(result, 'n1a2b3c4d5e6');
    });
  });

  describe('キー形式', () => {
    it('記事キーをそのまま返す', () => {
      const result = parseArticleInput('n1a2b3c4d5e6');
      assert.equal(result, 'n1a2b3c4d5e6');
    });

    it('nで始まる英数字キーを受け付ける', () => {
      const result = parseArticleInput('nabc123def456');
      assert.equal(result, 'nabc123def456');
    });
  });

  describe('エラーケース', () => {
    it('空文字列でエラーをスローする', () => {
      assert.throws(
        () => parseArticleInput(''),
        (err) => {
          assert.ok(err instanceof Error);
          return true;
        }
      );
    });

    it('nullでエラーをスローする', () => {
      assert.throws(
        () => parseArticleInput(null),
        (err) => {
          assert.ok(err instanceof Error);
          return true;
        }
      );
    });

    it('undefinedでエラーをスローする', () => {
      assert.throws(
        () => parseArticleInput(undefined),
        (err) => {
          assert.ok(err instanceof Error);
          return true;
        }
      );
    });

    it('不正な形式でエラーをスローする', () => {
      assert.throws(
        () => parseArticleInput('invalid'),
        (err) => {
          assert.ok(err instanceof Error);
          return true;
        }
      );
    });

    it('nで始まらないキーでエラーをスローする', () => {
      assert.throws(
        () => parseArticleInput('abc123'),
        (err) => {
          assert.ok(err instanceof Error);
          return true;
        }
      );
    });

    it('エラーメッセージに入力値が含まれる', () => {
      const input = 'invalid-input';
      assert.throws(
        () => parseArticleInput(input),
        (err) => {
          assert.ok(err instanceof Error);
          assert.ok(
            err.message.includes(input),
            `エラーメッセージ "${err.message}" に入力値 "${input}" が含まれていません`
          );
          return true;
        }
      );
    });
  });
});
