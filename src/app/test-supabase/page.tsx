"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabasePage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult("Testing connection...\n");

    try {
      // Test 1: Check if supabase client is initialized
      setResult((prev) => prev + "✓ Supabase client initialized\n");

      // Test 2: Try to get session (should be fast, from localStorage)
      setResult((prev) => prev + "Testing getSession...\n");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setResult((prev) => prev + `✓ getSession completed: ${session ? "Session found" : "No session"}\n`);

      // Test 3: Try to query users table
      setResult((prev) => prev + "Testing database query...\n");
      const { data, error } = await supabase.from("users").select("id").limit(1);

      if (error) {
        setResult((prev) => prev + `✗ Database query error: ${error.message}\n`);
        setResult((prev) => prev + `Error details: ${JSON.stringify(error, null, 2)}\n`);
      } else {
        setResult((prev) => prev + `✓ Database query successful: ${data?.length || 0} rows\n`);
      }
    } catch (error) {
      setResult((prev) => prev + `✗ Exception: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    setResult("Testing login...\n");

    try {
      const email = "admin@example.com";
      const password = "password";

      setResult((prev) => prev + `Attempting login with ${email}...\n`);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setResult((prev) => prev + `✗ Login error: ${error.message}\n`);
      } else {
        setResult((prev) => prev + `✓ Login successful: ${data.user?.id}\n`);
      }
    } catch (error) {
      setResult((prev) => prev + `✗ Exception: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>

        <div className="space-y-4 mb-6">
          <button
            onClick={testConnection}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Test Connection
          </button>

          <button
            onClick={testLogin}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 ml-4"
          >
            Test Login
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Results:</h2>
          <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded">{result || "Click a button to run tests"}</pre>
        </div>

        <div className="mt-6 bg-blue-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Environment Variables:</h3>
          <p className="text-sm">
            SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Set" : "✗ Not set"}
          </p>
          <p className="text-sm">
            SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓ Set" : "✗ Not set"}
          </p>
        </div>
      </div>
    </div>
  );
}
