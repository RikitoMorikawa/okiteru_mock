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

interface TimelineItem {
  date: string;
  type: "attendance" | "report";
  data: AttendanceRecord | DailyReport;
  status?: {
    completed: number;
    total: number;
    percentage: number;
  };
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
                const timeline: TimelineItem[] = [];

                // Add attendance records
                historyData.attendanceRecords.forEach((record) => {
                  const status = getAttendanceStatus(record);
                  timeline.push({
                    date: record.date,
                    type: "attendance" as const,
                    data: record,
                    status,
                  });
                });

                // Add daily reports
                historyData.dailyReports.forEach((report) => {
                  timeline.push({
                    date: report.date,
                    type: "report" as const,
                    data: report,
                  });
                });

                // Sort by date (newest first)
                timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                // Group by date
                const groupedTimeline = timeline.reduce((acc, item) => {
                  if (!acc[item.date]) {
                    acc[item.date] = [];
                  }
                  acc[item.date].push(item);
                  return acc;
                }, {} as Record<string, TimelineItem[]>);

                return Object.entries(groupedTimeline).map(([date, items]) => (
                  <div key={date} className="mb-8 last:mb-0">
                    <div className="flex items-center mb-4">
                      <div className="flex-shrink-0 w-3 h-3 bg-indigo-600 rounded-full"></div>
                      <div className="ml-4">
                        <h4 className="text-lg font-semibold text-gray-900">{formatDate(date)}</h4>
                      </div>
                    </div>

                    <div className="ml-7 space-y-4">
                      {items.map((item, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          {item.type === "attendance" ? (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-medium text-gray-900">勤怠記録</h5>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    (item.data as AttendanceRecord).status === "complete"
                                      ? "bg-green-100 text-green-800"
                                      : (item.data as AttendanceRecord).status === "partial"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {item.status?.completed}/{item.status?.total} 完了
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">起床:</span>
                                  <span className="ml-2 font-medium">{formatTime((item.data as AttendanceRecord).wake_up_time)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">出発:</span>
                                  <span className="ml-2 font-medium">{formatTime((item.data as AttendanceRecord).departure_time)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">到着:</span>
                                  <span className="ml-2 font-medium">{formatTime((item.data as AttendanceRecord).arrival_time)}</span>
                                </div>
                              </div>

                              {((item.data as AttendanceRecord).wake_up_notes ||
                                (item.data as AttendanceRecord).departure_notes ||
                                (item.data as AttendanceRecord).arrival_notes) && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <h6 className="text-sm font-medium text-gray-700 mb-2">メモ</h6>
                                  <div className="space-y-1 text-sm text-gray-600">
                                    {(item.data as AttendanceRecord).wake_up_notes && <div>起床: {(item.data as AttendanceRecord).wake_up_notes}</div>}
                                    {(item.data as AttendanceRecord).departure_notes && <div>出発: {(item.data as AttendanceRecord).departure_notes}</div>}
                                    {(item.data as AttendanceRecord).arrival_notes && <div>到着: {(item.data as AttendanceRecord).arrival_notes}</div>}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-medium text-gray-900">日報</h5>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    (item.data as DailyReport).status === "submitted" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {(item.data as DailyReport).status === "submitted" ? "提出済み" : "下書き"}
                                </span>
                              </div>

                              <div className="text-sm text-gray-600">
                                <p className="line-clamp-3">{(item.data as DailyReport).content}</p>
                              </div>

                              {(item.data as DailyReport).submitted_at && (
                                <div className="mt-2 text-xs text-gray-500">
                                  提出日時: {new Date((item.data as DailyReport).submitted_at).toLocaleString("ja-JP")}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
