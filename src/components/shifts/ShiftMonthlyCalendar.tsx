"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { StaffAvailability } from "@/types/database";

interface ShiftMonthlyCalendarProps {
  userId: string;
  userName: string;
}

export default function ShiftMonthlyCalendar({ userId, userName }: ShiftMonthlyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availabilities, setAvailabilities] = useState<StaffAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch availability data for the current month
  const fetchAvailabilities = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const startDate = new Date(year, month, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("staff_availability")
        .select("*")
        .eq("staff_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date");

      if (error) throw error;
      setAvailabilities((data as StaffAvailability[]) || []);
    } catch (error) {
      console.error("Error fetching availabilities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailabilities();
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

  // Check if a date is available
  const isDateAvailable = (date: Date | null): boolean => {
    if (!date) return false;
    const dateStr = date.toISOString().split("T")[0];
    return availabilities.some((avail) => avail.date === dateStr);
  };

  // Handle month navigation
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // Handle date click - toggle availability
  const handleDateClick = async (date: Date | null) => {
    if (!date) return;

    const dateStr = date.toISOString().split("T")[0];
    const existing = availabilities.find((avail) => avail.date === dateStr);

    try {
      if (existing) {
        // Remove availability (出社不可にする)
        const { error } = await supabase.from("staff_availability").delete().eq("id", existing.id);

        if (error) throw error;
      } else {
        // Add availability (出社可能にする)
        const { error } = await supabase.from("staff_availability").insert({
          staff_id: userId,
          date: dateStr,
        });

        if (error) throw error;
      }

      await fetchAvailabilities();
    } catch (error) {
      console.error("Error toggling availability:", error);
      alert("出社可能日の更新に失敗しました");
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

      {/* Instructions */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          📅 日付をクリックすると出社可能日として登録・解除できます
        </p>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
            <div
              key={day}
              className={`p-2 text-center text-sm font-semibold ${
                index === 0 ? "text-red-600" : index === 6 ? "text-blue-600" : "text-gray-600"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            const dateStr = date?.toISOString().split("T")[0];
            const isToday = dateStr === today;
            const isAvailable = isDateAvailable(date);
            const dayOfWeek = date?.getDay();

            return (
              <div
                key={index}
                onClick={() => handleDateClick(date)}
                className={`min-h-20 p-2 border-b border-r border-gray-200 cursor-pointer transition-all ${
                  !date ? "bg-gray-50 cursor-default" : ""
                } ${isToday ? "ring-2 ring-blue-500 ring-inset" : ""} ${
                  isAvailable ? "bg-blue-100 hover:bg-blue-200" : "hover:bg-gray-50"
                }`}
              >
                {date && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div
                      className={`text-sm font-semibold mb-1 ${
                        isToday
                          ? "text-blue-600"
                          : dayOfWeek === 0
                          ? "text-red-600"
                          : dayOfWeek === 6
                          ? "text-blue-600"
                          : isAvailable
                          ? "text-blue-700"
                          : "text-gray-700"
                      }`}
                    >
                      {date.getDate()}
                    </div>
                    {isAvailable && (
                      <div className="text-xs text-blue-700 font-medium bg-blue-200 px-2 py-1 rounded">
                        出社可
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">今月の出社可能日数:</span>
          <span className="text-lg font-semibold text-gray-900">{availabilities.length}日</span>
        </div>
      </div>
    </div>
  );
}
