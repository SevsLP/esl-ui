"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TrailerRow = {
  id: string;
  brand: string | null;
  vehicle_code: string | null;
};

const TXT = {
  title: "\u0421\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a \u2022 \u041f\u0440\u0438\u0446\u0435\u043f\u044b",
  add_title: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u0440\u0438\u0446\u0435\u043f",
  brand: "\u041c\u0430\u0440\u043a\u0430",
  code: "\u041a\u043e\u0434/\u0433\u043e\u0441.\u043d\u043e\u043c\u0435\u0440",
  save: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
  saving: "\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435...",
  loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...",
  empty: "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445",
  updated: "\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e",
  required: "\u0417\u0430\u043f\u043e\u043b\u043d\u0438 \u043e\u0431\u0430 \u043f\u043e\u043b\u044f",
  list: "\u0421\u043f\u0438\u0441\u043e\u043a",
  refresh: "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c",
  delete: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c",
  deleting: "\u0423\u0434\u0430\u043b\u0435\u043d\u0438\u0435...",
  confirm_delete:
    "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u0440\u0438\u0446\u0435\u043f? \u041e\u0442\u043c\u0435\u043d\u0438\u0442\u044c \u043d\u0435\u043b\u044c\u0437\u044f.",
};

export default function Page() {
  const [rows, setRows] = useState<TrailerRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [brand, setBrand] = useState("");
  const [vehicleCode, setVehicleCode] = useState("");

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string>("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    setMsg("");

    const { data, error } = await supabase
      .from("trailers")
      .select("id, brand, vehicle_code")
      .order("brand", { ascending: true })
      .order("vehicle_code", { ascending: true });

    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      setRows((data || []) as TrailerRow[]);
      setMsg(TXT.updated);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onAdd() {
    setErr("");
    setMsg("");

    const b = brand.trim();
    const c = vehicleCode.trim();

    if (!b || !c) {
      setErr(TXT.required);
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("trailers").insert({
      brand: b,
      vehicle_code: c,
    });

    if (error) {
      setErr(error.message);
      setSaving(false);
      return;
    }

    setBrand("");
    setVehicleCode("");
    setMsg("\u041f\u0440\u0438\u0446\u0435\u043f \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d");

    await load();
    setSaving(false);
  }

  async function onDelete(row: TrailerRow) {
    setErr("");
    setMsg("");

    const ok = window.confirm(TXT.confirm_delete);
    if (!ok) return;

    setDeletingId(row.id);

    const { error } = await supabase.from("trailers").delete().eq("id", row.id);

    if (error) {
      setErr(error.message);
      setDeletingId("");
      return;
    }

    setMsg("\u041f\u0440\u0438\u0446\u0435\u043f \u0443\u0434\u0430\u043b\u0451\u043d");
    await load();
    setDeletingId("");
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <h1>{TXT.title}</h1>

      <div
        style={{
          marginTop: 12,
          border: "1px solid #222",
          borderRadius: 12,
          padding: 12,
          background: "#0b0b0b",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 10 }}>{TXT.add_title}</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 260, flex: "1 1 260px" }}>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>{TXT.brand}</div>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder={TXT.brand}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #2a2a2a",
                background: "#0f0f0f",
                color: "#fff",
                outline: "none",
              }}
            />
          </div>

          <div style={{ minWidth: 260, flex: "1 1 260px" }}>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>{TXT.code}</div>
            <input
              value={vehicleCode}
              onChange={(e) => setVehicleCode(e.target.value)}
              placeholder={TXT.code}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #2a2a2a",
                background: "#0f0f0f",
                color: "#fff",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={onAdd}
              disabled={saving}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #2a2a2a",
                background: "#151515",
                color: "#fff",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? TXT.saving : TXT.save}
            </button>
          </div>
        </div>

        {err ? (
          <div style={{ marginTop: 10, color: "#ff6b6b", fontSize: 13, wordBreak: "break-word" }}>
            {err}
          </div>
        ) : null}

        {msg ? (
          <div style={{ marginTop: 10, color: "#9ad19a", fontSize: 13 }}>{msg}</div>
        ) : null}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>
            {TXT.list}: {rows.length}
          </div>
          <button
            onClick={load}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #2a2a2a",
              background: "#0f0f0f",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {TXT.refresh}
          </button>
        </div>

        {loading ? (
          <div style={{ marginTop: 12 }}>{TXT.loading}</div>
        ) : rows.length === 0 ? (
          <div style={{ marginTop: 12 }}>{TXT.empty}</div>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #222",
                      padding: "10px",
                      fontSize: 12,
                      opacity: 0.75,
                    }}
                  >
                    {TXT.brand}
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #222",
                      padding: "10px",
                      fontSize: 12,
                      opacity: 0.75,
                    }}
                  >
                    {TXT.code}
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid #222",
                      padding: "10px",
                      fontSize: 12,
                      opacity: 0.75,
                      width: 140,
                    }}
                  >
                    {" "}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isDeleting = deletingId === r.id;

                  return (
                    <tr key={r.id}>
                      <td style={{ padding: "10px", borderBottom: "1px solid #111" }}>
                        {r.brand || ""}
                      </td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #111" }}>
                        {r.vehicle_code || ""}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #111",
                          textAlign: "right",
                        }}
                      >
                        <button
                          onClick={() => onDelete(r)}
                          disabled={isDeleting}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: "1px solid #2a2a2a",
                            background: "#0f0f0f",
                            color: "#fff",
                            cursor: isDeleting ? "not-allowed" : "pointer",
                            opacity: isDeleting ? 0.7 : 1,
                          }}
                        >
                          {isDeleting ? TXT.deleting : TXT.delete}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}