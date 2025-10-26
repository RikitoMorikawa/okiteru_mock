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
import ProgressIndicator from "@/components/attendance/ProgressIndicator";
import { api } from "@/lib/api-client";

type AttendanceAction = "wakeup" | "departure" | "arrival" | "report" | null;

function AttendanceContent() {
  const searchParams = useSearchParams();
  const [activeAction, setActiveAction] = useState<AttendanceAction>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [attendanceStatus, setAttendanceStatus] = useState({
    wakeUpReported: false,
    departureReported: false,
    arrivalReported: false,
    reportSubmitted: false,
    dailyReportSubmitted: false,
    dayCompleted: false,
  });
  const [loading, setLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isStartingNewDay, setIsStartingNewDay] = useState(false);
  const [showNewDayConfirm, setShowNewDayConfirm] = useState(false);

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
          reportSubmitted: data.status.reportSubmitted || data.status.dailyReportSubmitted || false,
          dailyReportSubmitted: data.status.dailyReportSubmitted || data.status.reportSubmitted || false,
          dayCompleted: data.status.dayCompleted || false,
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
      fetchAttendanceStatus(); // Refresh status when attendance is updated
    };

    window.addEventListener("attendanceUpdated", handleAttendanceUpdate);
    return () => window.removeEventListener("attendanceUpdated", handleAttendanceUpdate);
  }, []);

  // Check if today is completed
  const isTodayCompleted = () => {
    return attendanceStatus.dayCompleted || false;
  };

  const isAllTasksComplete = () => {
    return (
      attendanceStatus.wakeUpReported &&
      attendanceStatus.departureReported &&
      attendanceStatus.arrivalReported &&
      (attendanceStatus.reportSubmitted || attendanceStatus.dailyReportSubmitted)
    );
  };

  const handleCompleteDay = async () => {
    try {
      setIsCompleting(true);

      const response = await api.post("/api/attendance/complete-day", {});

      if (response.ok) {
        const data = await response.json();
        alert(data.message || "本日の業務を完了しました。お疲れ様でした！");
        fetchAttendanceStatus();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "業務完了処理に失敗しました");
      }
    } catch (error) {
      console.error("Error completing day:", error);
      alert("業務完了処理中にエラーが発生しました");
    } finally {
      setIsCompleting(false);
      setShowConfirmDialog(false);
    }
  };

  const handleStartNewDay = async () => {
    try {
      setIsStartingNewDay(true);

      const response = await api.post("/api/attendance/start-new-day", {});

      if (response.ok) {
        const data = await response.json();
        alert(data.message || "新しい日を開始しました！");
        fetchAttendanceStatus();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "新しい日の開始に失敗しました");
      }
    } catch (error) {
      console.error("Error starting new day:", error);
      alert("新しい日の開始中にエラーが発生しました");
    } finally {
      setIsStartingNewDay(false);
      setShowNewDayConfirm(false);
    }
  };

  // Get next action based on current progress
  const getNextAction = () => {
    if (!attendanceStatus.wakeUpReported) {
      return {
        title: "起床報告",
        // description: "起床時間を報告してください",
        action: "wakeup",
        icon: "🌅",
        priority: "high",
      };
    }

    if (!attendanceStatus.departureReported) {
      return {
        title: "出発報告",
        // description: "出発時間と経路写真をアップロード",
        action: "departure",
        icon: "🚗",
        priority: "high",
      };
    }

    if (!attendanceStatus.arrivalReported) {
      return {
        title: "到着報告",
        // description: "到着時間と身だしなみ写真をアップロード",
        action: "arrival",
        icon: "🏢",
        priority: "high",
      };
    }

    if (!(attendanceStatus.reportSubmitted || attendanceStatus.dailyReportSubmitted)) {
      return {
        title: "日報作成",
        // description: "本日の業務内容を報告",
        action: "report",
        icon: "📝",
        priority: "medium",
      };
    }

    return null;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-200 bg-red-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      case "low":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

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
                {/* Progress Indicator */}
                {/* <ProgressIndicator /> */}

                {/* Next Action Card */}
                {!loading &&
                  !isTodayCompleted() &&
                  (() => {
                    const nextAction = getNextAction();
                    return nextAction ? (
                      <div className={`rounded-lg border-2 p-4 ${getPriorityColor(nextAction.priority)}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="text-2xl mr-3">{nextAction.icon}</span>
                            <div>
                              <h3 className="font-semibold text-gray-900">次のアクション: {nextAction.title}</h3>
                              {/* <p className="text-sm text-gray-600">{nextAction.description}</p> */}
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveAction(nextAction.action as AttendanceAction)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                          >
                            開始
                          </button>
                        </div>
                      </div>
                    ) : null;
                  })()}

                {/* If today is already completed, show completion status */}
                {!loading && isTodayCompleted() && (
                  <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">✅</span>
                        <div>
                          <h3 className="font-semibold text-blue-900">本日の業務完了済み</h3>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowNewDayConfirm(true)}
                        disabled={isStartingNewDay}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isStartingNewDay ? "開始中..." : "翌日開始"}
                      </button>
                    </div>
                  </div>
                )}

                {/* All Tasks Complete - Show completion button */}
                {!loading && !isTodayCompleted() && isAllTasksComplete() && (
                  <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">🎉</span>
                        <div>
                          <h3 className="font-semibold text-green-900">本日のタスク完了</h3>
                          <p className="text-sm text-green-700">お疲れ様でした！</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowConfirmDialog(true)}
                        disabled={isCompleting}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCompleting ? "処理中..." : "報告終了"}
                      </button>
                    </div>
                  </div>
                )}

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
                          return attendanceStatus.reportSubmitted || attendanceStatus.dailyReportSubmitted;
                        default:
                          return false;
                      }
                    };

                    const isCompleted = getStatus(action.id);
                    const nextAction = getNextAction();
                    const isNextAction = nextAction?.action === action.id;

                    return (
                      <button
                        key={action.id}
                        onClick={() => setActiveAction(action.id)}
                        className={`
                          relative p-6 rounded-lg border-2 transition-all hover:shadow-lg hover:scale-105
                          ${isCompleted ? "border-gray-200 bg-gray-50 text-gray-600" : action.color}
                        `}
                      >
                        <div className="text-center">
                          <div className="text-4xl mb-4">{action.icon}</div>
                          <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                          <p className="text-sm opacity-80">{action.description}</p>

                          {/* Status indicators */}
                          {isCompleted && (
                            <div className="absolute top-2 right-2">
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            </div>
                          )}

                          {isNextAction && !isCompleted && (
                            <div className="absolute top-2 right-2">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
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
                              return attendanceStatus.reportSubmitted || attendanceStatus.dailyReportSubmitted;
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
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div>
                    <div className="flex items-center mb-2">
                      <svg className="h-5 w-5 text-blue-400 flex-shrink-0 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <h3 className="text-xs sm:text-sm font-medium text-blue-800">報告のポイント</h3>
                    </div>
                    <div className="text-xs sm:text-sm text-blue-700">
                      <ul className="list-disc pl-4 space-y-1">
                        <li>起床報告は起床後すぐに行ってください</li>
                        <li>出発報告では経路と身だしなみの写真が必要です</li>
                        <li>日報提出では業務内容を詳しく記録してください</li>
                        <li>各報告は正確な時間で記録して下さい</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for completing day */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">報告終了の確認</h3>

            {isAllTasksComplete() ? (
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                本日の業務報告を終了しますか？
                <br />
                この操作により、本日のタスクがリセットされ、新しい日の準備が整います。
              </p>
            ) : (
              <div className="mb-6">
                <p className="text-sm sm:text-base text-amber-600 mb-3">⚠️ まだ完了していないタスクがあります：</p>
                <ul className="text-xs sm:text-sm text-gray-600 space-y-1 mb-4">
                  {!attendanceStatus.wakeUpReported && <li>• 起床報告</li>}
                  {!attendanceStatus.departureReported && <li>• 出発報告</li>}
                  {!attendanceStatus.arrivalReported && <li>• 到着報告</li>}
                  {!attendanceStatus.reportSubmitted && <li>• 日報提出</li>}
                </ul>
                <p className="text-sm sm:text-base text-gray-600">それでも業務を終了しますか？</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                キャンセル
              </button>
              <button
                onClick={handleCompleteDay}
                disabled={isCompleting}
                className={`flex-1 px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 text-sm sm:text-base ${
                  isAllTasksComplete() ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {isCompleting ? "処理中..." : "終了する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Day Confirmation Dialog */}
      {showNewDayConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">翌日開始の確認</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              新しい日を開始しますか？
              <br />
              <span className="text-xs sm:text-sm text-amber-600">※ 本日の完了状態がリセットされます。</span>
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowNewDayConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm sm:text-base rounded-md hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleStartNewDay}
                disabled={isStartingNewDay}
                className="flex-1 px-4 py-2 bg-green-600 text-white text-sm sm:text-base rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isStartingNewDay ? "開始中..." : "開始する"}
              </button>
            </div>
          </div>
        </div>
      )}
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
