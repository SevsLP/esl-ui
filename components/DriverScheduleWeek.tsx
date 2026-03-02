"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient"

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

const STATUS_OPTIONS: ScheduleRow["work_status"][] = [
  "on_duty",
  "off_day",
  "sick_leave",
  "vacation",
];

const TXT = {
  title: "\u0413\u0440\u0430\u0444\u0438\u043a \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u0435\u0439 (\u043d\u0435\u0434\u0435\u043b\u044f)",
  week_of: "\u041d\u0435\u0434\u0435\u043b\u044f \u0441",
  prev: "\u2190 \u041f\u0440\u043e\u0448\u043b\u0430\u044f",
  next: "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0430\u044f \u2192",
  refresh: "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c",
  loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...",
  saved: "\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e",
  not_saved: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
  err_prefix: "\u041e\u0448\u0438\u0431\u043a\u0430: ",
  driver: "\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c",
  phone: "\u0422\u0435\u043b",
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatISODate(d: Date) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${y}-${m}-${dd}`;
}

function parseISODate(s: string) {
  // YYYY-MM-DD
  const [y, m, d] = s.split("-").map((x) => Number(x));
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(d: Date, days: number) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + days);
  return x;
}

function startOfWeekMonday(d: Date) {
  const x = new Date(d.getTime());
  const day = x.getDay(); // 0 Sun ... 6 Sat
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtRU(iso: string) {
  // DD.MM
  const dt = parseISODate(iso);
  return `${pad2(dt.getDate())}.${pad2(dt.getMonth() + 1)}`;
}

function dayTitle(i: number) {
  // Monday..Sunday
  const titles = [
    "\u041f\u043d",
    "\u0412\u0442",
    "\u0421\u0440",
    "\u0427\u0442",
    "\u041f\u0442",
    "\u0421\u0431",
    "\u0412\u0441",
  ];
  return titles[i] || "";
}

function statusLabel(s: ScheduleRow["work_status"]) {
  if (s === "on_duty") return "\u041d\u0430 \u0441\u043c\u0435\u043d\u0435";
  if (s === "off_day") return "\u0412\u044b\u0445\u043e\u0434\u043d\u043e\u0439";
  if (s === "sick_leave") return "\u0411\u043e\u043b\u044c\u043d\u0438\u0447\u043d\u044b\u0439";
  if (s === "vacation") return "\u041e\u0442\u043f\u0443\u0441\u043a";
  return s;
}

function isDriverActiveOnDate(dr: DriverRow, dateISO: string) {
  const planned = dr.employment_status_planned;
  const plannedFrom = dr.employment_status_planned_from;
  const current = dr.employment_status;
  const currentFrom = dr.employment_status_from;

  // if there is a plan and its date is <= dateISO, use planned state
  if (planned && plannedFrom && plannedFrom <= dateISO) {
    return planned === "active";
  }

  // otherwise use current state (if fired since some date -> inactive from that date)
  if (current === "fired") {
    if (!currentFrom) return false;
    return dateISO < currentFrom;
  }

  return true;
}

type Toast = { id: string; kind: "success" | "error"; text: string };

type Props = {
  anchorDate: string; // YYYY-MM-DD
};

export default function DriverScheduleWeek({ anchorDate }: { anchorDate: string }) {
  const weekStartOf = (d: Date) => {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = x.getUTCDay(); // 0=Sun
    const diff = (day === 0 ? -6 : 1 - day); // Mon as start
    x.setUTCDate(x.getUTCDate() + diff);
    return x;
  };

  const [weekStart, setWeekStart] = useState(() => {
    const base = anchorDate ? new Date(anchorDate + "T00:00:00Z") : new Date();
    return weekStartOf(base);
  });

  // ✅ если диспетчер переключил дату — неделя в графике должна переякориться
  useEffect(() => {
    if (!anchorDate) return;
    setWeekStart(startOfWeekMonday(parseISODate(anchorDate)));
  }, [anchorDate]);

  const weekDates = useMemo(() => {
    const res: string[] = [];
    for (let i = 0; i < 7; i++) res.push(formatISODate(addDays(weekStart, i)));
    return res;
  }, [weekStart]);

  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [scheduleMap, setScheduleMap] = useState<Record<string, ScheduleRow>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [showFired, setShowFired] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  function pushToast(kind: Toast["kind"], text: string) {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [{ id, kind, text }, ...prev].slice(0, 4));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }

  async function ensureWeekRows(driverRows: DriverRow[], map: Record<string, ScheduleRow>) {
    // ensure an entry exists for every active driver and day, default: on_duty
    const inserts: ScheduleRow[] = [];

    for (const dr of driverRows) {
      for (const dt of weekDates) {
        const active = isDriverActiveOnDate(dr, dt);
        if (!active) continue;

        const k = `${dr.id}__${dt}`;
        if (!map[k]) {
          inserts.push({
            driver_id: dr.id,
            work_date: dt,
            work_status: "on_duty",
          });
        }
      }
    }

    if (inserts.length === 0) return map;

    const res = await supabase
      .from("driver_schedule")
      .upsert(inserts as any, { onConflict: "driver_id,work_date" });

    if (res.error) {
      pushToast("error", TXT.err_prefix + res.error.message);
      return map;
    }

    const next = { ...map };
    for (const row of inserts) {
      const k = `${row.driver_id}__${row.work_date}`;
      next[k] = row;
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

        <button
          onClick={() => setWeekStart((d) => addDays(d, -7))}
          style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2a2a2a", background: "#0f0f0f", color: "#fff", cursor: "pointer" }}
        >
          {TXT.prev}
        </button>

        <button
          onClick={() => setWeekStart((d) => addDays(d, 7))}
          style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2a2a2a", background: "#0f0f0f", color: "#fff", cursor: "pointer" }}
        >
          {TXT.next}
        </button>

        <button
          onClick={load}
          style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2a2a2a", background: "#151515", color: "#fff", cursor: "pointer" }}
        >
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
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {TXT.phone}: {dr.phone || ""}
                  </div>
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

      {err ? <div style={{ marginTop: 12, color: "#ff6b6b" }}>{TXT.err_prefix + err}</div> : null}
    </div>
  );
}