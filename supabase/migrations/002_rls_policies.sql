-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is manager
CREATE OR REPLACE FUNCTION is_manager(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = user_id AND role = 'manager'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role FROM public.users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
-- Managers can view all users, staff can only view their own profile
CREATE POLICY "users_select_policy" ON public.users
    FOR SELECT USING (
        is_manager(auth.uid()) OR id = auth.uid()
    );

-- Managers can insert new users (staff registration), users can update their own profile
CREATE POLICY "users_insert_policy" ON public.users
    FOR INSERT WITH CHECK (
        is_manager(auth.uid())
    );

-- Users can update their own profile, managers can update any profile
CREATE POLICY "users_update_policy" ON public.users
    FOR UPDATE USING (
        is_manager(auth.uid()) OR id = auth.uid()
    );

-- Only managers can delete users
CREATE POLICY "users_delete_policy" ON public.users
    FOR DELETE USING (
        is_manager(auth.uid())
    );

-- Attendance records policies
-- Managers can view all records, staff can only view their own
CREATE POLICY "attendance_records_select_policy" ON public.attendance_records
    FOR SELECT USING (
        is_manager(auth.uid()) OR staff_id = auth.uid()
    );

-- Staff can insert their own records, managers can insert for any staff
CREATE POLICY "attendance_records_insert_policy" ON public.attendance_records
    FOR INSERT WITH CHECK (
        is_manager(auth.uid()) OR staff_id = auth.uid()
    );

-- Staff can update their own records, managers can update any records
CREATE POLICY "attendance_records_update_policy" ON public.attendance_records
    FOR UPDATE USING (
        is_manager(auth.uid()) OR staff_id = auth.uid()
    );

-- Only managers can delete attendance records
CREATE POLICY "attendance_records_delete_policy" ON public.attendance_records
    FOR DELETE USING (
        is_manager(auth.uid())
    );

-- Daily reports policies
-- Managers can view all reports, staff can only view their own
CREATE POLICY "daily_reports_select_policy" ON public.daily_reports
    FOR SELECT USING (
        is_manager(auth.uid()) OR staff_id = auth.uid()
    );

-- Staff can insert their own reports, managers can insert for any staff
CREATE POLICY "daily_reports_insert_policy" ON public.daily_reports
    FOR INSERT WITH CHECK (
        is_manager(auth.uid()) OR staff_id = auth.uid()
    );

-- Staff can update their own reports, managers can update any reports
CREATE POLICY "daily_reports_update_policy" ON public.daily_reports
    FOR UPDATE USING (
        is_manager(auth.uid()) OR staff_id = auth.uid()
    );

-- Only managers can delete daily reports
CREATE POLICY "daily_reports_delete_policy" ON public.daily_reports
    FOR DELETE USING (
        is_manager(auth.uid())
    );

-- Shift schedules policies
-- Managers can view all schedules, staff can only view their own
CREATE POLICY "shift_schedules_select_policy" ON public.shift_schedules
    FOR SELECT USING (
        is_manager(auth.uid()) OR staff_id = auth.uid()
    );

-- Staff can insert their own schedules, managers can insert for any staff
CREATE POLICY "shift_schedules_insert_policy" ON public.shift_schedules
    FOR INSERT WITH CHECK (
        is_manager(auth.uid()) OR staff_id = auth.uid()
    );

-- Staff can update their own schedules, managers can update any schedules
CREATE POLICY "shift_schedules_update_policy" ON public.shift_schedules
    FOR UPDATE USING (
        is_manager(auth.uid()) OR staff_id = auth.uid()
    );

-- Only managers can delete shift schedules
CREATE POLICY "shift_schedules_delete_policy" ON public.shift_schedules
    FOR DELETE USING (
        is_manager(auth.uid())
    );

-- Alerts policies
-- Managers can view all alerts, staff can only view their own
CREATE POLICY "alerts_select_policy" ON public.alerts
    FOR SELECT USING (
        is_manager(auth.uid()) OR staff_id = auth.uid()
    );

-- Only managers can insert alerts
CREATE POLICY "alerts_insert_policy" ON public.alerts
    FOR INSERT WITH CHECK (
        is_manager(auth.uid())
    );

-- Managers can update any alerts, staff can only dismiss their own alerts
CREATE POLICY "alerts_update_policy" ON public.alerts
    FOR UPDATE USING (
        is_manager(auth.uid()) OR (
            staff_id = auth.uid() AND 
            status = 'active' -- Staff can only dismiss active alerts
        )
    );

-- Only managers can delete alerts
CREATE POLICY "alerts_delete_policy" ON public.alerts
    FOR DELETE USING (
        is_manager(auth.uid())
    );

-- Access logs policies
-- Managers can view all access logs, staff can only view their own
CREATE POLICY "access_logs_select_policy" ON public.access_logs
    FOR SELECT USING (
        is_manager(auth.uid()) OR user_id = auth.uid()
    );

-- System can insert access logs for any user
CREATE POLICY "access_logs_insert_policy" ON public.access_logs
    FOR INSERT WITH CHECK (true);

-- Only system/managers can update access logs
CREATE POLICY "access_logs_update_policy" ON public.access_logs
    FOR UPDATE USING (
        is_manager(auth.uid())
    );

-- Only managers can delete access logs
CREATE POLICY "access_logs_delete_policy" ON public.access_logs
    FOR DELETE USING (
        is_manager(auth.uid())
    );

-- Storage policies for photo uploads
-- Create storage bucket for photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for photos bucket
-- Staff can upload their own photos, managers can upload for any staff
CREATE POLICY "photos_upload_policy" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'photos' AND (
            is_manager(auth.uid()) OR 
            (auth.uid()::text = (storage.foldername(name))[1])
        )
    );

-- Staff can view their own photos, managers can view all photos
CREATE POLICY "photos_select_policy" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'photos' AND (
            is_manager(auth.uid()) OR 
            (auth.uid()::text = (storage.foldername(name))[1])
        )
    );

-- Staff can update their own photos, managers can update any photos
CREATE POLICY "photos_update_policy" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'photos' AND (
            is_manager(auth.uid()) OR 
            (auth.uid()::text = (storage.foldername(name))[1])
        )
    );

-- Only managers can delete photos
CREATE POLICY "photos_delete_policy" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'photos' AND is_manager(auth.uid())
    );