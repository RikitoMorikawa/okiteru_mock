-- 日報テーブルに勤怠記録IDフィールドを追加
ALTER TABLE public.daily_reports
ADD COLUMN attendance_record_id uuid NULL;

-- 外部キー制約を追加
ALTER TABLE public.daily_reports
ADD CONSTRAINT daily_reports_attendance_record_id_fkey FOREIGN KEY (attendance_record_id) REFERENCES public.attendance_records (id) ON DELETE SET NULL;

-- インデックスを追加（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_daily_reports_attendance_record_id ON public.daily_reports USING btree (attendance_record_id);

-- 既存データの移行（同じ日付・スタッフIDの最初の勤怠記録に紐付け）
UPDATE public.daily_reports
SET
    attendance_record_id = (
        SELECT ar.id
        FROM public.attendance_records ar
        WHERE
            ar.staff_id = daily_reports.staff_id
            AND ar.date = daily_reports.date
        ORDER BY ar.created_at ASC
        LIMIT 1
    )
WHERE
    attendance_record_id IS NULL;