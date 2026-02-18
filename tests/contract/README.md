# コントラクトテスト

note.com 非公式APIのレスポンス構造を検証するテスト。
API仕様変更の早期検知が目的。

## 実行条件

`.env` ファイルに以下の環境変数が必要:

```
NOTE_EMAIL=your-email@example.com
NOTE_PASSWORD=your-password
NOTE_USERNAME=your-note-username
```

## 実行方法

```bash
node --test tests/contract/
```

`.env` 未設定時はテストが自動的にスキップされます（エラーにはなりません）。

## 注意事項

- テストは実際のnote.com APIにリクエストを送信します
- テストで作成した記事はDELETE APIで自動削除を試みます
- レート制限に注意してください（1分10リクエスト以下）
