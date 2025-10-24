-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('manager', 'staff');

CREATE TYPE attendance_status AS ENUM ('pending', 'partial', 'complete');

CREATE TYPE report_status AS ENUM ('draft', 'submitted');

CREATE TYPE shift_status AS ENUM ('scheduled', 'confirmed', 'completed');

CREATE TYPE alert_type AS ENUM ('missing_wakeup', 'missing_departure', 'missing_arrival', 'missing_report');

CREATE TYPE alert_status AS ENUM ('active', 'dismissed');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users (id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'staff',
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- Attendance records table
CREATE TABLE public.attendance_records (
    id UUID DEFAULT uuid_generate_v4 () PRIMARY KEY,
    staff_id UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    wake_up_time TIMESTAMP
    WITH
        TIME ZONE,
        departure_time TIMESTAMP
    WITH
        TIME ZONE,
        arrival_time TIMESTAMP
    WITH
        TIME ZONE,
        route_photo_url TEXT,
        appearance_photo_url TEXT,
        status attendance_status DEFAULT 'pending',
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        UNIQUE (staff_id, date)
);

-- Daily reports table
CREATE TABLE public.daily_reports (
    id UUID DEFAULT uuid_generate_v4 () PRIMARY KEY,
    staff_id UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    content TEXT NOT NULL,
    submitted_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        status report_status DEFAULT 'submitted',
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        UNIQUE (staff_id, date)
);

-- Shift schedules table
CREATE TABLE public.shift_schedules (
    id UUID DEFAULT uuid_generate_v4 () PRIMARY KEY,
    staff_id UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    start_time TIMESTAMP
    WITH
        TIME ZONE NOT NULL,
        end_time TIMESTAMP
    WITH
        TIME ZONE NOT NULL,
        location TEXT,
        notes TEXT,
        status shift_status DEFAULT 'scheduled',
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- Alerts table
CREATE TABLE public.alerts (
    id UUID DEFAULT uuid_generate_v4 () PRIMARY KEY,
    staff_id UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
    type alert_type NOT NULL,
    message TEXT NOT NULL,
    triggered_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        dismissed_at TIMESTAMP
    WITH
        TIME ZONE,
        status alert_status DEFAULT 'active',
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- Access logs table
CREATE TABLE public.access_logs (
    id UUID DEFAULT uuid_generate_v4 () PRIMARY KEY,
    user_id UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
    login_time TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        logout_time TIMESTAMP
    WITH
        TIME ZONE,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_attendance_records_staff_date ON public.attendance_records (staff_id, date);

CREATE INDEX idx_attendance_records_date ON public.attendance_records (date);

CREATE INDEX idx_daily_reports_staff_date ON public.daily_reports (staff_id, date);

CREATE INDEX idx_daily_reports_date ON public.daily_reports (date);

CREATE INDEX idx_shift_schedules_staff_date ON public.shift_schedules (staff_id, date);

CREATE INDEX idx_shift_schedules_date ON public.shift_schedules (date);

CREATE INDEX idx_alerts_staff_status ON public.alerts (staff_id, status);

CREATE INDEX idx_alerts_triggered_at ON public.alerts (triggered_at);

CREATE INDEX idx_access_logs_user_login ON public.access_logs (user_id, login_time);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_reports_updated_at BEFORE UPDATE ON public.daily_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_schedules_updated_at BEFORE UPDATE ON public.shift_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON public.alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();