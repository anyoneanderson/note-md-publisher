# 要件定義書 - note-publish + note-automation（スキル拡張）

## 1. 概要

note-md-publisher リポジトリを3スキル構成に拡張する。

1. **note-draft**（既存 SKILL.md から移行）: API経由での下書き保存
2. **note-publish**（新規）: Playwrightによるハッシュタグ設定＋公開操作
3. **note-automation**（新規）: 上記スキルを統合制御するオーケストレーションスキル

将来的に原稿作成スキルやアイキャッチ画像生成スキルが追加された際にも、note-automation が一元的にパイプラインを制御する設計とする。

### 背景

- note.comの非公式APIでは**ハッシュタグの設定ができない**（2025-02-25 検証済み: `draft_save` に `hashtag_notes` / `tags` を含めても無視される）
- note.comの非公式APIでは**記事の公開操作もできない**（公開用APIエンドポイントが存在しない）
- 認証に既に Playwright を使用しているため、ブラウザ自動化の基盤は整っている

### 対象ユーザー

- note-md-publisher で記事を投稿しているClaude Codeユーザー
- ハッシュタグを付けてnote.comの検索・レコメンドに乗せたいユーザー
- 下書き → 公開のフローをClaude Code内で完結させたいユーザー

### 解決する課題

- APIで投稿した下書き記事にハッシュタグが付けられない
- 公開操作のためにnote.comのWeb UIを開く手間がある
- フロントマターで定義した `tags` が活用されていない

## 2. 機能要件

### スキル分割

[REQ-P001] skills/ ディレクトリによる3スキル構成
- `agent-skills` リポジトリと同じ構造で `skills/` ディレクトリを導入する
- 既存の `SKILL.md`（ルート）を `skills/note-draft/SKILL.md` に移行する
- 新規に `skills/note-publish/SKILL.md` を作成する
- 新規に `skills/note-automation/SKILL.md` を作成する
- note-draft, note-publish は独立して実行可能とする
- note-automation は他のスキルのスクリプトを順次呼び出すオーケストレーターとする

### ブラウザ自動化基盤

[REQ-P002] Playwright ブラウザコンテキストの構築
- `cookies.json` に保存済みの `rawCookies`（Playwright Cookie形式）を読み込む
- `browser.newContext()` → `context.addCookies(rawCookies)` でログイン状態を復元する
- Cookie が期限切れの場合は既存の `authenticate()` を呼び出して再取得する
- ブラウザは headless モードで動作する

[REQ-P003] 記事編集ページへのナビゲーション
- note.com の記事編集画面に遷移する
- 入力として以下のいずれかを受け付ける:
  - 記事URL（`https://note.com/{username}/n/{key}`）
  - 記事キー（`n1a2b3c4d5e6` 形式）
  - 記事ID（数値）
- 編集画面の読み込み完了を待機する

### ハッシュタグ設定

[REQ-P004] ハッシュタグの入力
- note.comの記事編集UIでハッシュタグ入力欄を特定し、タグを入力する
- 複数タグを順番に入力できる（各タグ入力後に確定操作）
- タグは以下のソースから取得する:
  - CLI引数 `--tags "タグ1,タグ2,タグ3"`
  - フロントマターの `tags` フィールド（MDファイルパス指定時）
- 既にタグが設定されている記事の場合、既存タグを保持したまま追加する

### 公開操作

[REQ-P005] 記事の公開
- `--publish` フラグ指定時、ハッシュタグ設定後に記事を公開状態にする
- `--publish` 未指定時はハッシュタグ設定のみ行い、下書き状態を維持する
- 公開前に確認プロンプト（AskUserQuestion）を表示する
- `--yes` フラグで確認をスキップできる

### 入力インターフェース

[REQ-P006] CLIインターフェース
- メインスクリプト: `node scripts/note-publish.mjs`
- 引数:
  - `<article>`: 記事URL、記事キー、または記事ID（必須）
  - `--tags "タグ1,タグ2"`: カンマ区切りのハッシュタグ（任意）
  - `--md <path>`: MDファイルパス。フロントマターからタグを読み取る（任意）
  - `--publish`: 公開する（任意。未指定時は下書き保存のまま）
  - `--yes`: 確認プロンプトをスキップ（任意）
  - `--help`: ヘルプ表示

[REQ-P007] SKILL.md（公開＋ハッシュタグスキル）
- `skills/note-publish/SKILL.md` としてスキル定義を作成する
- トリガーフレーズ（日英）を定義する
- 投稿スキルとの連携フロー（チェーン実行）を案内する
- AskUserQuestion でタグ・公開の確認を行う手順を定義する

### オーケストレーション

[REQ-P009] note-automation オーケストレーションスキル
- `skills/note-automation/SKILL.md` として作成する
- 各ステップを選択式で有効/無効にできるパイプラインを提供する
- 現在のパイプライン: `note-draft` → `note-publish`
- 将来の拡張パイプライン: `記事作成` → `画像生成` → `note-draft` → `note-publish`
- AskUserQuestion で以下を確認する:
  - 入力ファイルのパス（MDファイル）
  - 実行するステップの選択（スキップ可能）
  - ハッシュタグ（手動入力 or フロントマターから自動取得）
  - 公開するかどうか
- 各ステップの出力（articleKey 等）を次のステップに自動で引き渡す
- いずれかのステップが失敗した場合、エラーを報告し残りのステップを実行しない

[REQ-P010] パイプラインのステップ制御
- ステップの有効/無効を CLI オプションまたは AskUserQuestion で制御する
- `--skip-draft`: 下書き投稿をスキップ（既存の下書きに対してタグ設定＋公開のみ実行）
- `--skip-publish`: 公開をスキップ（下書き投稿＋タグ設定まで）
- `--draft-only`: 下書き投稿のみ実行（note-draft スキルと同等）
- 未指定時はフルパイプライン（note-draft → note-publish）を実行

### 既存スキルの整理

[REQ-P008] 原稿投稿スキル（SKILL.md）の移行と更新
- 既存のルート `SKILL.md` を `skills/note-draft/SKILL.md` に移行する
- ルートの `SKILL.md` は削除する（`skills/` 配下に一本化）
- `$SKILL_DIR` のパス変更に伴い、スクリプト実行パスを `$SKILL_DIR/../../scripts/publish.mjs` に修正する
- 完了メッセージに「`note-publish` スキルでハッシュタグ設定＋公開ができます」の案内を追加する
- フロントマターの `tags` フィールドの説明に、公開スキルとの連携を記載する

## 3. 非機能要件

[NFR-P001] 既存モジュールの再利用
- 認証（`lib/auth.mjs`）のCookie取得・検証ロジックを再利用する
- コンテンツ読み込み（`lib/content-loader.mjs`）のフロントマター解析を再利用する
- 新規モジュールは最小限とし、既存のアーキテクチャパターンに従う

[NFR-P002] ブラウザ自動化の信頼性
- note.com のUI要素はセレクタ変更のリスクがあるため、セレクタを定数として一元管理する
- 各操作ステップで要素の存在を確認し、見つからない場合は明確なエラーメッセージを返す
- 操作間の待機は `waitForSelector` による要素出現待機を基本とし、ネットワークアイドル状態の確認も併用する
- タイムアウト: 各操作ステップごとに30秒

[NFR-P003] テスト戦略
- ユニットテスト: CLI引数パース、タグ文字列のパース、入力バリデーション
- E2Eテスト（手動）: 実際のnote.comでのブラウザ操作確認（自動化は困難）
- セレクタの動作確認スクリプト: note.comのUIセレクタが有効か検証するヘルスチェック

## 4. 制約事項

[CON-P001] ブラウザ自動化への依存
- note.com のUI構造（HTML/CSS/セレクタ）変更により動作しなくなる可能性がある
- APIベースより動作が遅い（ブラウザ起動 + ページ描画のオーバーヘッド）
- headless モードでの動作を前提とする

[CON-P002] note.com エディタのUI依存
- ハッシュタグ入力のUIフロー（入力欄の位置、確定方法）はnote.comの実装に依存する
- 公開ボタンの位置・動作はnote.comの実装に依存する
- UI変更時はセレクタの更新が必要（保守コスト）

[CON-P003] 既存リポジトリ内での拡張
- 同一リポジトリ（note-md-publisher）内の `skills/` ディレクトリに3つのスキルを配置する
- `agent-skills` リポジトリと同じ `skills/{name}/SKILL.md` パターンに従う
- `package.json` の依存関係はリポジトリルートで共有する（Playwrightは既に導入済み）
- 各 SKILL.md から共有コードへのアクセスは `$SKILL_DIR/../../` でリポジトリルートを参照する

## 5. 前提条件

[ASM-P001] 既存環境
- note-md-publisher がセットアップ済みである（npm install, playwright install 完了）
- `.env` に認証情報が設定済みである
- Playwright の Chromium ブラウザがインストール済みである

[ASM-P002] 記事の状態
- 対象記事がnote.com上に下書きとして存在している
- 対象記事の所有者が認証ユーザーと同一である

[ASM-P003] UI調査の完了
- 実装前にnote.comのエディタUI（ハッシュタグ入力欄、公開ボタン等）のセレクタを事前調査する
- DevTools またはPlaywrightのデバッグモードで確認する

## 6. 用語集

| 用語 | 定義 |
|------|------|
| note-draft | 原稿投稿スキル。API経由で下書き保存を行う（既存 SKILL.md から移行） |
| note-publish | 公開＋ハッシュタグスキル。Playwrightでブラウザ操作を行う |
| note-automation | オーケストレーションスキル。パイプラインとして他のスキルを順次実行する |
| ハッシュタグ | note.com記事の下部に表示されるタグ。検索やレコメンドに影響する |
| rawCookies | Playwright形式のCookieオブジェクト配列。`cookies.json` に保存されている |
| パイプライン | 複数のスキルを順次実行するワークフロー。note-automation が制御する |
| セレクタ | Playwright で DOM 要素を特定するための CSS セレクタや role 指定 |
