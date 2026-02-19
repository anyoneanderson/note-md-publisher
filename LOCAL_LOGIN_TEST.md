# Playwright ログイン検証 — ローカルマシン引き継ぎ

## 背景

GCP インスタンス上で Playwright による note.com ログインが全パターンで失敗した。
エラーメッセージは常に「しばらくたってからもう一度お試し下さい。」

### GCP で試した対策（全て失敗）

| # | 対策 | 結果 |
|---|------|------|
| 1 | headless: true（基本） | ✗ |
| 2 | `--disable-blink-features=AutomationControlled` | ✗ |
| 3 | `navigator.webdriver` を undefined に上書き | ✗ |
| 4 | locale/timezone/viewport 設定 | ✗ |
| 5 | 人間的な入力速度 (delay: 80ms) | ✗ |
| 6 | `ignoreDefaultArgs: ['--enable-automation']` | ✗ |
| 7 | xvfb + headless: false（headed模擬） | ✗ |
| 8 | システムChrome (channel: 'chrome') | ✗ |

**仮説**: note.com がサーバーサイドで GCP/クラウドの IP レンジをブロックしている。

## 検証手順

### 1. セットアップ

```bash
cd note-md-publisher
npm install
npx playwright install --with-deps chromium

# .env を作成（GCPの .env をコピーするか新規作成）
cp .env.example .env
# NOTE_EMAIL, NOTE_PASSWORD, NOTE_USERNAME を設定
```

### 2. テスト実行

4パターンを順番に試す。1つでも成功すれば IP レンジが原因と確定。

```bash
# パターン1: headless（最もシンプル）
node scripts/test-login.mjs

# パターン2: headed（ブラウザ表示あり）
node scripts/test-login.mjs --headed

# パターン3: headless + stealth対策
node scripts/test-login.mjs --stealth

# パターン4: headed + stealth対策
node scripts/test-login.mjs --headed --stealth
```

### 3. 結果判定

| ローカル結果 | 判定 | 対応 |
|-------------|------|------|
| パターン1で成功 | IP レンジが原因。stealth 不要 | `auth.mjs` は現状のままでOK |
| パターン2〜4で成功 | IP + ブラウザ検知の複合 | 成功した対策を `auth.mjs` に適用 |
| 全て失敗 | IP 以外の原因 | `NOTE_COOKIE` を正規フローに昇格 |

## 成功した場合の次のアクション

`auth.mjs` の `loginWithPlaywright()` に成功した対策を適用する。
現在の実装は `lib/auth.mjs:39-99` にある。

成功パターンに応じて変更すべき箇所：

```javascript
// lib/auth.mjs の loginWithPlaywright() 内

// headless: false が必要な場合
browser = await chromium.launch({ headless: false });

// stealth が必要な場合
browser = await chromium.launch({
  headless: true,
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
});
// + context.addInitScript で navigator.webdriver 除去
```

## 全パターン失敗した場合の対応方針

`NOTE_COOKIE` 環境変数を正規の認証フローに昇格させる：

1. `authenticate()` の優先順位を変更:
   - `NOTE_COOKIE` 環境変数 → 保存済みCookie → Playwright ログイン
2. `publish.mjs` で `--cookie` オプションなしでも `NOTE_COOKIE` を読む
3. CLAUDE.md / design.md を更新
4. SKILL.md の利用手順に Cookie 取得方法を記載

## ローカル検証結果（2026-02-19）

### 根本原因

GCP での失敗原因は **IPレンジのブロックではなく、`.env` の認証情報（メールアドレス/パスワード）の誤り**だった。
誤った認証情報で繰り返しログイン試行した結果、アカウントロックが発生し、全パターンで失敗していた。

### テスト結果

`.env` を正しい認証情報に修正した後、ローカルマシン（macOS, 住宅用IP）で実施。

| パターン | モード | 結果 | 備考 |
|---------|--------|------|------|
| 1 | headless | ✅ 成功 | Cookie 7個取得、`_note_session_v5` あり |
| 2 | headed | ✅ 成功 | Cookie 7個取得、`_note_session_v5` あり |
| 3 | headless + stealth | — | テスト不要（パターン1で成功のため） |
| 4 | headed + stealth | — | テスト不要（パターン1で成功のため） |

### 結論

- **stealth 対策は不要** — 標準の headless Chromium でログイン可能
- **`auth.mjs` は現状のままで変更不要**
- **GCP 環境でも `.env` を正しく設定すれば動作するはず**（IPレンジは問題ではなかった）

### GCP 側への引き継ぎアクション

1. GCP の `.env` ファイルの `NOTE_EMAIL` と `NOTE_PASSWORD` をローカルと同じ正しい値に修正する
2. `node scripts/test-login.mjs` でログイン成功を確認する
3. 成功したら `node --test tests/contract/` でコントラクトテストを実行する
4. PR #2 のテストプラン残項目を消化する

### GCP で再度失敗した場合

同じ正しい `.env` でローカルは成功・GCPは失敗となれば、**IPレンジのブロックが原因と確定**する。
その場合は「全パターン失敗した場合の対応方針」（本ドキュメント上部）に従い、
`NOTE_COOKIE` 環境変数を正規の認証フローに昇格させる。

具体的には:
1. ローカルで `node scripts/test-login.mjs` を実行して Cookie を取得
2. 取得した `_note_session_v5` の値を GCP の `.env` に `NOTE_COOKIE` として設定
3. `auth.mjs` の `authenticate()` で `NOTE_COOKIE` を最優先にする
4. Cookie の有効期限管理（定期的にローカルで再取得）を運用フローに組み込む

### アカウントロックに関する知見

- note.com のアカウントロックはIPアドレス単位ではなく、**ブラウザ/セッション単位**で管理されている可能性が高い
- 同一IPでもSafari（別ブラウザ）からは正常にログインできた
- Playwright は毎回新しいブラウザコンテキストを起動するため、前回の失敗Cookieは引き継がれない
- ロック解除まで数時間かかるが、新しいブラウザセッションでは影響を受けない場合がある

## 関連ファイル

- `scripts/test-login.mjs` — テストスクリプト（このファイルと対）
- `lib/auth.mjs` — 本番の認証モジュール
- `.specs/note-md-publisher/design.md` §3.2 — 認証の設計仕様
- `CLAUDE.md` — プロジェクトガイド
