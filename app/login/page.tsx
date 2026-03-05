"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(): Promise<void> {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!r.ok) {
        setErr("\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0439 \u043b\u043e\u0433\u0438\u043d \u0438\u043b\u0438 \u043f\u0430\u0440\u043e\u043b\u044c");
        return;
      }
      router.replace("/system/test");
    } catch {
      setErr("\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0442\u0438");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-wrapper" style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 14 }}>
        {"\u0412\u0445\u043e\u0434 \u0432 \u0415\u0421\u041b"}
      </h1>

      <div style={{ display: "grid", gap: 10 }}>
        <label className="field">
          <span className="field-label">{"\u041b\u043e\u0433\u0438\u043d"}</span>
          <input
            className="field-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>

        <label className="field">
          <span className="field-label">{"\u041f\u0430\u0440\u043e\u043b\u044c"}</span>
          <input
            className="field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </label>

        {err && (
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            {err}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={() => void submit()}
          disabled={loading}
        >
          {loading ? "\u0412\u0445\u043e\u0434\u2026" : "\u0412\u043e\u0439\u0442\u0438"}
        </button>
      </div>
    </div>
  );
}