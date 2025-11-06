export type UserRole = "manager" | "staff";
export type AttendanceStatus = "pending" | "partial" | "complete" | "active" | "reset" | "reopened" | "archived";
export type ReportStatus = "draft" | "submitted" | "archived" | "superseded";

// Filter types for UI components
export interface FilterOptions {
  search: string;
  status: "all" | "active" | "inactive" | "scheduled" | "preparing" | "completed" | "alerts" | "active_staff" | "inactive_staff";
  sortBy: "name" | "status" | "lastActivity";
  dayView: "today" | "tomorrow";
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  staff_id: string;
  date: string;
  wake_up_time?: string;
  departure_time?: string;
  arrival_time?: string;
  route_photo_url?: string;
  appearance_photo_url?: string;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
  notes?: string; // 一般的な備考
  location?: string; // 到着場所（手動入力）
  destination?: string; // 出発時の目的地
  wake_up_location?: string; // 起床場所
  wake_up_notes?: string; // 起床時の備考
  departure_location?: string; // 出発場所
  departure_notes?: string; // 出発時の備考
  arrival_location?: string; // 到着場所（GPS座標等）
  arrival_notes?: string; // 到着時の備考
  arrival_gps_location?: string; // 到着時のGPS座標（自動取得）
}

export interface DailyReport {
  id: string;
  staff_id: string;
  attendance_record_id?: string; // 勤怠記録との紐付け用
  date: string;
  content: string;
  submitted_at: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

export interface StaffAvailability {
  id: string;
  staff_id: string;
  date: string;
  worksite_id?: string; // 勤務予定の現場ID
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Worksite {
  id: string;
  name: string;
  address?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessLog {
  id: string;
  user_id: string;
  login_time: string;
  logout_time?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface PreviousDayReport {
  id: string;
  user_id: string;
  report_date: string;
  next_wake_up_time: string;
  next_departure_time: string;
  next_arrival_time: string;
  appearance_photo_url: string;
  route_photo_url: string;
  notes?: string;
  actual_attendance_record_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<User, "id" | "created_at" | "updated_at">>;
      };
      attendance_records: {
        Row: AttendanceRecord;
        Insert: Omit<AttendanceRecord, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<AttendanceRecord, "id" | "created_at" | "updated_at">>;
      };
      daily_reports: {
        Row: DailyReport;
        Insert: Omit<DailyReport, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DailyReport, "id" | "created_at" | "updated_at">>;
      };
      access_logs: {
        Row: AccessLog;
        Insert: Omit<AccessLog, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<AccessLog, "id" | "created_at">>;
      };
      previous_day_reports: {
        Row: PreviousDayReport;
        Insert: Omit<PreviousDayReport, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PreviousDayReport, "id" | "created_at" | "updated_at">>;
      };
      staff_availability: {
        Row: StaffAvailability;
        Insert: Omit<StaffAvailability, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<StaffAvailability, "id" | "created_at" | "updated_at">>;
      };
      worksites: {
        Row: Worksite;
        Insert: Omit<Worksite, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Worksite, "id" | "created_at" | "updated_at">>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_manager: {
        Args: { user_id: string };
        Returns: boolean;
      };
      get_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
    };
    Enums: {
      user_role: UserRole;
      attendance_status: AttendanceStatus;
      report_status: ReportStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
