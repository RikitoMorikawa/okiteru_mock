"use client";

import { useState } from "react";
import Link from "next/link";
import { User, AttendanceRecord, DailyReport } from "@/types/database";
import StaffDetailModal from "@/components/staff/StaffDetailModal";
import { supabase } from "@/lib/supabase";

interface StaffWithStatus extends User {
  todayAttendance?: AttendanceRecord;
  resetRecord?: AttendanceRecord; // リセットレコードの詳細
  todayReport?: DailyReport;
  previousDayReport?: any; // 前日報告データ
  lastLogin?: string;
  hasResetToday?: boolean; // リセットされたかどうか
  hasActiveRecord?: boolean; // アクティブな記録があるかどうか
}

interface StaffStatusCardProps {
  staff: StaffWithStatus;
}

export default function StaffStatusCard({ staff }: StaffStatusCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updatingActive, setUpdatingActive] = useState(false);

  // Calculate completion status
  const getCompletionStatus = () => {
    // 非活動のユーザーは進捗0
    if (!staff.active) {
      const tasks = [
        { name: "前日報告", completed: false },
        { name: "起床報告", completed: false },
        { name: "出発報告", completed: false },
        { name: "到着報告", completed: false },
        { name: "日報提出", completed: false },
      ];

      return { tasks, completed: 0, total: tasks.length, percentage: 0 };
    }

    // 活動中のユーザー：シンプルに4段階の進捗
    // リセットされた場合はリセット前の記録を使用
    const attendanceRecord = staff.hasResetToday && !staff.hasActiveRecord ? staff.resetRecord : staff.todayAttendance;

    const tasks = [
      { name: "起床報告", completed: !!attendanceRecord?.wake_up_time },
      { name: "出発報告", completed: !!attendanceRecord?.departure_time },
      { name: "到着報告", completed: !!attendanceRecord?.arrival_time },
      { name: "日報提出", completed: staff.todayReport?.status === "submitted" || staff.todayReport?.status === "archived" },
    ];

    const completed = tasks.filter((task) => task.completed).length;
    const total = tasks.length;
    const percentage = Math.round((completed / total) * 100);

    return { tasks, completed, total, percentage };
  };

  // Get overall status
  const getOverallStatus = () => {
    const { percentage } = getCompletionStatus();

    // 非活動のユーザーは常に「非活動」
    if (!staff.active) {
      return { status: "inactive", label: "非活動", color: "gray" };
    }

    // 活動中のユーザーは従来通りの詳細な判定
    // リセットされたユーザーは「完了」として表示（緑色）
    if (staff.hasResetToday && !staff.hasActiveRecord) {
      return { status: "complete", label: "完了", color: "green" };
    }

    // 日報が提出されている場合は「完了」として表示
    if (staff.todayReport?.status === "submitted" || staff.todayReport?.status === "archived") {
      return { status: "complete", label: "完了", color: "green" };
    }

    if (percentage === 100) return { status: "complete", label: "完了", color: "green" };
    if (percentage > 0) return { status: "partial", label: "進行中", color: "yellow" };
    return { status: "inactive", label: "未開始", color: "gray" };
  };

  // Format time
  const formatTime = (timeString?: string) => {
    if (!timeString) return "--:--";
    return new Date(timeString).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format last login
  const formatLastLogin = (loginTime?: string) => {
    if (!loginTime) return "未ログイン";
    const date = new Date(loginTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "1分以内";
    if (diffMinutes < 60) return `${diffMinutes}分前`;
    if (diffHours < 24) {
      const remainingMinutes = diffMinutes % 60;
      if (remainingMinutes === 0) {
        return `${diffHours}時間前`;
      } else {
        return `${diffHours}時間${remainingMinutes}分前`;
      }
    }
    if (diffDays < 7) return `${diffDays}日前`;

    // 1週間以上前は日付を表示
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Toggle active status
  const toggleActiveStatus = async () => {
    try {
      setUpdatingActive(true);

      // Check if current user is a manager
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("認証が必要です。再度ログインしてください。");
        return;
      }

      // Check if user is a manager
      const { data: currentUser } = await supabase.from("users").select("role").eq("id", session.user.id).single();

      if (!currentUser || (currentUser as any).role !== "manager") {
        alert("管理者権限が必要です。");
        return;
      }

      // Update the staff member's active status directly
      const { error } = await (supabase as any).from("users").update({ active: !staff.active }).eq("id", staff.id).eq("role", "staff");

      if (error) {
        console.error("Error updating active status:", error);
        throw new Error("activeステータスの更新に失敗しました");
      }

      // Refresh the page to update the data
      window.location.reload();
    } catch (error) {
      console.error("Error updating active status:", error);
      alert("activeステータスの更新に失敗しました");
    } finally {
      setUpdatingActive(false);
    }
  };


  const { tasks, completed, total, percentage } = getCompletionStatus();
  const { status, label, color } = getOverallStatus();

  const statusColors = {
    red: "bg-red-100 text-red-800 border-red-200",
    green: "bg-green-100 text-green-800 border-green-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200",
  };

  const borderColors = {
    red: "border-red-300",
    green: "border-green-300",
    yellow: "border-yellow-300",
    gray: "border-gray-300",
    purple: "border-purple-300",
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${borderColors[color as keyof typeof borderColors]} hover:shadow-md transition-shadow`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">{staff.name.charAt(0)}</span>
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm mr-4 font-medium text-gray-900">{staff.name}</h3>
                </div>
                {/* Active Status */}
                <button
                  onClick={toggleActiveStatus}
                  disabled={updatingActive}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                    staff.active
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  } ${updatingActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {updatingActive ? (
                    <svg className="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
                    <div
                      className={`w-1.5 h-1.5 rounded-full mr-1 ${staff.active ? "bg-green-500" : "bg-gray-400"}`}
                    ></div>
                  )}
                  {staff.active ? "活動中" : "非活動"}
                </button>
              </div>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[color as keyof typeof statusColors]}`}>{label}</div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>本日の進捗</span>
            <span>
              {!staff.active
                ? "非活動"
                : staff.hasResetToday && !staff.hasActiveRecord
                ? "完了"
                : staff.todayReport?.status === "submitted" || staff.todayReport?.status === "archived"
                ? "完了"
                : `${completed}/${total}`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                color === "green"
                  ? "bg-green-500"
                  : color === "yellow"
                  ? "bg-yellow-500"
                  : color === "red"
                  ? "bg-red-500"
                  : color === "purple"
                  ? "bg-purple-500"
                  : "bg-gray-400"
              }`}
              style={{
                width: `${
                  (staff.hasResetToday && !staff.hasActiveRecord) || staff.todayReport?.status === "submitted" || staff.todayReport?.status === "archived"
                    ? 100
                    : percentage
                }%`,
              }}
            ></div>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center"
        >
          {expanded ? "詳細を閉じる" : "詳細を表示"}
          <svg className={`w-4 h-4 ml-1 transform transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {/* Additional Info */}
            <div className="text-xs text-gray-500 space-y-1 mb-4">
              <div>最終ログイン: {formatLastLogin(staff.lastLogin)}</div>
              {staff.phone && <div>電話: {staff.phone}</div>}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Link
                href={`/manager/staff/${staff.id}/history`}
                className="flex-1 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 text-center transition-colors"
              >
                履歴表示
              </Link>
              <button
                onClick={() => setShowDetailModal(true)}
                className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                詳細
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <StaffDetailModal staff={staff} isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} />
    </div>
  );
}
