"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import PhotoUpload from "@/components/ui/PhotoUpload";
import { uploadAppearancePhoto, getTodayDateString, validateImageFile } from "@/lib/storage";

interface ArrivalFormProps {
  onSuccess: () => void;
}

export default function ArrivalForm({ onSuccess }: ArrivalFormProps) {
  const { user } = useAuth();
  const [arrivalTime, setArrivalTime] = useState(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:MM format
  });
  const [location, setLocation] = useState("");
  const [appearancePhoto, setAppearancePhoto] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handlePhotoSelect = (file: File) => {
    const validationError = validateImageFile(file, 5);
    if (validationError) {
      setError(validationError);
      return;
    }

    setAppearancePhoto(file);
    setError("");
  };

  const handlePhotoRemove = () => {
    setAppearancePhoto(null);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!arrivalTime || !/^\d{2}:\d{2}$/.test(arrivalTime)) {
        throw new Error("正しい時間形式で入力してください（HH:MM）");
      }

      if (!location.trim()) {
        throw new Error("到着場所を入力してください");
      }

      if (!appearancePhoto) {
        throw new Error("身だしなみの写真をアップロードしてください");
      }

      // Create datetime from today's date and selected time
      const today = new Date();
      const [hours, minutes] = arrivalTime.split(":").map(Number);
      const arrivalDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);

      // Validate that arrival time is not in the future
      if (arrivalDateTime > new Date()) {
        throw new Error("到着時間は現在時刻より前である必要があります");
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("arrival_time", arrivalDateTime.toISOString());
      formData.append("location", location.trim());
      formData.append("appearance_photo", appearancePhoto);
      formData.append("notes", notes.trim());

      const response = await api.post("/api/attendance/arrival", {
        arrival_time: arrivalDateTime.toISOString(),
        appearance_photo_url: appearancePhoto ? "placeholder_appearance_photo_url" : null, // TODO: Implement photo upload
        notes: notes.trim(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "到着報告の送信に失敗しました");
      }

      // Success - trigger a custom event to notify other components
      window.dispatchEvent(
        new CustomEvent("attendanceUpdated", {
          detail: { type: "arrival", timestamp: new Date() },
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
    setArrivalTime(now.toTimeString().slice(0, 5));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-6">
        <span className="text-3xl mr-4">🏢</span>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">到着報告</h2>
          <p className="text-gray-600">到着時間と身だしなみを報告してください</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Arrival Time */}
        <div>
          <label htmlFor="arrivalTime" className="block text-sm font-medium text-gray-700 mb-2">
            到着時間 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="time"
              id="arrivalTime"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="block w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="button"
              onClick={getCurrentTime}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              現在時刻を使用
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">到着した時間を選択してください</p>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
            到着場所 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="例：本社オフィス、顧客先、現場など"
            required
            maxLength={100}
          />
          <p className="mt-1 text-sm text-gray-500">到着した場所を入力してください</p>
        </div>

        {/* Appearance Photo */}
        <PhotoUpload
          label="身だしなみ写真"
          description="身だしなみを確認できる写真をアップロードしてください（顔が写っている必要があります）"
          selectedPhoto={appearancePhoto}
          onPhotoSelect={handlePhotoSelect}
          onPhotoRemove={handlePhotoRemove}
          required
          preview
        />

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            備考（任意）
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="遅延理由や特記事項があれば記入してください"
            maxLength={500}
          />
          <p className="mt-1 text-sm text-gray-500">{notes.length}/500文字</p>
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
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onSuccess}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "送信中..." : "到着報告を送信"}
          </button>
        </div>
      </form>

      {/* Information */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
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
            <h3 className="text-sm font-medium text-blue-800">到着報告について</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>到着後、速やかに報告してください</li>
                <li>身だしなみの写真は必須です（顔が確認できるもの）</li>
                <li>到着場所は正確に入力してください</li>
                <li>遅延があった場合は理由を備考欄に記入してください</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
