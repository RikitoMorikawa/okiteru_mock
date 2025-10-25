"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";

interface StaffRegistrationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
}

export default function StaffRegistrationForm({ onSuccess, onCancel }: StaffRegistrationFormProps) {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Partial<FormData>>({});

  const validateForm = () => {
    const errors: Partial<FormData> = {};

    // Email validation
    if (!formData.email) {
      errors.email = "メールアドレスを入力してください";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "有効なメールアドレスを入力してください";
    }

    // Name validation
    if (!formData.name.trim()) {
      errors.name = "名前を入力してください";
    } else if (formData.name.trim().length < 2) {
      errors.name = "名前は2文字以上で入力してください";
    }

    // Password validation
    if (!formData.password) {
      errors.password = "パスワードを入力してください";
    } else if (formData.password.length < 8) {
      errors.password = "パスワードは8文字以上で入力してください";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = "パスワードは大文字、小文字、数字を含む必要があります";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = "パスワード確認を入力してください";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "パスワードが一致しません";
    }

    // Phone validation (optional but if provided, should be valid)
    if (formData.phone && !/^[\d-+().\s]+$/.test(formData.phone)) {
      errors.phone = "有効な電話番号を入力してください";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/api/staff", {
        email: formData.email,
        password: formData.password,
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "スタッフの作成に失敗しました");
      }

      // Reset form
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        name: "",
        phone: "",
      });

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "スタッフの作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-4">新しいスタッフを追加</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            名前 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            className={`mt-1 block w-full px-3 py-2 border ${
              validationErrors.name ? "border-red-300" : "border-gray-300"
            } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="田中太郎"
          />
          {validationErrors.name && <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            className={`mt-1 block w-full px-3 py-2 border ${
              validationErrors.email ? "border-red-300" : "border-gray-300"
            } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            placeholder="tanaka@example.com"
          />
          {validationErrors.email && <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            電話番号
          </label>
          <input
            type="tel"
            id="phone"
            className={`mt-1 block w-full px-3 py-2 border ${
              validationErrors.phone ? "border-red-300" : "border-gray-300"
            } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
            value={formData.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            placeholder="090-1234-5678"
          />
          {validationErrors.phone && <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            パスワード <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="password"
            className={`mt-1 block w-full px-3 py-2 border ${
              validationErrors.password ? "border-red-300" : "border-gray-300"
            } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
            value={formData.password}
            onChange={(e) => handleInputChange("password", e.target.value)}
            placeholder="8文字以上（大文字、小文字、数字を含む）"
          />
          {validationErrors.password && <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            パスワード確認 <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="confirmPassword"
            className={`mt-1 block w-full px-3 py-2 border ${
              validationErrors.confirmPassword ? "border-red-300" : "border-gray-300"
            } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
            placeholder="パスワードを再入力"
          />
          {validationErrors.confirmPassword && <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              キャンセル
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                作成中...
              </div>
            ) : (
              "スタッフを作成"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
