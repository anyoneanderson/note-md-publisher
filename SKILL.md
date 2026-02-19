---
name: note-md-publisher
description: Markdownファイルをnote.comに自動投稿するスキル
version: 0.1.0
license: MIT
---

# note-md-publisher

Markdownファイルとヘッダー画像を指定して、note.comに記事を自動投稿します。

## トリガー

日本語:
- 「noteに投稿して」
- 「note.comに記事を公開して」
- 「この記事をnoteにアップして」
- 「Markdownをnoteに投稿」

English:
- "Post to note.com"
- "Publish article to note"
- "Upload this article to note.com"

## 初回セットアップ

このスキルの初回実行時は、以下のセットアップが必要です。

### 1. 依存パッケージのインストール

```bash
cd $SKILL_DIR && npm install
```

### 2. Playwrightブラウザのインストール

```bash
npx playwright install --with-deps chromium
```

### 3. 環境変数の設定

`$SKILL_DIR/.env` ファイルを作成し、以下を設定してください：

```
NOTE_EMAIL=your-email@example.com
NOTE_PASSWORD=your-password
NOTE_USERNAME=your-note-username
```

NOTE_USERNAMEは、あなたのnote.comプロフィールURL（`https://note.com/USERNAME`）のUSERNAME部分です。

## 使い方

### 投稿前の確認フロー

投稿を実行する前に、以下の情報をAskUserQuestionで確認してください。
ユーザーが既にコマンドやメッセージで明示している項目はスキップしてOKです。

**確認項目（1回のAskUserQuestionでまとめて聞く）：**

1. **アイキャッチ画像**: 画像パスが `--image` やフロントマターの `image` で指定されていない場合
   - 選択肢: 「画像なしで投稿」「画像パスを指定する」
2. **公開ステータス**: `--publish` が指定されていない場合
   - 選択肢: 「下書き保存 (Recommended)」「即時公開」

```
例: AskUserQuestion
question: "投稿設定を確認します"
options:
  - header: "アイキャッチ画像"
    - "画像なしで投稿"
    - "画像パスを指定する"
  - header: "公開ステータス"
    - "下書き保存 (Recommended)"
    - "即時公開"
```

### 投稿コマンド

**基本（下書き保存）：**
```bash
cd $SKILL_DIR && node scripts/publish.mjs <path/to/article.md>
```

**ヘッダー画像付き：**
```bash
cd $SKILL_DIR && node scripts/publish.mjs <path/to/article.md> --image <path/to/header.jpg>
```

**即時公開：**
```bash
cd $SKILL_DIR && node scripts/publish.mjs <path/to/article.md> --publish --yes
```

### フロントマター

Markdownファイルのフロントマターで以下を指定できます：

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

- `title`: 記事タイトル（未指定の場合は本文のh1を使用）
- `tags`: タグ（配列）
- `image`: ヘッダー画像の相対パス
- `publish`: `true` で即時公開

## 出力

### 成功時

```
✓ 記事を下書き保存しました
  URL: https://note.com/username/n/n1a2b3c4d5e6
  ステータス: draft
  記事ID: 12345678
```

### 失敗時

```
✗ 記事の投稿に失敗しました
  エラー: 401 Unauthorized - Cookieが期限切れです
```

## トラブルシューティング

- **ログイン失敗**: NOTE_EMAIL と NOTE_PASSWORD が正しいか確認してください
- **Cookie期限切れ**: 自動的に再ログインを試みます。失敗する場合は `.env` の認証情報を確認してください
- **画像アップロード失敗**: JPEG, PNG, GIF のみ対応。10MB以下のファイルを使用してください
- **Playwright未インストール**: `npx playwright install --with-deps chromium` を実行してください
