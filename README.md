# note-md-publisher

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
- unified + remark-parse + remark-html
- gray-matter
- node:test

## ライセンス

MIT
