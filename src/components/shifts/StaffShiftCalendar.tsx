"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { StaffAvailability, Worksite } from "@/types/database";
import { getTodayJST } from "@/utils/dateUtils";

export default function StaffShiftCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date(getTodayJST()));
  const [availabilities, setAvailabilities] = useState<StaffAvailability[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
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

  const fetchWorksites = async () => {
    try {
      const { data, error } = await supabase.from("worksites").select("*").eq("is_active", true).order("name");

      if (error) throw error;
      setWorksites((data as Worksite[]) || []);
    } catch (error) {
      console.error("Error fetching worksites:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAvailabilities();
      fetchWorksites();
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

  const getAvailabilityStatus = (date: Date | null): { isAvailable: boolean; worksiteId?: string | null } => {
    if (!date) return { isAvailable: false };
    const dateStr = date.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    const availability = availabilities.find((avail) => avail.date === dateStr);
    return {
      isAvailable: !!availability,
      worksiteId: availability?.worksite_id,
    };
  };

  const handleDateToggle = async (date: Date | null) => {
    if (!date || !user) return;

    const dateStr = date.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    const existing = availabilities.find((avail) => avail.date === dateStr);

    // Do not allow changes if a worksite is assigned (shift is confirmed)
    if (existing?.worksite_id) {
      alert("この日付のシフトは確定済みのため、変更できません。");
      return;
    }

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
              const { isAvailable, worksiteId } = getAvailabilityStatus(date);
              const dayOfWeek = date?.getDay();

              const isConfirmed = isAvailable && worksiteId;

              return (
                <div
                  key={index}
                  onClick={() => (isConfirmed ? null : handleDateToggle(date))}
                  className={`min-h-20 p-2 border-b border-r border-gray-200 transition-all ${
                    !date ? "bg-gray-50" : ""
                  } ${isToday ? "ring-2 ring-blue-500 ring-inset" : ""} ${
                    isConfirmed
                      ? "bg-green-100"
                      : isAvailable
                      ? "bg-blue-100 hover:bg-blue-200"
                      : "hover:bg-gray-50"
                  } ${isConfirmed ? "cursor-default" : "cursor-pointer"}`}
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
                            : isConfirmed
                            ? "text-green-700"
                            : isAvailable
                            ? "text-blue-700"
                            : "text-gray-700"
                        }`}
                      >
                        {date.getDate()}
                      </div>
                      {isAvailable &&
                        (() => {
                          const worksite = worksites.find((w) => w.id === worksiteId);
                          return (
                            <>
                              <div
                                className={`text-xs font-medium px-2 py-1 rounded mb-1 ${
                                  isConfirmed
                                    ? "bg-green-200 text-green-800"
                                    : "bg-blue-200 text-blue-800"
                                }`}
                              >
                                {isConfirmed ? "出勤確定" : "出勤希望"}
                              </div>
                              {worksite && (
                                <div className="text-xs text-gray-600 text-center px-1">
                                  📍 {worksite.name}
                                </div>
                              )}
                            </>
                          );
                        })()}
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
          <span className="text-lg font-semibold text-gray-900">
            {availabilities.filter((a) => !a.worksite_id).length}日
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-600">今月の出勤確定日数:</span>
          <span className="text-lg font-semibold text-gray-900">
            {availabilities.filter((a) => a.worksite_id).length}日
          </span>
        </div>
      </div>
    </div>
  );
}
