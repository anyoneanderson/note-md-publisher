# note-md-publisher

> **⚠️ 注意**: 本ツールは note.com の**非公式API**を利用しています。note公式が提供・サポートするものではなく、APIの仕様は予告なく変更される可能性があります。ご利用にあたっては [noteご利用規約](https://terms.help-note.com/hc/ja/articles/44943817565465) を遵守し、規約に違反するような使い方（スパム投稿、大量自動投稿、不正アクセスなど）は絶対に行わないでください。本ツールの利用により生じた問題について、開発者は一切の責任を負いません。

Markdownファイルをnote.comに自動投稿・公開するエージェントスキル群(AgentSkills)です。

記事生成やアイキャッチ画像の生成に関しては、他にも優秀なプロンプト集や、カスタムスラッシュコマンドがあるようなので、記事の生成はそれらのライブラリ群にお任せする前提で、投稿・公開部分に特化したエージェントスキルを開発しました。

.env上に認証情報を登録していただくとPlaywrightでログインして、API用のセッション情報を取得して非公式の投稿APIを呼び出して投稿を行います。公開やハッシュタグの設定はPlaywrightブラウザ操作で自動化しています。

あくまでも非公式なのでnote側の仕様変更があれば動作しない可能性があることと、APIの送信制限や、IPレンジの制限などがnote側で実装されている可能性が高いので、自己責任で利用ください。

## 特徴

- Markdown → HTML変換してnote.com APIで下書き投稿
- フロントマター（YAML）でタイトル・タグ・画像を指定
- ヘッダー画像のアップロード対応
- Playwrightによる自動ログイン + Cookie永続化
- ブラウザ自動化によるハッシュタグ設定・記事公開
- 3つのスキル構成: note-draft（下書き）/ note-publish（公開）/ note-automation（一気通貫）

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

`npx skills add` でインストール済みであれば、エージェントに話しかけるだけで投稿・公開できます：

```
> noteに投稿して content/note/my-article.md
> この記事をnoteにアップして（画像: public/images/note/my-article.png）
> noteに記事を下書き保存して content/note/my-article.md
> 下書き記事を公開して n1a2b3c4d5e6 タグ: AI,プログラミング
```

3つのスキルが利用可能です：

| スキル | 用途 |
|--------|------|
| **note-draft** | Markdown → note.com下書き保存（API経由） |
| **note-publish** | 下書き記事のハッシュタグ設定 + 公開（ブラウザ操作） |
| **note-automation** | 上記2つを一気通貫で実行 |

### CLIから直接

```bash
# 下書き保存（デフォルト）
node scripts/publish.mjs path/to/article.md

# ヘッダー画像付き
node scripts/publish.mjs path/to/article.md --image path/to/header.jpg

# 下書き記事にタグを設定して公開
node scripts/note-publish.mjs <articleKey> --tags "AI,プログラミング" --publish --yes

# フロントマターからタグを読み取って公開
node scripts/note-publish.mjs <articleKey> --md path/to/article.md --publish --yes

# セレクタヘルスチェック（note.com UI変更の検知）
node scripts/inspect-editor.mjs <articleKey> --check
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
---
```

- `title`: 未指定の場合は本文の最初のh1見出しを使用
- `tags`: `note-publish.mjs --md` 指定時にハッシュタグとして設定される
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
