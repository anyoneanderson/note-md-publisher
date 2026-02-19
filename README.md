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

## 使い方

### 下書き保存

```bash
node scripts/publish.mjs path/to/article.md
```

### ヘッダー画像付き

```bash
node scripts/publish.mjs path/to/article.md --image path/to/header.jpg
```

### 即時公開

```bash
node scripts/publish.mjs path/to/article.md --publish --yes
```

### フロントマター

```yaml
---
title: "記事タイトル"
tags:
  - AI
  - プログラミング
image: ./header.png
publish: false
---
```

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
