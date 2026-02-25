# コーディングルール

> spec-rules-init により自動生成。
> 出典: CLAUDE.md, AGENTS.md, コードベース分析
> 生成日時: 2026-02-25

## テスト基準

### [MUST] テストフレームワーク
- すべてのテストに `node:test` を使用すること
- jest / vitest 等の外部テストフレームワークは使用しない
- 出典: CLAUDE.md, AGENTS.md

### [MUST] テスト構成
- ユニットテスト: `tests/unit/` に配置（外部依存なし、常時実行可能）
- コントラクトテスト: `tests/contract/` に配置（実API検証、要 `.env`）
- テスト用サンプルデータ: `tests/fixtures/` に配置
- 出典: AGENTS.md

### [MUST] コントラクトテストのスキップ
- `.env` 未設定時はコントラクトテストをスキップする（エラーにしない）
- コントラクトテストで作成した記事は可能な限り削除してクリーンアップする
- 出典: AGENTS.md

### [SHOULD] テスト命名規則
- `describe` / `it` の説明は日本語で振る舞いを記述する
- パターン: `describe('モジュール名', () => { it('期待される振る舞い', ...) })`
- 出典: コードベース分析（tests/unit/*.test.mjs）

### [SHOULD] テストカバレッジ
- 正常系、エラーケース、エッジケースをカバーする
- エッジケース例: 空文字列、空配列、存在しないパス

## コード品質

### [MUST] モジュール形式
- ESM (.mjs) のみ使用する。`import` / `export` を使用し、`require()` は禁止
- 出典: CLAUDE.md, AGENTS.md

### [MUST] HTTPクライアント
- Node.js 標準の `fetch` API を使用する。axios 等の追加依存は入れない
- 出典: CLAUDE.md, AGENTS.md

### [MUST] 追加依存の最小化
- Node.js 18+ 標準機能を優先し、外部依存は最小限に留める
- 新しい npm パッケージの追加は慎重に検討すること
- 出典: CLAUDE.md

### [MUST] 命名規則
- ファイル名: kebab-case（例: `content-loader.mjs`, `note-api.mjs`）
- 関数名: camelCase（例: `loadContent`, `buildHeaders`）
- 定数: UPPER_SNAKE_CASE（例: `BASE_URL`, `MAX_RETRIES`）
- 出典: コードベース分析（100% kebab-case ファイル名）

### [SHOULD] import形式
- 相対パス (`../lib/`, `../../lib/`) を使用する
- パスエイリアス (`@/`) は使用しない
- 出典: コードベース分析

### [SHOULD] export形式
- named export を使用する。default export は使用しない
- 出典: コードベース分析（全モジュールが named export）

### [SHOULD] 定数の定義
- マジックナンバーや固定文字列はモジュール先頭で名前付き定数として定義する
- 例: `const MIN_REQUEST_INTERVAL_MS = 1000;`, `const MAX_RETRIES = 3;`
- 出典: コードベース分析（lib/note-api.mjs, lib/image-uploader.mjs）

### [SHOULD] 単一責任の原則
- 各ファイル（モジュール）は単一の責任を持つ
- lib/ 配下の各ファイルが独立した機能を担当する構造に従う
- 出典: AGENTS.md（「各ファイルが単一責任」）

### [SHOULD] 不要コードの排除
- `console.log`（デバッグ用）、コメントアウトされたコード、デッドコードをコミットしない
- ユーザー向けの `console.log`（進捗表示等）は許可

## エラーハンドリング

### [MUST] リトライポリシー
- API リクエストのリトライは最大3回、エクスポネンシャルバックオフで実施する
- リトライ対象: ネットワークエラー、429、5xx
- 非リトライ対象: 4xx（429を除く）は即座にエラーをスロー
- 出典: AGENTS.md, lib/note-api.mjs

### [MUST] レート制限
- note.com API へのリクエスト間隔は最低1秒
- 1分あたり10リクエスト以下
- 出典: CLAUDE.md, AGENTS.md

### [SHOULD] エラーメッセージ
- エラーメッセージは日本語で記述する
- エラーコンテキスト（操作名、原因）を含める
- 例: `Cookieが期限切れです。再認証してください`
- 出典: コードベース分析

### [SHOULD] エッジケースの考慮
- null / undefined、空文字列、空配列の場合を考慮する
- ファイルが存在しない場合の適切なエラーメッセージ

## ドキュメント

### [SHOULD] JSDoc
- パブリック関数には JSDoc を記述する
- `@param`, `@returns`, `@throws` を含める
- JSDoc の説明は英語で記述する
- 出典: コードベース分析（lib/ 全モジュール）

### [SHOULD] モジュールヘッダーコメント
- 各モジュールの先頭に `@module` タグ付きの説明コメントを記述する
- 出典: コードベース分析（lib/note-api.mjs）

## セキュリティ

### [MUST] 認証情報の管理
- 認証情報（メール、パスワード、Cookie）は `.env` ファイルでのみ管理する
- コードにハードコードしない
- 出典: AGENTS.md

### [MUST] Cookie保存のセキュリティ
- Cookie は `~/.config/note-md-publisher/cookies.json` に保存する
- ファイルパーミッションは `0600` を設定する
- 出典: CLAUDE.md, AGENTS.md

### [SHOULD] リソースの解放
- Playwright ブラウザインスタンスは `finally` ブロックで確実に `close()` する
- ファイルハンドル、ストリーム等も適切に解放する
- 出典: コードベース分析（lib/auth.mjs）

## Git

### [MUST] ブランチ戦略
- 常に feature ブランチで作業し、`main` に直接コミットしない
- ブランチ命名: `feature/{issue}-{slug}`
- 出典: CLAUDE.md

### [MUST] コミットメッセージ形式
- 形式: Conventional Commits（英語 prefix + 日本語本文）
- 例: `feat: 画像アップロード機能を追加`, `fix: Cookie有効期限チェックを修正`
- prefix: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`

### [SHOULD] アトミックコミット
- 各コミットは1つの論理的な変更を表すこと

## 共有ユーティリティ

### [SHOULD] 既存モジュールの活用
- 認証処理: `lib/auth.mjs` の `authenticate()` を使用する
- コンテンツ読込: `lib/content-loader.mjs` の `loadContent()` を使用する
- MD→HTML変換: `lib/markdown-converter.mjs` の `convert()` を使用する
- API通信: `lib/note-api.mjs` の `createArticle()` / `updateArticle()` / `postArticle()` を使用する
- 画像アップロード: `lib/image-uploader.mjs` の `uploadImage()` を使用する

### [SHOULD] 外部ライブラリの使い分け
- フロントマター解析: `gray-matter` を使用する
- Markdown パース: `unified` + `remark-parse` + `remark-gfm` + `remark-html` を使用する
- ブラウザ操作: `playwright` を使用する

---

## 出典

| ファイル | 抽出ルール数 |
|---------|-------------|
| CLAUDE.md | 7 |
| AGENTS.md | 8 |
| コードベース分析 | 10 |

---

> このコーディングルールは spec-rules-init で生成されました。プロジェクトの成長に合わせて更新してください。
