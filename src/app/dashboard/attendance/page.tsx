"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { StaffOnly } from "@/components/ui/RoleBasedRender";
import StaffNavigation from "@/components/dashboard/StaffNavigation";
import StatusIndicator from "@/components/dashboard/StatusIndicator";
import WakeUpForm from "@/components/attendance/WakeUpForm";
import DepartureForm from "@/components/attendance/DepartureForm";
import ArrivalForm from "@/components/attendance/ArrivalForm";
import DailyReportForm from "@/components/reports/DailyReportForm";
import { api } from "@/lib/api-client";

type AttendanceAction = "wakeup" | "departure" | "arrival" | "report" | null;

function AttendanceContent() {
  const searchParams = useSearchParams();
  const [activeAction, setActiveAction] = useState<AttendanceAction>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [attendanceStatus, setAttendanceStatus] = useState({
    wakeUpReported: false,
    departureReported: false,
    arrivalReported: false,
    reportSubmitted: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const action = searchParams.get("action") as AttendanceAction;
    setActiveAction(action);
  }, [searchParams]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Fetch attendance status from API
  const fetchAttendanceStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/attendance/status");

      if (response.ok) {
        const data = await response.json();
        setAttendanceStatus({
          wakeUpReported: data.status.wakeUpReported,
          departureReported: data.status.departureReported,
          arrivalReported: data.status.arrivalReported,
          reportSubmitted: data.status.reportSubmitted || false,
        });
      } else {
        console.error("Failed to fetch attendance status");
      }
    } catch (error) {
      console.error("Error fetching attendance status:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAttendanceStatus();
  }, []);

  // Listen for attendance updates
  useEffect(() => {
    const handleAttendanceUpdate = () => {
      setRefreshKey((prev) => prev + 1);
      fetchAttendanceStatus(); // Refresh status when attendance is updated
    };

    window.addEventListener("attendanceUpdated", handleAttendanceUpdate);
    return () => window.removeEventListener("attendanceUpdated", handleAttendanceUpdate);
  }, []);

  const attendanceActions = [
    {
      id: "wakeup" as const,
      title: "起床報告",
      description: "起床時間を記録します",
      icon: "🌅",
      color: "bg-orange-50 border-orange-200 text-orange-700",
    },
    {
      id: "departure" as const,
      title: "出発報告",
      description: "出発時間と経路写真をアップロード",
      icon: "🚗",
      color: "bg-blue-50 border-blue-200 text-blue-700",
    },
    {
      id: "arrival" as const,
      title: "到着報告",
      description: "到着時間と身だしなみ写真をアップロード",
      icon: "🏢",
      color: "bg-green-50 border-green-200 text-green-700",
    },
    {
      id: "report" as const,
      title: "日報提出",
      description: "業務報告書を作成・提出",
      icon: "📝",
      color: "bg-purple-50 border-purple-200 text-purple-700",
    },
  ];

  const renderActiveForm = () => {
    switch (activeAction) {
      case "wakeup":
        return <WakeUpForm onSuccess={() => setActiveAction(null)} />;
      case "departure":
        return <DepartureForm onSuccess={() => setActiveAction(null)} />;
      case "arrival":
        return <ArrivalForm onSuccess={() => setActiveAction(null)} />;
      case "report":
        return <DailyReportForm onSuccess={() => setActiveAction(null)} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-base sm:text-xl font-semibold text-gray-900">勤怠報告</h1>
            </div>
            <div className="flex items-center space-x-4">
              <StatusIndicator />
              <div className="hidden sm:block text-xs sm:text-sm text-gray-600">
                {currentTime.toLocaleString("ja-JP", {
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 lg:gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <StaffNavigation />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeAction ? (
              <div className="space-y-6">
                {/* Back Button */}
                <div className="flex items-center">
                  <button onClick={() => setActiveAction(null)} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    勤怠報告一覧に戻る
                  </button>
                </div>

                {/* Active Form */}
                {renderActiveForm()}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Current Time Display */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">現在時刻</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {currentTime.toLocaleString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                {/* Attendance Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {attendanceActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => setActiveAction(action.id)}
                      className={`
                            p-6 rounded-lg border-2 transition-all hover:shadow-lg hover:scale-105
                            ${action.color}
                          `}
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-4">{action.icon}</div>
                        <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                        <p className="text-sm opacity-80">{action.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Today's Status Summary */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">本日の報告状況</h3>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">読み込み中...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {attendanceActions.map((action) => {
                        const getStatus = (actionId: string) => {
                          switch (actionId) {
                            case "wakeup":
                              return attendanceStatus.wakeUpReported;
                            case "departure":
                              return attendanceStatus.departureReported;
                            case "arrival":
                              return attendanceStatus.arrivalReported;
                            case "report":
                              return attendanceStatus.reportSubmitted;
                            default:
                              return false;
                          }
                        };

                        const isCompleted = getStatus(action.id);

                        return (
                          <div key={action.id} className="flex items-center justify-between py-2">
                            <div className="flex items-center">
                              <span className="text-xl mr-3">{action.icon}</span>
                              <span className="font-medium text-gray-700">{action.title}</span>
                            </div>
                            <div className="flex items-center">
                              {isCompleted ? (
                                <>
                                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                  <span className="ml-2 text-sm text-green-600 font-medium">完了</span>
                                </>
                              ) : (
                                <>
                                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                  </div>
                                  <span className="ml-2 text-sm text-gray-500">未報告</span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">報告のポイント</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li>起床報告は起床後すぐに行ってください</li>
                          <li>出発報告では経路のスクリーンショットが必要です</li>
                          <li>到着報告では身だしなみの写真をアップロードしてください</li>
                          <li>日報提出では業務内容を詳しく記録してください</li>
                          <li>各報告は正確な時間で記録されます</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <ProtectedRoute>
      <StaffOnly>
        <Suspense
          fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">読み込み中...</p>
              </div>
            </div>
          }
        >
          <AttendanceContent />
        </Suspense>
      </StaffOnly>
    </ProtectedRoute>
  );
}
