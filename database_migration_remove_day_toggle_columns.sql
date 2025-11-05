-- 当日/翌日切り替え機能に関連するカラムを削除

-- dashboard_view_preference カラムを削除
ALTER TABLE public.users DROP COLUMN IF EXISTS dashboard_view_preference;

-- next_day_active カラムを削除
ALTER TABLE public.users DROP COLUMN IF EXISTS next_day_active;

-- 削除完了のコメント
COMMENT ON TABLE public.users IS 'ユーザーテーブル - 当日/翌日切り替え機能のカラムを削除しました';
