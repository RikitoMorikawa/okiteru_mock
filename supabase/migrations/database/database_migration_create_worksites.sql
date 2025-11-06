-- 現場マスタテーブルを作成
CREATE TABLE IF NOT EXISTS public.worksites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE, -- 現場名（例：渋谷現場、新宿オフィスビル）
    address TEXT, -- 住所
    description TEXT, -- 説明・備考
    is_active BOOLEAN NOT NULL DEFAULT true, -- 有効/無効
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_worksites_is_active ON public.worksites (is_active);
CREATE INDEX IF NOT EXISTS idx_worksites_name ON public.worksites (name);

-- RLS (Row Level Security) を有効化
ALTER TABLE public.worksites ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成
-- 全ユーザーが現場情報を閲覧可能
CREATE POLICY "Anyone can view active worksites" ON public.worksites FOR SELECT USING (
    is_active = true
);

-- マネージャーのみが現場を追加・更新・削除可能
CREATE POLICY "Managers can insert worksites" ON public.worksites FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'manager'
    )
);

CREATE POLICY "Managers can update worksites" ON public.worksites FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'manager'
    )
);

CREATE POLICY "Managers can delete worksites" ON public.worksites FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'manager'
    )
);

-- updated_atトリガーを追加
CREATE TRIGGER update_worksites_updated_at
    BEFORE UPDATE ON public.worksites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- コメントを追加
COMMENT ON TABLE public.worksites IS '勤務先現場マスタテーブル';
COMMENT ON COLUMN public.worksites.name IS '現場名';
COMMENT ON COLUMN public.worksites.address IS '住所';
COMMENT ON COLUMN public.worksites.description IS '説明・備考';
COMMENT ON COLUMN public.worksites.is_active IS '有効/無効フラグ';

-- テストデータを挿入
INSERT INTO public.worksites (name, address, description) VALUES
    ('渋谷現場', '東京都渋谷区渋谷1-1-1', '渋谷駅前の商業施設建設現場'),
    ('新宿オフィスビル', '東京都新宿区西新宿2-2-2', '新宿高層ビル建設現場'),
    ('品川倉庫', '東京都品川区東品川3-3-3', '物流倉庫の改修工事'),
    ('横浜工場', '神奈川県横浜市西区みなとみらい4-4-4', '工場建設プロジェクト'),
    ('川崎マンション', '神奈川県川崎市川崎区5-5-5', 'マンション建設現場')
ON CONFLICT (name) DO NOTHING;

-- 確認メッセージ
DO $$
BEGIN
    RAISE NOTICE '現場マスタテーブル (worksites) を作成しました';
    RAISE NOTICE 'テストデータを投入しました';
END $$;
