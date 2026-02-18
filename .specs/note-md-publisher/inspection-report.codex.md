# spec-inspect Report — note-md-publisher

## Inspection Summary

- Date: 2026-02-18
- Targets:
  - `.specs/note-md-publisher/requirement.md`
  - `.specs/note-md-publisher/design.md`
  - `.specs/note-md-publisher/tasks.md`
- Result Counts:
  - CRITICAL: 0
  - WARNING: 6
  - INFO: 3

## CRITICAL

None

## WARNING

### [WARNING-001] Requirement coverage: 9/20 (45%)
- File: `design.md:1`
- Description: requirement.md で定義された20件の要件IDのうち、design.md で参照されているのは9件（45%）です。未カバー: `ASM-001`, `ASM-002`, `ASM-003`, `CON-001`, `CON-002`, `CON-003`, `NFR-001`, `NFR-002`, `NFR-003`, `NFR-004`, `NFR-005`。
- Suggestion: design.md に非機能・制約・前提条件の反映先を追記し、各IDに対応する設計項目を明示してください。

### [WARNING-002] Required section 'Security Design' is missing
- File: `design.md:1`
- Description: design.md に必須セクション相当の「Security Design（セキュリティ設計）」がありません。
- Suggestion: 認証情報管理、Cookie保護、通信時の保護方針、エラーハンドリング時の秘匿情報マスキング方針を明記したセクションを追加してください。

### [WARNING-003] Required section 'Priority' is missing
- File: `tasks.md:1`
- Description: tasks.md に必須セクション相当の「Priority（優先度）」がありません。
- Suggestion: タスクに優先度（例: P0/P1/P2 または High/Medium/Low）を定義し、実装順の根拠を明確化してください。

### [WARNING-004] Contradiction: dependency policy
- File: `requirement.md:91`
- Description: requirement.md は「外部依存は Playwright のみ」と定義していますが、design.md と tasks.md では `gray-matter`, `unified`, `remark-parse`, `remark-html` など複数依存を前提にしています（`design.md:280`, `tasks.md:61`）。
- Suggestion: NFR-001 を現実の依存構成に合わせて更新するか、設計/タスク側の依存を見直して矛盾を解消してください。

### [WARNING-005] Design element 'CookieStore' has no clear task/module trace
- File: `design.md:8`
- Description: 要件トレーサビリティ表では REQ-002 を `CookieStore` に紐付けていますが、モジュール設計とタスクでは `AuthModule` 名義で実装されており、`CookieStore` という設計要素の追跡が曖昧です（`design.md:287`, `tasks.md:216`）。
- Suggestion: `CookieStore` を `AuthModule` の内部コンポーネントとして明記するか、名称を統一してください。

### [WARNING-006] API naming inconsistency
- File: `design.md:80`
- Description: 同一文脈のパスパラメータ命名が混在しています。`{article_id}` と `{id}` が併存し、URLテンプレートも `{username}` と `{user}` が混在しています（`design.md:154`, `design.md:394`, `design.md:563`）。
- Suggestion: パスパラメータ命名規約を1つに統一し、全セクションを同一表記へ揃えてください。

## INFO

### [INFO-001] Requirement IDs are unreferenced
- File: `requirement.md:94`
- Description: 以下の要件IDが design.md/tasks.md で未参照です: `NFR-002`, `NFR-003`, `CON-003`, `ASM-001`, `ASM-002`, `ASM-003`（行: `requirement.md:94`, `requirement.md:99`, `requirement.md:143`, `requirement.md:150`, `requirement.md:154`, `requirement.md:158`）。
- Suggestion: 必要な要件は設計/タスクへ紐付け、不要なら要件から削除を検討してください。

### [INFO-002] Naming convention inconsistency: `article_id` vs `articleId`
- File: `design.md:394`
- Description: 同じ概念（記事ID）に snake_case と camelCase が混在しています（`design.md:394`, `design.md:416`）。
- Suggestion: ドキュメント内命名規約を定義し、APIパラメータ名と内部変数名の使い分けルールを明文化してください。

### [INFO-003] Documentation update needed: `README.md`
- File: `/home/sunagakeita/zenchaine/note-md-publisher`
- Description: プロジェクトルートに README.md がなく、仕様で定義したインストール方法・実行方法・前提条件が利用者向け文書に反映されていません。
- Suggestion: `tasks.md` に以下の文書更新タスクを追加してください。

### Documentation Update Tasks (auto-detected)
- [ ] DOC-001: Add `README.md` with setup, environment variables, install command, and usage examples
