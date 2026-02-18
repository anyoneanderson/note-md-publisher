# spec-inspect Report — note-md-publisher（第2回）

## 検査概要

| 項目 | 値 |
|------|-----|
| 検査日 | 2026-02-18（第2回） |
| 対象ファイル | requirement.md, design.md, tasks.md, CLAUDE.md, AGENTS.md |
| 検査チェック数 | 15 |
| 前回からの修正 | 10件（修正A〜J） |

### 結果サマリー

| 重要度 | 件数 | 前回比 |
|--------|------|--------|
| 🔴 CRITICAL | 0 | -2 |
| 🟡 WARNING | 3 | -11 |
| 🔵 INFO | 12 | -7 |

### 前回からの改善

| 前回の問題 | 状態 |
|-----------|------|
| CRITICAL-1: NFR-002のトレーサビリティ欠落 | ✅ 解決（T001, T008にNFR-002追加） |
| CRITICAL-2: NFR-003のトレーサビリティ欠落 | ✅ 解決（T004, T008にNFR-003追加） |
| WARNING-2: トレーサビリティマトリックス不完全 | ✅ 解決（NFR/CON/ASM全12行追加） |
| WARNING-3: セキュリティ設計セクション欠落 | ✅ 解決（§10新設） |
| WARNING-4: CookieStore→AuthModule | ✅ 解決 |
| WARNING-5: T008 §5.2→§7.2 | ✅ 解決 |
| WARNING-6: remark→remark-parse | ✅ 解決 |
| WARNING-7/10: T011依存にT016追加 | ✅ 解決 |
| WARNING-8: 命名規則不統一 | ✅ 解決（§11命名規約新設） |
| WARNING-9: エラーハンドリングのタスク不在 | ✅ 軽減（NFR-003をT004, T008に紐付け） |
| WARNING-11/12: DELETE API未文書化 | ✅ 軽減（T002に調査タスク追加） |
| WARNING-14: AGENTS.mdクリーンアップルール | ✅ 解決（条件付きルールに変更） |
| codex WARNING-003: 優先度セクション欠落 | ✅ 解決（優先度マッピング追加） |
| codex WARNING-004: NFR-001依存矛盾 | ✅ 解決（実際の依存一覧に修正） |

---

## 🔴 CRITICAL

なし

---

## 🟡 WARNING

### [WARNING-1] CLAUDE.mdとAGENTS.mdのAPIパスパラメータが§11命名規約と不一致

- **ファイル**: CLAUDE.md:60,70 / AGENTS.md:43
- **詳細**: design.md §11で「URLパスパラメータは`{article_id}`を使用」と規定されたが、CLAUDE.md（60行: `PUT /api/v1/text_notes/{id}`、70行: `PUT /api/v1/text_notes/{id}`）とAGENTS.md（43行: `PUT /api/v1/text_notes/{id}`）は旧表記`{id}`のまま。requirement.md 56行も同様。
- **提案**: CLAUDE.md、AGENTS.mdのAPIテーブルを`{article_id}`に更新する。requirement.mdは要件レベルのため`{id}`でも許容可能だが、統一するのが望ましい。

### [WARNING-2] design.md §6 NoteAPIClient疑似コードのURL内パスパラメータがcamelCase

- **ファイル**: design.md:405
- **詳細**: §6の疑似コードで`PUT https://note.com/api/v1/text_notes/{articleId}`と記載。§11の命名規約ではURLパスパラメータは`{article_id}`（snake_case）と規定しており矛盾する。疑似コードの意図はJavaScript変数`articleId`の値をURLに埋め込むことだが、URLテンプレートとしてはAPI規約に合わせるべき。
- **提案**: `{articleId}`を`{article_id}`に修正し、コメントで「※ JavaScript変数 articleId の値を使用」と補足する。

### [WARNING-3] design.md §7.1 package.json依存コメントにremark-parseが欠落

- **ファイル**: design.md:511
- **詳細**: §7.1ファイル構造のpackage.jsonコメントが「依存関係（playwright, gray-matter, unified, remark-html）」で、remark-parseが漏れている。§5技術スタックは修正済み（unified + remark-parse + remark-html）。
- **提案**: `remark-html`を`remark-parse, remark-html`に修正する。

---

## 🔵 INFO

### [INFO-1] PostParamsのtagsフィールドがAPIで使用されない可能性

- **ファイル**: design.md:419
- **詳細**: PostParams型にtags: string[]があるが、§3のAPI仕様ではPOST/PUTリクエストにtagsフィールドが記載されていない。
- **提案**: note.com APIがtagsをサポートするか確認し、未サポートならPostParamsからtagsを除外するか、将来の拡張用としてコメントを追記する。

### [INFO-2] 「目安とする」が曖昧な表現

- **ファイル**: requirement.md:108
- **詳細**: NFR-004の「1分あたり10リクエスト以下を目安とする」で「目安」がハードリミットかソフトガイドラインか不明確。
- **提案**: 「目安とする」を「制限する」に変更して確定的な表現にする。

### [INFO-3] 「適切な頻度」が曖昧な表現

- **ファイル**: requirement.md:136
- **詳細**: CON-001の「適切な頻度」がNFR-004の具体的数値と相互参照されていない。
- **提案**: 「適切な頻度（NFR-004参照: 最低1秒間隔、1分10リクエスト以下）」とクロスリファレンスを追加する。

### [INFO-4] 「最も近い形式にフォールバック」が曖昧な表現

- **ファイル**: requirement.md:49
- **詳細**: REQ-004の「note.comがサポートしない要素は最も近い形式にフォールバックする」が主観的。テーブル、取り消し線、脚注等のフォールバック先が未定義。
- **提案**: 主要な非対応要素（table, strikethrough, footnote等）のフォールバック方法を明記する。

### [INFO-5] CON-003を参照するタスクがない

- **ファイル**: tasks.md
- **詳細**: CON-003（note.com固有の制約: フォーマット制限、文字数上限、画像サイズ上限）が明示的にタスクIDとして参照されていない。T003とT009が実質的にカバーしているが、トレーサビリティが不完全。
- **提案**: T003とT009の要件IDにCON-003を追加することを検討する。

### [INFO-6] 本文内インライン画像のスコープ外が未明記

- **ファイル**: requirement.md
- **詳細**: REQ-007はヘッダー画像のみ。本文中の`![alt](image.png)`はdesign.mdで「スキップ」だが、requirement.mdにスコープ外として明記されていない。
- **提案**: 本文内画像がv1ではスコープ外であることをrequirement.mdに明記する。

### [INFO-7] 重複記事の検出要件がない

- **ファイル**: requirement.md
- **詳細**: 同じMDファイルを2回実行すると2つの記事が作成される。冪等性や重複検出の要件がない。
- **提案**: この動作をrequirement.mdに「既知の制限」として明記する。

### [INFO-8] 疑似コードにTypeScript型注釈が使用されている

- **ファイル**: design.md:302-336
- **詳細**: §6の疑似コードがTypeScript型注釈を使用。プロジェクトはESM JavaScript。
- **提案**: §6冒頭に「型注釈はドキュメント目的であり、実装はプレーンJavaScript」と注記する。

### [INFO-9] Playwrightログインの2FA/CAPTCHA制限が未明記

- **ファイル**: requirement.md:29-31
- **詳細**: REQ-001は標準のメール/パスワードログインを前提。tasks.mdリスク表では「監視中」だがrequirement.md自体に制限事項として記載されていない。
- **提案**: REQ-001に2FA/CAPTCHAの既知制限と手動Cookieフォールバックへの言及を追加する。

### [INFO-10] ログ/可観測性の要件が未定義

- **ファイル**: requirement.md
- **詳細**: エラーハンドリング（NFR-003）は定義されているが、デバッグログの要件がない。
- **提案**: 将来的に--verboseフラグによるデバッグログ出力を検討する。

### [INFO-11] design.md §7.1に.specs/ディレクトリが不在

- **ファイル**: design.md:496-515
- **詳細**: CLAUDE.mdには`.specs/note-md-publisher/`が含まれるがdesign.md §7.1にはない。
- **提案**: §7.1は配布ファイルのみとして明記するか、.specs/を追加する。

### [INFO-12] CLIの引数パースにutil.parseArgsが利用可能

- **ファイル**: design.md:462-469
- **詳細**: publish.mjsのCLI引数パースが手動設計。Node.js 18+にはutil.parseArgsが標準搭載。
- **提案**: 外部依存なしでutil.parseArgs（Node.js 18.3+）の使用を検討する。
