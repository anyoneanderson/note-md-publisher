# AGENTS.md

このリポジトリで作業するサブエージェント向けのガイドライン。

## プロジェクト概要

note.comにMarkdown記事を自動投稿するClaude Codeエージェントスキル。
非公式API + 2ステップ投稿（POST作成 → PUT更新）。本文はHTML形式。

## 必須ルール

- **モジュール形式**: ESM (.mjs) のみ。`import`/`export` を使用、`require()` は禁止
- **HTTPクライアント**: Node.js標準の `fetch` を使用。axios等の追加依存は入れない
- **テスト**: `node:test` を使用。jest/vitest等は入れない
- **認証情報**: `.env` でのみ管理。コードにハードコードしない
- **レート制限**: note.com APIへのリクエスト間隔は最低1秒。1分10リクエスト以下
- **エラーハンドリング**: リトライは最大3回、エクスポネンシャルバックオフ
- **Cookie保存**: `~/.config/note-md-publisher/cookies.json`、パーミッション `0600`

## ディレクトリ構造

```
lib/                            # コアモジュール（各ファイルが単一責任）
├── auth.mjs                    # Playwright認証 + Cookie永続化
├── content-loader.mjs          # ファイル読込 + gray-matter解析
├── markdown-converter.mjs      # MD→HTML変換（unified + remark-html）
├── note-api.mjs                # note.com API（2ステップ投稿）
└── image-uploader.mjs          # 画像アップロード（multipart）

scripts/publish.mjs             # メインスクリプト（CLI引数 → モジュール呼出）

tests/
├── unit/                       # ユニットテスト（外部依存なし、常時実行可能）
├── contract/                   # コントラクトテスト（実API、要.env）
└── fixtures/                   # テスト用サンプルデータ
```

## note.com API要点

| 操作 | エンドポイント | ポイント |
|------|--------------|---------|
| 記事作成 | `POST /api/v1/text_notes` | `{ body, name, template_key: null }` → `data.id`, `data.key` |
| 記事更新 | `PUT /api/v1/text_notes/{article_id}` | `{ body, name, status, eyecatch_image_key }` |
| 画像UP | `POST /api/v1/upload_image` | multipart/form-data → `data.key`, `data.url` |
| Cookie検証 | `GET /api/v2/creators/{username}` | 200=有効、401=期限切れ |

- ベースURL: `https://note.com/api`
- 本文の `body` は **HTML文字列**（Markdownではない）
- 共通ヘッダー: `Content-Type: application/json`, `Cookie: ...`, `User-Agent: Mozilla/5.0 ...`

## テスト

```bash
node --test tests/unit/          # ユニットテスト
node --test tests/contract/      # コントラクトテスト（要.env）
```

- ユニットテスト: MarkdownConverter, ContentLoader の入出力検証
- コントラクトテスト: 実APIのレスポンス構造検証（仕様変更の早期検知）
- コントラクトテストで作成した記事はDELETE APIが利用可能であれば削除してクリーンアップする（DELETE APIの存在はT002で確認）
- `.env` 未設定時はコントラクトテストをスキップ（エラーにしない）

## 仕様書

`.specs/note-md-publisher/` に詳細仕様:
- `requirement.md` — 要件定義（REQ/NFR/CON/ASM）
- `design.md` — API仕様、モジュール設計、データフロー
- `tasks.md` — 実装タスク（T001〜T016、3フェーズ）
