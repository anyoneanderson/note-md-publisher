# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Markdownファイルをnote.comに自動投稿・公開するClaude Codeエージェントスキル群。
3つのスキル（note-draft / note-publish / note-automation）で構成される。
- **note-draft**: 非公式API経由でMD→HTML変換 → 下書き保存
- **note-publish**: Playwrightブラウザ操作でハッシュタグ設定 → 公開
- **note-automation**: 上記2つを組み合わせた一気通貫パイプライン

## Commands

```bash
# 依存関係インストール
npm install

# Playwrightブラウザインストール（初回のみ）
npx playwright install --with-deps chromium

# 記事投稿（下書き保存）
node scripts/publish.mjs <path/to/article.md>
node scripts/publish.mjs <path> --image <path/to/header.jpg>

# ハッシュタグ設定 + 公開（ブラウザ操作）
node scripts/note-publish.mjs <article> --tags "AI,プログラミング" --publish --yes
node scripts/note-publish.mjs <article> --md <path> --publish --yes

# セレクタヘルスチェック
node scripts/inspect-editor.mjs <articleKey> --check

# テスト
node --test tests/unit/              # ユニットテスト（常時実行可能）
node --test tests/contract/          # コントラクトテスト（要.env認証）
```

## Architecture

```
note-md-publisher/
├── skills/                         # スキル定義ディレクトリ
│   ├── note-draft/SKILL.md         # 下書き投稿スキル（旧ルートSKILL.md）
│   ├── note-publish/SKILL.md       # ハッシュタグ設定＋公開スキル
│   └── note-automation/SKILL.md    # オーケストレーションスキル
├── scripts/
│   ├── publish.mjs                 # 下書き投稿スクリプト（note-draft用）
│   ├── note-publish.mjs            # 公開＋タグ設定スクリプト（note-publish用）
│   └── inspect-editor.mjs          # UI調査＋セレクタヘルスチェック
├── lib/
│   ├── auth.mjs                    # 認証（Playwrightログイン + Cookie管理）
│   ├── content-loader.mjs          # MD/MDX読込 + フロントマター解析
│   ├── markdown-converter.mjs      # MD→HTML変換（unified + remark-html）
│   ├── note-api.mjs                # note.com APIクライアント（2ステップ投稿）
│   ├── image-uploader.mjs          # 画像アップロード（multipart/form-data）
│   ├── browser.mjs                 # ブラウザコンテキスト管理（note-publish用）
│   ├── hashtag.mjs                 # ハッシュタグ操作（note-publish用）
│   ├── publish-action.mjs          # 公開操作（note-publish用）
│   └── selectors.mjs               # UIセレクタ定数（note-publish用）
├── tests/
│   ├── unit/                       # ユニットテスト（node:test）
│   ├── contract/                   # コントラクトテスト（実API検証）
│   └── fixtures/                   # テスト用サンプルデータ
├── .specs/
│   ├── note-md-publisher/          # 既存仕様書
│   └── note-publish/               # note-publish拡張仕様書
├── package.json
├── .env.example
└── .gitignore
```

## Key Patterns

- **モジュール形式**: ESM (.mjs)。`import`/`export` を使用、`require` は使わない
- **HTTPクライアント**: Node.js標準の `fetch` API（追加依存なし）
- **テストフレームワーク**: `node:test`（Node.js 18+標準搭載、追加依存なし）
- **2ステップ投稿**: `POST /api/v1/text_notes`（作成）→ `POST /api/v1/text_notes/draft_save`（更新）
- **本文形式**: note.com APIはHTML文字列を要求する（Markdownではない）
- **Cookie認証**: Playwright でログイン → Cookie取得 → HTTPヘッダーに付与
- **Cookie保存先**: `~/.config/note-md-publisher/cookies.json`（パーミッション 0600）
- **ブラウザ操作**: note-publish用。Playwright role-basedロケータ（`page.getByRole()`）でエディタ/公開ページのUI要素を操作
- **エディタURL**: `editor.note.com`（エディタ: `/notes/{key}/edit/`、公開設定: `/notes/{key}/publish/`）
- **セレクタ一元管理**: `lib/selectors.mjs` でnote.comのUIセレクタをrole-based形式で一元管理。UI変更時はこのファイルのみ修正
- **タグの保存制約**: ハッシュタグは「投稿する」（公開）時のみ保存される。下書き保存ではタグは保存されない

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

## Development Workflow

開発フロー（Issue → 実装 → PR）は以下のファイルに従ってください:
- [docs/issue-to-pr-workflow.md](docs/issue-to-pr-workflow.md) — spec-workflow-init で生成された開発ワークフロー

## コーディングルール

実装時のコーディングルールは以下のファイルに従ってください:
- [docs/coding-rules.md](docs/coding-rules.md) — spec-rules-init で生成された品質ルール集

## Constraints

- **非公式API依存**: note.comのAPIは予告なく仕様変更される可能性がある
- **レート制限**: 1分あたり10リクエスト以下、リクエスト間隔は最低1秒
- **画像形式**: JPEG, PNG, GIF（10MB以下）
- **追加依存の最小化**: Node.js 18+標準機能を優先し、外部依存は最小限に留める
