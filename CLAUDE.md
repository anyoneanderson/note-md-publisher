# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Markdownファイルとヘッダー画像をnote.comに自動投稿するClaude Codeエージェントスキル。
note.comの非公式APIを使用し、MD→HTML変換 → 2ステップ投稿（作成→更新）を行う。
SKILL.md形式で提供し、`npx skills add` でインストール可能。

## Commands

```bash
# 依存関係インストール
npm install

# Playwrightブラウザインストール（初回のみ）
npx playwright install --with-deps chromium

# 記事投稿
node scripts/publish.mjs <path/to/article.md>
node scripts/publish.mjs <path> --image <path/to/header.jpg>
## ※ 記事は常に下書きとして保存されます（note.comに公開APIは存在しません）

# テスト
node --test tests/unit/              # ユニットテスト（常時実行可能）
node --test tests/contract/          # コントラクトテスト（要.env認証）
node --test tests/                   # 全テスト
```

## Architecture

```
note-md-publisher/
├── SKILL.md                    # スキル定義（エントリポイント）
├── scripts/
│   └── publish.mjs             # メインスクリプト（CLI引数パース → 投稿フロー実行）
├── lib/
│   ├── auth.mjs                # 認証（Playwrightログイン + Cookie管理）
│   ├── content-loader.mjs      # MD/MDX読込 + フロントマター解析
│   ├── markdown-converter.mjs  # MD→HTML変換（unified + remark-html）
│   ├── note-api.mjs            # note.com APIクライアント（2ステップ投稿）
│   └── image-uploader.mjs      # 画像アップロード（multipart/form-data）
├── tests/
│   ├── unit/                   # ユニットテスト（node:test）
│   ├── contract/               # コントラクトテスト（実API検証）
│   └── fixtures/               # テスト用サンプルデータ
├── .specs/note-md-publisher/   # 仕様書（requirement.md, design.md, tasks.md）
├── package.json
├── .env.example
└── .gitignore
```

## Key Patterns

- **モジュール形式**: ESM (.mjs)。`import`/`export` を使用、`require` は使わない
- **HTTPクライアント**: Node.js標準の `fetch` API（追加依存なし）
- **テストフレームワーク**: `node:test`（Node.js 18+標準搭載、追加依存なし）
- **2ステップ投稿**: `POST /api/v1/text_notes`（作成）→ `PUT /api/v1/text_notes/{article_id}`（更新）
- **本文形式**: note.com APIはHTML文字列を要求する（Markdownではない）
- **Cookie認証**: Playwright でログイン → Cookie取得 → HTTPヘッダーに付与
- **Cookie保存先**: `~/.config/note-md-publisher/cookies.json`（パーミッション 0600）

## note.com API（非公式）

| エンドポイント | 用途 |
|--------------|------|
| `POST /api/v1/text_notes` | 記事作成（id, key 取得）→ 201 |
| `POST /api/v1/text_notes/draft_save?id={id}` | 記事更新（body, eyecatch_image_src）→ 201 |
| `POST /api/v1/image_upload/note_eyecatch` | 画像アップロード（multipart, note_id必須）→ 201 |
| `GET /api/v2/creators/{username}` | Cookie有効性検証 |

**必須ヘッダー**: `X-Requested-With: XMLHttpRequest`（POST操作に必須）

詳細は `.specs/note-md-publisher/design.md` §3 を参照。

## Environment Variables

| 変数 | 用途 |
|------|------|
| NOTE_EMAIL | note.comのメールアドレス |
| NOTE_PASSWORD | note.comのパスワード |
| NOTE_USERNAME | note.comのユーザー名（Cookie検証用） |

## Branch Strategy

- **main**: 本番ブランチ。直接コミットしない
- **feature/\***: 機能開発ブランチ。`main` へPRを出す

## Specs

`.specs/note-md-publisher/` に仕様書がある:
- `requirement.md` — 機能要件（REQ-001〜009）、非機能要件（NFR-001〜005）
- `design.md` — API仕様、アーキテクチャ、モジュール設計、テスト戦略
- `tasks.md` — 16タスク / 3フェーズ（Phase 1: MVP, Phase 2: 認証+画像+テスト, Phase 3: スキル化）

## Constraints

- **非公式API依存**: note.comのAPIは予告なく仕様変更される可能性がある
- **レート制限**: 1分あたり10リクエスト以下、リクエスト間隔は最低1秒
- **画像形式**: JPEG, PNG, GIF（10MB以下）
- **追加依存の最小化**: Node.js 18+標準機能を優先し、外部依存は最小限に留める
