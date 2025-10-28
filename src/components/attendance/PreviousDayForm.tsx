"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import PhotoUpload from "@/components/ui/PhotoUpload";
import { uploadRoutePhoto, uploadAppearancePhoto, getTodayDateString, validateImageFile } from "@/lib/storage";

interface PreviousDayFormProps {
  onSuccess: () => void;
}

export default function PreviousDayForm({ onSuccess }: PreviousDayFormProps) {
  const { user } = useAuth();

  // 翌日の予定時間
  const [nextWakeUpTime, setNextWakeUpTime] = useState("07:00");
  const [nextDepartureTime, setNextDepartureTime] = useState("08:00");
  const [nextArrivalTime, setNextArrivalTime] = useState("09:00");

  // 写真アップロード
  const [appearancePhoto, setAppearancePhoto] = useState<File | null>(null);
  const [routePhoto, setRoutePhoto] = useState<File | null>(null);

  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAppearancePhotoSelect = (file: File) => {
    const validationError = validateImageFile(file, 5);
    if (validationError) {
      setError(validationError);
      return;
    }
    setAppearancePhoto(file);
    setError("");
  };

  const handleAppearancePhotoRemove = () => {
    setAppearancePhoto(null);
    setError("");
  };

  const handleRoutePhotoSelect = (file: File) => {
    const validationError = validateImageFile(file, 5);
    if (validationError) {
      setError(validationError);
      return;
    }
    setRoutePhoto(file);
    setError("");
  };

  const handleRoutePhotoRemove = () => {
    setRoutePhoto(null);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // バリデーション
      if (!nextWakeUpTime || !/^\d{2}:\d{2}$/.test(nextWakeUpTime)) {
        throw new Error("正しい起床時間を入力してください（HH:MM）");
      }

      if (!nextDepartureTime || !/^\d{2}:\d{2}$/.test(nextDepartureTime)) {
        throw new Error("正しい出発時間を入力してください（HH:MM）");
      }

      if (!nextArrivalTime || !/^\d{2}:\d{2}$/.test(nextArrivalTime)) {
        throw new Error("正しい到着時間を入力してください（HH:MM）");
      }

      if (!appearancePhoto) {
        throw new Error("身だしなみ写真をアップロードしてください");
      }

      if (!routePhoto) {
        throw new Error("経路のスクリーンショットをアップロードしてください");
      }

      // 時間の論理チェック
      const wakeUp = new Date(`2000-01-01T${nextWakeUpTime}:00`);
      const departure = new Date(`2000-01-01T${nextDepartureTime}:00`);
      const arrival = new Date(`2000-01-01T${nextArrivalTime}:00`);

      if (departure <= wakeUp) {
        throw new Error("出発時間は起床時間より後である必要があります");
      }

      if (arrival <= departure) {
        throw new Error("到着時間は出発時間より後である必要があります");
      }

      // 写真をアップロード
      let appearancePhotoUrl = null;
      let routePhotoUrl = null;
      const todayDate = getTodayDateString();

      if (appearancePhoto) {
        const appearanceUploadResult = await uploadAppearancePhoto(appearancePhoto, user!.id, todayDate);
        appearancePhotoUrl = appearanceUploadResult.url;
      }

      if (routePhoto) {
        const routeUploadResult = await uploadRoutePhoto(routePhoto, user!.id, todayDate);
        routePhotoUrl = routeUploadResult.url;
      }

      const response = await api.post("/api/attendance/previous-day", {
        next_wake_up_time: nextWakeUpTime,
        next_departure_time: nextDepartureTime,
        next_arrival_time: nextArrivalTime,
        appearance_photo_url: appearancePhotoUrl,
        route_photo_url: routePhotoUrl,
        notes: notes.trim(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "前日報告の送信に失敗しました");
      }

      // 成功イベントを発火
      window.dispatchEvent(
        new CustomEvent("attendanceUpdated", {
          detail: { type: "previous-day", timestamp: new Date() },
        })
      );

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-6">
        <span className="text-2xl sm:text-3xl mr-3 sm:mr-4">🌙</span>
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">前日報告</h2>
          <p className="text-sm sm:text-base text-gray-600">翌日の予定と準備状況を報告してください</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 翌日の予定時間 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-4">翌日の予定時間</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 起床時間 */}
            <div>
              <label htmlFor="nextWakeUpTime" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                起床時間 <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                id="nextWakeUpTime"
                value={nextWakeUpTime}
                onChange={(e) => setNextWakeUpTime(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                required
              />
            </div>

            {/* 出発時間 */}
            <div>
              <label htmlFor="nextDepartureTime" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                出発時間 <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                id="nextDepartureTime"
                value={nextDepartureTime}
                onChange={(e) => setNextDepartureTime(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                required
              />
            </div>

            {/* 到着時間 */}
            <div>
              <label htmlFor="nextArrivalTime" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                到着時間 <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                id="nextArrivalTime"
                value={nextArrivalTime}
                onChange={(e) => setNextArrivalTime(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                required
              />
            </div>
          </div>
        </div>

        {/* 身だしなみ写真 */}
        <PhotoUpload
          label="身だしなみ写真"
          description="翌日の準備として身だしなみを確認できる写真をアップロードしてください"
          selectedPhoto={appearancePhoto}
          onPhotoSelect={handleAppearancePhotoSelect}
          onPhotoRemove={handleAppearancePhotoRemove}
          required
          preview={false}
        />

        {/* 経路スクリーンショット */}
        <PhotoUpload
          label="経路スクリーンショット"
          description="翌日使用予定の経路をナビアプリで確認し、スクリーンショットをアップロードしてください"
          selectedPhoto={routePhoto}
          onPhotoSelect={handleRoutePhotoSelect}
          onPhotoRemove={handleRoutePhotoRemove}
          required
          preview={false}
        />

        {/* 備考 */}
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
            placeholder="翌日の特記事項や準備状況があれば記入してください"
            maxLength={500}
          />
        </div>

        {/* エラーメッセージ */}
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

        {/* 送信ボタン */}
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
            {isSubmitting ? "送信中..." : "前日報告を送信"}
          </button>
        </div>
      </form>

      {/* 情報 */}
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
            <h3 className="text-xs sm:text-sm font-medium text-blue-800">前日報告について</h3>
          </div>
          <div className="text-xs sm:text-sm text-blue-700">
            <ul className="list-disc pl-4 space-y-1">
              <li>翌日の業務に向けた準備状況を報告してください</li>
              <li>時間は起床→出発→到着の順序で設定してください</li>
              <li>身だしなみ写真と経路確認は翌日の円滑な業務のために重要です</li>
              <li>特別な予定や注意事項がある場合は備考欄に記入してください</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
