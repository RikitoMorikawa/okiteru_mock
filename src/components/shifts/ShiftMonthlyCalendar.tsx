"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ShiftSchedule, User } from "@/types/database";

interface ShiftMonthlyCalendarProps {
  userId: string;
  userName: string;
}

interface DayShift {
  date: string;
  shifts: ShiftSchedule[];
}

export default function ShiftMonthlyCalendar({ userId, userName }: ShiftMonthlyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<ShiftSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState({
    start_time: "",
    end_time: "",
    location: "",
    notes: "",
  });

  // Fetch shifts for the current month
  const fetchShifts = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const startDate = new Date(year, month, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("shift_schedules")
        .select("*")
        .eq("staff_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date")
        .order("start_time");

      if (error) throw error;
      setShifts((data as ShiftSchedule[]) || []);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [currentDate, userId]);

  // Get calendar days for the current month
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startPadding = firstDay.getDay();
    const days: (Date | null)[] = [];

    // Add padding for days before month starts
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  // Get shifts for a specific date
  const getShiftsForDate = (date: Date | null): ShiftSchedule[] => {
    if (!date) return [];
    const dateStr = date.toISOString().split("T")[0];
    return shifts.filter((shift) => shift.date === dateStr);
  };

  // Handle month navigation
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // Handle date click
  const handleDateClick = (date: Date | null) => {
    if (!date) return;
    const dateStr = date.toISOString().split("T")[0];
    setSelectedDate(dateStr);
    setShiftForm({
      start_time: "",
      end_time: "",
      location: "",
      notes: "",
    });
  };

  // Handle shift save
  const handleSaveShift = async () => {
    if (!selectedDate || !shiftForm.start_time || !shiftForm.end_time) {
      alert("開始時刻と終了時刻を入力してください");
      return;
    }

    try {
      const { error } = await supabase.from("shift_schedules").insert({
        staff_id: userId,
        date: selectedDate,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time,
        location: shiftForm.location || null,
        notes: shiftForm.notes || null,
        status: "scheduled",
      });

      if (error) throw error;

      await fetchShifts();
      setSelectedDate(null);
      setShiftForm({
        start_time: "",
        end_time: "",
        location: "",
        notes: "",
      });
    } catch (error) {
      console.error("Error saving shift:", error);
      alert("シフトの保存に失敗しました");
    }
  };

  // Handle shift delete
  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm("このシフトを削除しますか？")) return;

    try {
      const { error } = await supabase.from("shift_schedules").delete().eq("id", shiftId);

      if (error) throw error;
      await fetchShifts();
    } catch (error) {
      console.error("Error deleting shift:", error);
      alert("シフトの削除に失敗しました");
    }
  };

  const calendarDays = getCalendarDays();
  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-semibold">
          {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-semibold text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            const dayShifts = getShiftsForDate(date);
            const dateStr = date?.toISOString().split("T")[0];
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;

            return (
              <div
                key={index}
                onClick={() => handleDateClick(date)}
                className={`min-h-24 p-2 border-b border-r border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                  !date ? "bg-gray-50" : ""
                } ${isToday ? "bg-blue-50" : ""} ${isSelected ? "ring-2 ring-blue-500" : ""}`}
              >
                {date && (
                  <>
                    <div className={`text-sm font-semibold mb-1 ${isToday ? "text-blue-600" : ""}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayShifts.map((shift) => (
                        <div
                          key={shift.id}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex justify-between items-center group"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>
                            {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                          </span>
                          <button
                            onClick={() => handleDeleteShift(shift.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shift Form Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              シフト登録 - {new Date(selectedDate).toLocaleDateString("ja-JP")}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始時刻 *
                </label>
                <input
                  type="time"
                  value={shiftForm.start_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了時刻 *
                </label>
                <input
                  type="time"
                  value={shiftForm.end_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">場所</label>
                <input
                  type="text"
                  value={shiftForm.location}
                  onChange={(e) => setShiftForm({ ...shiftForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="勤務場所"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                <textarea
                  value={shiftForm.notes}
                  onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="備考・注意事項など"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setSelectedDate(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveShift}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
