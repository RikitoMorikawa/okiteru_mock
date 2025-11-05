-- 前日報告テーブルを作成
CREATE TABLE IF NOT EXISTS public.previous_day_reports (
    id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    next_wake_up_time TIME NOT NULL,
    next_departure_time TIME NOT NULL,
    next_arrival_time TIME NOT NULL,
    appearance_photo_url TEXT NOT NULL,
    route_photo_url TEXT NOT NULL,
    notes TEXT,
    -- 実際の出勤記録との関連付け（翌日の出勤記録）
    actual_attendance_record_id UUID REFERENCES public.attendance_records (id) ON DELETE SET NULL,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        UNIQUE (user_id, report_date)
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_previous_day_reports_user_date ON public.previous_day_reports (user_id, report_date);

CREATE INDEX IF NOT EXISTS idx_previous_day_reports_date ON public.previous_day_reports (report_date);

CREATE INDEX IF NOT EXISTS idx_previous_day_reports_attendance_record ON public.previous_day_reports (actual_attendance_record_id);

-- RLS (Row Level Security) を有効化
ALTER TABLE public.previous_day_reports ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成（ユーザーは自分のデータのみアクセス可能）
CREATE POLICY "Users can view own previous day reports" ON public.previous_day_reports FOR
SELECT USING (auth.uid () = user_id);

CREATE POLICY "Users can insert own previous day reports" ON public.previous_day_reports FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can update own previous day reports" ON public.previous_day_reports FOR
UPDATE USING (auth.uid () = user_id);

CREATE POLICY "Users can delete own previous day reports" ON public.previous_day_reports FOR DELETE USING (auth.uid () = user_id);

-- 管理者は全てのデータにアクセス可能
CREATE POLICY "Managers can view all previous day reports" ON public.previous_day_reports FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.users
            WHERE
                users.id = auth.uid ()
                AND users.role = 'manager'
        )
    );

-- コメントを追加
COMMENT ON
TABLE public.previous_day_reports IS '前日報告テーブル - 翌日の予定と準備状況を記録';

COMMENT ON COLUMN public.previous_day_reports.user_id IS 'ユーザーID';

COMMENT ON COLUMN public.previous_day_reports.report_date IS '報告日（前日報告を行った日）';

COMMENT ON COLUMN public.previous_day_reports.next_wake_up_time IS '翌日の予定起床時間';

COMMENT ON COLUMN public.previous_day_reports.next_departure_time IS '翌日の予定出発時間';

COMMENT ON COLUMN public.previous_day_reports.next_arrival_time IS '翌日の予定到着時間';

COMMENT ON COLUMN public.previous_day_reports.appearance_photo_url IS '身だしなみ写真のURL';

COMMENT ON COLUMN public.previous_day_reports.route_photo_url IS '経路スクリーンショットのURL';

COMMENT ON COLUMN public.previous_day_reports.notes IS '備考';

COMMENT ON COLUMN public.previous_day_reports.actual_attendance_record_id IS '実際の出勤記録ID（翌日の出勤記録との関連付け）';