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

export default function StaffHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const staffId = params.id as string;

  const [historyData, setHistoryData] = useState<StaffHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTabs, setActiveTabs] = useState<Record<string, "attendance" | "report">>({});
  const dateRange = {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30日前
    endDate: new Date().toISOString().split("T")[0], // 今日
  };

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

      // Fetch attendance records within date range (exclude archived records - preparation records)
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("staff_id", staffId)
        .gte("date", dateRange.startDate)
        .lte("date", dateRange.endDate)
        .neq("status", "archived")
        .order("created_at", { ascending: false });

      if (attendanceError) throw attendanceError;

      // Debug: First fetch all records to see what statuses exist
      const { data: allRecords } = await supabase
        .from("attendance_records")
        .select("id, date, status")
        .eq("staff_id", staffId)
        .gte("date", dateRange.startDate)
        .lte("date", dateRange.endDate)
        .order("created_at", { ascending: false });

      // Debug: Check for archived records specifically
      const { data: archivedRecords } = await supabase
        .from("attendance_records")
        .select("id, date, status")
        .eq("staff_id", staffId)
        .gte("date", dateRange.startDate)
        .lte("date", dateRange.endDate)
        .eq("status", "archived");

      console.log("🔍 Archived records check:", archivedRecords?.length || 0, "records found");
      if (archivedRecords && archivedRecords.length > 0) {
        console.log("📋 Archived records:", archivedRecords);
      }

      // Fetch daily reports within date range
      const { data: dailyReports, error: reportsError } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("staff_id", staffId)
        .gte("date", dateRange.startDate)
        .lte("date", dateRange.endDate)
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      // デバッグ用ログ
      console.log("取得した日報データ:", dailyReports);
      console.log("取得した勤怠記録:", attendanceRecords);

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
  }, [staffId]);

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

  const setActiveTab = (sessionId: string, tab: "attendance" | "report") => {
    setActiveTabs((prev) => ({
      ...prev,
      [sessionId]: tab,
    }));
  };

  const getActiveTab = (sessionId: string, hasAttendance: boolean, hasReport: boolean) => {
    if (activeTabs[sessionId]) {
      return activeTabs[sessionId];
    }
    // Default to attendance if available, otherwise report (only if report actually exists)
    return hasAttendance ? "attendance" : hasReport ? "report" : "attendance";
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
        {/* History Timeline */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">履歴タイムライン（{historyData.attendanceRecords.length}日）</h3>
          </div>

          {historyData.attendanceRecords.length === 0 && historyData.dailyReports.length === 0 ? (
            <div className="p-6 text-center text-gray-500">選択した期間にデータがありません</div>
          ) : (
            <div className="p-6">
              {/* Create work session sets (attendance + report pairs) */}
              {(() => {
                // Create work session sets - each attendance record with its corresponding report
                const workSessions: Array<{
                  id: string;
                  attendanceRecord: AttendanceRecord;
                  dailyReport?: DailyReport;
                  sortDate: Date;
                }> = [];

                // For each attendance record, find matching daily report
                historyData.attendanceRecords.forEach((record) => {
                  // 勤怠記録IDで直接紐付け、なければ日付とスタッフIDで検索（ただし未使用のもののみ）
                  const matchingReport = historyData.dailyReports.find((report) => {
                    // 勤怠記録IDがある場合は直接マッチング
                    if (report.attendance_record_id) {
                      return report.attendance_record_id === record.id;
                    }
                    // 従来の方法：同じ日付・スタッフIDで、まだ使われていない日報
                    return (
                      report.date === record.date &&
                      report.staff_id === record.staff_id &&
                      !workSessions.some((session) => session.dailyReport?.id === report.id)
                    );
                  });

                  // デバッグ用ログ
                  console.log(`勤怠記録 ${record.date} (${record.id}):`, {
                    recordDate: record.date,
                    recordId: record.id,
                    staffId: record.staff_id,
                    matchingReport: matchingReport
                      ? {
                          id: matchingReport.id,
                          date: matchingReport.date,
                          attendanceRecordId: matchingReport.attendance_record_id,
                          status: matchingReport.status,
                        }
                      : null,
                  });

                  workSessions.push({
                    id: `session-${record.id}`,
                    attendanceRecord: record,
                    dailyReport: matchingReport,
                    sortDate: new Date(record.created_at),
                  });
                });

                // Add standalone daily reports (reports without matching attendance)
                historyData.dailyReports.forEach((report) => {
                  // 既にワークセッションに含まれているかチェック
                  const alreadyIncluded = workSessions.some((session) => session.dailyReport?.id === report.id);

                  if (!alreadyIncluded) {
                    // 勤怠記録IDがあるが対応する勤怠記録が見つからない場合、または勤怠記録IDがない場合
                    const hasMatchingAttendance = report.attendance_record_id
                      ? historyData.attendanceRecords.some((record) => record.id === report.attendance_record_id)
                      : historyData.attendanceRecords.some((record) => record.date === report.date && record.staff_id === report.staff_id);

                    if (!hasMatchingAttendance) {
                      workSessions.push({
                        id: `report-only-${report.id}`,
                        attendanceRecord: {} as AttendanceRecord, // Empty attendance record
                        dailyReport: report,
                        sortDate: new Date(report.created_at),
                      });
                    }
                  }
                });

                // Sort by creation time (newest first)
                const sortedSessions = workSessions.sort((a, b) => {
                  return b.sortDate.getTime() - a.sortDate.getTime();
                });

                return sortedSessions.map((session) => {
                  const hasAttendance = !!session.attendanceRecord.id;
                  const hasReport = !!(session.dailyReport && session.dailyReport.id && session.dailyReport.content);

                  // デバッグ用ログ
                  console.log(`セッション ${session.id}:`, {
                    hasAttendance,
                    hasReport,
                    reportData: session.dailyReport
                      ? {
                          id: session.dailyReport.id,
                          date: session.dailyReport.date,
                          content: session.dailyReport.content ? "内容あり" : "内容なし",
                          status: session.dailyReport.status,
                        }
                      : "なし",
                  });
                  const attendanceStatus = hasAttendance ? getAttendanceStatus(session.attendanceRecord) : null;

                  return (
                    <div key={session.id} className="mb-6 last:mb-0">
                      <div className="flex items-center mb-3">
                        <div className="flex-shrink-0 w-3 h-3 bg-indigo-600 rounded-full"></div>
                        <div className="ml-4">
                          <h4 className="text-base font-semibold text-gray-900">
                            {formatDate(hasAttendance ? session.attendanceRecord.date : session.dailyReport!.date)}
                          </h4>
                        </div>
                      </div>

                      <div className="ml-7">
                        <div className="bg-white rounded-lg border border-gray-200">
                          {/* Tab Navigation - 勤怠記録または日報が存在する場合のみ表示 */}
                          {(hasAttendance || hasReport) && (
                            <div className="flex border-b border-gray-200">
                              {hasAttendance && (
                                <button
                                  onClick={() => setActiveTab(session.id, "attendance")}
                                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    getActiveTab(session.id, hasAttendance, hasReport) === "attendance"
                                      ? "border-indigo-500 text-indigo-600 bg-indigo-50"
                                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                  }`}
                                >
                                  勤怠記録
                                </button>
                              )}
                              {/* 日報が実際に存在し、かつIDが有効な場合のみタブを表示 */}
                              {hasReport && (
                                <button
                                  onClick={() => setActiveTab(session.id, "report")}
                                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    getActiveTab(session.id, hasAttendance, hasReport) === "report"
                                      ? "border-indigo-500 text-indigo-600 bg-indigo-50"
                                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                  }`}
                                >
                                  日報
                                  <span
                                    className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                                      session.dailyReport!.status === "submitted" || session.dailyReport!.submitted_at || (session.dailyReport as any).archived
                                        ? "bg-green-100 text-green-700"
                                        : "bg-yellow-100 text-yellow-700"
                                    }`}
                                  >
                                    {session.dailyReport!.status === "submitted" || session.dailyReport!.submitted_at || (session.dailyReport as any).archived
                                      ? "提出済"
                                      : "下書き"}
                                  </span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Tab Content */}
                          <div className="p-4">
                            {getActiveTab(session.id, hasAttendance, hasReport) === "attendance" && hasAttendance && (
                              <div>
                                {/* Time Display */}
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500 mb-1">起床</div>
                                    <div className="text-sm font-medium">{formatTime(session.attendanceRecord.wake_up_time)}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500 mb-1">出発</div>
                                    <div className="text-sm font-medium">{formatTime(session.attendanceRecord.departure_time)}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500 mb-1">到着</div>
                                    <div className="text-sm font-medium">{formatTime(session.attendanceRecord.arrival_time)}</div>
                                  </div>
                                </div>

                                {/* Notes */}
                                {(session.attendanceRecord.wake_up_notes ||
                                  session.attendanceRecord.departure_notes ||
                                  session.attendanceRecord.arrival_notes) && (
                                  <div className="pt-4 border-t border-gray-100">
                                    <h6 className="text-sm font-medium text-gray-700 mb-2">メモ</h6>
                                    <div className="space-y-2 text-sm text-gray-600">
                                      {session.attendanceRecord.wake_up_notes && (
                                        <div>
                                          <span className="font-medium">起床:</span> {session.attendanceRecord.wake_up_notes}
                                        </div>
                                      )}
                                      {session.attendanceRecord.departure_notes && (
                                        <div>
                                          <span className="font-medium">出発:</span> {session.attendanceRecord.departure_notes}
                                        </div>
                                      )}
                                      {session.attendanceRecord.arrival_notes && (
                                        <div>
                                          <span className="font-medium">到着:</span> {session.attendanceRecord.arrival_notes}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {getActiveTab(session.id, hasAttendance, hasReport) === "report" && (
                              <div>
                                {session.dailyReport ? (
                                  <>
                                    {/* Content */}
                                    <div className="text-sm text-gray-600 mb-4">
                                      <p className="whitespace-pre-wrap">{session.dailyReport.content}</p>
                                    </div>

                                    {/* Submission Time */}
                                    {session.dailyReport.submitted_at && (
                                      <div className="text-xs text-gray-500 pt-4 border-t border-gray-100">
                                        提出日時: {new Date(session.dailyReport.submitted_at).toLocaleString("ja-JP")}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="text-center text-gray-500 py-8">
                                    <div className="text-sm">日報が提出されていません</div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* No data message */}
                            {!hasAttendance && !hasReport && (
                              <div className="text-center text-gray-500 py-8">
                                <div className="text-sm">データがありません</div>
                              </div>
                            )}
                          </div>
                        </div>
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
