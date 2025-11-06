# データベーススキーマ情報

このドキュメントは、Supabaseデータベースの構造を記録したものです。

**プロジェクトURL**: https://wmwmhtdbismedkfjbbjf.supabase.co

---

## 1. テーブル一覧

| テーブル名 | サイズ | 説明 |
|-----------|--------|------|
| `access_logs` | 64 kB | アクセスログ（ログイン・ログアウト記録） |
| `attendance_records` | 96 kB | 勤怠記録（起床・出発・到着時刻、写真等） |
| `daily_reports` | 112 kB | 日報 |
| `previous_day_reports` | 112 kB | 前日の日報 |
| `staff_availability` | 96 kB | スタッフ出社可能日 |
| `users` | 96 kB | ユーザー情報（スタッフ・管理者） |

**合計**: 6テーブル

---

## 2. カラム情報

### 2.1 `users` テーブル

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|---------|---------|------------|------|
| `id` | uuid | NO | - | プライマリキー（auth.usersと連携） |
| `email` | text | NO | - | メールアドレス（ユニーク） |
| `role` | user_role | NO | 'staff' | ユーザーロール（manager/staff） |
| `name` | text | NO | - | ユーザー名 |
| `phone` | text | YES | - | 電話番号 |
| `created_at` | timestamptz | YES | now() | 作成日時 |
| `updated_at` | timestamptz | YES | now() | 更新日時 |
| `active` | boolean | NO | true | アクティブ状態（スケジュール可能かどうか） |

### 2.2 `attendance_records` テーブル

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|---------|---------|------------|------|
| `id` | uuid | NO | uuid_generate_v4() | プライマリキー |
| `staff_id` | uuid | NO | - | スタッフID（外部キー → users.id） |
| `date` | date | NO | - | 勤怠日付 |
| `wake_up_time` | timestamptz | YES | - | 起床時刻 |
| `departure_time` | timestamptz | YES | - | 出発時刻 |
| `arrival_time` | timestamptz | YES | - | 到着時刻 |
| `route_photo_url` | text | YES | - | 経路写真URL |
| `appearance_photo_url` | text | YES | - | 身だしなみ写真URL |
| `status` | attendance_status | YES | 'pending' | ステータス（pending/partial/complete） |
| `created_at` | timestamptz | YES | now() | 作成日時 |
| `updated_at` | timestamptz | YES | now() | 更新日時 |
| `notes` | text | YES | - | 一般的な備考 |
| `location` | text | YES | - | 到着場所（手動入力） |
| `destination` | text | YES | - | 出発時の目的地 |
| `wake_up_location` | text | YES | - | 起床場所 |
| `wake_up_notes` | text | YES | - | 起床時の備考（健康状態等） |
| `departure_location` | text | YES | - | 出発場所 |
| `departure_notes` | text | YES | - | 出発時の備考（交通状況等） |
| `arrival_location` | text | YES | - | 到着場所（GPS座標等） |
| `arrival_notes` | text | YES | - | 到着時の備考（遅延等） |
| `arrival_gps_location` | text | YES | - | 到着時のGPS座標（自動取得） |

### 2.3 `daily_reports` テーブル

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|---------|---------|------------|------|
| `id` | uuid | NO | uuid_generate_v4() | プライマリキー |
| `staff_id` | uuid | NO | - | スタッフID（外部キー → users.id） |
| `date` | date | NO | - | 日報の日付 |
| `content` | text | NO | - | 日報の内容 |
| `submitted_at` | timestamptz | YES | now() | 提出日時 |
| `status` | report_status | YES | 'submitted' | ステータス（draft/submitted） |
| `created_at` | timestamptz | YES | now() | 作成日時 |
| `updated_at` | timestamptz | YES | now() | 更新日時 |
| `attendance_record_id` | uuid | YES | - | 勤怠記録ID（外部キー → attendance_records.id） |

### 2.4 `previous_day_reports` テーブル

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|---------|---------|------------|------|
| `id` | uuid | NO | gen_random_uuid() | プライマリキー |
| `user_id` | uuid | NO | - | ユーザーID（外部キー → users.id） |
| `report_date` | date | NO | - | 報告日（前日報告を行った日） |
| `next_wake_up_time` | time | NO | - | 翌日の予定起床時刻 |
| `next_departure_time` | time | NO | - | 翌日の予定出発時刻 |
| `next_arrival_time` | time | NO | - | 翌日の予定到着時刻 |
| `appearance_photo_url` | text | NO | - | 身だしなみ写真URL |
| `route_photo_url` | text | NO | - | 経路スクリーンショットURL |
| `notes` | text | YES | - | 備考 |
| `actual_attendance_record_id` | uuid | YES | - | 実際の出勤記録ID（外部キー → attendance_records.id） |
| `created_at` | timestamptz | YES | now() | 作成日時 |
| `updated_at` | timestamptz | YES | now() | 更新日時 |

### 2.5 `staff_availability` テーブル

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|---------|---------|------------|------|
| `id` | uuid | NO | gen_random_uuid() | プライマリキー |
| `staff_id` | uuid | NO | - | スタッフID（外部キー → users.id） |
| `date` | date | NO | - | 出社可能日 |
| `notes` | text | YES | - | 備考・メモ |
| `created_at` | timestamptz | YES | now() | 作成日時 |
| `updated_at` | timestamptz | YES | now() | 更新日時 |

### 2.6 `access_logs` テーブル

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|---------|---------|------------|------|
| `id` | uuid | NO | uuid_generate_v4() | プライマリキー |
| `user_id` | uuid | NO | - | ユーザーID（外部キー → users.id） |
| `login_time` | timestamptz | YES | now() | ログイン時刻 |
| `logout_time` | timestamptz | YES | - | ログアウト時刻 |
| `ip_address` | inet | YES | - | IPアドレス |
| `user_agent` | text | YES | - | ユーザーエージェント |
| `created_at` | timestamptz | YES | now() | 作成日時 |

---

## 3. プライマリキー

| テーブル名 | カラム名 | 制約名 |
|-----------|---------|--------|
| `access_logs` | `id` | `access_logs_pkey` |
| `attendance_records` | `id` | `attendance_records_pkey` |
| `daily_reports` | `id` | `daily_reports_pkey` |
| `previous_day_reports` | `id` | `previous_day_reports_pkey` |
| `staff_availability` | `id` | `staff_availability_pkey` |
| `users` | `id` | `users_pkey` |

**すべてのテーブルで `id` カラムがプライマリキーとして使用されています。**

---

## 4. 外部キー（リレーション）

| 参照元テーブル | 参照元カラム | 参照先テーブル | 参照先カラム | 制約名 | 削除時の動作 |
|--------------|------------|--------------|------------|--------|------------|
| `access_logs` | `user_id` | `users` | `id` | `access_logs_user_id_fkey` | CASCADE |
| `attendance_records` | `staff_id` | `users` | `id` | `attendance_records_staff_id_fkey` | CASCADE |
| `daily_reports` | `staff_id` | `users` | `id` | `daily_reports_staff_id_fkey` | CASCADE |
| `daily_reports` | `attendance_record_id` | `attendance_records` | `id` | `daily_reports_attendance_record_id_fkey` | SET NULL |
| `previous_day_reports` | `actual_attendance_record_id` | `attendance_records` | `id` | `previous_day_reports_actual_attendance_record_id_fkey` | SET NULL |
| `staff_availability` | `staff_id` | `users` | `id` | `staff_availability_staff_id_fkey` | CASCADE |

**リレーションの説明**:
- **users** が削除されると、関連する `access_logs`, `attendance_records`, `daily_reports`, `staff_availability` も削除されます（CASCADE）
- **attendance_records** が削除されても、関連する `daily_reports` と `previous_day_reports` の該当カラムは NULL に設定されます（SET NULL）

---

## 5. インデックス

### 5.1 `users` テーブル
- `users_pkey` (UNIQUE): `id` - プライマリキー
- `users_email_key` (UNIQUE): `email` - メールアドレスの一意性
- `idx_users_active`: `active` - アクティブユーザー検索用

### 5.2 `attendance_records` テーブル
- `attendance_records_pkey` (UNIQUE): `id` - プライマリキー
- `idx_attendance_records_staff_date`: `staff_id, date` - スタッフ別日付検索用
- `idx_attendance_records_date`: `date` - 日付検索用
- `idx_attendance_records_staff_date_status`: `staff_id, date, status, created_at DESC` - 複合検索・ソート用

### 5.3 `daily_reports` テーブル
- `daily_reports_pkey` (UNIQUE): `id` - プライマリキー
- `idx_daily_reports_staff_date`: `staff_id, date` - スタッフ別日付検索用
- `idx_daily_reports_date`: `date` - 日付検索用
- `idx_daily_reports_attendance_record_id`: `attendance_record_id` - 勤怠記録との紐付け検索用
- `idx_daily_reports_staff_date_status`: `staff_id, date, status, created_at DESC` - 複合検索・ソート用

### 5.4 `previous_day_reports` テーブル
- `previous_day_reports_pkey` (UNIQUE): `id` - プライマリキー
- `idx_previous_day_reports_user_date`: `user_id, report_date` - ユーザー別報告日検索用
- `idx_previous_day_reports_date`: `report_date` - 報告日検索用
- `idx_previous_day_reports_attendance_record`: `actual_attendance_record_id` - 実際の勤怠記録との紐付け用

### 5.5 `staff_availability` テーブル
- `staff_availability_pkey` (UNIQUE): `id` - プライマリキー
- `staff_availability_staff_id_date_key` (UNIQUE): `staff_id, date` - スタッフと日付の組み合わせの一意性
- `idx_staff_availability_staff_date`: `staff_id, date` - スタッフ別日付検索用
- `idx_staff_availability_staff`: `staff_id` - スタッフ検索用
- `idx_staff_availability_date`: `date` - 日付検索用

### 5.6 `access_logs` テーブル
- `access_logs_pkey` (UNIQUE): `id` - プライマリキー
- `idx_access_logs_user_login`: `user_id, login_time` - ユーザーのログイン履歴検索用

---

## 6. カスタム型（ENUM）

| ENUM型名 | 値 | 使用箇所 |
|---------|---|---------|
| `user_role` | `manager`, `staff` | `users.role` |
| `attendance_status` | `pending`, `partial`, `complete`, `active`, `reset`, `reopened`, `archived` | `attendance_records.status` |
| `report_status` | `draft`, `submitted`, `archived`, `superseded` | `daily_reports.status` |

---

## 7. トリガー

| テーブル名 | トリガー名 | イベント | タイミング | 実行内容 |
|-----------|----------|---------|----------|---------|
| `users` | `update_users_updated_at` | UPDATE | BEFORE | `update_updated_at_column()` |
| `attendance_records` | `update_attendance_records_updated_at` | UPDATE | BEFORE | `update_updated_at_column()` |
| `daily_reports` | `update_daily_reports_updated_at` | UPDATE | BEFORE | `update_updated_at_column()` |

**説明**: これらのトリガーは、レコードが更新される際に自動的に `updated_at` カラムを現在時刻に更新します。

---

## 8. ユニーク制約

| テーブル名 | 制約名 | カラム | 説明 |
|-----------|--------|--------|------|
| `users` | `users_email_key` | `email` | メールアドレスの一意性を保証 |
| `staff_availability` | `staff_availability_staff_id_date_key` | `staff_id`, `date` | 同じスタッフが同じ日に複数の出社可能記録を持てないようにする |

**注意**: プライマリキー以外のユニーク制約はこの2つのみです。`attendance_records` や `daily_reports` などのテーブルには明示的なユニーク制約が設定されていません。

---

## 9. CHECK制約

データベースには多数のCHECK制約が設定されていますが、そのほとんどはNOT NULL制約を実装するためのものです。

**主要なNOT NULL制約**:
- **users**: `id`, `email`, `role`, `name`, `active`
- **attendance_records**: `id`, `staff_id`, `date`
- **daily_reports**: `id`, `staff_id`, `date`, `content`
- **previous_day_reports**: `id`, `user_id`, `report_date`, `next_wake_up_time`, `next_departure_time`, `next_arrival_time`, `appearance_photo_url`, `route_photo_url`
- **staff_availability**: `id`, `staff_id`, `date`
- **access_logs**: `id`, `user_id`

これらの制約により、必須フィールドのデータ整合性が保たれています。

---

## 10. ストアドファンクション

データベースには以下のストアドファンクションが定義されています。

| 関数名 | 戻り値型 | 用途 |
|-------|---------|------|
| `update_updated_at_column()` | trigger | レコード更新時に`updated_at`を自動更新 |
| `get_user_role()` | user_role | 現在のユーザーのロールを取得 |
| `is_manager(user_id)` | boolean | 指定されたユーザーがマネージャーかどうかを判定 |
| `handle_new_user()` | trigger | 新規ユーザー作成時に`users`テーブルにプロフィールを作成 |
| `handle_user_delete()` | trigger | 認証ユーザー削除時に`users`テーブルからも削除 |
| `update_user_dashboard_preference(user_id, preference)` | void | ユーザーのダッシュボード表示設定を更新 |

### 詳細

**`update_updated_at_column()`**
- トリガー関数として使用
- レコード更新時に自動的に`updated_at`カラムを現在時刻に設定

**`get_user_role()`**
- 現在認証されているユーザー（`auth.uid()`）のロールを返す
- RLSポリシーで使用

**`is_manager(user_id)`**
- 指定されたユーザーIDがマネージャーロールを持っているかを判定
- RLSポリシーで使用

**`handle_new_user()`**
- Supabase Authで新規ユーザーが作成された時に自動実行
- `public.users`テーブルにユーザープロフィールを作成（デフォルトロール: staff）

**`handle_user_delete()`**
- Supabase Authからユーザーが削除された時に自動実行
- `public.users`テーブルから対応するレコードを削除

**`update_user_dashboard_preference(user_id, preference)`**
- ユーザーのダッシュボード表示設定（'today' または 'next_day'）を安全に更新
- バリデーション機能付き

---

## 11. RLSポリシー（Row Level Security）

すべてのテーブルでRLSが有効化されており、ユーザーロールに基づいたアクセス制御が実装されています。

### 11.1 `users` テーブル

| 操作 | ポリシー名 | 条件 |
|-----|----------|------|
| SELECT | `users_select_policy` | マネージャーまたは自分自身のレコード |
| INSERT | `users_insert_policy` | マネージャーのみ |
| UPDATE | `users_update_policy` | マネージャーまたは自分自身のレコード |
| DELETE | `users_delete_policy` | マネージャーのみ |

### 11.2 `attendance_records` テーブル

| 操作 | ポリシー名 | 条件 |
|-----|----------|------|
| SELECT | `attendance_records_select_policy` | マネージャーまたは自分の勤怠記録 |
| INSERT | `attendance_records_insert_policy` | マネージャーまたは自分の勤怠記録 |
| UPDATE | `attendance_records_update_policy` | マネージャーまたは自分の勤怠記録 |
| DELETE | `attendance_records_delete_policy` | マネージャーのみ |

### 11.3 `daily_reports` テーブル

| 操作 | ポリシー名 | 条件 |
|-----|----------|------|
| SELECT | `daily_reports_select_policy` | マネージャーまたは自分の日報 |
| INSERT | `daily_reports_insert_policy` | マネージャーまたは自分の日報 |
| UPDATE | `daily_reports_update_policy` | マネージャーまたは自分の日報 |
| DELETE | `daily_reports_delete_policy` | マネージャーのみ |

### 11.4 `previous_day_reports` テーブル

| 操作 | ポリシー名 | 条件 |
|-----|----------|------|
| SELECT | `Users can view own previous day reports` | 自分の前日報告 |
| SELECT | `Managers can view all previous day reports` | マネージャーは全ての前日報告 |
| INSERT | `Users can insert own previous day reports` | 自分の前日報告 |
| UPDATE | `Users can update own previous day reports` | 自分の前日報告 |
| DELETE | `Users can delete own previous day reports` | 自分の前日報告 |

### 11.5 `staff_availability` テーブル

| 操作 | ポリシー名 | 条件 |
|-----|----------|------|
| SELECT | `Staff can view own availability` | スタッフは自分の出社可能日 |
| SELECT | `Managers can view all availability` | マネージャーは全ての出社可能日 |
| INSERT | `Staff can insert own availability` | スタッフは自分の出社可能日 |
| INSERT | `Managers can insert all availability` | マネージャーは全ての出社可能日 |
| UPDATE | `Staff can update own availability` | スタッフは自分の出社可能日 |
| UPDATE | `Managers can update all availability` | マネージャーは全ての出社可能日 |
| DELETE | `Staff can delete own availability` | スタッフは自分の出社可能日 |
| DELETE | `Managers can delete all availability` | マネージャーは全ての出社可能日 |

### 11.6 `access_logs` テーブル

| 操作 | ポリシー名 | 条件 |
|-----|----------|------|
| SELECT | `access_logs_select_policy` | マネージャーまたは自分のアクセスログ |
| INSERT | `access_logs_insert_policy` | 全てのユーザー |
| UPDATE | `access_logs_update_policy` | マネージャーのみ |
| DELETE | `access_logs_delete_policy` | マネージャーのみ |

**セキュリティポイント**:
- **マネージャー**: 全てのデータに対する完全なアクセス権限
- **スタッフ**: 自分のデータのみアクセス可能
- **削除権限**: 基本的にマネージャーのみ（`previous_day_reports`と`staff_availability`は例外）
- **認証**: `auth.uid()`を使用してSupabase Authと連携

---

## データベースER図（概念図）

```
┌─────────────────┐
│     users       │
│  (ユーザー)      │
└────────┬────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌──────────────┐  ┌──────────────────────┐
│ access_logs  │  │ attendance_records   │
│(アクセスログ) │  │   (勤怠記録)          │
└──────────────┘  └──────────────────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌──────────────────┐  ┌─────────────────────┐
│  daily_reports   │  │ staff_availability  │
│   (日報)          │  │ (出社可能日)         │
└──────────────────┘  └─────────────────────┘
         │
         ▼
┌──────────────────────┐
│ previous_day_reports │
│  (前日の日報)         │
└──────────────────────┘
```

---

_このドキュメントは順次更新されます。_
