"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { StaffAvailability } from "@/types/database";
import { getTodayJST } from "@/utils/dateUtils";

export default function StaffShiftCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date(getTodayJST()));
  const [availabilities, setAvailabilities] = useState<StaffAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAvailabilities = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
      const endDate = new Date(year, month + 1, 0).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

      const { data, error } = await supabase
        .from("staff_availability")
        .select("*")
        .eq("staff_id", user.id)
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
    if (user) {
      fetchAvailabilities();
    }
  }, [currentDate, user]);

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days: (Date | null)[] = [];

    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const getAvailabilityStatus = (date: Date | null): boolean => {
    if (!date) return false;
    const dateStr = date.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    return availabilities.some((avail) => avail.date === dateStr);
  };

  const handleDateToggle = async (date: Date | null) => {
    if (!date || !user) return;

    const dateStr = date.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    const existing = availabilities.find((avail) => avail.date === dateStr);

    try {
      if (existing) {
        // Delete availability
        const { error } = await supabase.from("staff_availability").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        // Add availability
        // @ts-expect-error
        const { error } = await supabase.from("staff_availability").insert({
          staff_id: user.id,
          date: dateStr,
          worksite_id: null,
        });
        if (error) throw error;
      }
      await fetchAvailabilities();
    } catch (error) {
      console.error("Error toggling availability:", error);
      alert("シフトの更新に失敗しました");
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const calendarDays = getCalendarDays();
  const today = getTodayJST();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-semibold">
          {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
        </h2>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">📅 日付をクリックして、出勤希望日を登録・解除できます。</p>
      </div>

      <div className="overflow-x-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200" style={{ minWidth: "640px" }}>
          <div className="grid grid-cols-7 border-b border-gray-200">
            {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
              <div key={day} className={`p-2 text-center text-sm font-semibold ${index === 0 ? "text-red-600" : index === 6 ? "text-blue-600" : "text-gray-600"}`}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((date, index) => {
              const dateStr = date?.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
              const isToday = dateStr === today;
              const isAvailable = getAvailabilityStatus(date);
              const dayOfWeek = date?.getDay();

              return (
                <div
                  key={index}
                  onClick={() => handleDateToggle(date)}
                  className={`min-h-20 p-2 border-b border-r border-gray-200 cursor-pointer transition-all ${!date ? "bg-gray-50 cursor-default" : ""} ${isToday ? "ring-2 ring-blue-500 ring-inset" : ""} ${isAvailable ? "bg-blue-100 hover:bg-blue-200" : "hover:bg-gray-50"}`}>
                  {date && (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className={`text-sm font-semibold mb-1 ${isToday ? "text-blue-600" : dayOfWeek === 0 ? "text-red-600" : dayOfWeek === 6 ? "text-blue-600" : isAvailable ? "text-blue-700" : "text-gray-700"}`}>
                        {date.getDate()}
                      </div>
                      {isAvailable && (
                        <div className="text-xs font-medium bg-blue-200 text-blue-800 px-2 py-1 rounded">
                          出勤希望
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">今月の出勤希望日数:</span>
          <span className="text-lg font-semibold text-gray-900">{availabilities.length}日</span>
        </div>
      </div>
    </div>
  );
}
