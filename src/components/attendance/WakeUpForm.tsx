"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";

interface WakeUpFormProps {
  onSuccess: () => void;
}

export default function WakeUpForm({ onSuccess }: WakeUpFormProps) {
  const { user } = useAuth();
  const [wakeUpTime, setWakeUpTime] = useState(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:MM format
  });
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // Validate time format
      if (!wakeUpTime || !/^\d{2}:\d{2}$/.test(wakeUpTime)) {
        throw new Error("正しい時間形式で入力してください（HH:MM）");
      }

      // Create datetime from today's date and selected time
      const today = new Date();
      const [hours, minutes] = wakeUpTime.split(":").map(Number);
      const wakeUpDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);

      // Validate that wake up time is not in the future
      if (wakeUpDateTime > new Date()) {
        throw new Error("起床時間は現在時刻より前である必要があります");
      }

      const response = await api.post("/api/attendance/wakeup", {
        wake_up_time: wakeUpDateTime.toISOString(),
        notes: notes.trim(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "起床報告の送信に失敗しました");
      }

      // Success - trigger a custom event to notify other components
      window.dispatchEvent(
        new CustomEvent("attendanceUpdated", {
          detail: { type: "wakeup", timestamp: new Date() },
        })
      );

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    setWakeUpTime(now.toTimeString().slice(0, 5));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-6">
        <span className="text-2xl sm:text-3xl mr-3 sm:mr-4">🌅</span>
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">起床報告</h2>
          <p className="text-sm sm:text-base text-gray-600">起床時間を報告してください</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Wake Up Time */}
        <div>
          <label htmlFor="wakeUpTime" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            起床時間 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="time"
              id="wakeUpTime"
              value={wakeUpTime}
              onChange={(e) => setWakeUpTime(e.target.value)}
              className="block w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
              required
            />
            <button
              type="button"
              onClick={getCurrentTime}
              className="px-4 py-2 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              現在時刻を使用
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            備考（任意）
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm placeholder:text-xs sm:placeholder:text-sm"
            placeholder="体調や睡眠の質など、特記事項があれば記入してください"
            maxLength={500}
          />
        </div>

        {/* Error Message */}
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
                <p className="text-xs sm:text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onSuccess}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "送信中..." : "起床報告を送信"}
          </button>
        </div>
      </form>

      {/* Information */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
        <div>
          <div className="flex items-center mb-2">
            <svg className="h-5 w-5 text-blue-400 flex-shrink-0 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="text-xs sm:text-sm font-medium text-blue-800">起床報告について</h3>
          </div>
          <div className="text-xs sm:text-sm text-blue-700">
            <ul className="list-disc pl-4 space-y-1">
              <li>起床後、できるだけ早めに報告してください</li>
              <li>正確な起床時間を入力してください</li>
              <li>体調不良などがある場合は備考欄に記入してください</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
