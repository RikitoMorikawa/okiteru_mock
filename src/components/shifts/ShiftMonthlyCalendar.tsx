"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { StaffAvailability, Worksite, Database } from "@/types/database";

import { getTodayJST } from "@/utils/dateUtils";

interface ShiftMonthlyCalendarProps {
  userId: string;
  userName: string;
}

export default function ShiftMonthlyCalendar({ userId, userName }: ShiftMonthlyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(getTodayJST()));
  const [availabilities, setAvailabilities] = useState<StaffAvailability[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorksiteId, setSelectedWorksiteId] = useState<string>("");

  // Fetch availability data for the current month
  const fetchAvailabilities = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const startDate = new Date(year, month, 1).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
      const endDate = new Date(year, month + 1, 0).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

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

  // Fetch worksites (現場マスタ)
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
    fetchAvailabilities();
    fetchWorksites();
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

  // Check if a date is available and return availability info
  const getAvailabilityStatus = (date: Date | null): { isAvailable: boolean; worksiteId?: string | null } => {
    if (!date) return { isAvailable: false };
    const dateStr = date.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    const availability = availabilities.find((avail) => avail.date === dateStr);
    return {
      isAvailable: !!availability,
      worksiteId: availability?.worksite_id,
    };
  };

  // Handle month navigation
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // Handle date click - open modal
  const handleDateClick = (date: Date | null) => {
    if (!date) return;

    // 既存の出社可能日データがあれば、その現場IDを設定
    const dateStr = date.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    const existing = availabilities.find((avail) => avail.date === dateStr);
    setSelectedWorksiteId(existing?.worksite_id || "");

    setSelectedDate(date);
    setIsModalOpen(true);
  };

  // Handle availability toggle in modal
  const handleToggleAvailability = async (makeAvailable: boolean) => {
    if (!selectedDate) return;

    const dateStr = selectedDate.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    const existing = availabilities.find((avail) => avail.date === dateStr);

    try {
      if (makeAvailable) {
        // Add or update availability (出社可能にする)
        if (existing) {
          // 既存レコードを更新
          const { error } = await supabase
            .from("staff_availability")
            // @ts-expect-error
            .update({
              worksite_id: selectedWorksiteId || undefined,
            })
            .eq("id", existing.id);

          if (error) throw error;
        } else {
          // 新規レコードを挿入
          const { error } = await supabase.from("staff_availability")
            // @ts-expect-error
            .insert({
              staff_id: userId,
              date: dateStr,
              worksite_id: selectedWorksiteId || undefined,
            });

          if (error) throw error;
        }
      } else {
        // Remove availability (出社不可にする)
        if (existing) {
          const { error } = await supabase.from("staff_availability").delete().eq("id", existing.id);

          if (error) throw error;
        }
      }

      await fetchAvailabilities();
      setIsModalOpen(false);
      setSelectedWorksiteId(""); // リセット
    } catch (error) {
      console.error("Error toggling availability:", error);
      alert("出社可能日の更新に失敗しました");
    }
  };

  const calendarDays = getCalendarDays();
  const today = getTodayJST();

  return (
    <div>
      {/* Month Navigation */}
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

      {/* Instructions */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">📅 日付をクリックすると詳細モーダルが開きます。そこで出社可否を設定できます。</p>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200" style={{ minWidth: "640px" }}>
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
              <div
                key={day}
                className={`p-2 text-center text-sm font-semibold ${index === 0 ? "text-red-600" : index === 6 ? "text-blue-600" : "text-gray-600"}`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date, index) => {
              const dateStr = date?.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
              const isToday = dateStr === today;
              const { isAvailable, worksiteId } = getAvailabilityStatus(date);
              const dayOfWeek = date?.getDay();

              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(date)}
                  className={`min-h-20 p-2 border-b border-r border-gray-200 cursor-pointer transition-all ${!date ? "bg-gray-50 cursor-default" : ""} ${
                    isToday ? "ring-2 ring-blue-500 ring-inset" : ""
                  } ${
                    isAvailable
                      ? worksiteId
                        ? "bg-green-100 hover:bg-green-200"
                        : "bg-blue-100 hover:bg-blue-200"
                      : "hover:bg-gray-50"
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
                            ? worksiteId
                              ? "text-green-700"
                              : "text-blue-700"
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
                                  worksiteId ? "bg-green-200 text-green-800" : "bg-blue-200 text-blue-700"
                                }`}
                              >
                                {worksiteId ? "出社確定" : "出社可"}
                              </div>
                              {worksite && <div className="text-xs text-gray-600 text-center px-1">📍 {worksite.name}</div>}
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

      {/* Summary */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">今月の出社可能日数:</span>
          <span className="text-lg font-semibold text-gray-900">{availabilities.length}日</span>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDate.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric" })}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Current Status */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">現在のステータス:</p>
              <p className="text-base font-semibold">
                {(() => {
                  const { isAvailable, worksiteId } = getAvailabilityStatus(selectedDate);
                  if (isAvailable) {
                    return worksiteId ? (
                      <span className="text-green-600">✓ 出社確定</span>
                    ) : (
                      <span className="text-blue-600">✓ 出社可能</span>
                    );
                  }
                  return <span className="text-gray-600">✗ 出社不可</span>;
                })()}
              </p>
              {getAvailabilityStatus(selectedDate).isAvailable &&
                (() => {
                  const { worksiteId } = getAvailabilityStatus(selectedDate);
                  const worksite = worksites.find((w) => w.id === worksiteId);
                  return worksite ? (
                    <p className="text-sm text-gray-600 mt-2">📍 現場: {worksite.name}</p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-2">📍 現場: 未設定</p>
                  );
                })()}
            </div>

            {/* Worksite Selection */}
            <div className="mb-6">
              <label htmlFor="worksite" className="block text-sm font-medium text-gray-700 mb-2">
                勤務現場を選択
              </label>
              <select
                id="worksite"
                value={selectedWorksiteId}
                onChange={(e) => setSelectedWorksiteId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">-- 現場を選択してください --</option>
                {worksites.map((worksite) => (
                  <option key={worksite.id} value={worksite.id}>
                    {worksite.name} {worksite.address && `(${worksite.address})`}
                  </option>
                ))}
              </select>
              {selectedWorksiteId &&
                (() => {
                  const worksite = worksites.find((w) => w.id === selectedWorksiteId);
                  return worksite?.description ? <p className="text-xs text-gray-500 mt-1">{worksite.description}</p> : null;
                })()}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleToggleAvailability(true)}
                disabled={getAvailabilityStatus(selectedDate).isAvailable}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                  getAvailabilityStatus(selectedDate).isAvailable
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                }`}
              >
                {getAvailabilityStatus(selectedDate).isAvailable ? "✓ すでに出社可能に設定済み" : "出社可能にする"}
              </button>

              <button
                onClick={() => handleToggleAvailability(false)}
                disabled={!getAvailabilityStatus(selectedDate).isAvailable}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                  !getAvailabilityStatus(selectedDate).isAvailable
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700 active:scale-95"
                }`}
              >
                {!getAvailabilityStatus(selectedDate).isAvailable ? "✓ すでに出社不可に設定済み" : "出社不可にする"}
              </button>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full py-3 px-4 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
