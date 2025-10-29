"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User, AttendanceRecord, DailyReport, Alert, FilterOptions } from "@/types/database";
import Link from "next/link";
import { getTodayJST } from "../../utils/dateUtils";

interface StaffWithDetails extends User {
  todayAttendance?: AttendanceRecord;
  todayReport?: DailyReport;
  previousDayReport?: any; // 前日報告
  activeAlerts: Alert[];
  lastLogin?: string;
  totalReports: number;
  attendanceRate: number;
}

interface StaffListProps {
  searchQuery?: string;
  statusFilter?: FilterOptions["status"];
  viewMode?: "today" | "tomorrow";
}

export default function StaffList({ searchQuery = "", statusFilter = "all", viewMode = "today" }: StaffListProps) {
  const [staffList, setStaffList] = useState<StaffWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"name" | "status" | "reports" | "attendance" | "active">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [updatingActive, setUpdatingActive] = useState<string | null>(null);
  const [updatingNextDayActive, setUpdatingNextDayActive] = useState<string | null>(null);

  const fetchStaffDetails = async () => {
    try {
      setLoading(true);
      const today = getTodayJST();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // Fetch all staff members
      const { data: staff, error: staffError } = await supabase.from("users").select("*").eq("role", "staff").order("name");

      if (staffError) throw staffError;

      // Fetch today's attendance records
      const { data: todayAttendance, error: attendanceError } = await supabase.from("attendance_records").select("*").eq("date", today);

      if (attendanceError) throw attendanceError;

      // Fetch today's daily reports
      const { data: todayReports, error: reportsError } = await supabase.from("daily_reports").select("*").eq("date", today);

      if (reportsError) throw reportsError;

      // Fetch all previous day reports (used and unused)
      // 管理者は全ての前日報告を確認する必要がある
      const { data: previousDayReports, error: previousDayError } = await supabase.from("previous_day_reports").select("*");

      if (previousDayError) throw previousDayError;

      // Fetch active alerts
      const { data: alerts, error: alertsError } = await supabase.from("alerts").select("*").eq("status", "active");

      if (alertsError) throw alertsError;

      // Fetch recent access logs
      const { data: accessLogs, error: logsError } = await supabase.from("access_logs").select("user_id, login_time").order("login_time", { ascending: false });

      if (logsError) throw logsError;

      // Fetch report counts for the last 30 days
      const { data: reportCounts, error: reportCountsError } = await supabase
        .from("daily_reports")
        .select("staff_id")
        .gte("date", thirtyDaysAgo)
        .eq("status", "submitted");

      if (reportCountsError) throw reportCountsError;

      // Fetch attendance records for the last 30 days to calculate attendance rate
      const { data: attendanceRecords, error: attendanceRecordsError } = await supabase
        .from("attendance_records")
        .select("staff_id, date")
        .gte("date", thirtyDaysAgo);

      if (attendanceRecordsError) throw attendanceRecordsError;

      // Combine data
      const staffWithDetails: StaffWithDetails[] = ((staff as User[]) || []).map((staffMember) => {
        // Get the most recent active attendance record for this staff member
        const staffAttendanceRecords = ((todayAttendance as AttendanceRecord[]) || [])
          .filter((record) => record.staff_id === staffMember.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const todayAttendanceRecord = staffAttendanceRecords.find((record) => ["pending", "partial", "active"].includes(record.status)) || undefined;
        const todayReportRecord = ((todayReports as DailyReport[]) || []).find((report) => report.staff_id === staffMember.id);

        // 前日報告の検索: 今日のattendance_recordに紐づいたものまたは未使用のもの
        let previousDayReportRecord = null;

        // まず、今日のattendance_recordに紐づいた前日報告を確認
        if (todayAttendanceRecord) {
          previousDayReportRecord = ((previousDayReports as any[]) || []).find(
            (report) => report.user_id === staffMember.id && report.actual_attendance_record_id === todayAttendanceRecord.id
          );
        }

        // 紐づいた前日報告がない場合、未使用の前日報告を確認
        if (!previousDayReportRecord) {
          previousDayReportRecord = ((previousDayReports as any[]) || []).find(
            (report) => report.user_id === staffMember.id && !report.actual_attendance_record_id
          );
        }

        console.log(`StaffList - Previous day report search for ${staffMember.name}:`, {
          staffId: staffMember.id,
          todayAttendanceId: todayAttendanceRecord?.id,
          allPreviousDayReports: ((previousDayReports as any[]) || []).filter((r) => r.user_id === staffMember.id),
          selectedReport: previousDayReportRecord,
        });
        const activeAlertsForStaff = ((alerts as Alert[]) || []).filter((alert) => alert.staff_id === staffMember.id);
        const lastLogin = ((accessLogs as any[]) || []).find((log) => log.user_id === staffMember.id)?.login_time;

        // Calculate total reports in last 30 days
        const totalReports = ((reportCounts as any[]) || []).filter((report) => report.staff_id === staffMember.id).length;

        // Calculate attendance rate (days with any attendance record / 30 days)
        const attendanceDays = new Set(
          ((attendanceRecords as AttendanceRecord[]) || []).filter((record) => record.staff_id === staffMember.id).map((record) => record.date)
        ).size;
        const attendanceRate = Math.round((attendanceDays / 30) * 100);

        return {
          ...staffMember,
          todayAttendance: todayAttendanceRecord,
          todayReport: todayReportRecord,
          previousDayReport: previousDayReportRecord,
          activeAlerts: activeAlertsForStaff,
          lastLogin,
          totalReports,
          attendanceRate,
        };
      });

      setStaffList(staffWithDetails);
    } catch (error) {
      console.error("Error fetching staff details:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort staff
  const getFilteredAndSortedStaff = () => {
    let filtered = [...staffList];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (staff) => staff.name.toLowerCase().includes(searchQuery.toLowerCase()) || staff.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((staff) => {
        switch (statusFilter) {
          case "active":
            return staff.todayAttendance || staff.todayReport;
          case "inactive":
            return !staff.todayAttendance && !staff.todayReport;
          case "alerts":
            return staff.activeAlerts.length > 0;
          case "active_staff":
            return staff.active;
          case "inactive_staff":
            return !staff.active;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "name":
          aValue = a.name;
          bValue = b.name;
          break;
        case "status":
          aValue = getActivityScore(a);
          bValue = getActivityScore(b);
          break;
        case "reports":
          aValue = a.totalReports;
          bValue = b.totalReports;
          break;
        case "attendance":
          aValue = a.attendanceRate;
          bValue = b.attendanceRate;
          break;
        case "active":
          aValue = a.active ? 1 : 0;
          bValue = b.active ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string") {
        return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }
    });

    return filtered;
  };

  const getActivityScore = (staff: StaffWithDetails) => {
    let score = 0;
    const tasks = {
      previousDayReport: !!staff.previousDayReport,
      wakeUp: !!staff.todayAttendance?.wake_up_time,
      departure: !!staff.todayAttendance?.departure_time,
      arrival: !!staff.todayAttendance?.arrival_time,
      dailyReport: staff.todayReport?.status === "submitted",
    };

    if (tasks.previousDayReport) score += 1; // 前日報告
    if (tasks.wakeUp) score += 1; // 起床報告
    if (tasks.departure) score += 1; // 出発報告
    if (tasks.arrival) score += 1; // 到着報告
    if (tasks.dailyReport) score += 1; // 日報提出

    console.log(`StaffList - Activity score for ${staff.name}:`, {
      tasks,
      score,
      previousDayReportData: staff.previousDayReport,
      todayAttendanceData: staff.todayAttendance,
    });

    return score;
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const formatLastLogin = (loginTime?: string) => {
    if (!loginTime) return "未ログイン";
    const date = new Date(loginTime);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return "1時間以内";
    if (diffHours < 24) return `${diffHours}時間前`;
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  };

  const toggleActiveStatus = async (staffId: string, currentActive: boolean) => {
    try {
      setUpdatingActive(staffId);

      const response = await fetch(`/api/staff/${staffId}/active`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "activeステータスの更新に失敗しました");
      }

      // Update only the specific staff member's active status in the local state
      setStaffList((prevStaff) => prevStaff.map((staff) => (staff.id === staffId ? { ...staff, active: !currentActive } : staff)));
    } catch (error) {
      console.error("Error updating active status:", error);
      alert("activeステータスの更新に失敗しました");
    } finally {
      setUpdatingActive(null);
    }
  };

  const toggleNextDayActiveStatus = async (staffId: string, currentNextDayActive: boolean) => {
    try {
      setUpdatingNextDayActive(staffId);

      const response = await fetch(`/api/staff/${staffId}/next-day-active`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ next_day_active: !currentNextDayActive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "翌日activeステータスの更新に失敗しました");
      }

      // Update only the specific staff member's next_day_active status in the local state
      setStaffList((prevStaff) => prevStaff.map((staff) => (staff.id === staffId ? { ...staff, next_day_active: !currentNextDayActive } : staff)));
    } catch (error) {
      console.error("Error updating next day active status:", error);
      alert("翌日activeステータスの更新に失敗しました");
    } finally {
      setUpdatingNextDayActive(null);
    }
  };

  const getStatusBadge = (staff: StaffWithDetails) => {
    const score = getActivityScore(staff);
    const hasAlerts = staff.activeAlerts.length > 0;

    if (hasAlerts) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">要注意</span>;
    }
    if (score === 4) {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">完了</span>;
    }
    if (score > 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">進行中</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">未開始</span>;
  };

  useEffect(() => {
    fetchStaffDetails();

    // Set up real-time subscriptions
    const attendanceSubscription = supabase
      .channel("staff_attendance_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records" }, () => {
        fetchStaffDetails();
      })
      .subscribe();

    const reportsSubscription = supabase
      .channel("staff_reports_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_reports" }, () => {
        fetchStaffDetails();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceSubscription);
      supabase.removeChannel(reportsSubscription);
    };
  }, []);

  const filteredStaff = getFilteredAndSortedStaff();

  if (loading) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">スタッフ一覧 ({filteredStaff.length})</h3>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">表示中: {viewMode === "today" ? "当日" : "翌日"}ステータス</span>
            <button
              onClick={fetchStaffDetails}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              全データ更新
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort("name")}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center">
                  スタッフ
                  {sortBy === "name" && (
                    <svg className={`w-4 h-4 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort("status")}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center">
                  本日のステータス
                  {sortBy === "status" && (
                    <svg className={`w-4 h-4 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort("reports")}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center">
                  月間報告数
                  {sortBy === "reports" && (
                    <svg className={`w-4 h-4 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort("attendance")}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center">
                  出勤率
                  {sortBy === "attendance" && (
                    <svg className={`w-4 h-4 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort("active")}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center">
                  {viewMode === "today" ? "当日ステータス" : "翌日ステータス"}
                  {sortBy === "active" && (
                    <svg className={`w-4 h-4 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最終ログイン</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStaff.map((staff) => (
              <tr key={staff.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">{staff.name.charAt(0)}</span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                      <div className="text-sm text-gray-500">{staff.email}</div>
                      {staff.phone && <div className="text-xs text-gray-400">{staff.phone}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(staff)}
                    {staff.activeAlerts.length > 0 && <span className="text-xs text-red-600">{staff.activeAlerts.length}件のアラート</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">進捗: {getActivityScore(staff)}/5</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{staff.totalReports}件</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm text-gray-900">{staff.attendanceRate}%</div>
                    <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          staff.attendanceRate >= 80 ? "bg-green-500" : staff.attendanceRate >= 60 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${staff.attendanceRate}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() =>
                      viewMode === "today" ? toggleActiveStatus(staff.id, staff.active) : toggleNextDayActiveStatus(staff.id, staff.next_day_active)
                    }
                    disabled={viewMode === "today" ? updatingActive === staff.id : updatingNextDayActive === staff.id}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      (viewMode === "today" ? staff.active : staff.next_day_active)
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    } ${
                      (viewMode === "today" ? updatingActive === staff.id : updatingNextDayActive === staff.id)
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    {(viewMode === "today" ? updatingActive === staff.id : updatingNextDayActive === staff.id) ? (
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${
                          (viewMode === "today" ? staff.active : staff.next_day_active) ? "bg-green-500" : "bg-gray-400"
                        }`}
                      ></div>
                    )}
                    {(viewMode === "today" ? staff.active : staff.next_day_active) ? "活動中" : "非活動"}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatLastLogin(staff.lastLogin)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link href={`/manager/staff/${staff.id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                    詳細
                  </Link>
                  <Link href={`/manager/staff/${staff.id}/history`} className="text-gray-600 hover:text-gray-900">
                    履歴
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">👤</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">スタッフが見つかりません</h3>
          <p className="text-gray-600">{searchQuery || statusFilter !== "all" ? "検索条件を変更してください" : "スタッフを追加してください"}</p>
        </div>
      )}
    </div>
  );
}
