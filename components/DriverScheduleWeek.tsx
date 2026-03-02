"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from '../lib/supabaseClient';

type DriverRow = {
  id: string;
  full_name: string | null;
  phone: string | null;

  employment_status: "active" | "fired" | null;
  employment_status_from: string | null;

  employment_status_planned: "active" | "fired" | null;
  employment_status_planned_from: string | null;
};

type ScheduleRow = {
  id?: string;
  driver_id: string;
  work_date: string; // YYYY-MM-DD
  work_status: "on_duty" | "off_day" | "sick_leave" | "vacation";
};

const TXT = {
  title: "\u0413\u0440\u0430\u0444\u0438\u043a \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u0435\u0439 (\u043d\u0435\u0434\u0435\u043b\u044f)",
  week_of: "\u041d\u0435\u0434\u0435\u043b\u044f \u0441",
  prev: "\u2190 \u041d\u0430\u0437\u0430\u0434",
  next: "\u0412\u043f\u0435\u0440\u0451\u0434 \u2192",
  refresh: "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c",
  loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...",
  err_prefix: "\u041e\u0448\u0438\u0431\u043a\u0430: ",
  saved: "\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e",
  not_saved: "\u041d\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u043b\u043e\u0441\u044c",
  driver: "\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c",
  phone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d",

  on_duty: "\u0420\u0430\u0431\u043e\u0442\u0430\u0435\u0442",
  off_day: "\u0412\u044b\u0445\u043e\u0434\u043d\u043e\u0439",
  sick_leave: "\u0411\u043e\u043b\u044c\u043d\u0438\u0447\u043d\u044b\u0439",
  vacation: "\u041e\u0442\u043f\u0443\u0441\u043a",

  mon: "\u041f\u043d",
  tue: "\u0412\u0442",
  wed: "\u0421\u0440",
  thu: "\u0427\u0442",
  fri: "\u041f\u0442",
  sat: "\u0421\u0431",
  sun: "\u0412\u0441",
};

const STATUS_OPTIONS: Array<ScheduleRow["work_status"]> = [
  "on_duty",
  "off_day",
  "sick_leave",
  "vacation",
];

function statusLabel(s: ScheduleRow["work_status"]) {
  if (s === "on_duty") return TXT.on_duty;
  if (s === "off_day") return TXT.off_day;
  if (s === "sick_leave") return TXT.sick_leave;
  return TXT.vacation;
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfWeekMonday(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const res = new Date(d);
  res.setDate(d.getDate() + diff);
  res.setHours(0, 0, 0, 0);
  return res;
}

function addDays(d: Date, n: number) {
  const res = new Date(d);
  res.setDate(d.getDate() + n);
  return res;
}

function fmtRU(iso: string) {
  const d = parseISO(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
}

function dayTitle(i: number) {
  if (i === 0) return TXT.mon;
  if (i === 1) return TXT.tue;
  if (i === 2) return TXT.wed;
  if (i === 3) return TXT.thu;
  if (i === 4) return TXT.fri;
  if (i === 5) return TXT.sat;
  return TXT.sun;
}

function isDriverActiveOnDate(driver: DriverRow, isoDate: string) {
  const date = parseISO(isoDate);

  const baseStatus = driver.employment_status;
  const baseFrom = driver.employment_status_from ? parseISO(driver.employment_status_from) : null;

  const plannedStatus = driver.employment_status_planned;
  const plannedFrom = driver.employment_status_planned_from ? parseISO(driver.employment_status_planned_from) : null;

  if (plannedStatus && plannedFrom && plannedFrom.getTime() <= date.getTime()) {
    return plannedStatus === "active";
  }

  if (baseStatus === "fired") {
    if (!baseFrom) return false;
    return baseFrom.getTime() > date.getTime();
  }

  return true;
}

export default function Page() {
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const weekDates = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < 7; i++) arr.push(toISODate(addDays(weekStart, i)));
    return arr;
  }, [weekStart]);

  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [showFired, setShowFired] = useState(false);
  const [scheduleMap, setScheduleMap] = useState<Record<string, ScheduleRow>>({});
  const [loading, setLoading] = useState(false);

  type Toast = { id: string; kind: "success" | "error" | "info"; text: string };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [err, setErr] = useState("");

  function pushToast(kind: Toast["kind"], text: string) {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, kind, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  }

  const [savingKey, setSavingKey] = useState<string>("");

  async function ensureWeekRows(driverRows: DriverRow[], map: Record<string, ScheduleRow>) {
    // Создаём отсутствующие записи графика, чтобы диспетчер мог назначать водителей.
    // По умолчанию: on_duty для активных водителей.
    const bulk: ScheduleRow[] = [];

    for (const dr of driverRows) {
      for (const dt of weekDates) {
        const activeHere = isDriverActiveOnDate(dr, dt);
        if (!activeHere) continue;

        const k = `${dr.id}__${dt}`;
        if (!map[k]) {
          bulk.push({ driver_id: dr.id, work_date: dt, work_status: "on_duty" });
        }
      }
    }

    if (bulk.length === 0) return map;

    const up = await supabase
      .from("driver_schedule")
      .upsert(bulk as any, { onConflict: "driver_id,work_date" })
      .select("id, driver_id, work_date, work_status");

    if (up.error) {
      pushToast("error", TXT.err_prefix + up.error.message);
      return map;
    }

    const next = { ...map };
    for (const row of (up.data || []) as any[]) {
      const k = `${row.driver_id}__${row.work_date}`;
      next[k] = {
        id: row.id,
        driver_id: row.driver_id,
        work_date: row.work_date,
        work_status: row.work_status,
      };
    }

    return next;
  }

  async function load() {
    setLoading(true);
    setErr("");

    const d = await supabase
      .from("drivers")
      .select("id, full_name, phone, employment_status, employment_status_from, employment_status_planned, employment_status_planned_from")
      .order("full_name", { ascending: true });

    if (d.error) {
      setErr(d.error.message);
      pushToast("error", TXT.err_prefix + d.error.message);
      setDrivers([]);
      setScheduleMap({});
      setLoading(false);
      return;
    }

    const driverRows = (d.data || []) as DriverRow[];

    const from = weekDates[0];
    const to = weekDates[6];

    const s = await supabase
      .from("driver_schedule")
      .select("id, driver_id, work_date, work_status")
      .gte("work_date", from)
      .lte("work_date", to);

    if (s.error) {
      setErr(s.error.message);
      pushToast("error", TXT.err_prefix + s.error.message);
      setDrivers(driverRows);
      setScheduleMap({});
      setLoading(false);
      return;
    }

    const map: Record<string, ScheduleRow> = {};
    for (const row of (s.data || []) as any[]) {
      const k = `${row.driver_id}__${row.work_date}`;
      map[k] = {
        id: row.id,
        driver_id: row.driver_id,
        work_date: row.work_date,
        work_status: row.work_status,
      };
    }

    const ensured = await ensureWeekRows(driverRows, map);

    setDrivers(driverRows);
    setScheduleMap(ensured);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  async function upsertStatus(driverId: string, dateISO: string, work_status: ScheduleRow["work_status"]) {
    setErr("");

    const key = `${driverId}__${dateISO}`;
    setSavingKey(key);

    const payload: ScheduleRow = {
      driver_id: driverId,
      work_date: dateISO,
      work_status,
    };

    const res = await supabase
      .from("driver_schedule")
      .upsert(payload as any, { onConflict: "driver_id,work_date" });

    if (res.error) {
      setErr(TXT.not_saved + ": " + res.error.message);
      pushToast("error", TXT.not_saved + ": " + res.error.message);
      setSavingKey("");
      return;
    }

    setScheduleMap((prev) => ({
      ...prev,
      [key]: payload,
    }));

    pushToast("success", TXT.saved);
    setSavingKey("");
  }

  const visibleDrivers = useMemo(() => {
    if (showFired) return drivers;
    return drivers.filter((dr) => weekDates.some((dt) => isDriverActiveOnDate(dr, dt)));
  }, [drivers, weekDates, showFired]);

  return (
    <div style={{ maxWidth: 1200 }}>
      <h1>{TXT.title}</h1>

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 800 }}>
          {TXT.week_of} {fmtRU(weekDates[0])}
        </div>

        <button onClick={() => setWeekStart((d) => addDays(d, -7))}
          style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2a2a2a", background: "#0f0f0f", color: "#fff", cursor: "pointer" }}>
          {TXT.prev}
        </button>

        <button onClick={() => setWeekStart((d) => addDays(d, 7))}
          style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2a2a2a", background: "#0f0f0f", color: "#fff", cursor: "pointer" }}>
          {TXT.next}
        </button>

        <button onClick={load}
          style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2a2a2a", background: "#151515", color: "#fff", cursor: "pointer" }}>
          {TXT.refresh}
        </button>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={showFired} onChange={(e) => setShowFired(e.target.checked)} />
          <span style={{ fontSize: 13, opacity: 0.8 }}>
            {"\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0443\u0432\u043e\u043b\u0435\u043d\u043d\u044b\u0445"}
          </span>
        </label>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          {loading ? <span style={{ opacity: 0.75 }}>{TXT.loading}</span> : null}
        </div>
      </div>

      <div style={{ marginTop: 14, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #222", fontSize: 12, opacity: 0.75, width: 320 }}>
                {TXT.driver}
              </th>
              {weekDates.map((d, i) => (
                <th key={d} style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #222", fontSize: 12, opacity: 0.75 }}>
                  {dayTitle(i)} <span style={{ opacity: 0.7 }}>{fmtRU(d)}</span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleDrivers.map((dr) => (
              <tr key={dr.id}>
                <td style={{ padding: "10px", borderBottom: "1px solid #111" }}>
                  <div style={{ fontWeight: 800 }}>{dr.full_name || ""}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{TXT.phone}: {dr.phone || ""}</div>
                </td>

                {weekDates.map((d) => {
                  const activeHere = isDriverActiveOnDate(dr, d);
                  const k = `${dr.id}__${d}`;
                  const row = scheduleMap[k];
                  const val: ScheduleRow["work_status"] = row?.work_status || "on_duty";
                  const isSaving = savingKey === k;

                  return (
                    <td key={k} style={{ padding: "10px", borderBottom: "1px solid #111" }}>
                      {!activeHere ? (
                        <span className={"status-badge status-fired"}>
                          {"\u041d\u0435 \u0432 \u0448\u0442\u0430\u0442\u0435"}
                        </span>
                      ) : (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <select
                            value={val}
                            onChange={(e) => upsertStatus(dr.id, d, e.target.value as any)}
                            disabled={isSaving}
                            className={`esl-select esl-select-${val}${isSaving ? " esl-select-saving" : ""}`}
                            style={{ width: "100%", minWidth: 120 }}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {statusLabel(s)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="esl-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`esl-toast esl-toast-${t.kind}`}>{t.text}</div>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
        {"\u041f\u0440\u0430\u0432\u0438\u043b\u043e: \u0432 \u0433\u0440\u0430\u0444\u0438\u043a\u0435 \u0434\u043e\u043b\u0436\u043d\u0430 \u0431\u044b\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u044c \u043d\u0430 \u043a\u0430\u0436\u0434\u044b\u0439 \u0434\u0435\u043d\u044c (\u043f\u043e \u0443\u043c\u043e\u043b\u0447\u0430\u043d\u0438\u044e \u0441\u043e\u0437\u0434\u0430\u0451\u0442\u0441\u044f on_duty)."}
      </div>
    </div>
  );
}