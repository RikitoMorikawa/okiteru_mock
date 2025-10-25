import { supabase } from "./supabase";

interface ApiRequestOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * Enhanced fetch function that automatically includes authentication headers
 */
export async function apiRequest(url: string, options: ApiRequestOptions = {}): Promise<Response> {
  const { requireAuth = true, headers = {}, ...fetchOptions } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  // Add authentication header if required
  if (requireAuth) {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error("認証が必要です。再度ログインしてください。");
    }

    requestHeaders["Authorization"] = `Bearer ${session.access_token}`;
  }

  return fetch(url, {
    ...fetchOptions,
    headers: requestHeaders,
  });
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: (url: string, options?: ApiRequestOptions) => apiRequest(url, { ...options, method: "GET" }),

  post: (url: string, data?: any, options?: ApiRequestOptions) =>
    apiRequest(url, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: (url: string, data?: any, options?: ApiRequestOptions) =>
    apiRequest(url, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: (url: string, options?: ApiRequestOptions) => apiRequest(url, { ...options, method: "DELETE" }),
};
