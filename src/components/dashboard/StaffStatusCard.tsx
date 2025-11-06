"use client";

import { useState } from "react";
import Link from "next/link";
import { User, AttendanceRecord, DailyReport, StaffAvailability } from "@/types/database";

interface StaffWithStatus extends User {
  todayAttendance?: AttendanceRecord;
  resetRecord?: AttendanceRecord; // リセットレコードの詳細
  todayReport?: DailyReport;
  availability: StaffAvailability; // staff_availability record
  activeAlerts: any[]; // Keep for compatibility but will be empty
  lastLogin?: string;
  hasResetToday?: boolean; // リセットされたかどうか
  hasActiveRecord?: boolean; // アクティブな記録があるかどうか
  hasPreviousDayReport?: boolean; // 前日報告があるかどうか
  isConfirmed?: boolean; // 出社確定かどうか
}

interface StaffStatusCardProps {
  staff: StaffWithStatus;
}

export default function StaffStatusCard({ staff }: StaffStatusCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Calculate completion status
  const getCompletionStatus = () => {
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

    if (staff.hasResetToday && !staff.hasActiveRecord) {
      return { status: "complete", label: "完了", color: "green" };
    }

    if (staff.todayReport?.status === "submitted" || staff.todayReport?.status === "archived") {
      return { status: "complete", label: "完了", color: "green" };
    }

    if (percentage === 100) return { status: "complete", label: "完了", color: "green" };
    if (percentage > 0) return { status: "partial", label: "進行中", color: "yellow" };
    return { status: "inactive", label: "未開始", color: "gray" };
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



  const { status, label, color } = getOverallStatus();
  const { completed, total, percentage } = getCompletionStatus();

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
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${borderColors[color as keyof typeof borderColors]} ${staff.isConfirmed ? "border-blue-500" : ""} hover:shadow-md transition-shadow`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center flex-grow">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-gray-600">{staff.name.charAt(0)}</span>
            </div>
            <div className="ml-2 flex-grow">
              <div className="flex items-center">
                <h3 className="text-xs font-medium text-gray-900 truncate">{staff.name}</h3>
                {label === "未開始" && (
                  <div className={`px-1.5 py-0.5 text-xs font-medium border ${statusColors[color as keyof typeof statusColors]} ml-2 flex-shrink-0`}>{label}</div>
                )}
                {staff.isConfirmed && (
                  <span className="ml-2 px-1.5 py-0.5 text-[0.6rem] font-medium bg-blue-100 text-blue-800 rounded-full flex-shrink-0">確定</span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
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
          </div>
          <div className="flex items-center">
            {label !== "未開始" && (
              <div className={`px-1.5 py-0.5 text-xs font-medium border ${statusColors[color as keyof typeof statusColors]} ml-2 flex-shrink-0`}>{label}</div>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex-shrink-0 ml-1"
            >
              <svg className={`w-4 h-4 transform transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {/* Worksite Info */}
            {staff.availability && (
              <div className="text-xs text-gray-600 mb-2">
                <span className="font-medium">勤務先:</span> {staff.availability.worksites?.name || "未設定"}
              </div>
            )}

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
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
