"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

interface ShiftEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  status: "scheduled" | "confirmed" | "completed";
}

interface CalendarDay {
  date: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  shift?: ShiftEntry;
}

export default function ShiftCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<ShiftEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<ShiftEntry | null>(null);

  useEffect(() => {
    loadShifts();
  }, [currentDate]);

  const loadShifts = async () => {
    try {
      setLoading(true);

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      // TODO: Replace with actual API call
      const response = await fetch(`/api/shifts/calendar?year=${year}&month=${month}`);

      if (response.ok) {
        const data = await response.json();
        setShifts(data.shifts || []);
      } else {
        // Mock data for demonstration
        const mockShifts: ShiftEntry[] = [
          {
            id: "1",
            date: "2024-01-22",
            startTime: "09:00",
            endTime: "18:00",
            location: "本社",
            notes: "",
            status: "confirmed",
          },
          {
            id: "2",
            date: "2024-01-23",
            startTime: "10:00",
            endTime: "19:00",
            location: "営業所",
            notes: "顧客訪問あり",
            status: "scheduled",
          },
          {
            id: "3",
            date: "2024-01-24",
            startTime: "09:30",
            endTime: "17:30",
            location: "在宅",
            notes: "",
            status: "scheduled",
          },
        ];
        setShifts(mockShifts);
      }
    } catch (error) {
      console.error("Failed to load shifts:", error);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Start from the first Monday of the calendar view
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay() + 1);

    // End at the last Sunday of the calendar view
    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (7 - lastDay.getDay()));

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split("T")[0];
      const shift = shifts.find((s) => s.date === dateStr);

      days.push({
        date: dateStr,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        shift,
      });
    }

    return days;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "確定";
      case "completed":
        return "完了";
      default:
        return "予定";
    }
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5); // HH:MM format
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ["月", "火", "水", "木", "金", "土", "日"];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-7 gap-2">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{currentDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}</h2>
          <div className="flex space-x-2">
            <button onClick={() => navigateMonth("prev")} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              今月
            </button>
            <button onClick={() => navigateMonth("next")} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Week Day Headers */}
          {weekDays.map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-700 bg-gray-50">
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((day) => (
            <div
              key={day.date}
              className={`
                min-h-24 p-2 border border-gray-200 cursor-pointer hover:bg-gray-50
                ${day.isCurrentMonth ? "bg-white" : "bg-gray-50"}
                ${day.isToday ? "ring-2 ring-blue-500" : ""}
              `}
              onClick={() => day.shift && setSelectedShift(day.shift)}
            >
              <div className={`text-sm ${day.isCurrentMonth ? "text-gray-900" : "text-gray-400"}`}>{new Date(day.date).getDate()}</div>

              {day.shift && (
                <div className={`mt-1 p-1 rounded text-xs border ${getStatusColor(day.shift.status)}`}>
                  <div className="font-medium">
                    {formatTime(day.shift.startTime)}-{formatTime(day.shift.endTime)}
                  </div>
                  <div className="truncate">{day.shift.location}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">凡例</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded mr-2"></div>
            <span className="text-sm text-gray-700">予定</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded mr-2"></div>
            <span className="text-sm text-gray-700">確定</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded mr-2"></div>
            <span className="text-sm text-gray-700">完了</span>
          </div>
        </div>
      </div>

      {/* Shift Detail Modal */}
      {selectedShift && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">シフト詳細</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedShift.date).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "long",
                    })}
                  </p>
                </div>
                <button onClick={() => setSelectedShift(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">開始時間</label>
                    <p className="mt-1 text-sm text-gray-900">{formatTime(selectedShift.startTime)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">終了時間</label>
                    <p className="mt-1 text-sm text-gray-900">{formatTime(selectedShift.endTime)}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">勤務場所</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedShift.location || "未設定"}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">ステータス</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedShift.status)}`}>
                      {getStatusText(selectedShift.status)}
                    </span>
                  </div>
                </div>

                {selectedShift.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">備考</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedShift.notes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedShift(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
