"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type DriverRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  employment_status: string | null;

  employment_status_from: string | null; // YYYY-MM-DD
  employment_status_planned: string | null;
  employment_status_planned_from: string | null; // YYYY-MM-DD
};

const TXT = {
  title: "\u0421\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a \u2022 \u0412\u043e\u0434\u0438\u0442\u0435\u043b\u0438",
  add_title: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044f",
  full_name: "\u0424\u0418\u041e",
  phone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d",
  save: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
  saving: "\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435...",

  list: "\u0421\u043f\u0438\u0441\u043e\u043a",
  refresh: "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c",
  loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...",
  empty: "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445",

  show_fired: "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0443\u0432\u043e\u043b\u0435\u043d\u043d\u044b\u0445",

  status: "\u0421\u0442\u0430\u0442\u0443\u0441",
  active: "\u0420\u0430\u0431\u043e\u0442\u0430\u0435\u0442",
  fired: "\u0423\u0432\u043e\u043b\u0435\u043d",
  restore: "\u0412\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c",
  fire: "\u0423\u0432\u043e\u043b\u0438\u0442\u044c",
 
  cancel_plan: "\u0421\u043d\u044f\u0442\u044c \u043f\u043b\u0430\u043d",
  effective_date: "\u0414\u0430\u0442\u0430 \u0441",
  applying: "\u041f\u0440\u0438\u043c\u0435\u043d\u0435\u043d\u0438\u0435...",

  required: "\u0417\u0430\u043f\u043e\u043b\u043d\u0438 \u0424\u0418\u041e",
  past_forbidden:
    "\u0412 \u043f\u0440\u043e\u0448\u043b\u043e\u043c \u043c\u0435\u043d\u044f\u0442\u044c \u0441\u0442\u0430\u0442\u0443\u0441 \u043d\u0435\u043b\u044c\u0437\u044f. \u0412\u044b\u0431\u0435\u0440\u0438 \u0441\u0435\u0433\u043e\u0434\u043d\u044f \u0438\u043b\u0438 \u0431\u0443\u0434\u0443\u0449\u0435\u0435.",
  done_now_fired: "\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c \u0443\u0432\u043e\u043b\u0435\u043d (\u0441\u0435\u0433\u043e\u0434\u043d\u044f)",
  done_now_active: "\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d (\u0441\u0435\u0433\u043e\u0434\u043d\u044f)",
  done_planned: "\u0417\u0430\u043f\u043b\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u043e \u043d\u0430 \u0431\u0443\u0434\u0443\u0449\u0435\u0435",
};

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isPastISO(dateISO: string): boolean {
  return dateISO < todayISO();
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  // YYYY-MM-DD -> DD.MM.YYYY
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

export default function Page() {
  const [rows, setRows] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [showFired, setShowFired] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [saving, setSaving] = useState(false);
  const [applyingId, setApplyingId] = useState<string>("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const defaultEffectiveDate = useMemo(() => todayISO(), []);
  const [effectiveDate, setEffectiveDate] = useState<string>(defaultEffectiveDate);

  async function load() {
    setLoading(true);
    setErr("");
    setMsg("");

    let q = supabase
      .from("drivers")
      .select(
        "id, full_name, phone, employment_status, employment_status_from, employment_status_planned, employment_status_planned_from"
      )
      .order("full_name", { ascending: true });

    if (!showFired) {
      q = q.eq("employment_status", "active");
    }

    const { data, error } = await q;

    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      setRows((data || []) as DriverRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFired]);

  async function onAdd() {
    setErr("");
    setMsg("");

    const name = fullName.trim();
    const ph = phone.trim();

    if (!name) {
      setErr(TXT.required);
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("drivers").insert({
      full_name: name,
      phone: ph || null,
      employment_status: "active",
      employment_status_from: todayISO(),
      employment_status_planned: null,
      employment_status_planned_from: null,
    });

    if (error) {
      setErr(error.message);
      setSaving(false);
      return;
    }

    setFullName("");
    setPhone("");
    setMsg("\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d");

    await load();
    setSaving(false);
  }

  function statusLabel(v: string | null) {
    if (v === "active") return TXT.active;
    if (v === "fired") return TXT.fired;
    return v || "";
  }

  async function onApplyStatus(row: DriverRow, newStatus: "active" | "fired") {
    setErr("");
    setMsg("");

    const d = effectiveDate;
    if (!d) return;

    if (isPastISO(d)) {
      setErr(TXT.past_forbidden);
      return;
    }

    setApplyingId(row.id);

    if (d === todayISO()) {
      // меняем "сегодня": это не ломает прошлое, потому что прошлое запрещено
      const { error } = await supabase
        .from("drivers")
        .update({
          employment_status: newStatus,
          employment_status_from: d,
          employment_status_planned: null,
          employment_status_planned_from: null,
        })
        .eq("id", row.id);

      if (error) {
        setErr(error.message);
        setApplyingId("");
        return;
      }

      setMsg(newStatus === "fired" ? TXT.done_now_fired : TXT.done_now_active);
      await load();
      setApplyingId("");
      return;
    }

    // план на будущее: текущий статус не меняем, чтобы архив/сегодня не ломались
    const { error } = await supabase
      .from("drivers")
      .update({
        employment_status_planned: newStatus,
        employment_status_planned_from: d,
      })
      .eq("id", row.id);

    if (error) {
      setErr(error.message);
      setApplyingId("");
      return;
    }

    setMsg(TXT.done_planned);
    await load();
    setApplyingId("");
  }
   async function onCancelPlan(row: DriverRow) {
  setErr("");
  setMsg("");

  setApplyingId(row.id);

  const { error } = await supabase
    .from("drivers")
    .update({
      employment_status_planned: null,
      employment_status_planned_from: null,
    })
    .eq("id", row.id);

  if (error) {
    setErr(error.message);
    setApplyingId("");
    return;
  }

  setMsg("\u041f\u043b\u0430\u043d \u0441\u043d\u044f\u0442");
  await load();
  setApplyingId("");
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
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>{TXT.full_name}</div>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={TXT.full_name}
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
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>{TXT.phone}</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={TXT.phone}
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

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
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

        <label style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
          <input type="checkbox" checked={showFired} onChange={(e) => setShowFired(e.target.checked)} />
          <span style={{ fontSize: 13, opacity: 0.9 }}>{TXT.show_fired}</span>
        </label>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, opacity: 0.75 }}>{TXT.effective_date}</div>
        <input
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #2a2a2a",
            background: "#0f0f0f",
            color: "#fff",
            outline: "none",
          }}
        />
        <div style={{ fontSize: 12, opacity: 0.65 }}>
          {"\u041f\u0440\u043e\u0448\u043b\u043e\u0435 \u0437\u0430\u043f\u0440\u0435\u0449\u0435\u043d\u043e"}
        </div>
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
                <th style={{ textAlign: "left", borderBottom: "1px solid #222", padding: "10px", fontSize: 12, opacity: 0.75 }}>
                  {TXT.full_name}
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #222", padding: "10px", fontSize: 12, opacity: 0.75 }}>
                  {TXT.phone}
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #222", padding: "10px", fontSize: 12, opacity: 0.75 }}>
                  {TXT.status}
                </th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #222", padding: "10px", fontSize: 12, opacity: 0.75, width: 260 }}>
                  {" "}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isApplying = applyingId === r.id;
                const st = r.employment_status || "";
                const canFire = st !== "fired";
                const canRestore = st === "fired";

                const plannedText =
                  r.employment_status_planned && r.employment_status_planned_from
                    ? `\u041f\u043b\u0430\u043d: ${r.employment_status_planned === "fired" ? TXT.fired : TXT.active} \u0441 ${fmtDate(
                        r.employment_status_planned_from
                      )}`
                    : "";

                return (
                  <tr key={r.id}>
                    <td style={{ padding: "10px", borderBottom: "1px solid #111" }}>{r.full_name || ""}</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #111" }}>{r.phone || ""}</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #111" }}>
                   <span
             className={
                "status-badge " +
                  (r.employment_status === "active"
                 ? "status-active"
                  : r.employment_status === "fired"
                ? "status-fired"
                    : "")
                 }
                        >
  {statusLabel(r.employment_status)}
</span>
                     {plannedText ? (
  <div style={{ marginTop: 6 }}>
    <span
      className={
        "status-badge " +
        (r.employment_status_planned === "fired"
          ? "status-planned"
          : "status-planned-active")
      }
    >
      {plannedText}
    </span>
  </div>
) : null}
                    </td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #111", textAlign: "right" }}>
                      {canFire ? (
                        <button
                          onClick={() => onApplyStatus(r, "fired")}
                          disabled={isApplying}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: "1px solid #2a2a2a",
                            background: "#0f0f0f",
                            color: "#fff",
                            cursor: isApplying ? "not-allowed" : "pointer",
                            opacity: isApplying ? 0.7 : 1,
                          }}
                        >
                          {isApplying ? TXT.applying : TXT.fire}
                        </button>
                      ) : null}

                      {canRestore ? (
                        <button
                          onClick={() => onApplyStatus(r, "active")}
                          disabled={isApplying}
                          style={{
                            marginLeft: 8,
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: "1px solid #2a2a2a",
                            background: "#151515",
                            color: "#fff",
                            cursor: isApplying ? "not-allowed" : "pointer",
                            opacity: isApplying ? 0.7 : 1,
                          }}
                        >
                          {isApplying ? TXT.applying : TXT.restore}
                        </button>
                      ) : null}

                      {r.employment_status_planned && r.employment_status_planned_from ? (
  <button
    onClick={() => onCancelPlan(r)}
    disabled={isApplying}
    style={{
      marginLeft: 8,
      padding: "8px 12px",
      borderRadius: 10,
      border: "1px solid #2a2a2a",
      background: "#0f0f0f",
      color: "#fff",
      cursor: isApplying ? "not-allowed" : "pointer",
      opacity: isApplying ? 0.7 : 1,
    }}
  >
    {isApplying ? TXT.applying : TXT.cancel_plan}
  </button>
) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
