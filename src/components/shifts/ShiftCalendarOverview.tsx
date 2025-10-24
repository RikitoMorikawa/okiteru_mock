"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShiftSchedule, User } from "@/types/database";

interface ShiftWithStaff extends ShiftSchedule {
  staff: User;
}

interface ShiftCalendarOverviewProps {
  shifts: ShiftWithStaff[];
  currentWeek: Date;
  onWeekChange: (date: Date) => void;
  onShiftUpdate: () => void;
}

export default function ShiftCalendarOverview({ shifts, currentWeek, onWeekChange, onShiftUpdate }: ShiftCalendarOverviewProps) {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [selectedShift, setSelectedShift] = useState<ShiftWithStaff | null>(null);

  // Generate calendar days based on view mode
  const generateCalendarDays = () => {
    if (viewMode === "week") {
      return generateWeekDays();
    } else {
      return generateMonthDays();
    }
  };

  const generateWeekDays = () => {
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const generateMonthDays = () => {
    const year = currentWeek.getFullYear();
    const month = currentWeek.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  // Get shifts for a specific date
  const getShiftsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return shifts.filter((shift) => shift.date === dateStr);
  };

  // Navigation functions
  const navigatePrevious = () => {
    const newDate = new Date(currentWeek);
    if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    onWeekChange(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentWeek);
    if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    onWeekChange(newDate);
  };

  const navigateToday = () => {
    onWeekChange(new Date());
  };

  // Format time
  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status color
  const getStatusColor = (status: ShiftSchedule["status"]) => {
    switch (status) {
      case "scheduled":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const days = generateCalendarDays();
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

  return (
    <div>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-gray-900">
            {viewMode === "week"
              ? `${currentWeek.getFullYear()}年 ${monthNames[currentWeek.getMonth()]} 第${Math.ceil(currentWeek.getDate() / 7)}週`
              : `${currentWeek.getFullYear()}年 ${monthNames[currentWeek.getMonth()]}`}
          </h3>
          <div className="flex space-x-2">
            <button onClick={navigatePrevious} className="p-2 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={navigateToday} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded">
              今日
            </button>
            <button onClick={navigateNext} className="p-2 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-2 text-sm font-medium ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:text-gray-900"}`}
            >
              週表示
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-2 text-sm font-medium ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:text-gray-900"}`}
            >
              月表示
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {dayNames.map((day, index) => (
            <div key={day} className={`p-3 text-center text-sm font-medium text-gray-500 ${index === 0 || index === 6 ? "bg-gray-50" : "bg-white"}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className={`grid grid-cols-7 ${viewMode === "month" ? "grid-rows-6" : ""}`}>
          {days.map((day, index) => {
            const dayShifts = getShiftsForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isCurrentMonth = viewMode === "month" ? day.getMonth() === currentWeek.getMonth() : true;

            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border-r border-b border-gray-200 ${!isCurrentMonth ? "bg-gray-50 opacity-50" : "bg-white"} ${
                  isToday ? "bg-blue-50" : ""
                }`}
              >
                <div className={`text-sm font-medium mb-2 ${isToday ? "text-blue-600" : isCurrentMonth ? "text-gray-900" : "text-gray-400"}`}>
                  {day.getDate()}
                </div>

                <div className="space-y-1">
                  {dayShifts.slice(0, viewMode === "week" ? 10 : 3).map((shift) => (
                    <div
                      key={shift.id}
                      onClick={() => setSelectedShift(shift)}
                      className={`p-1 rounded text-xs cursor-pointer hover:opacity-80 border ${getStatusColor(shift.status)}`}
                    >
                      <div className="font-medium truncate">{shift.staff.name}</div>
                      <div className="truncate">
                        {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                      </div>
                      {shift.location && <div className="truncate text-gray-600">📍 {shift.location}</div>}
                    </div>
                  ))}

                  {dayShifts.length > (viewMode === "week" ? 10 : 3) && (
                    <div className="text-xs text-gray-500 text-center">+{dayShifts.length - (viewMode === "week" ? 10 : 3)}件</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded mr-2"></div>
          <span>承認待ち</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-100 border border-green-200 rounded mr-2"></div>
          <span>承認済み</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded mr-2"></div>
          <span>完了</span>
        </div>
      </div>

      {/* Shift Detail Modal */}
      {selectedShift && <ShiftDetailModal shift={selectedShift} onClose={() => setSelectedShift(null)} onUpdate={onShiftUpdate} />}
    </div>
  );
}

// Shift Detail Modal Component
function ShiftDetailModal({ shift, onClose, onUpdate }: { shift: ShiftWithStaff; onClose: () => void; onUpdate: () => void }) {
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus: ShiftSchedule["status"]) => {
    try {
      setUpdating(true);

      const { error } = await (supabase as any).from("shift_schedules").update({ status: newStatus }).eq("id", shift.id);

      if (error) throw error;

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error updating shift:", error);
    } finally {
      setUpdating(false);
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusLabel = (status: ShiftSchedule["status"]) => {
    switch (status) {
      case "scheduled":
        return "承認待ち";
      case "confirmed":
        return "承認済み";
      case "completed":
        return "完了";
      default:
        return status;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">シフト詳細</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Shift Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">スタッフ</label>
              <p className="mt-1 text-sm text-gray-900">{shift.staff.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">日付</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(shift.date).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">開始時間</label>
                <p className="mt-1 text-sm text-gray-900">{formatTime(shift.start_time)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">終了時間</label>
                <p className="mt-1 text-sm text-gray-900">{formatTime(shift.end_time)}</p>
              </div>
            </div>

            {shift.location && (
              <div>
                <label className="block text-sm font-medium text-gray-700">勤務場所</label>
                <p className="mt-1 text-sm text-gray-900">{shift.location}</p>
              </div>
            )}

            {shift.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700">備考</label>
                <p className="mt-1 text-sm text-gray-900">{shift.notes}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">ステータス</label>
              <p className="mt-1 text-sm text-gray-900">{getStatusLabel(shift.status)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">登録日時</label>
              <p className="mt-1 text-sm text-gray-500">{new Date(shift.created_at).toLocaleString("ja-JP")}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex space-x-3">
            {shift.status === "scheduled" && (
              <>
                <button
                  onClick={() => handleStatusUpdate("confirmed")}
                  disabled={updating}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {updating ? "更新中..." : "承認"}
                </button>
                <button onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400">
                  キャンセル
                </button>
              </>
            )}

            {shift.status === "confirmed" && (
              <>
                <button
                  onClick={() => handleStatusUpdate("completed")}
                  disabled={updating}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {updating ? "更新中..." : "完了にする"}
                </button>
                <button
                  onClick={() => handleStatusUpdate("scheduled")}
                  disabled={updating}
                  className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700 disabled:opacity-50"
                >
                  {updating ? "更新中..." : "承認取消"}
                </button>
              </>
            )}

            {shift.status === "completed" && (
              <button onClick={onClose} className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400">
                閉じる
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
