"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api-client";

interface AttendanceStatus {
  previousDayReported?: boolean;
  wakeUpReported: boolean;
  departureReported: boolean;
  arrivalReported: boolean;
  dailyReportSubmitted: boolean;
  dayCompleted?: boolean; // Add day completion status from DB
  // shiftScheduleSubmitted: boolean;
}

interface QuickActionsProps {
  attendanceStatus: AttendanceStatus;
  previousDayReportDate?: string | null; // report_date from previous day report
  onStatusUpdate?: () => void;
}

export default function QuickActions({ attendanceStatus, previousDayReportDate, onStatusUpdate }: QuickActionsProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isStartingNewDay, setIsStartingNewDay] = useState(false);
  const [showNewDayConfirm, setShowNewDayConfirm] = useState(false);

  // Check if today is already completed from DB status
  const isTodayCompleted = () => {
    console.log("Debug - Attendance Status:", attendanceStatus);
    console.log("Debug - Day Completed:", attendanceStatus.dayCompleted);
    return attendanceStatus.dayCompleted || false;
  };

  const handleCompleteDay = async () => {
    try {
      setIsCompleting(true);

      const response = await api.post("/api/attendance/complete-day", {});

      if (response.ok) {
        const data = await response.json();

        // Show success message
        alert(data.message || "本日の業務を完了しました。お疲れ様でした！");

        // Refresh the attendance status
        if (onStatusUpdate) {
          onStatusUpdate();
        }
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

        // Refresh the attendance status
        if (onStatusUpdate) {
          onStatusUpdate();
        }
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

  const isAllTasksComplete = () => {
    return (
      attendanceStatus.previousDayReported &&
      attendanceStatus.wakeUpReported &&
      attendanceStatus.departureReported &&
      attendanceStatus.arrivalReported &&
      attendanceStatus.dailyReportSubmitted
    );
  };

  // 前日報告カードを非表示にするべきかどうか（report_dateが今日より後の場合）
  const shouldHidePreviousDayReport = () => {
    if (!attendanceStatus.previousDayReported) {
      return false; // 未報告なら表示する
    }

    if (!previousDayReportDate) {
      return false; // report_dateがない場合は表示する（念のため）
    }

    const today = new Date().toISOString().split("T")[0];
    const reportDate = previousDayReportDate;

    // report_dateが今日より後の場合（今日報告した場合）、カードを非表示にする
    return reportDate > today;
  };

  const getNextAction = () => {
    // 前日報告が未完了の場合は最初に前日報告を促す
    // ただし、report_dateが今日より後（今日報告済み）の場合は非表示
    if (!attendanceStatus.previousDayReported) {
      return {
        title: "前日報告",
        description: "翌日の予定と準備状況を報告してください",
        href: "/dashboard/attendance?action=previous-day",
        icon: "🌙",
        priority: "high",
      };
    } else if (shouldHidePreviousDayReport()) {
      // 前日報告済みだが、今日報告したばかりで翌日まで非表示にする場合
      // 次のアクションをスキップして起床報告以降を表示しない
      return null;
    }

    if (!attendanceStatus.wakeUpReported) {
      return {
        title: "起床報告",
        description: "起床時間を報告してください",
        href: "/dashboard/attendance?action=wakeup",
        icon: "🌅",
        priority: "high",
      };
    }

    if (!attendanceStatus.departureReported) {
      return {
        title: "出発報告",
        description: "出発時間と経路写真をアップロード",
        href: "/dashboard/attendance?action=departure",
        icon: "🚗",
        priority: "high",
      };
    }

    if (!attendanceStatus.arrivalReported) {
      return {
        title: "到着報告",
        description: "到着時間と身だしなみ写真をアップロード",
        href: "/dashboard/attendance?action=arrival",
        icon: "🏢",
        priority: "high",
      };
    }

    if (!attendanceStatus.dailyReportSubmitted) {
      return {
        title: "日報作成",
        description: "本日の業務内容を報告",
        href: "/dashboard/reports",
        icon: "📝",
        priority: "medium",
      };
    }

    // if (!attendanceStatus.shiftScheduleSubmitted) {
    //   return {
    //     title: "シフト提出",
    //     description: "来週のシフト予定を提出",
    //     href: "/dashboard/shifts",
    //     icon: "📅",
    //     priority: "low",
    //   };
    // }

    return null;
  };

  const nextAction = getNextAction();

  const quickActionItems = [
    {
      title: "前日報告",
      href: "/dashboard/attendance?action=previous-day",
      icon: "🌙",
      completed: attendanceStatus.previousDayReported || false,
    },
    {
      title: "起床報告",
      href: "/dashboard/attendance?action=wakeup",
      icon: "🌅",
      completed: attendanceStatus.wakeUpReported,
    },
    {
      title: "出発報告",
      href: "/dashboard/attendance?action=departure",
      icon: "🚗",
      completed: attendanceStatus.departureReported,
    },
    {
      title: "到着報告",
      href: "/dashboard/attendance?action=arrival",
      icon: "🏢",
      completed: attendanceStatus.arrivalReported,
    },
    {
      title: "日報作成",
      href: "/dashboard/reports",
      icon: "📝",
      completed: attendanceStatus.dailyReportSubmitted,
    },
  ];

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

  // If today is already completed, show completion status
  if (isTodayCompleted()) {
    return (
      <div className="mb-6">
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">✅</span>
              <div>
                <h3 className="font-semibold text-blue-900">本日の業務完了済み</h3>
                <p className="text-sm text-blue-700">
                  本日の業務は既に完了しています。データは管理者が確認できるよう保存されています。
                  <br />
                  「翌日開始」ボタンで新しい日のタスクを開始できます。
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              {/* <button
                onClick={async () => {
                  try {
                    const response = await api.post("/api/attendance/reopen-day", {});
                    if (response.ok) {
                      alert("業務を再開しました");
                      if (onStatusUpdate) {
                        onStatusUpdate();
                      }
                    } else {
                      alert("業務再開に失敗しました");
                    }
                  } catch (error) {
                    console.error("Error reopening day:", error);
                    alert("業務再開中にエラーが発生しました");
                  }
                }}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                再開
              </button> */}
              <button
                onClick={() => setShowNewDayConfirm(true)}
                disabled={isStartingNewDay}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStartingNewDay ? "開始中..." : "翌日開始"}
              </button>
            </div>
          </div>
        </div>

        {/* Show completed tasks for reference */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">完了済みタスク</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActionItems.map((item) => (
              <div key={item.title} className="relative p-3 rounded-lg border-2 border-green-200 bg-green-50 text-green-700 opacity-75">
                <div className="text-center">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="absolute top-1 right-1">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* New Day Confirmation Dialog */}
        {showNewDayConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">翌日開始の確認</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                新しい日を開始しますか？
                <br />
                この操作により、本日の完了状態がリセットされ、新しいタスクが表示されます。
                <br />
                <span className="text-xs sm:text-sm text-amber-600">※ 完了済みのデータは管理者用に保存されます</span>
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

  return (
    <div className="mb-6">
      {/* Next Action Card */}
      {nextAction && (
        <div className={`rounded-lg border-2 p-4 mb-4 ${getPriorityColor(nextAction.priority)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">{nextAction.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900">次のアクション: {nextAction.title}</h3>
                <p className="text-sm text-gray-600">{nextAction.description}</p>
              </div>
            </div>
            <Link href={nextAction.href} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
              開始
            </Link>
          </div>
        </div>
      )}

      {/* All Actions Complete */}
      {!nextAction && (
        <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🎉</span>
              <div>
                <h3 className="font-semibold text-green-900">本日のタスク完了</h3>
                <p className="text-sm text-green-700">お疲れ様でした！本日の全ての報告が完了しています。</p>
              </div>
            </div>
            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isCompleting}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCompleting ? "処理中..." : "報告終了"}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">報告終了の確認</h3>

            {isAllTasksComplete() ? (
              <p className="text-gray-600 mb-6">
                本日の業務報告を終了しますか？
                <br />
                この操作により、本日のタスクがリセットされ、新しい日の準備が整います。
              </p>
            ) : (
              <div className="mb-6">
                <p className="text-amber-600 mb-3">⚠️ まだ完了していないタスクがあります：</p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                  {!attendanceStatus.previousDayReported && <li>• 前日報告</li>}
                  {!attendanceStatus.wakeUpReported && <li>• 起床報告</li>}
                  {!attendanceStatus.departureReported && <li>• 出発報告</li>}
                  {!attendanceStatus.arrivalReported && <li>• 到着報告</li>}
                  {!attendanceStatus.dailyReportSubmitted && <li>• 日報提出</li>}
                </ul>
                <p className="text-gray-600">それでも業務を終了しますか？</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCompleteDay}
                disabled={isCompleting}
                className={`flex-1 px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 ${
                  isAllTasksComplete() ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {isCompleting ? "処理中..." : "終了する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">クイックアクション</h3>
          {/* {nextAction && (
            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isCompleting}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              早期終了
            </button>
          )} */}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {quickActionItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`
                relative p-3 rounded-lg border-2 transition-all hover:shadow-md
                ${item.completed ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"}
              `}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-sm font-medium">{item.title}</div>
                {item.completed && (
                  <div className="absolute top-1 right-1">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
