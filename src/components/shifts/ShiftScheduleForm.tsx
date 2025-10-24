"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

interface ShiftEntry {
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  isAvailable: boolean;
}

interface ShiftWeek {
  weekStart: string;
  weekEnd: string;
  shifts: ShiftEntry[];
}

export default function ShiftScheduleForm() {
  const { user } = useAuth();
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [shiftWeek, setShiftWeek] = useState<ShiftWeek | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Generate next few weeks for selection
  const getAvailableWeeks = () => {
    const weeks = [];
    const today = new Date();

    for (let i = 1; i <= 4; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + 7 * i - today.getDay() + 1); // Next Monday

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Sunday

      const weekStartStr = weekStart.toISOString().split("T")[0];
      const weekEndStr = weekEnd.toISOString().split("T")[0];

      weeks.push({
        value: weekStartStr,
        label: `${weekStart.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("ja-JP", {
          month: "short",
          day: "numeric",
        })}`,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
      });
    }

    return weeks;
  };

  const availableWeeks = getAvailableWeeks();

  // Initialize shift week when week is selected
  useEffect(() => {
    if (selectedWeek) {
      const weekInfo = availableWeeks.find((w) => w.value === selectedWeek);
      if (weekInfo) {
        initializeShiftWeek(weekInfo.weekStart, weekInfo.weekEnd);
      }
    }
  }, [selectedWeek]);

  const initializeShiftWeek = async (weekStart: string, weekEnd: string) => {
    try {
      // Try to load existing shifts for this week
      const response = await fetch(`/api/shifts?weekStart=${weekStart}&weekEnd=${weekEnd}`);

      let existingShifts: ShiftEntry[] = [];
      if (response.ok) {
        const data = await response.json();
        existingShifts = data.shifts || [];
      }

      // Generate 7 days for the week
      const shifts: ShiftEntry[] = [];
      const startDate = new Date(weekStart);

      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];

        // Check if there's an existing shift for this date
        const existingShift = existingShifts.find((s) => s.date === dateStr);

        shifts.push({
          date: dateStr,
          startTime: existingShift?.startTime || "09:00",
          endTime: existingShift?.endTime || "18:00",
          location: existingShift?.location || "",
          notes: existingShift?.notes || "",
          isAvailable: existingShift?.isAvailable ?? true,
        });
      }

      setShiftWeek({
        weekStart,
        weekEnd,
        shifts,
      });
    } catch (error) {
      console.error("Failed to load existing shifts:", error);
      // Initialize with default values
      const shifts: ShiftEntry[] = [];
      const startDate = new Date(weekStart);

      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];

        shifts.push({
          date: dateStr,
          startTime: "09:00",
          endTime: "18:00",
          location: "",
          notes: "",
          isAvailable: true,
        });
      }

      setShiftWeek({
        weekStart,
        weekEnd,
        shifts,
      });
    }
  };

  const updateShift = (index: number, field: keyof ShiftEntry, value: string | boolean) => {
    if (!shiftWeek) return;

    const updatedShifts = [...shiftWeek.shifts];
    updatedShifts[index] = {
      ...updatedShifts[index],
      [field]: value,
    };

    setShiftWeek({
      ...shiftWeek,
      shifts: updatedShifts,
    });
  };

  const applyToAllDays = (field: keyof ShiftEntry, value: string) => {
    if (!shiftWeek) return;

    const updatedShifts = shiftWeek.shifts.map((shift) => ({
      ...shift,
      [field]: value,
    }));

    setShiftWeek({
      ...shiftWeek,
      shifts: updatedShifts,
    });
  };

  const submitShifts = async () => {
    if (!shiftWeek) {
      setError("シフト週を選択してください");
      return;
    }

    // Validate shifts
    const availableShifts = shiftWeek.shifts.filter((shift) => shift.isAvailable);
    for (const shift of availableShifts) {
      if (!shift.startTime || !shift.endTime) {
        setError("勤務可能日は開始時間と終了時間を入力してください");
        return;
      }

      if (shift.startTime >= shift.endTime) {
        setError("終了時間は開始時間より後に設定してください");
        return;
      }
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/shifts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekStart: shiftWeek.weekStart,
          weekEnd: shiftWeek.weekEnd,
          shifts: shiftWeek.shifts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "シフトの提出に失敗しました");
      }

      setSuccessMessage("シフトを提出しました");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "シフトの提出に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", { weekday: "short" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Week Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">シフト提出</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="week" className="block text-sm font-medium text-gray-700 mb-2">
              提出週を選択 <span className="text-red-500">*</span>
            </label>
            <select
              id="week"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">週を選択してください</option>
              {availableWeeks.map((week) => (
                <option key={week.value} value={week.value}>
                  {week.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Shift Schedule */}
      {shiftWeek && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              シフト予定 ({new Date(shiftWeek.weekStart).toLocaleDateString("ja-JP")} - {new Date(shiftWeek.weekEnd).toLocaleDateString("ja-JP")})
            </h3>

            {/* Quick Actions */}
            <div className="flex space-x-2">
              <button onClick={() => applyToAllDays("location", "本社")} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                全日「本社」
              </button>
              <button onClick={() => applyToAllDays("startTime", "09:00")} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                全日9:00開始
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {shiftWeek.shifts.map((shift, index) => (
              <div key={shift.date} className={`border rounded-lg p-4 ${shift.isAvailable ? "border-gray-200" : "border-gray-100 bg-gray-50"}`}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  {/* Date and Availability */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={shift.isAvailable}
                        onChange={(e) => updateShift(index, "isAvailable", e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{getDayName(shift.date)}</div>
                        <div className="text-sm text-gray-600">{formatDate(shift.date)}</div>
                      </div>
                    </div>
                  </div>

                  {shift.isAvailable ? (
                    <>
                      {/* Start Time */}
                      <div className="lg:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">開始時間</label>
                        <input
                          type="time"
                          value={shift.startTime}
                          onChange={(e) => updateShift(index, "startTime", e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>

                      {/* End Time */}
                      <div className="lg:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">終了時間</label>
                        <input
                          type="time"
                          value={shift.endTime}
                          onChange={(e) => updateShift(index, "endTime", e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>

                      {/* Location */}
                      <div className="lg:col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">勤務場所</label>
                        <input
                          type="text"
                          value={shift.location}
                          onChange={(e) => updateShift(index, "location", e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="本社、営業所、在宅など"
                        />
                      </div>

                      {/* Notes */}
                      <div className="lg:col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">備考</label>
                        <input
                          type="text"
                          value={shift.notes}
                          onChange={(e) => updateShift(index, "notes", e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="特記事項があれば記入"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="lg:col-span-10 text-center text-gray-500 py-4">勤務不可</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={submitShifts}
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "提出中..." : "シフトを提出"}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">シフト提出について</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>チェックボックスで勤務可能日を選択してください</li>
                <li>勤務可能日は開始・終了時間と勤務場所を入力してください</li>
                <li>「全日」ボタンで一括設定ができます</li>
                <li>提出後の変更は管理者に連絡してください</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
