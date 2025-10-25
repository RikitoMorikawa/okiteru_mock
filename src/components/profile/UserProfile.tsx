"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";

interface UserProfileProps {
  editable?: boolean;
}

export default function UserProfile({ editable = false }: UserProfileProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  if (!user) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500">ユーザー情報を読み込み中...</p>
      </div>
    );
  }

  const getRoleDisplayName = (role: string) => {
    return role === "manager" ? "管理者" : "スタッフ";
  };

  const getRoleBadgeColor = (role: string) => {
    return role === "manager" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800";
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">プロフィール</h3>
          {editable && (
            <button onClick={() => setIsEditing(!isEditing)} className="text-sm text-indigo-600 hover:text-indigo-500">
              {isEditing ? "キャンセル" : "編集"}
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-4">
        {isEditing ? (
          <EditProfileForm user={user} onSave={() => setIsEditing(false)} />
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">名前</label>
              <p className="mt-1 text-sm text-gray-900">{user.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
              <p className="mt-1 text-sm text-gray-900">{user.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">電話番号</label>
              <p className="mt-1 text-sm text-gray-900">{user.phone || "未設定"}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">役割</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                  {getRoleDisplayName(user.role)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface EditProfileFormProps {
  user: any;
  onSave: () => void;
}

function EditProfileForm({ user, onSave }: EditProfileFormProps) {
  const { refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    phone?: string;
  }>({});

  const validateForm = () => {
    const errors: { name?: string; phone?: string } = {};

    if (!formData.name.trim()) {
      errors.name = "名前を入力してください";
    } else if (formData.name.trim().length < 2) {
      errors.name = "名前は2文字以上で入力してください";
    }

    if (formData.phone && !/^[\d-+().\s]+$/.test(formData.phone)) {
      errors.phone = "有効な電話番号を入力してください";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.put("/api/profile", {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "プロフィールの更新に失敗しました");
      }

      await refreshUser();
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "プロフィールの更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
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
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, name: e.target.value }));
            if (validationErrors.name) {
              setValidationErrors((prev) => ({ ...prev, name: undefined }));
            }
          }}
        />
        {validationErrors.name && <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>}
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
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, phone: e.target.value }));
            if (validationErrors.phone) {
              setValidationErrors((prev) => ({ ...prev, phone: undefined }));
            }
          }}
          placeholder="090-1234-5678"
        />
        {validationErrors.phone && <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onSave}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              保存中...
            </div>
          ) : (
            "保存"
          )}
        </button>
      </div>
    </form>
  );
}
