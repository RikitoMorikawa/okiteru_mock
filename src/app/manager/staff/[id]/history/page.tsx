"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { User, AttendanceRecord, DailyReport } from "@/types/database";

interface StaffHistoryData {
  user: User;
  attendanceRecords: AttendanceRecord[];
  dailyReports: DailyReport[];
}

interface DayCardProps {
  date: string;
  attendanceRecord?: AttendanceRecord;
  dailyReport?: DailyReport;
  attendanceStatus?: {
    completed: number;
    total: number;
    percentage: number;
  };
  formatTime: (timeString?: string) => string;
}

function DayCard({ date, attendanceRecord, dailyReport, attendanceStatus, formatTime }: DayCardProps) {
  const [activeTab, setActiveTab] = useState<"attendance" | "report">("attendance");

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-4">
        <button
          onClick={() => setActiveTab("attendance")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "attendance" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          勤怠記録
          {attendanceRecord && (
            <span
              className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                attendanceRecord.status === "complete"
                  ? "bg-green-100 text-green-700"
                  : attendanceRecord.status === "partial"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {attendanceStatus?.completed || 0}/{attendanceStatus?.total || 3}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("report")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "report" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          日報
          {dailyReport && (
            <span
              className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                dailyReport.status === "submitted" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {dailyReport.status === "submitted" ? "提出済" : "下書き"}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-md p-3">
        {activeTab === "attendance" ? (
          <div>
            {attendanceRecord ? (
              <>
                {/* Compact Time Display */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">起床</div>
                    <div className="text-sm font-medium">{formatTime(attendanceRecord.wake_up_time)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">出発</div>
                    <div className="text-sm font-medium">{formatTime(attendanceRecord.departure_time)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">到着</div>
                    <div className="text-sm font-medium">{formatTime(attendanceRecord.arrival_time)}</div>
                  </div>
                </div>

                {/* Notes */}
                {(attendanceRecord.wake_up_notes || attendanceRecord.departure_notes || attendanceRecord.arrival_notes) && (
                  <div className="pt-3 border-t border-gray-100">
                    <h6 className="text-xs font-medium text-gray-700 mb-2">メモ</h6>
                    <div className="space-y-1 text-xs text-gray-600">
                      {attendanceRecord.wake_up_notes && (
                        <div>
                          <span className="font-medium">起床:</span> {attendanceRecord.wake_up_notes}
                        </div>
                      )}
                      {attendanceRecord.departure_notes && (
                        <div>
                          <span className="font-medium">出発:</span> {attendanceRecord.departure_notes}
                        </div>
                      )}
                      {attendanceRecord.arrival_notes && (
                        <div>
                          <span className="font-medium">到着:</span> {attendanceRecord.arrival_notes}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-gray-500 py-4">
                <div className="text-sm">勤怠記録がありません</div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {dailyReport ? (
              <>
                <div className="text-sm text-gray-600 mb-3">
                  <p className="line-clamp-4">{dailyReport.content}</p>
                </div>

                {dailyReport.submitted_at && (
                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                    提出日時: {new Date(dailyReport.submitted_at).toLocaleString("ja-JP")}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-gray-500 py-4">
                <div className="text-sm">日報が提出されていません</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StaffHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const staffId = params.id as string;

  const [historyData, setHistoryData] = useState<StaffHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30日前
    endDate: new Date().toISOString().split("T")[0], // 今日
  });

  // Redirect if not manager
  useEffect(() => {
    if (user && user.role !== "manager") {
      router.push("/dashboard/attendance");
    }
  }, [user, router]);

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch staff user info
      const { data: staffUser, error: userError } = await supabase.from("users").select("*").eq("id", staffId).eq("role", "staff").single();

      if (userError || !staffUser) {
        throw new Error("スタッフが見つかりません");
      }

      // Fetch attendance records within date range
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("staff_id", staffId)
        .gte("date", dateRange.startDate)
        .lte("date", dateRange.endDate)
        .order("date", { ascending: false });

      if (attendanceError) throw attendanceError;

      // Fetch daily reports within date range
      const { data: dailyReports, error: reportsError } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("staff_id", staffId)
        .gte("date", dateRange.startDate)
        .lte("date", dateRange.endDate)
        .order("date", { ascending: false });

      if (reportsError) throw reportsError;

      setHistoryData({
        user: staffUser as User,
        attendanceRecords: (attendanceRecords as AttendanceRecord[]) || [],
        dailyReports: (dailyReports as DailyReport[]) || [],
      });
    } catch (err) {
      console.error("Error fetching history data:", err);
      setError(err instanceof Error ? err.message : "データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staffId) {
      fetchHistoryData();
    }
  }, [staffId, dateRange]);

  const formatTime = (timeString?: string) => {
    if (!timeString) return "--:--";
    return new Date(timeString).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  const getAttendanceStatus = (record: AttendanceRecord) => {
    const tasks = [
      { name: "起床", completed: !!record.wake_up_time },
      { name: "出発", completed: !!record.departure_time },
      { name: "到着", completed: !!record.arrival_time },
    ];
    const completed = tasks.filter((task) => task.completed).length;
    return { completed, total: tasks.length, percentage: Math.round((completed / tasks.length) * 100) };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">履歴を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">エラー</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => router.back()} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            戻る
          </button>
        </div>
      </div>
    );
  }

  if (!historyData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button onClick={() => router.back()} className="mr-4 p-2 text-gray-600 hover:text-gray-900 rounded-md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-base sm:text-xl font-semibold text-gray-900">{historyData.user.name}さんの履歴</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">勤怠記録</p>
                <p className="text-2xl font-semibold text-gray-900">{historyData.attendanceRecords.length}日</p>
              </div>
            </div>
          </div>

        </div>

        {/* History Timeline */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">履歴タイムライン</h3>
          </div>

          {historyData.attendanceRecords.length === 0 && historyData.dailyReports.length === 0 ? (
            <div className="p-6 text-center text-gray-500">選択した期間にデータがありません</div>
          ) : (
            <div className="p-6">
              {/* Create combined timeline */}
              {(() => {
                // Get all unique dates
                const allDates = new Set([...historyData.attendanceRecords.map((r) => r.date), ...historyData.dailyReports.map((r) => r.date)]);

                const sortedDates = Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

                return sortedDates.map((date) => {
                  const attendanceRecord = historyData.attendanceRecords.find((r) => r.date === date);
                  const dailyReport = historyData.dailyReports.find((r) => r.date === date);
                  const attendanceStatus = attendanceRecord ? getAttendanceStatus(attendanceRecord) : undefined;

                  return (
                    <div key={date} className="mb-6 last:mb-0">
                      <div className="flex items-center mb-3">
                        <div className="flex-shrink-0 w-3 h-3 bg-indigo-600 rounded-full"></div>
                        <div className="ml-4">
                          <h4 className="text-base font-semibold text-gray-900">{formatDate(date)}</h4>
                        </div>
                      </div>

                      <div className="ml-7">
                        <DayCard
                          date={date}
                          attendanceRecord={attendanceRecord}
                          dailyReport={dailyReport}
                          attendanceStatus={attendanceStatus}
                          formatTime={formatTime}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
