import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseTags } from '../../lib/hashtag.mjs';

describe('parseTags', () => {
  describe('基本的なパース', () => {
    it('カンマ区切り文字列をタグ配列に変換する', () => {
      const result = parseTags('AI,プログラミング');
      assert.deepEqual(result, ['AI', 'プログラミング']);
    });

    it('単一タグを配列に変換する', () => {
      const result = parseTags('AI');
      assert.deepEqual(result, ['AI']);
    });
  });

  describe('空白処理', () => {
    it('タグの前後空白をトリムする', () => {
      const result = parseTags(' AI , プログラミング ');
      assert.deepEqual(result, ['AI', 'プログラミング']);
    });
  });

  describe('#プレフィックス処理', () => {
    it('#プレフィックスを除去する', () => {
      const result = parseTags('#AI,#プログラミング');
      assert.deepEqual(result, ['AI', 'プログラミング']);
    });

    it('#なしのタグはそのまま', () => {
      const result = parseTags('AI');
      assert.deepEqual(result, ['AI']);
    });

    it('#ありなし混在を処理する', () => {
      const result = parseTags('#AI,プログラミング');
      assert.deepEqual(result, ['AI', 'プログラミング']);
    });
  });

  describe('空文字列の除外', () => {
    it('連続カンマで空文字列を除外する', () => {
      const result = parseTags('AI,,プログラミング');
      assert.deepEqual(result, ['AI', 'プログラミング']);
    });

    it('末尾カンマで空文字列を除外する', () => {
      const result = parseTags('AI,');
      assert.deepEqual(result, ['AI']);
    });
  });

  describe('エッジケース', () => {
    it('空文字列で空配列を返す', () => {
      const result = parseTags('');
      assert.deepEqual(result, []);
    });

    it('空白のみで空配列を返す', () => {
      const result = parseTags('   ');
      assert.deepEqual(result, []);
    });

    it('カンマのみで空配列を返す', () => {
      const result = parseTags(',,,');
      assert.deepEqual(result, []);
    });
  });
});
