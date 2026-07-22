"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function DocumentUpload({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "id_proof");

    const res = await fetch(`/api/applications/${applicationId}/documents`, {
      method: "POST",
      body: formData,
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Upload failed");
      return;
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <input
        ref={fileInputRef}
        type="file"
        required
        className="text-sm text-zinc-600 dark:text-zinc-400"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        {loading ? "Uploading..." : "Upload ID proof"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </form>
  );
}
