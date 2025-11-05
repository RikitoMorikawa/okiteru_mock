-- スタッフ出社可能日テーブルを作成
-- 出社可能な日だけレコードを作成するシンプルな設計
CREATE TABLE IF NOT EXISTS public.staff_availability (
    id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    date DATE NOT NULL,
    notes TEXT, -- メモ・備考（オプション）
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        -- 同じスタッフの同じ日付は1レコードのみ
        UNIQUE (staff_id, date)
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_staff_availability_staff_date ON public.staff_availability (staff_id, date);

CREATE INDEX IF NOT EXISTS idx_staff_availability_date ON public.staff_availability (date);

CREATE INDEX IF NOT EXISTS idx_staff_availability_staff ON public.staff_availability (staff_id);

-- RLS (Row Level Security) を有効化
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成（スタッフは自分のデータのみアクセス可能）
CREATE POLICY "Staff can view own availability" ON public.staff_availability FOR
SELECT USING (
        auth.uid () = staff_id
        AND EXISTS (
            SELECT 1
            FROM public.users
            WHERE
                users.id = auth.uid ()
                AND users.role = 'staff'
        )
    );

CREATE POLICY "Staff can insert own availability" ON public.staff_availability FOR
INSERT
WITH
    CHECK (
        auth.uid () = staff_id
        AND EXISTS (
            SELECT 1
            FROM public.users
            WHERE
                users.id = auth.uid ()
                AND users.role = 'staff'
        )
    );

CREATE POLICY "Staff can update own availability" ON public.staff_availability FOR
UPDATE USING (
        auth.uid () = staff_id
        AND EXISTS (
            SELECT 1
            FROM public.users
            WHERE
                users.id = auth.uid ()
                AND users.role = 'staff'
        )
    );

CREATE POLICY "Staff can delete own availability" ON public.staff_availability FOR DELETE USING (
        auth.uid () = staff_id
        AND EXISTS (
            SELECT 1
            FROM public.users
            WHERE
                users.id = auth.uid ()
                AND users.role = 'staff'
        )
    );

-- 管理者は全てのスタッフのデータにアクセス可能
CREATE POLICY "Managers can view all availability" ON public.staff_availability FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.users
            WHERE
                users.id = auth.uid ()
                AND users.role = 'manager'
        )
    );

CREATE POLICY "Managers can insert all availability" ON public.staff_availability FOR
INSERT
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.users
            WHERE
                users.id = auth.uid ()
                AND users.role = 'manager'
        )
    );

CREATE POLICY "Managers can update all availability" ON public.staff_availability FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.users
            WHERE
                users.id = auth.uid ()
                AND users.role = 'manager'
        )
    );

CREATE POLICY "Managers can delete all availability" ON public.staff_availability FOR DELETE USING (
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
TABLE public.staff_availability IS 'スタッフ出社可能日テーブル - 出社可能な日のみレコードを作成';

COMMENT ON COLUMN public.staff_availability.staff_id IS 'スタッフユーザーID';

COMMENT ON COLUMN public.staff_availability.date IS '出社可能日';

COMMENT ON COLUMN public.staff_availability.notes IS '備考・メモ';
