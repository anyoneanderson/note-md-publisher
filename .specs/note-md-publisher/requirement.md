# 要件定義書 - note-md-publisher

## 1. 概要

Markdownファイルとヘッダー画像を指定し、note.comに記事を自動投稿するエージェントスキル。
note.comの非公式APIを使用し、MarkdownをHTMLに変換して2ステップで投稿する。
デフォルトでは下書き保存、`--publish` フラグで即時公開にも対応する。

SKILL.md形式で提供し、`npx skills add` で単独リポジトリからインストール可能。
Claude Code利用者が最小限のセットアップで使えることを重視する。

### 対象ユーザー

- note.comで記事を公開しているClaude Codeユーザー
- 複数プラットフォームへの記事配信を自動化したいユーザー
- ZenchainWebのようなMDベースのコンテンツ管理と連携したいユーザー

### 解決する課題

- note.comへの記事投稿が手動コピペで手間がかかる
- Markdown → note.com形式への手動変換が必要
- 画像のアップロードと記事への紐付けが煩雑

## 2. 機能要件

### 認証・セッション管理

[REQ-001] note.comログインとCookie取得
- Playwright（ヘッドレスモード）でnote.comにログインし、セッションCookieを取得する
- ログイン情報（メールアドレス・パスワード）は `.env` ファイルから読み込む
- ヘッドレスモードで動作し、GUIなし環境（Ubuntu Server等）でも動作する

[REQ-002] Cookie永続化
- 取得したCookieをローカルファイルに保存する（例: `~/.config/note-md-publisher/cookies.json`）
- 次回実行時はファイルから読み込み、有効期限内なら再ログインをスキップする
- Cookie無効時は自動的に再ログインを試行する

### 記事投稿

[REQ-003] Markdown/MDXファイルの読み込み
- 指定されたパスからMD/MDXファイルを読み込む
- フロントマター（YAML）からタイトル、タグ等のメタ情報を抽出する
- MDX固有のコンポーネント記法はフォールバック変換する（無視またはプレーンテキスト化）

[REQ-004] Markdown → HTML変換
- Markdownをnote.com APIが受け付けるHTML文字列に変換する
- note.com APIの`body`フィールドはHTML形式を要求する（Markdownではない）
- 対応要素: 見出し（h1-h3）、段落、リスト（箇条書き・番号付き）、コードブロック、引用、リンク、太字・斜体
- note.comがサポートしない要素は最も近い形式にフォールバックする
- MDX固有要素（import文、JSXコンポーネント）はフィルタして除外する

[REQ-005] 記事の下書き保存（2ステップ投稿）
- デフォルト動作として、記事を下書き状態でnote.comに保存する
- 投稿は2ステップで行う:
  1. `POST /api/v1/text_notes` で記事を作成し、IDとキーを取得
  2. `PUT /api/v1/text_notes/{id}` で本文・ステータス・画像を更新
- 保存成功時、note.com上の記事URL（`https://note.com/{username}/n/{key}`）を返す

[REQ-006] 記事の即時公開オプション
- `--publish` フラグ指定時、下書きではなく公開状態で投稿する
- 公開前に確認プロンプト（AskUserQuestion）を表示する
- 確認なしで公開する `--yes` フラグも提供する

### 画像処理

[REQ-007] ヘッダー画像のアップロード
- 指定されたパスから画像ファイルを読み込む
- note.comの画像アップロードAPIで画像をアップロードする
- アップロードされた画像を記事のヘッダー画像（アイキャッチ）として設定する
- 対応形式: JPEG, PNG, GIF

### 入力インターフェース

[REQ-008] パス指定による汎用的な入力
- 記事ファイルのパスと画像ファイルのパスを個別に指定できる
- 例: `/post path/to/article.md --image path/to/header.jpg`
- ディレクトリを指定した場合、そのディレクトリ内のMDファイルと画像を自動検出する
- パスは絶対パス・相対パスの両方に対応する

[REQ-009] フロントマターによるメタ情報指定
- MDファイルのフロントマター（YAML）から以下を読み取る:
  - `title`: 記事タイトル（必須。未指定の場合はファイル内の最初のh1）
  - `tags`: タグ（配列）
  - `image`: ヘッダー画像の相対パス（`--image` オプションの代替）
  - `publish`: 公開状態（boolean、`--publish` フラグの代替）

## 3. 非機能要件

[NFR-001] ポータビリティ
- Node.js（v18以上）のみを前提とする（Claude Codeユーザーに確実に存在）
- 外部依存は最小限とする（Playwright, gray-matter, unified, remark-parse, remark-html）。Playwrightは初回に `npx playwright install --with-deps chromium` でセットアップ
- macOS, Linux, Windows（WSL含む）で動作する

[NFR-002] セキュリティ
- 認証情報（メール・パスワード）は `.env` ファイルでのみ管理し、コードにハードコードしない
- Cookieファイルのパーミッションは `600`（所有者のみ読み書き可）に設定する
- `.env` および Cookie ファイルは `.gitignore` に含める

[NFR-003] エラーハンドリング
- API通信失敗時はリトライ（最大3回、エクスポネンシャルバックオフ）する
- ログイン失敗時は明確なエラーメッセージ（認証情報の確認を促す）を表示する
- Cookie期限切れは自動検出し、再ログインする

[NFR-004] 非公式API依存のリスク管理
- APIの仕様変更で動作しなくなるリスクを認識する
- APIレスポンスの検証を行い、想定外のレスポンスには明確なエラーを返す
- サーバー負荷軽減のため、連続投稿時には適切な間隔（最低1秒）を空ける
- レート制限: 1分あたり10リクエスト以下を目安とする

[NFR-005] テスト戦略
- テストフレームワーク: `node:test`（Node.js 18+標準搭載、追加依存なし）
- テストは以下の2層で構成する:

  **ユニットテスト**（`tests/unit/`）
  - 外部依存なしで常時実行可能なテスト
  - 対象: MarkdownConverter（MD→HTML変換ロジック）、ContentLoader（フロントマター解析）
  - フィクスチャファイル（`tests/fixtures/`）を用いた入出力検証
  - `node --test tests/unit/` で実行

  **コントラクトテスト**（`tests/contract/`）
  - note.com非公式APIの仕様変更を早期検知するテスト
  - 実際のnote.com APIに対してリクエストを送信し、レスポンス構造を検証する
  - 対象エンドポイント:
    - `GET /api/v2/creators/{username}` — レスポンスに `data.id` 等の期待フィールドが存在するか
    - `POST /api/v1/text_notes` — 記事作成後に `data.id`, `data.key` が返るか
    - `POST /api/v1/upload_image` — `data.key`, `data.url` が返るか
  - テスト後に作成した記事は削除してクリーンアップする
  - 実行条件: `.env` に有効な認証情報が必要
  - `node --test tests/contract/` で実行

## 4. 制約事項

[CON-001] 非公式API依存
- note.comの公式APIは存在しないため、非公式APIを使用する
- APIの仕様はnote.comにより予告なく変更される可能性がある
- 利用規約に反しない範囲（個人利用、適切な頻度）で使用する

[CON-002] 配布形態
- 単独リポジトリ（anyoneanderson/note-md-publisher）として配布する
- `npx skills add anyoneanderson/note-md-publisher -g -y` でインストール可能にする
- SKILL.md形式に準拠する

[CON-003] note.com固有の制約
- note.comがサポートするフォーマット（見出し、リスト、コードブロック等）に限定される
- 記事の文字数上限はnote.comの仕様に従う
- 画像ファイルサイズの上限はnote.comの仕様に従う

## 5. 前提条件

[ASM-001] 実行環境
- ユーザーのマシンにNode.js v18以上がインストールされている
- `npx playwright install` でChromiumがインストール可能である

[ASM-002] note.comアカウント
- ユーザーがnote.comのアカウントを持っている
- メールアドレス+パスワードでのログインが可能である（ソーシャルログインのみのアカウントは非対応）

[ASM-003] 環境設定
- `.env` ファイルに以下が設定されている:
  - `NOTE_EMAIL`: note.comのメールアドレス
  - `NOTE_PASSWORD`: note.comのパスワード
  - `NOTE_USERNAME`: note.comのユーザー名（Cookie有効性検証用）

## 6. 用語集

| 用語 | 定義 |
|------|------|
| note.com | 日本のブログ/コンテンツプラットフォーム |
| 非公式API | note.comが公式に公開していない内部APIエンドポイント |
| SKILL.md | エージェントスキルの定義ファイル。skills.sh の仕様に準拠 |
| フロントマター | MDファイル先頭のYAMLメタデータ（`---`で囲まれた部分） |
| Cookie永続化 | ブラウザセッションのCookieをファイルに保存し、再利用する仕組み |
| ヘッダー画像 | 記事のアイキャッチ画像。記事一覧やSNSシェア時に表示される |
| MDX | JSXを含むMarkdown拡張形式 |
| コントラクトテスト | 外部APIのレスポンス構造が期待通りかを検証するテスト。API仕様変更の早期検知が目的 |
| node:test | Node.js 18+に標準搭載されたテストランナー。追加依存なしでテスト実行可能 |
