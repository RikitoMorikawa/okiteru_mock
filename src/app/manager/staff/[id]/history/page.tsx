"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { User, AttendanceRecord, DailyReport } from "@/types/database";
import { parseGPSLocation, getAddressFromCoordinates } from "@/utils/locationUtils";

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
  const [activeTabs, setActiveTabs] = useState<Record<string, "wake_up" | "departure" | "arrival" | "report">>({});
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
        .not("status", "in", '("archived","active")')
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

      // Fetch daily reports within date range
      const { data: dailyReports, error: reportsError } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("staff_id", staffId)
        .gte("date", dateRange.startDate)
        .lte("date", dateRange.endDate)
        .order("created_at", { ascending: false });

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

  const setActiveTab = (sessionId: string, tab: "wake_up" | "departure" | "arrival" | "report") => {
    setActiveTabs((prev) => ({
      ...prev,
      [sessionId]: tab,
    }));
  };

  const getActiveTab = (sessionId: string, hasAttendance: boolean, hasReport: boolean) => {
    if (activeTabs[sessionId]) {
      return activeTabs[sessionId];
    }
    // Default to wake_up if attendance is available, otherwise report
    return hasAttendance ? "wake_up" : hasReport ? "report" : "wake_up";
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
                                <>
                                  <button
                                    onClick={() => setActiveTab(session.id, "wake_up")}
                                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                      getActiveTab(session.id, hasAttendance, hasReport) === "wake_up"
                                        ? "border-indigo-500 text-indigo-600 bg-indigo-50"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                                  >
                                    起床
                                  </button>
                                  <button
                                    onClick={() => setActiveTab(session.id, "departure")}
                                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                      getActiveTab(session.id, hasAttendance, hasReport) === "departure"
                                        ? "border-indigo-500 text-indigo-600 bg-indigo-50"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                                  >
                                    出発
                                  </button>
                                  <button
                                    onClick={() => setActiveTab(session.id, "arrival")}
                                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                      getActiveTab(session.id, hasAttendance, hasReport) === "arrival"
                                        ? "border-indigo-500 text-indigo-600 bg-indigo-50"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                                  >
                                    到着
                                  </button>
                                </>
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
                            {getActiveTab(session.id, hasAttendance, hasReport) === "wake_up" && hasAttendance && (
                              <div className="space-y-2">
                                <InfoItem label="起床時間" value={formatTime(session.attendanceRecord.wake_up_time)} />
                                <InfoItem label="起床場所" value={session.attendanceRecord.wake_up_location} />
                                <InfoItem label="備考" value={session.attendanceRecord.wake_up_notes} />
                              </div>
                            )}

                            {getActiveTab(session.id, hasAttendance, hasReport) === "departure" && hasAttendance && (
                              <div className="space-y-2">
                                <InfoItem label="出発時間" value={formatTime(session.attendanceRecord.departure_time)} />
                                <InfoItem label="出発場所" value={session.attendanceRecord.departure_location} />
                                <InfoItem label="備考" value={session.attendanceRecord.departure_notes} />
                                <ImageItem label="経路写真" url={session.attendanceRecord.route_photo_url} />
                              </div>
                            )}

                            {getActiveTab(session.id, hasAttendance, hasReport) === "arrival" && hasAttendance && (
                              <div className="space-y-2">
                                <InfoItem label="到着時間" value={formatTime(session.attendanceRecord.arrival_time)} />
                                <InfoItem label="到着場所" value={session.attendanceRecord.arrival_location} />
                                <LocationItem gpsLocation={session.attendanceRecord.arrival_gps_location} />
                                <InfoItem label="備考" value={session.attendanceRecord.arrival_notes} />
                                <ImageItem label="身だしなみ写真" url={session.attendanceRecord.appearance_photo_url} />
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

// Helper Components
const InfoItem = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-sm text-gray-600">{value}</p>
    </div>
  );
};

const ImageItem = ({ label, url }: { label: string; url?: string | null }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (url) {
      if (url.startsWith("http")) {
        setImageUrl(url);
      } else {
        const { data } = supabase.storage.from("photos").getPublicUrl(url);
        setImageUrl(data.publicUrl);
      }
    }
  }, [url]);

  if (!imageUrl) {
    return null;
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <img
        src={imageUrl}
        alt={label}
        className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setSelectedImage(imageUrl)}
      />
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="拡大表示" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
};

const LocationItem = ({ gpsLocation }: { gpsLocation?: string | null }) => {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const fetchAddress = async () => {
      if (gpsLocation) {
        const gpsData = parseGPSLocation(gpsLocation);
        if (gpsData) {
          try {
            const addr = await getAddressFromCoordinates(gpsData.latitude, gpsData.longitude);
            setAddress(addr);
          } catch (error) {
            console.error("Error getting address:", error);
            setAddress("住所の取得に失敗しました");
          }
        }
      }
    };
    fetchAddress();
  }, [gpsLocation]);

  if (!gpsLocation) return null;

  return (
    <div>
      <p className="text-sm font-medium text-gray-700">GPS情報</p>
      <p className="text-sm text-gray-600">{gpsLocation}</p>
      {address && <p className="text-sm text-gray-600 mt-1">推定住所: {address}</p>}
      <a
        href={`https://www.google.com/maps?q=${gpsLocation}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors mt-2"
      >
        Google Mapsで確認
      </a>
    </div>
  );
};
