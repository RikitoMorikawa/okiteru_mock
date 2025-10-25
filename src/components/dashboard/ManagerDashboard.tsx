"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { User, AttendanceRecord, DailyReport, Alert } from "@/types/database";
import StaffStatusCard from "./StaffStatusCard";
import StaffFilters from "./StaffFilters";

interface StaffWithStatus extends User {
  todayAttendance?: AttendanceRecord;
  todayReport?: DailyReport;
  activeAlerts: Alert[];
  lastLogin?: string;
}

interface FilterOptions {
  search: string;
  status: "all" | "active" | "inactive" | "alerts";
  sortBy: "name" | "status" | "lastActivity";
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
    sortBy: "name",
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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

  // Fetch staff data
  const fetchStaffData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      // Fetch all staff members
      const { data: staff, error: staffError } = await supabase.from("users").select("*").eq("role", "staff").order("name");

      if (staffError) throw staffError;

      // Fetch today's attendance records
      const { data: attendanceRecords, error: attendanceError } = await supabase.from("attendance_records").select("*").eq("date", today);

      if (attendanceError) throw attendanceError;

      // Fetch today's daily reports
      const { data: dailyReports, error: reportsError } = await supabase.from("daily_reports").select("*").eq("date", today);

      if (reportsError) throw reportsError;

      // Fetch active alerts
      const { data: alerts, error: alertsError } = await supabase.from("alerts").select("*").eq("status", "active");

      if (alertsError) throw alertsError;

      // Fetch the most recent access log for each user more efficiently
      const staffIds = ((staff as User[]) || []).map((s) => s.id);
      const { data: accessLogs, error: accessLogsError } = await supabase
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
        const todayAttendance = ((attendanceRecords as AttendanceRecord[]) || []).find((record) => record.staff_id === staffMember.id);
        const todayReport = ((dailyReports as DailyReport[]) || []).find((report) => report.staff_id === staffMember.id);
        const activeAlerts = ((alerts as Alert[]) || []).filter((alert) => alert.staff_id === staffMember.id);
        const lastLogin = lastLoginMap.get(staffMember.id);

        return {
          ...staffMember,
          todayAttendance,
          todayReport,
          activeAlerts,
          lastLogin,
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
          case "active":
            return staff.todayAttendance || staff.todayReport;
          case "inactive":
            return !staff.todayAttendance && !staff.todayReport;
          case "alerts":
            return staff.activeAlerts.length > 0;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "status":
          const aScore = getActivityScore(a);
          const bScore = getActivityScore(b);
          return bScore - aScore;
        case "lastActivity":
          const aTime = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          const bTime = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          return bTime - aTime;
        default:
          return 0;
      }
    });

    setFilteredStaff(filtered);
  }, [staffList, filters]);

  // Calculate activity score for sorting
  const getActivityScore = (staff: StaffWithStatus) => {
    let score = 0;
    if (staff.todayAttendance?.wake_up_time) score += 1;
    if (staff.todayAttendance?.departure_time) score += 1;
    if (staff.todayAttendance?.arrival_time) score += 1;
    if (staff.todayReport) score += 1;
    return score;
  };

  // Get dashboard statistics
  const getStats = () => {
    const totalStaff = staffList.length;
    const activeStaff = staffList.filter((staff) => staff.todayAttendance || staff.todayReport);
    const activeToday = activeStaff.length;
    const totalAlerts = staffList.reduce((sum, staff) => sum + staff.activeAlerts.length, 0);
    const completedReports = activeStaff.filter((staff) => staff.todayReport?.status === "submitted").length;

    return {
      totalStaff,
      activeToday,
      totalAlerts,
      completedReports,
      activeStaff: activeStaff.length,
      activityRate: totalStaff > 0 ? Math.round((activeToday / totalStaff) * 100) : 0,
    };
  };

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

    const alertsSubscription = supabase
      .channel("alerts_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => {
        fetchStaffData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceSubscription);
      supabase.removeChannel(reportsSubscription);
      supabase.removeChannel(alertsSubscription);
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
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 mb-4 sm:mb-8">
          <StatCard title="総スタッフ数" mobileTitle="スタッフ" value={stats.totalStaff} icon="👥" color="blue" />
          <StatCard title="本日活動中" mobileTitle="活動中" value={stats.activeToday} icon="✅" color="green" />
          <StatCard title="アクティブアラート" mobileTitle="アラート" value={stats.totalAlerts} icon="🚨" color={stats.totalAlerts > 0 ? "red" : "gray"} />
          <StatCard title="完了報告" mobileTitle="完了" value={stats.completedReports} subtitle={`/ ${stats.activeStaff}`} icon="📝" color="purple" />
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
                <StaffStatusCard key={staff.id} staff={staff} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  mobileTitle?: string;
  value: number;
  subtitle?: string;
  icon: string;
  color: "blue" | "green" | "red" | "purple" | "gray";
}

function StatCard({ title, mobileTitle, value, subtitle, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    red: "bg-red-50 text-red-600 border-red-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-2 sm:p-6 border-l-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between sm:block">
        {/* Mobile: Single line layout */}
        <div className="flex items-center sm:hidden">
          <span className="text-base mr-2">{icon}</span>
          <span className="text-xs font-medium text-gray-600 mr-2">{mobileTitle || title}</span>
          <span className="text-sm font-semibold text-gray-900">{value}</span>
          {subtitle && <span className="text-xs text-gray-500 ml-1">{subtitle}</span>}
        </div>

        {/* Desktop: Original layout */}
        <div className="hidden sm:flex sm:items-center">
          <div className="flex-shrink-0">
            <span className="text-2xl">{icon}</span>
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
              {subtitle && <p className="ml-2 text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
