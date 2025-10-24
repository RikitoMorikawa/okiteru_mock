"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { User, AttendanceRecord, DailyReport, Alert, AccessLog } from "@/types/database";
import Link from "next/link";
import StaffActivityTimeline from "./StaffActivityTimeline";

interface StaffProfileData extends User {
  recentAttendance: AttendanceRecord[];
  recentReports: DailyReport[];
  activeAlerts: Alert[];
  accessLogs: AccessLog[];
  stats: {
    totalReports: number;
    attendanceRate: number;
    averageWakeUpTime: string;
    averageArrivalTime: string;
    alertCount: number;
  };
}

interface StaffProfileProps {
  staffId: string;
}

export default function StaffProfile({ staffId }: StaffProfileProps) {
  const [staffData, setStaffData] = useState<StaffProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "reports" | "attendance">("overview");

  const fetchStaffProfile = useCallback(async () => {
    try {
      setLoading(true);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // Fetch staff member basic info
      const { data: staff, error: staffError } = await supabase.from("users").select("*").eq("id", staffId).eq("role", "staff").single();

      if (staffError) throw staffError;

      // Fetch recent attendance records (last 30 days)
      const { data: recentAttendance, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("staff_id", staffId)
        .gte("date", thirtyDaysAgo)
        .order("date", { ascending: false });

      if (attendanceError) throw attendanceError;

      // Fetch recent daily reports (last 30 days)
      const { data: recentReports, error: reportsError } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("staff_id", staffId)
        .gte("date", thirtyDaysAgo)
        .order("date", { ascending: false });

      if (reportsError) throw reportsError;

      // Fetch active alerts
      const { data: activeAlerts, error: alertsError } = await supabase
        .from("alerts")
        .select("*")
        .eq("staff_id", staffId)
        .eq("status", "active")
        .order("triggered_at", { ascending: false });

      if (alertsError) throw alertsError;

      // Fetch access logs (last 30 days)
      const { data: accessLogs, error: logsError } = await supabase
        .from("access_logs")
        .select("*")
        .eq("user_id", staffId)
        .gte("login_time", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("login_time", { ascending: false })
        .limit(50);

      if (logsError) throw logsError;

      // Calculate statistics
      const totalReports = ((recentReports as DailyReport[]) || []).filter((report) => report.status === "submitted").length;

      // Calculate attendance rate (days with any attendance record / 30 days)
      const attendanceDays = new Set(((recentAttendance as AttendanceRecord[]) || []).map((record) => record.date)).size;
      const attendanceRate = Math.round((attendanceDays / 30) * 100);

      // Calculate average wake up time
      const wakeUpTimes = ((recentAttendance as AttendanceRecord[]) || [])
        .filter((record) => record.wake_up_time)
        .map((record) => {
          const time = new Date(record.wake_up_time!);
          return time.getHours() * 60 + time.getMinutes();
        });
      const avgWakeUpMinutes = wakeUpTimes.length > 0 ? Math.round(wakeUpTimes.reduce((sum, minutes) => sum + minutes, 0) / wakeUpTimes.length) : 0;
      const avgWakeUpHours = Math.floor(avgWakeUpMinutes / 60);
      const avgWakeUpMins = avgWakeUpMinutes % 60;
      const averageWakeUpTime = wakeUpTimes.length > 0 ? `${avgWakeUpHours.toString().padStart(2, "0")}:${avgWakeUpMins.toString().padStart(2, "0")}` : "--:--";

      // Calculate average arrival time
      const arrivalTimes = ((recentAttendance as AttendanceRecord[]) || [])
        .filter((record) => record.arrival_time)
        .map((record) => {
          const time = new Date(record.arrival_time!);
          return time.getHours() * 60 + time.getMinutes();
        });
      const avgArrivalMinutes = arrivalTimes.length > 0 ? Math.round(arrivalTimes.reduce((sum, minutes) => sum + minutes, 0) / arrivalTimes.length) : 0;
      const avgArrivalHours = Math.floor(avgArrivalMinutes / 60);
      const avgArrivalMins = avgArrivalMinutes % 60;
      const averageArrivalTime =
        arrivalTimes.length > 0 ? `${avgArrivalHours.toString().padStart(2, "0")}:${avgArrivalMins.toString().padStart(2, "0")}` : "--:--";

      // Get total alert count (including dismissed ones)
      const { count: alertCount } = await supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("staff_id", staffId)
        .gte("triggered_at", thirtyDaysAgo);

      const staffProfileData: StaffProfileData = {
        ...(staff as User),
        recentAttendance: recentAttendance || [],
        recentReports: recentReports || [],
        activeAlerts: activeAlerts || [],
        accessLogs: accessLogs || [],
        stats: {
          totalReports,
          attendanceRate,
          averageWakeUpTime,
          averageArrivalTime,
          alertCount: alertCount || 0,
        },
      };

      setStaffData(staffProfileData);
    } catch (error) {
      console.error("Error fetching staff profile:", error);
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    fetchStaffProfile();

    // Set up real-time subscriptions
    const attendanceSubscription = supabase
      .channel(`staff_${staffId}_attendance`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_records",
          filter: `staff_id=eq.${staffId}`,
        },
        () => {
          fetchStaffProfile();
        }
      )
      .subscribe();

    const reportsSubscription = supabase
      .channel(`staff_${staffId}_reports`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_reports",
          filter: `staff_id=eq.${staffId}`,
        },
        () => {
          fetchStaffProfile();
        }
      )
      .subscribe();

    const alertsSubscription = supabase
      .channel(`staff_${staffId}_alerts`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alerts",
          filter: `staff_id=eq.${staffId}`,
        },
        () => {
          fetchStaffProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceSubscription);
      supabase.removeChannel(reportsSubscription);
      supabase.removeChannel(alertsSubscription);
    };
  }, [staffId, fetchStaffProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">スタッフ情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!staffData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">スタッフが見つかりません</h3>
          <p className="text-gray-600 mb-4">指定されたスタッフは存在しないか、アクセス権限がありません。</p>
          <Link
            href="/manager"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            ダッシュボードに戻る
          </Link>
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
              <Link href="/manager" className="text-gray-400 hover:text-gray-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">{staffData.name}さんのプロファイル</h1>
            </div>
            <button
              onClick={fetchStaffProfile}
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
              更新
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Staff Info Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xl font-medium text-gray-600">{staffData.name.charAt(0)}</span>
              </div>
              <div className="ml-6">
                <h2 className="text-2xl font-bold text-gray-900">{staffData.name}</h2>
                <p className="text-gray-600">{staffData.email}</p>
                {staffData.phone && <p className="text-gray-500 text-sm">{staffData.phone}</p>}
                <p className="text-gray-400 text-xs">登録日: {new Date(staffData.created_at).toLocaleDateString("ja-JP")}</p>
              </div>
            </div>

            {/* Active Alerts */}
            {staffData.activeAlerts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-red-800">{staffData.activeAlerts.length}件のアクティブアラート</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <StatCard title="月間報告数" value={staffData.stats.totalReports} subtitle="件" icon="📝" color="blue" />
          <StatCard
            title="出勤率"
            value={staffData.stats.attendanceRate}
            subtitle="%"
            icon="📅"
            color={staffData.stats.attendanceRate >= 80 ? "green" : staffData.stats.attendanceRate >= 60 ? "yellow" : "red"}
          />
          <StatCard title="平均起床時間" value={staffData.stats.averageWakeUpTime} icon="🌅" color="purple" />
          <StatCard title="平均到着時間" value={staffData.stats.averageArrivalTime} icon="🏢" color="indigo" />
          <StatCard title="月間アラート" value={staffData.stats.alertCount} subtitle="件" icon="🚨" color={staffData.stats.alertCount > 0 ? "red" : "gray"} />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: "overview", label: "概要", icon: "📊" },
                { id: "timeline", label: "活動タイムライン", icon: "⏰" },
                { id: "reports", label: "日報履歴", icon: "📝" },
                { id: "attendance", label: "勤怠履歴", icon: "📅" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "overview" && <StaffOverview staffData={staffData} />}
            {activeTab === "timeline" && <StaffActivityTimeline staffId={staffId} />}
            {activeTab === "reports" && <StaffReportsHistory reports={staffData.recentReports} />}
            {activeTab === "attendance" && <StaffAttendanceHistory attendance={staffData.recentAttendance} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components for different tabs
function StaffOverview({ staffData }: { staffData: StaffProfileData }) {
  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      {staffData.activeAlerts.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">アクティブアラート</h3>
          <div className="space-y-3">
            {staffData.activeAlerts.map((alert) => (
              <div key={alert.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">{alert.message}</p>
                    <p className="text-xs text-red-600 mt-1">発生日時: {new Date(alert.triggered_at).toLocaleString("ja-JP")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Summary */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">最近の活動サマリー</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">直近の勤怠記録</h4>
            <div className="space-y-2">
              {staffData.recentAttendance.slice(0, 5).map((record) => (
                <div key={record.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{new Date(record.date).toLocaleDateString("ja-JP")}</span>
                  <span
                    className={`font-medium ${
                      record.status === "complete" ? "text-green-600" : record.status === "partial" ? "text-yellow-600" : "text-gray-600"
                    }`}
                  >
                    {record.status === "complete" ? "完了" : record.status === "partial" ? "部分的" : "未完了"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">直近の日報</h4>
            <div className="space-y-2">
              {staffData.recentReports.slice(0, 5).map((report) => (
                <div key={report.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{new Date(report.date).toLocaleDateString("ja-JP")}</span>
                  <span className={`font-medium ${report.status === "submitted" ? "text-green-600" : "text-yellow-600"}`}>
                    {report.status === "submitted" ? "提出済" : "下書き"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffReportsHistory({ reports }: { reports: DailyReport[] }) {
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">日報履歴 ({reports.length}件)</h3>
      <div className="space-y-4">
        {reports.map((report) => (
          <div key={report.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900">{new Date(report.date).toLocaleDateString("ja-JP")}</span>
                <span
                  className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                    report.status === "submitted" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {report.status === "submitted" ? "提出済" : "下書き"}
                </span>
              </div>
              {report.status === "submitted" && (
                <span className="text-xs text-gray-500">提出日時: {new Date(report.submitted_at).toLocaleString("ja-JP")}</span>
              )}
            </div>
            <p className="text-sm text-gray-600 line-clamp-3">{report.content}</p>
          </div>
        ))}
        {reports.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>日報の履歴がありません</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StaffAttendanceHistory({ attendance }: { attendance: AttendanceRecord[] }) {
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">勤怠履歴 ({attendance.length}件)</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">起床時間</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出発時間</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">到着時間</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attendance.map((record) => (
              <tr key={record.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(record.date).toLocaleDateString("ja-JP")}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {record.wake_up_time ? new Date(record.wake_up_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {record.departure_time ? new Date(record.departure_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {record.arrival_time ? new Date(record.arrival_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      record.status === "complete"
                        ? "bg-green-100 text-green-800"
                        : record.status === "partial"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {record.status === "complete" ? "完了" : record.status === "partial" ? "部分的" : "未完了"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {attendance.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>勤怠記録がありません</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: "blue" | "green" | "red" | "purple" | "indigo" | "yellow" | "gray";
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    red: "bg-red-50 text-red-600 border-red-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${colorClasses[color]}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <span className="text-xl">{icon}</span>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-xs font-medium text-gray-600">{title}</p>
          <div className="flex items-baseline">
            <p className="text-lg font-semibold text-gray-900">{value}</p>
            {subtitle && <p className="ml-1 text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
