-- 未使用のENUM型を削除
-- alert_type, alert_status, shift_status は現在使用されていないため削除

-- alert_type を削除
DROP TYPE IF EXISTS alert_type CASCADE;

-- alert_status を削除
DROP TYPE IF EXISTS alert_status CASCADE;

-- shift_status を削除
DROP TYPE IF EXISTS shift_status CASCADE;

-- 確認メッセージ
DO $$
BEGIN
    RAISE NOTICE '未使用のENUM型（alert_type, alert_status, shift_status）を削除しました';
END $$;
