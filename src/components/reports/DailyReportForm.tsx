"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

interface DailyReportData {
  date: string;
  content: string;
  status: "draft" | "submitted";
}

export default function DailyReportForm() {
  const { user } = useAuth();
  const [reportContent, setReportContent] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  // Load existing draft on component mount
  useEffect(() => {
    loadExistingReport();
  }, []);

  // Update word count when content changes
  useEffect(() => {
    const words = reportContent
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    setWordCount(words.length);
  }, [reportContent]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (reportContent.trim() && !isDraft) {
      const autoSaveTimer = setTimeout(() => {
        saveDraft(true); // Silent save
      }, 30000);

      return () => clearTimeout(autoSaveTimer);
    }
  }, [reportContent]);

  const loadExistingReport = async () => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/reports/daily?date=${today}`);

      if (response.ok) {
        const data: DailyReportData = await response.json();
        if (data) {
          setReportContent(data.content);
          setIsDraft(data.status === "draft");
          if (data.status === "submitted") {
            setSuccessMessage("本日の日報は既に提出済みです");
          }
        }
      }
    } catch (error) {
      // Ignore errors for now - might be first time creating report
    }
  };

  const saveDraft = async (silent: boolean = false) => {
    if (!reportContent.trim()) {
      if (!silent) setError("報告内容を入力してください");
      return;
    }

    if (!silent) setIsSavingDraft(true);
    setError("");

    try {
      // TODO: Replace with actual API call
      const response = await fetch("/api/reports/daily", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: today,
          content: reportContent.trim(),
          status: "draft",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "下書き保存に失敗しました");
      }

      setIsDraft(true);
      setLastSaved(new Date());
      if (!silent) {
        setSuccessMessage("下書きを保存しました");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "下書き保存に失敗しました");
      }
    } finally {
      if (!silent) setIsSavingDraft(false);
    }
  };

  const submitReport = async () => {
    if (!reportContent.trim()) {
      setError("報告内容を入力してください");
      return;
    }

    if (wordCount < 10) {
      setError("報告内容は10文字以上で入力してください");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // TODO: Replace with actual API call
      const response = await fetch("/api/reports/daily", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: today,
          content: reportContent.trim(),
          status: "submitted",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "日報の提出に失敗しました");
      }

      setIsDraft(false);
      setSuccessMessage("日報を提出しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "日報の提出に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearForm = () => {
    setReportContent("");
    setIsDraft(false);
    setError("");
    setSuccessMessage("");
    setLastSaved(null);
  };

  const insertTemplate = (template: string) => {
    const templates = {
      basic: `【本日の業務内容】
・

【成果・進捗】
・

【課題・問題点】
・

【明日の予定】
・

【その他・特記事項】
・`,
      meeting: `【会議・打ち合わせ】
・

【営業活動】
・

【事務作業】
・

【学習・研修】
・

【その他】
・`,
      simple: `【今日やったこと】


【うまくいったこと】


【改善点・課題】


【明日やること】

`,
    };

    setReportContent(templates[template as keyof typeof templates] || "");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">日報作成</h2>
            <p className="text-gray-600 mt-1">
              {new Date().toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </p>
          </div>
          <div className="text-right">
            {lastSaved && <p className="text-sm text-gray-500">最終保存: {lastSaved.toLocaleTimeString("ja-JP")}</p>}
            <div className="flex items-center mt-1">
              <div className={`w-2 h-2 rounded-full mr-2 ${isDraft ? "bg-yellow-400" : "bg-gray-300"}`}></div>
              <span className="text-sm text-gray-600">{isDraft ? "下書き保存済み" : "未保存"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">テンプレート</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* <button
            onClick={() => insertTemplate("basic")}
            className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium text-gray-900">基本テンプレート</div>
            <div className="text-sm text-gray-600">業務内容・成果・課題・予定</div>
          </button> */}
          {/* <button
            onClick={() => insertTemplate("meeting")}
            className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium text-gray-900">営業テンプレート</div>
            <div className="text-sm text-gray-600">会議・営業・事務・学習</div>
          </button> */}
          <button
            onClick={() => insertTemplate("simple")}
            className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium text-gray-900">テンプレート</div>
            <div className="text-sm text-gray-600">簡潔な振り返り形式</div>
          </button>
        </div>
      </div>

      {/* Report Form */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="reportContent" className="block text-lg font-medium text-gray-700">
              報告内容 <span className="text-red-500">*</span>
            </label>
            <div className="text-sm text-gray-500">
              {wordCount} 文字 {wordCount < 10 && "(最低10文字)"}
            </div>
          </div>

          <textarea
            id="reportContent"
            value={reportContent}
            onChange={(e) => setReportContent(e.target.value)}
            rows={15}
            className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            placeholder="本日の業務内容、成果、課題、明日の予定などを記入してください..."
            maxLength={5000}
          />

          <div className="flex justify-between text-sm text-gray-500">
            <span>Markdown記法が使用できます</span>
            <span>{reportContent.length}/5000文字</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
          <div className="flex space-x-3">
            <button
              onClick={() => saveDraft(false)}
              disabled={isSavingDraft || !reportContent.trim()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingDraft ? "保存中..." : "下書き保存"}
            </button>
            <button
              onClick={clearForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              クリア
            </button>
          </div>

          <button
            onClick={submitReport}
            disabled={isSubmitting || !reportContent.trim() || wordCount < 10}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "提出中..." : "日報を提出"}
          </button>
        </div>
      </div>

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

      {/* Tips */}
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
            <h3 className="text-sm font-medium text-blue-800">日報作成のコツ</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>具体的な数値や成果を含めて記載しましょう</li>
                <li>課題や問題点は改善案も一緒に書きましょう</li>
                <li>明日の予定を書くことで計画的に業務を進められます</li>
                <li>30秒ごとに自動で下書き保存されます</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
