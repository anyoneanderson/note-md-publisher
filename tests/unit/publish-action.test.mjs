import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { publishArticle, saveDraft } from '../../lib/publish-action.mjs';

/**
 * Create a mock Playwright page with configurable button visibility.
 * @param {Object} opts
 * @param {boolean} [opts.publishVisible] - Whether "投稿する" button is visible
 * @param {boolean} [opts.updateVisible] - Whether "更新する" button is visible
 * @param {boolean} [opts.draftVisible] - Whether "下書き保存" button is visible
 * @returns {Object} Mock page object
 */
function createMockPage({ publishVisible = false, updateVisible = false, draftVisible = false } = {}) {
  const clicks = [];
  const buttonMap = {
    '投稿する': publishVisible,
    '更新する': updateVisible,
    '下書き保存': draftVisible,
  };

  return {
    clicks,
    getByRole(role, { name }) {
      const visible = buttonMap[name] ?? false;
      return {
        isVisible: async () => visible,
        click: async () => { clicks.push(name); },
        waitFor: async () => {
          if (!visible) throw new Error(`${name} not visible`);
        },
      };
    },
    waitForLoadState: async () => {},
    waitForTimeout: async () => {},
  };
}

describe('publishArticle', () => {
  it('新規記事の「投稿する」ボタンをクリックする', async () => {
    const page = createMockPage({ publishVisible: true });
    await publishArticle(page);
    assert.deepEqual(page.clicks, ['投稿する']);
  });

  it('公開済み記事の「更新する」ボタンにフォールバックする', async () => {
    const page = createMockPage({ updateVisible: true });
    await publishArticle(page);
    assert.deepEqual(page.clicks, ['更新する']);
  });

  it('「投稿する」が優先され、両方表示時は「投稿する」をクリックする', async () => {
    const page = createMockPage({ publishVisible: true, updateVisible: true });
    await publishArticle(page);
    assert.deepEqual(page.clicks, ['投稿する']);
  });

  it('どちらのボタンも見つからない場合エラーをスローする', async () => {
    const page = createMockPage();
    await assert.rejects(
      () => publishArticle(page),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('投稿/更新ボタンが見つかりません'));
        return true;
      }
    );
  });
});

describe('saveDraft', () => {
  it('「下書き保存」ボタンをクリックする', async () => {
    const page = createMockPage({ draftVisible: true });
    await saveDraft(page);
    assert.deepEqual(page.clicks, ['下書き保存']);
  });

  it('「下書き保存」ボタンが見つからない場合エラーをスローする', async () => {
    const page = createMockPage();
    await assert.rejects(
      () => saveDraft(page),
      (err) => {
        assert.ok(err instanceof Error);
        return true;
      }
    );
  });
});
