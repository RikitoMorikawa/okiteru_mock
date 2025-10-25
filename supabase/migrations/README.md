# Database Migrations

このディレクトリには、データベーススキーマの変更を管理するマイグレーションファイルが含まれています。

## 最新のマイグレーション

### 014_final_attendance_columns.sql（推奨）

- **目的**: 現在の要件に合わせた最終的なカラム構成
- **追加カラム**:
  - `wake_up_notes`: 起床時の備考
  - `departure_notes`: 出発時の備考
  - `arrival_notes`: 到着時の備考
  - `arrival_gps_location`: 到着時の GPS 座標（自動取得）
- **既存カラム活用**: `location`を到着時の手動入力場所として使用

### 旧マイグレーション（参考）

- `010_separate_location_and_notes_columns.sql`: 構文エラー修正済み
- `012_notes_only_separate_arrival_location.sql`: 中間バージョン
- `013_add_gps_location_column.sql`: GPS 専用カラム追加

## マイグレーションの実行方法

### Supabase CLI を使用する場合

```bash
# 新しいマイグレーションを適用
supabase db push

# または特定のマイグレーションを実行
supabase db reset
```

### 手動実行の場合

1. Supabase ダッシュボードにログイン
2. SQL Editor を開く
3. マイグレーションファイルの内容をコピー＆ペースト
4. 実行

## データ移行の注意点

1. **バックアップ**: マイグレーション実行前に必ずデータベースをバックアップしてください
2. **段階的実行**:
   - まず `010_separate_location_and_notes_columns.sql` を実行
   - アプリケーションが正常に動作することを確認
   - 必要に応じて `011_cleanup_old_columns.sql` を実行
3. **データ確認**: 新しいカラムにデータが正しく保存されることを確認

## カラム構造の変更

### 変更前

```sql
notes TEXT          -- 全報告で共通（問題あり）
location TEXT       -- 到着場所のみ
```

### 変更後

```sql
wake_up_location TEXT    -- 起床場所
wake_up_notes TEXT       -- 起床時の備考
departure_location TEXT  -- 出発場所
departure_notes TEXT     -- 出発時の備考
arrival_location TEXT    -- 到着場所
arrival_notes TEXT       -- 到着時の備考
```

## トラブルシューティング

### マイグレーション失敗時

1. エラーメッセージを確認
2. 既存データとの競合がないか確認
3. 必要に応じてロールバック

### データ不整合時

1. 古いカラムと新しいカラムの内容を比較
2. 手動でデータを修正
3. アプリケーションのテストを実行
