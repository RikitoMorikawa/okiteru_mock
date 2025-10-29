export type UserRole = "manager" | "staff";
export type AttendanceStatus = "pending" | "partial" | "complete" | "active" | "reset" | "archived";
export type ReportStatus = "draft" | "submitted" | "archived";
export type ShiftStatus = "scheduled" | "confirmed" | "completed";
export type AlertType = "missing_wakeup" | "missing_departure" | "missing_arrival" | "missing_report";
export type AlertStatus = "active" | "dismissed";

// Filter types for UI components
export interface FilterOptions {
  search: string;
  status: "all" | "active" | "inactive" | "scheduled" | "preparing" | "completed" | "alerts";
  sortBy: "name" | "status" | "lastActivity";
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  staff_id: string;
  date: string;
  wake_up_time?: string;
  wake_up_notes?: string;
  departure_time?: string;
  departure_notes?: string;
  arrival_time?: string;
  arrival_location?: string;
  arrival_gps_location?: string;
  arrival_notes?: string;
  route_photo_url?: string;
  appearance_photo_url?: string;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
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

export interface ShiftSchedule {
  id: string;
  staff_id: string;
  date: string;
  start_time: string;
  end_time: string;
  location?: string;
  notes?: string;
  status: ShiftStatus;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  staff_id: string;
  type: AlertType;
  message: string;
  triggered_at: string;
  dismissed_at?: string;
  status: AlertStatus;
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
      shift_schedules: {
        Row: ShiftSchedule;
        Insert: Omit<ShiftSchedule, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ShiftSchedule, "id" | "created_at" | "updated_at">>;
      };
      alerts: {
        Row: Alert;
        Insert: Omit<Alert, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Alert, "id" | "created_at" | "updated_at">>;
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
      shift_status: ShiftStatus;
      alert_type: AlertType;
      alert_status: AlertStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
