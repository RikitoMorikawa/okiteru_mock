/**
 * 日付処理のユーティリティ関数
 */

/**
 * 日本時間での今日の日付を YYYY-MM-DD 形式で取得
 */
export function getTodayJST(): string {
  const now = new Date();
  // 正確な日本時間での日付を取得
  return now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

/**
 * 指定されたタイムゾーンでの今日の日付を YYYY-MM-DD 形式で取得
 */
export function getTodayInTimezone(timezone: string = "Asia/Tokyo"): string {
  const now = new Date();
  return now.toLocaleDateString("sv-SE", { timeZone: timezone });
}

/**
 * 日本時間での現在時刻を ISO 文字列で取得
 */
export function getNowJST(): string {
  return new Date().toISOString();
}

/**
 * 日付文字列が有効かどうかをチェック
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * 日本時間での日付を表示用にフォーマット
 */
export function formatDateJST(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  };

  return dateObj.toLocaleDateString("ja-JP", defaultOptions);
}

/**
 * 日本時間での時刻を表示用にフォーマット
 */
export function formatTimeJST(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  };

  return dateObj.toLocaleTimeString("ja-JP", defaultOptions);
}

/**
 * 日本時間での前日の日付を YYYY-MM-DD 形式で取得
 */
export function getPreviousDayJST(dateString: string): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() - 1);
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}
