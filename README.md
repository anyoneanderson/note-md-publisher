# note-md-publisher

> **⚠️ 注意**: 本ツールは note.com の**非公式API**を利用しています。note公式が提供・サポートするものではなく、APIの仕様は予告なく変更される可能性があります。ご利用にあたっては [noteご利用規約](https://terms.help-note.com/hc/ja/articles/44943817565465) を遵守し、規約に違反するような使い方（スパム投稿、大量自動投稿、不正アクセスなど）は絶対に行わないでください。本ツールの利用により生じた問題について、開発者は一切の責任を負いません。

Markdownファイルをnote.comに自動投稿するClaude Codeエージェントスキル。

## 特徴

- Markdown → HTML変換してnote.com APIで投稿
- フロントマター（YAML）でタイトル・タグ・画像を指定
- ヘッダー画像のアップロード対応
- Playwrightによる自動ログイン + Cookie永続化
- 下書き保存（デフォルト）/ 即時公開を選択可能

## インストール

### Claude Codeスキルとして

```bash
npx skills add anyoneanderson/note-md-publisher -g -y
```

### 手動セットアップ

```bash
git clone https://github.com/anyoneanderson/note-md-publisher.git
cd note-md-publisher
npm install
npx playwright install --with-deps chromium
```

## 設定

`.env` ファイルを作成してnote.comの認証情報を設定：

```bash
cp .env.example .env
# .env を編集
```

```
NOTE_EMAIL=your-email@example.com
NOTE_PASSWORD=your-password
NOTE_USERNAME=your-note-username
```

### 機密情報の管理

本ツールは以下のファイルに機密情報を保存します。取り扱いには十分ご注意ください。

| ファイル | 内容 | 備考 |
|---------|------|------|
| `.env` | note.comのメールアドレス・パスワード | **絶対にGitにコミットしないでください**（.gitignoreに含まれています） |
| `~/.config/note-md-publisher/cookies.json` | ログインセッションCookie | パーミッション0600で自動作成、24時間で期限切れ |

これらのファイルが漏洩した場合、第三者にnote.comアカウントを不正利用される恐れがあります。管理は自己責任でお願いします。

## 使い方

### AIエージェントから（スキルとして）

`npx skills add` でインストール済みであれば、エージェントに話しかけるだけで投稿できます：

```
> noteに投稿して content/note/my-article.md
> この記事をnoteにアップして（画像: public/images/note/my-article.png）
> noteに記事を公開して content/note/my-article.md --publish
```

エージェントが SKILL.md の指示に従い、自動で `publish.mjs` を実行します。

### CLIから直接

```bash
# 下書き保存（デフォルト）
node scripts/publish.mjs path/to/article.md

# ヘッダー画像付き
node scripts/publish.mjs path/to/article.md --image path/to/header.jpg

# 即時公開
node scripts/publish.mjs path/to/article.md --publish --yes
```

### フロントマター

Markdownファイルの先頭にYAMLフロントマターで記事情報を指定できます：

```yaml
---
title: "記事タイトル"
tags:
  - AI
  - プログラミング
image: ./header.png    # ヘッダー画像の相対パス
publish: false         # true で即時公開
---
```

- `title`: 未指定の場合は本文の最初のh1見出しを使用
- `image`: `--image` オプションでも指定可能（CLIオプションが優先）

## テスト

```bash
# ユニットテスト
node --test tests/unit/

# コントラクトテスト（要.env）
node --test tests/contract/

# 全テスト
node --test tests/
```

## 技術スタック

- Node.js 18+（ESM）
- Playwright（ヘッドレスChromium）
- unified + remark-parse + remark-gfm + remark-html
- gray-matter
- node:test

## ライセンス

MIT
