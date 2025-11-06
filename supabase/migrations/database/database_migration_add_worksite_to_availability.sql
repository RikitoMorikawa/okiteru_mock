-- staff_availabilityテーブルに現場IDカラムを追加

-- 現場IDカラムを追加（NULL許可、外部キー制約付き）
ALTER TABLE public.staff_availability
ADD COLUMN IF NOT EXISTS worksite_id UUID REFERENCES public.worksites(id) ON DELETE SET NULL;

-- インデックスを作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_staff_availability_worksite_id
ON public.staff_availability (worksite_id);

-- コメントを追加
COMMENT ON COLUMN public.staff_availability.worksite_id IS '勤務予定の現場ID（worksitesテーブルへの外部キー）';

-- 確認メッセージ
DO $$
BEGIN
    RAISE NOTICE 'staff_availabilityテーブルにworksite_idカラムを追加しました';
END $$;
