"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { User, AttendanceRecord, DailyReport, FilterOptions } from "@/types/database";
import StaffStatusCard from "./StaffStatusCard";
import StaffFilters from "./StaffFilters";
import StatsDetailModal from "./StatsDetailModal";
import { getTodayJST } from "../../utils/dateUtils";

interface StaffWithStatus extends User {
  todayAttendance?: AttendanceRecord;
  resetRecord?: AttendanceRecord; // リセットレコードの詳細
  todayReport?: DailyReport;
  previousDayReport?: any; // 前日報告データ
  todayPreviousDayReport?: any; // 当日の前日報告データ
  activeAlerts: any[]; // Keep for compatibility but will be empty
  lastLogin?: string;
  hasResetToday?: boolean; // リセットされたかどうか
  hasActiveRecord?: boolean; // アクティブな記録があるかどうか
}

export default function ManagerDashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffWithStatus[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    status: "all",
    sortBy: "status",
    dayView: "today",
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [statsModal, setStatsModal] = useState<{
    isOpen: boolean;
    type: "previous" | "preparing" | "active" | "completed" | null;
  }>({ isOpen: false, type: null });
  const [showTodayReports, setShowTodayReports] = useState(false); // 当日の前日報告表示フラグ
  const [dashboardViewPreference, setDashboardViewPreference] = useState<"today" | "next_day">("today"); // データベースから読み込む設定

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showProfileMenu && !target.closest(".relative")) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  // Load manager's dashboard view preference
  const loadDashboardPreference = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.from("users").select("dashboard_view_preference").eq("id", user.id).single();

      if (error) {
        console.error("Error loading dashboard preference:", error);
        return;
      }

      // Type-safe access to the preference field
      const preference = (data as any)?.dashboard_view_preference as "today" | "next_day" | undefined;
      const finalPreference = preference || "today";
      setDashboardViewPreference(finalPreference);
      setShowTodayReports(finalPreference === "next_day");
    } catch (error) {
      console.error("Error loading dashboard preference:", error);
    }
  };

  // Save manager's dashboard view preference
  const saveDashboardPreference = async (preference: "today" | "next_day") => {
    if (!user?.id) return;

    try {
      // Method 1: Try using the database function with type assertion
      const { error } = await (supabase as any).rpc("update_user_dashboard_preference", {
        user_id: user.id,
        preference: preference,
      });

      // Method 2: Fallback to direct update if RPC function doesn't exist
      if (error && error.message?.includes("function")) {
        console.log("RPC function not found, using direct update");
        // Cast the entire supabase client to bypass strict typing
        const supabaseAny = supabase as any;
        const { error: updateError } = await supabaseAny.from("users").update({ dashboard_view_preference: preference }).eq("id", user.id);

        if (updateError) {
          console.error("Error saving dashboard preference:", updateError);
          return;
        }
      } else if (error) {
        console.error("Error saving dashboard preference:", error);
        return;
      }

      setDashboardViewPreference(preference);
      setShowTodayReports(preference === "next_day");
    } catch (error) {
      console.error("Error saving dashboard preference:", error);
    }
  };

  // Fetch staff data
  const fetchStaffData = async () => {
    try {
      setLoading(true);
      const today = getTodayJST();
      console.log("[ManagerDashboard] Using date:", today);

      // Fetch all staff members
      const { data: staff, error: staffError } = await supabase.from("users").select("*").eq("role", "staff").order("name");

      if (staffError) throw staffError;

      // Fetch today's attendance records
      const { data: attendanceRecords, error: attendanceError } = await supabase.from("attendance_records").select("*").eq("date", today);

      if (attendanceError) throw attendanceError;

      // Fetch today's daily reports (submitted or archived - any report counts as completion)
      const { data: dailyReports, error: reportsError } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("date", today)
        .in("status", ["submitted", "archived"]);

      if (reportsError) throw reportsError;

      // Fetch all previous day reports (used and unused)
      // 管理者は全ての前日報告を確認する必要がある
      const { data: previousDayReports, error: previousDayError } = await supabase.from("previous_day_reports").select("*");

      // Fetch today's previous day reports (reports made today for tomorrow)
      const { data: todayPreviousDayReports, error: todayPreviousError } = await supabase.from("previous_day_reports").select("*").eq("report_date", today);

      if (previousDayError) throw previousDayError;
      if (todayPreviousError) throw todayPreviousError;

      // Fetch the most recent access log for each user more efficiently
      const staffIds = ((staff as User[]) || []).map((s) => s.id);
      const { data: accessLogs } = await supabase
        .from("access_logs")
        .select("user_id, login_time")
        .in("user_id", staffIds)
        .order("user_id, login_time", { ascending: false });

      // Create a map for quick lookup of last login times
      const lastLoginMap = new Map();
      if (accessLogs) {
        // Group by user_id and get the most recent login for each user
        const userLogins = new Map();
        accessLogs.forEach((log: any) => {
          if (!userLogins.has(log.user_id) || new Date(log.login_time) > new Date(userLogins.get(log.user_id))) {
            userLogins.set(log.user_id, log.login_time);
          }
        });
        userLogins.forEach((loginTime, userId) => {
          lastLoginMap.set(userId, loginTime);
        });
      }

      // Combine data
      const staffWithStatus: StaffWithStatus[] = ((staff as User[]) || []).map((staffMember) => {
        // Get the most recent active attendance record for this staff member
        const staffAttendanceRecords = ((attendanceRecords as AttendanceRecord[]) || [])
          .filter((record) => record.staff_id === staffMember.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Find the most recent attendance record (including reset records)
        // Get the most recent active attendance record (exclude archived, complete, and reset)
        const todayAttendance = staffAttendanceRecords.find((record) => ["pending", "partial", "active"].includes(record.status)) || undefined;

        // Check if user has been reset today (has reset record but no active record)
        const hasResetToday = staffAttendanceRecords.some((record) => record.status === "reset");
        const hasActiveRecord = staffAttendanceRecords.some((record) => ["pending", "partial", "active"].includes(record.status));

        // Get reset record details if exists
        const resetRecord = staffAttendanceRecords.find((record) => record.status === "reset");

        const todayReport = ((dailyReports as DailyReport[]) || []).find((report) => report.staff_id === staffMember.id);

        // 前日報告の検索: 今日のattendance_recordに紐づいたものまたは未使用のもの
        let previousDayReport = null;

        // まず、今日のattendance_recordに紐づいた前日報告を確認
        if (todayAttendance) {
          previousDayReport = ((previousDayReports as any[]) || []).find(
            (report) => report.user_id === staffMember.id && report.actual_attendance_record_id === todayAttendance.id
          );
        }

        // 紐づいた前日報告がない場合、未使用の前日報告を確認
        if (!previousDayReport) {
          previousDayReport = ((previousDayReports as any[]) || []).find((report) => report.user_id === staffMember.id && !report.actual_attendance_record_id);
        }

        // 当日の前日報告（今日報告された明日の予定）
        const todayPreviousDayReport = ((todayPreviousDayReports as any[]) || []).find((report) => report.user_id === staffMember.id);
        const lastLogin = lastLoginMap.get(staffMember.id);

        return {
          ...staffMember,
          todayAttendance: hasActiveRecord ? todayAttendance : undefined, // リセットのみの場合はundefined
          resetRecord, // リセットレコードの詳細を追加
          todayReport,
          previousDayReport,
          todayPreviousDayReport, // 当日の前日報告を追加
          activeAlerts: [], // Keep for compatibility but empty
          lastLogin,
          hasResetToday,
          hasActiveRecord,
        };
      });

      setStaffList(staffWithStatus);
    } catch (error) {
      console.error("Error fetching staff data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...staffList];

    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter(
        (staff) => staff.name.toLowerCase().includes(filters.search.toLowerCase()) || staff.email.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((staff) => {
        switch (filters.status) {
          case "active_staff":
            // 活動予定のスタッフ: activeがtrueのスタッフ
            return staff.active;
          case "inactive_staff":
            // 非活動のスタッフ: activeがfalseのスタッフ
            return !staff.active;
          case "scheduled":
            // 活動予定: 起床して到着報告がまだないユーザー
            return staff.todayAttendance?.wake_up_time && !staff.todayAttendance?.arrival_time;
          case "preparing":
            // 準備中: 何も活動していないユーザー（リセットされたユーザーは除く）
            return !staff.todayAttendance && !staff.todayReport && !staff.hasResetToday;
          case "active":
            // 活動中: 到着報告完了したが日報未提出のユーザー
            return staff.todayAttendance?.arrival_time && !staff.todayReport;
          case "completed":
            // 完了: 当日の日付で日報が1つでもあるユーザー（提出済み・アーカイブ済み含む）+ リセットされたユーザー
            return staff.todayReport || (staff.hasResetToday && !staff.hasActiveRecord);
          case "inactive":
            // 未活動: 何も活動していないユーザー（リセットされたユーザーは除く）- 準備中と同じ
            return !staff.todayAttendance && !staff.todayReport && !staff.hasResetToday;
          default:
            return true;
        }
      });
    }

    // Apply sorting - 活動中ユーザーを最初に、その中で進捗が遅い順
    filtered.sort((a, b) => {
      // まず活動ステータスで分ける（表示モードに応じてactiveまたはnext_day_activeを参照）
      const aActive = showTodayReports ? a.next_day_active : a.active;
      const bActive = showTodayReports ? b.next_day_active : b.active;

      if (aActive !== bActive) {
        return bActive ? 1 : -1; // active: true が先に来る
      }

      // 同じ活動ステータス内では、選択されたソート方法に従う
      switch (filters.sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "status":
          if (showTodayReports) {
            // 翌日モード: 前日報告の有無でソート（未報告が先に来る）
            const aScore = getActivityScore(a); // 0 or 1
            const bScore = getActivityScore(b); // 0 or 1
            return aScore - bScore; // 未報告(0)が先、報告済み(1)が後
          } else {
            // 当日モード: 進捗スコアでソート
            const aScore = getActivityScore(a);
            const bScore = getActivityScore(b);
            return aScore - bScore;
          }
        case "lastActivity":
          const aTime = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          const bTime = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          return bTime - aTime;
        default:
          if (showTodayReports) {
            // 翌日モード: デフォルトは前日報告の有無でソート（未報告が先）
            const aScore = getActivityScore(a); // 0 or 1
            const bScore = getActivityScore(b); // 0 or 1
            return aScore - bScore; // 未報告(0)が先、報告済み(1)が後
          } else {
            // 当日モード: デフォルトは進捗が遅い順
            const defaultAScore = getActivityScore(a);
            const defaultBScore = getActivityScore(b);
            return defaultAScore - defaultBScore;
          }
      }
    });

    setFilteredStaff(filtered);
  }, [staffList, filters, showTodayReports]);

  // Calculate activity score for sorting (低いスコア = 進捗が遅い = 優先度高)
  const getActivityScore = (staff: StaffWithStatus) => {
    // 翌日モードの場合は、前日報告の有無のみで判定（0 or 1）
    if (showTodayReports) {
      // 翌日モード: 当日の前日報告（明日の予定）があるかどうかのみ
      return staff.todayPreviousDayReport ? 1 : 0; // 報告済み=1, 未報告=0
    }

    // 当日モード: シンプルに4段階の進捗
    // 完了済み（最低優先度）
    if (staff.todayReport || (staff.hasResetToday && !staff.hasActiveRecord)) {
      return 100; // 完了済みは最後
    }

    // 到着報告済みだが日報未提出（高優先度）
    if (staff.todayAttendance?.arrival_time) {
      return 10; // 日報提出を促すべき
    }

    // 出発報告済みだが到着報告未完了
    if (staff.todayAttendance?.departure_time) {
      return 8;
    }

    // 起床報告済みだが出発報告未完了
    if (staff.todayAttendance?.wake_up_time) {
      return 6;
    }

    // 何も報告していない（最高優先度）
    return 1;
  };

  // Get dashboard statistics
  const getStats = () => {
    const totalStaff = staffList.length;
    const activeStaffCount = showTodayReports
      ? staffList.filter((staff) => staff.next_day_active).length // 翌日モード: 翌日activeなスタッフ数
      : staffList.filter((staff) => staff.active).length; // 当日モード: 当日activeなスタッフ数

    // 前日報告: 表示モードに応じて計算
    const activeStaffWithPreviousDayReport = showTodayReports
      ? // 翌日モード: 当日前日報告した人数（翌日の予定として報告）
        staffList.filter((staff) => staff.next_day_active && staff.todayPreviousDayReport).length
      : // 当日モード: 昨日前日報告した人数（当日の予定として報告された）
        staffList.filter(
          (staff) =>
            staff.active &&
            (staff.previousDayReport || staff.todayAttendance?.arrival_time || staff.todayReport || (staff.hasResetToday && !staff.hasActiveRecord))
        ).length;

    // 準備中: 翌日モードでは0
    const preparingStaff = showTodayReports
      ? 0
      : staffList.filter(
          (staff) =>
            staff.active &&
            ((staff.todayAttendance?.wake_up_time && !staff.todayAttendance?.departure_time) ||
              staff.todayAttendance?.departure_time ||
              staff.todayAttendance?.arrival_time ||
              staff.todayReport ||
              (staff.hasResetToday && !staff.hasActiveRecord))
        ).length;

    // 活動中: 翌日モードでは0
    const activeToday = showTodayReports
      ? 0
      : staffList.filter(
          (staff) =>
            staff.active &&
            ((staff.todayAttendance?.arrival_time && !staff.todayReport) || staff.todayReport || (staff.hasResetToday && !staff.hasActiveRecord))
        ).length;

    // 完了報告: 翌日モードでは0
    const completedReports = showTodayReports
      ? 0
      : staffList.filter((staff) => staff.active && (staff.todayReport || (staff.hasResetToday && !staff.hasActiveRecord))).length;

    const activeStaff = staffList.filter((staff) => staff.todayAttendance || staff.todayReport || staff.hasResetToday);

    // Debug log
    console.log("[DEBUG] Stats calculation:", {
      totalStaff,
      activeStaffCount,
      activeStaffWithPreviousDayReport,
      preparingStaff,
      activeToday,
      completedReports,
      staffWithReports: staffList.filter((staff) => staff.todayReport).map((s) => s.name),
      staffWithReset: staffList.filter((staff) => staff.hasResetToday && !staff.hasActiveRecord).map((s) => s.name),
      preparingStaffDetails: staffList
        .filter((staff) => staff.active && staff.todayAttendance?.wake_up_time && !staff.todayAttendance?.arrival_time)
        .map((s) => s.name),
      activeTodayDetails: staffList.filter((staff) => staff.active && staff.todayAttendance?.arrival_time && !staff.todayReport).map((s) => s.name),
    });

    return {
      totalStaff,
      activeStaffCount,
      activeStaffWithPreviousDayReport,
      preparingStaff,
      activeToday,
      completedReports,
      activeStaff: activeStaff.length,
      activityRate: totalStaff > 0 ? Math.round((activeToday / totalStaff) * 100) : 0,
    };
  };

  // Get detailed stats for modal
  const getStatsDetail = (type: "previous" | "preparing" | "active" | "completed") => {
    // 表示モードに応じて対象スタッフを決定
    const activeStaff = showTodayReports
      ? staffList.filter((staff) => staff.next_day_active) // 翌日モード: 翌日activeなスタッフ
      : staffList.filter((staff) => staff.active); // 当日モード: 当日activeなスタッフ

    switch (type) {
      case "previous":
        return showTodayReports
          ? {
              // 翌日モード: 当日前日報告した人（翌日の予定として報告）
              completed: activeStaff.filter((staff) => staff.todayPreviousDayReport),
              pending: activeStaff.filter((staff) => !staff.todayPreviousDayReport),
            }
          : {
              // 当日モード: 昨日前日報告した人（当日の予定として報告された）
              completed: activeStaff.filter(
                (staff) =>
                  staff.previousDayReport || staff.todayAttendance?.arrival_time || staff.todayReport || (staff.hasResetToday && !staff.hasActiveRecord)
              ),
              pending: activeStaff.filter(
                (staff) =>
                  !staff.previousDayReport && !staff.todayAttendance?.arrival_time && !staff.todayReport && !(staff.hasResetToday && !staff.hasActiveRecord)
              ),
            };
      case "preparing":
        return showTodayReports
          ? {
              // 翌日モード: 準備中は基本的に0
              completed: [],
              pending: activeStaff,
            }
          : {
              // 当日モード: 準備中の計算（起床報告済み）
              completed: activeStaff.filter(
                (staff) =>
                  (staff.todayAttendance?.wake_up_time && !staff.todayAttendance?.departure_time) ||
                  staff.todayAttendance?.departure_time ||
                  staff.todayAttendance?.arrival_time ||
                  staff.todayReport ||
                  (staff.hasResetToday && !staff.hasActiveRecord)
              ),
              pending: activeStaff.filter(
                (staff) =>
                  !staff.todayAttendance?.wake_up_time &&
                  !staff.todayAttendance?.departure_time &&
                  !staff.todayAttendance?.arrival_time &&
                  !staff.todayReport &&
                  !(staff.hasResetToday && !staff.hasActiveRecord)
              ),
            };
      case "active":
        return showTodayReports
          ? {
              // 翌日モード: 活動中は基本的に0
              completed: [],
              pending: activeStaff,
            }
          : {
              // 当日モード: 活動中の計算
              completed: activeStaff.filter(
                (staff) => (staff.todayAttendance?.arrival_time && !staff.todayReport) || staff.todayReport || (staff.hasResetToday && !staff.hasActiveRecord)
              ),
              pending: activeStaff.filter(
                (staff) => !staff.todayAttendance?.arrival_time && !staff.todayReport && !(staff.hasResetToday && !staff.hasActiveRecord)
              ),
            };
      case "completed":
        return showTodayReports
          ? {
              // 翌日モード: 完了報告は基本的に0
              completed: [],
              pending: activeStaff,
            }
          : {
              // 当日モード: 完了報告の計算
              completed: activeStaff.filter((staff) => staff.todayReport || (staff.hasResetToday && !staff.hasActiveRecord)),
              pending: activeStaff.filter((staff) => !staff.todayReport && !(staff.hasResetToday && !staff.hasActiveRecord)),
            };
      default:
        return { completed: [], pending: [] };
    }
  };

  // Handle stats card click
  const handleStatsCardClick = (type: "previous" | "preparing" | "active" | "completed") => {
    setStatsModal({ isOpen: true, type });
  };

  // Load dashboard preference on component mount
  useEffect(() => {
    if (user?.id) {
      loadDashboardPreference();
    }
  }, [user?.id]);

  // Set up real-time subscriptions
  useEffect(() => {
    fetchStaffData();

    // Subscribe to real-time updates
    const attendanceSubscription = supabase
      .channel("attendance_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records" }, () => {
        fetchStaffData();
      })
      .subscribe();

    const reportsSubscription = supabase
      .channel("reports_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_reports" }, () => {
        fetchStaffData();
      })
      .subscribe();

    const previousDaySubscription = supabase
      .channel("previous_day_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "previous_day_reports" }, () => {
        fetchStaffData();
      })
      .subscribe();

    const usersSubscription = supabase
      .channel("users_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        fetchStaffData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceSubscription);
      supabase.removeChannel(reportsSubscription);
      supabase.removeChannel(previousDaySubscription);
      supabase.removeChannel(usersSubscription);
    };
  }, []);

  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-base sm:text-xl font-semibold text-gray-900">ダッシュボード</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-xs sm:text-sm text-gray-600">
                {currentTime.toLocaleString("ja-JP", {
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              {/* 当日/翌日切り替えボタン */}
              <button
                onClick={async () => {
                  console.log("[DEBUG] ===== BUTTON CLICKED =====");
                  console.log(`[DEBUG] Current state - dashboardViewPreference: ${dashboardViewPreference}, showTodayReports: ${showTodayReports}`);

                  const newPreference = dashboardViewPreference === "today" ? "next_day" : "today";
                  console.log(`[DEBUG] Button clicked. Current: ${dashboardViewPreference}, New: ${newPreference}`);

                  await saveDashboardPreference(newPreference);

                  // Verify the change was saved
                  setTimeout(async () => {
                    console.log("[DEBUG] Verifying database state...");
                    if (user?.id) {
                      const { data } = await supabase.from("users").select("dashboard_view_preference").eq("id", user.id).single();
                      console.log("[DEBUG] Current DB value:", data);
                    }
                  }, 1000);
                }}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  showTodayReports
                    ? "bg-green-100 hover:bg-green-200 text-green-700 border border-green-300" // 翌日モード: 緑色
                    : "bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300" // 当日モード: 青色
                }`}
                title={showTodayReports ? "翌日の統計を表示中" : "当日の統計を表示中"}
              >
                {showTodayReports ? "翌日" : "当日"}
              </button>

              {/* Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                      <div className="font-medium">{user?.name}</div>
                      <div className="text-xs text-gray-500">{user?.email}</div>
                    </div>

                    <Link
                      href="/register"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        スタッフ新規登録
                      </div>
                    </Link>

                    <Link
                      href="/manager/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        プロフィール
                      </div>
                    </Link>

                    <div className="border-t border-gray-100">
                      <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                          ログアウト
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <StatCard
            title="前日報告"
            mobileTitle="前日報告"
            value={stats.activeStaffWithPreviousDayReport}
            subtitle={`/ ${stats.activeStaffCount}`}
            icon=""
            color="orange"
            onClick={() => handleStatsCardClick("previous")}
            isCompleted={stats.activeStaffWithPreviousDayReport === stats.activeStaffCount}
            pendingCount={stats.activeStaffCount - stats.activeStaffWithPreviousDayReport}
          />
          <StatCard
            title="準備中"
            mobileTitle="準備中"
            value={stats.preparingStaff}
            subtitle={`/ ${stats.activeStaffCount}`}
            icon=""
            color="gray"
            onClick={() => handleStatsCardClick("preparing")}
            isCompleted={stats.preparingStaff === stats.activeStaffCount}
            pendingCount={stats.activeStaffCount - stats.preparingStaff}
          />
          <StatCard
            title="活動中"
            mobileTitle="活動中"
            value={stats.activeToday}
            subtitle={`/ ${stats.activeStaffCount}`}
            icon=""
            color="green"
            onClick={() => handleStatsCardClick("active")}
            isCompleted={stats.activeToday === stats.activeStaffCount}
            pendingCount={stats.activeStaffCount - stats.activeToday}
          />
          <StatCard
            title="完了報告"
            mobileTitle="完了"
            value={stats.completedReports}
            subtitle={`/ ${stats.activeStaffCount}`}
            icon=""
            color="purple"
            onClick={() => handleStatsCardClick("completed")}
            isCompleted={stats.completedReports === stats.activeStaffCount}
            pendingCount={stats.activeStaffCount - stats.completedReports}
          />
        </div>

        {/* Filters */}
        <StaffFilters filters={filters} onFiltersChange={setFilters} />

        {/* Staff Status Grid */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">スタッフステータス ({filteredStaff.length})</h2>
            <div className="flex space-x-3">
              <button
                onClick={fetchStaffData}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                更新
              </button>
            </div>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <div className="text-gray-400 text-6xl mb-4">👤</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">スタッフが見つかりません</h3>
              <p className="text-gray-600">{filters.search || filters.status !== "all" ? "検索条件を変更してください" : "スタッフを追加してください"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStaff.map((staff) => (
                <StaffStatusCard key={staff.id} staff={staff} showTodayReports={showTodayReports} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Detail Modal */}
      {statsModal.type && (
        <StatsDetailModal
          isOpen={statsModal.isOpen}
          onClose={() => setStatsModal({ isOpen: false, type: null })}
          title={
            statsModal.type === "previous"
              ? showTodayReports
                ? "翌日の前日報告"
                : "当日の前日報告"
              : statsModal.type === "preparing"
              ? "準備中"
              : statsModal.type === "active"
              ? "活動中"
              : "完了報告"
          }
          icon={statsModal.type === "previous" ? "" : statsModal.type === "preparing" ? "" : statsModal.type === "active" ? "" : ""}
          completedStaff={getStatsDetail(statsModal.type).completed}
          pendingStaff={getStatsDetail(statsModal.type).pending}
          totalActiveStaff={staffList.filter((staff) => staff.active).length}
        />
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  mobileTitle?: string;
  value: number;
  subtitle?: string;
  icon: string;
  color: "blue" | "green" | "red" | "purple" | "gray" | "orange";
  onClick?: () => void;
  isCompleted?: boolean; // 全員完了かどうか
  pendingCount?: number; // 未完了の人数
}

function StatCard({ title, mobileTitle, value, subtitle, icon, color, onClick, isCompleted, pendingCount }: StatCardProps) {
  // 全員完了の場合はグレー、未完了がいる場合は元の色
  const actualColor = isCompleted ? "gray" : color;

  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    red: "bg-red-50 text-red-600 border-red-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
  };

  // 完了済みは黒字、未完了がある場合はオレンジ
  const valueTextColor = isCompleted ? "text-gray-900" : "text-orange-600";

  // 全員完了時は背景をより濃いグレーに
  const backgroundClass = isCompleted ? "bg-gray-200" : "bg-white";

  return (
    <div className={`${backgroundClass} rounded-lg shadow-sm p-2 sm:p-6 border-l-4 ${colorClasses[actualColor]}`}>
      <div className="flex items-center justify-between sm:block">
        {/* Mobile: Single line layout */}
        <div className="flex items-center sm:hidden">
          <span className="text-base mr-2">{icon}</span>
          <span className="text-xs font-medium text-gray-600 mr-2">{mobileTitle || title}</span>
          <span className={`text-sm font-semibold ${valueTextColor}`} onClick={onClick}>
            {value}
          </span>
          {subtitle && <span className="text-xs text-gray-500 ml-1">{subtitle}</span>}
        </div>

        {/* Desktop: Original layout */}
        <div className="hidden sm:block">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-3">{icon}</span>
            <p className="text-sm font-medium text-gray-600">{title}</p>
          </div>
          <div className={`flex items-baseline ${onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`} onClick={onClick}>
            <p className={`text-2xl font-semibold ${valueTextColor}`}>{value}</p>
            {subtitle && <p className="ml-2 text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
