"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TestStatus = "ok" | "warn" | "fail" | "run";

type TestResult = {
  key: string;
  title: string;
  status: TestStatus;
  details: string;
};

const TXT = {
  title: "\u0422\u0435\u0441\u0442 \u0441\u0438\u0441\u0442\u0435\u043c\u044b",
  run: "\u0417\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c \u0442\u0435\u0441\u0442\u044b",
  running: "\u0422\u0435\u0441\u0442\u044b \u0438\u0434\u0443\u0442...",
  ready: "\u0413\u043e\u0442\u043e\u0432\u043e",
  hint:
    "\u042d\u0442\u043e \u043d\u0435 \u0440\u0430\u0437\u043e\u0432\u044b\u0439 \u044d\u043a\u0440\u0430\u043d. \u041f\u0440\u0438 \u043b\u044e\u0431\u044b\u0445 \u043f\u0440\u0430\u0432\u043a\u0430\u0445 \u0431\u0430\u0437\u044b/\u043f\u0440\u0430\u0432/\u0442\u0440\u0438\u0433\u0433\u0435\u0440\u043e\u0432 \u0442\u0443\u0442 \u0441\u0440\u0430\u0437\u0443 \u0432\u0438\u0434\u043d\u043e, \u0447\u0442\u043e \u0441\u043b\u043e\u043c\u0430\u043b\u043e\u0441\u044c.",
  col_test_tag: "\u0422\u0415\u0421\u0422",
};

function badge(status: TestStatus) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #2a2a2a",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  };

  const dot: React.CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#9aa0a6",
  };

  if (status === "ok") dot.background = "#39d353";
  if (status === "warn") dot.background = "#f7d154";
  if (status === "fail") dot.background = "#ff6b6b";
  if (status === "run") dot.background = "#4da3ff";

  const text =
    status === "ok"
      ? "\u041e\u041a"
      : status === "warn"
      ? "\u0412\u043d\u0438\u043c\u0430\u043d\u0438\u0435"
      : status === "fail"
      ? "\u041e\u0448\u0438\u0431\u043a\u0430"
      : "\u0418\u0434\u0451\u0442";

  return (
    <span style={base}>
      <span style={dot} />
      {text}
    </span>
  );
}

function nowTag() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}${m}${day}_${hh}${mm}${ss}`;
}

export default function Page() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const testTag = useMemo(() => `${TXT.col_test_tag}_${nowTag()}`, []);

  function setOne(key: string, patch: Partial<TestResult>) {
    setResults((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } as TestResult : r))
    );
  }

  function init() {
    const base: TestResult[] = [
      {
        key: "r_vehicles_read",
        title:
          "\u0427\u0442\u0435\u043d\u0438\u0435: vehicles (id, brand, vehicle_code)",
        status: "run",
        details: "",
      },
      {
        key: "w_vehicles_write",
        title: "\u0417\u0430\u043f\u0438\u0441\u044c: vehicles (insert + delete)",
        status: "run",
        details: "",
      },
      {
        key: "r_trailers_read",
        title:
          "\u0427\u0442\u0435\u043d\u0438\u0435: trailers (id, brand, vehicle_code)",
        status: "run",
        details: "",
      },
      {
        key: "w_trailers_write",
        title: "\u0417\u0430\u043f\u0438\u0441\u044c: trailers (insert + delete)",
        status: "run",
        details: "",
      },
      {
        key: "r_drivers_read",
        title:
          "\u0427\u0442\u0435\u043d\u0438\u0435: drivers (employment_status + \u043f\u043e\u043b\u044f \u043f\u043b\u0430\u043d\u0430)",
        status: "run",
        details: "",
      },
      {
        key: "s_drivers_columns",
        title:
          "\u0421\u0445\u0435\u043c\u0430: \u043a\u043e\u043b\u043e\u043d\u043a\u0438 drivers (employment_status_from / planned)",
        status: "run",
        details: "",
      },
      {
        key: "w_drivers_plan_write",
        title:
          "\u0417\u0430\u043f\u0438\u0441\u044c: drivers (\u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044f \u0438 \u043f\u043e\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u043f\u043b\u0430\u043d)",
        status: "run",
        details: "",
      },
      {
        key: "p_drivers_plans",
        title:
          "\u041f\u043b\u0430\u043d\u044b: \u0441\u043a\u043e\u043b\u044c\u043a\u043e \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u0435\u0439 \u0441 \u043f\u043b\u0430\u043d\u043e\u043c",
        status: "run",
        details: "",
      },
      {
        key: "r_logistics_vehicle_id",
        title:
          "\u0421\u0432\u044f\u0437\u044c: logistics.vehicle_id (\u043a\u043e\u043b\u043e\u043d\u043a\u0430 \u0435\u0441\u0442\u044c \u0438 \u0447\u0442\u0435\u043d\u0438\u0435 \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442)",
        status: "run",
        details: "",
      },

{
  key: "rpc_apply_driver_employment_plans",
  title: "RPC: apply_driver_employment_plans()",
  status: "run",
  details: "",
},
{
  key: "rpc_ensure_day_idempotent",
  title: "RPC: ensure_dispatcher_day_with_carryover (создание дня + идемпотентность)",
  status: "run",
  details: "",
},
{
  key: "s_dispatcher_day_closed_flag",
  title: "Диспетчер: закрытие дня (dispatcher_days.is_closed/day_status)",
  status: "run",
  details: "",
},
{
  key: "r_dispatcher_lines_read",
  title: "Чтение: dispatcher_day_lines (по dispatcher_day_id)",
  status: "run",
  details: "",
},
{
  key: "s_dispatcher_unique_driver",
  title: "Ограничение: uq_dday_driver (один водитель в день) — ожидаем блокировку дубля",
  status: "run",
  details: "",
},
{
  key: "s_driver_schedule_tomorrow",
  title: "График: driver_schedule на завтра (есть записи on_duty)",
  status: "run",
  details: "",
},
{
  key: "s_dispatcher_closed_day_blocks_write_testdate",
  title: "Диспетчер: закрытый тестовый день блокирует запись (2099-01-01)",
  status: "run",
  details: "",
},
    ];
    setResults(base);
  }

  async function testSelectOne(key: string, table: string, columns: string) {
    const { error } = await supabase.from(table).select(columns).limit(1);
    if (error) {
      setOne(key, { status: "fail", details: error.message });
      return false;
    }
    setOne(key, { status: "ok", details: "\u0427\u0442\u0435\u043d\u0438\u0435 \u043e\u043a" });
    return true;
  }

  async function testInsertDelete(
    key: string,
    table: "vehicles" | "trailers",
    brand: string,
    code: string
  ) {
    // insert
    const ins = await supabase.from(table).insert({ brand, vehicle_code: code }).select("id").single();
    if (ins.error || !ins.data?.id) {
      setOne(key, { status: "fail", details: ins.error?.message || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c" });
      return false;
    }

    const id = ins.data.id as string;

    // delete
    const del = await supabase.from(table).delete().eq("id", id);
    if (del.error) {
      // Важно: запись может остаться — покажем предупреждение и id
      setOne(key, {
        status: "warn",
        details:
          "\u0421\u043e\u0437\u0434\u0430\u043d\u043e, \u043d\u043e \u043d\u0435 \u0443\u0434\u0430\u043b\u0438\u043b\u043e\u0441\u044c (\u043f\u0440\u0430\u0432\u0430/RLS?). id=" +
          id +
          " \u2022 " +
          del.error.message,
      });
      return true;
    }

    setOne(key, { status: "ok", details: "\u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435 \u0438 \u0443\u0434\u0430\u043b\u0435\u043d\u0438\u0435 \u043e\u043a" });
    return true;
  }

  async function testDriversColumns(key: string) {
    // Проверяем через select: если колонки нет — PostgREST вернёт ошибку.
    const cols = [
      "employment_status",
      "employment_status_from",
      "employment_status_planned",
      "employment_status_planned_from",
    ];

    for (const c of cols) {
      const { error } = await supabase.from("drivers").select(c).limit(1);
      if (error) {
        setOne(key, {
          status: "fail",
          details:
            "\u041d\u0435\u0442 \u043a\u043e\u043b\u043e\u043d\u043a\u0438 \u0438\u043b\u0438 \u043d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0430: " +
            c +
            " \u2022 " +
            error.message,
        });
        return false;
      }
    }

    setOne(key, { status: "ok", details: "\u041a\u043e\u043b\u043e\u043d\u043a\u0438 \u043d\u0430 \u043c\u0435\u0441\u0442\u0435" });
    return true;
  }

  async function testDriversPlanWrite(key: string) {
    // Создаём тестового водителя, ставим план, потом пытаемся удалить.
    const fullName = `${TXT.col_test_tag}_\u0412\u041e\u0414\u0418\u0422\u0415\u041b\u042c_${nowTag()}`;
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const todayISO = `${y}-${m}-${d}`;

    const ins = await supabase
      .from("drivers")
      .insert({
        full_name: fullName,
        phone: null,
        employment_status: "active",
        employment_status_from: todayISO,
        employment_status_planned: null,
        employment_status_planned_from: null,
      })
      .select("id")
      .single();

    if (ins.error || !ins.data?.id) {
      setOne(key, {
        status: "fail",
        details: ins.error?.message || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c",
      });
      return false;
    }

    const id = ins.data.id as string;

    // План на завтра
    const t2 = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const y2 = t2.getFullYear();
    const m2 = String(t2.getMonth() + 1).padStart(2, "0");
    const d2 = String(t2.getDate()).padStart(2, "0");
    const tomorrowISO = `${y2}-${m2}-${d2}`;

    const upd = await supabase
      .from("drivers")
      .update({
        employment_status_planned: "fired",
        employment_status_planned_from: tomorrowISO,
      })
      .eq("id", id);

    if (upd.error) {
      setOne(key, {
        status: "fail",
        details: "\u041d\u0435 \u0441\u0442\u0430\u0432\u0438\u0442\u0441\u044f \u043f\u043b\u0430\u043d \u2022 " + upd.error.message,
      });
      return false;
    }

    // Попытка удалить тестового водителя (может быть запрещено — тогда предупреждение)
    const del = await supabase.from("drivers").delete().eq("id", id);
    if (del.error) {
      setOne(key, {
        status: "warn",
        details:
          "\u041f\u043b\u0430\u043d \u0441\u0442\u0430\u0432\u0438\u0442\u0441\u044f, \u043d\u043e \u0443\u0434\u0430\u043b\u0435\u043d\u0438\u0435 \u0437\u0430\u043f\u0440\u0435\u0449\u0435\u043d\u043e (ok). id=" +
          id +
          " \u2022 " +
          del.error.message,
      });
      return true;
    }

    setOne(key, { status: "ok", details: "\u0421\u043e\u0437\u0434\u0430\u043d\u043e \u2192 \u043f\u043b\u0430\u043d \u043f\u043e\u0441\u0442\u0430\u0432\u043b\u0435\u043d \u2192 \u0443\u0434\u0430\u043b\u0435\u043d\u043e" });
    return true;
  }

  async function testPlansCount(key: string) {
    const { data, error } = await supabase
      .from("drivers")
      .select("id", { count: "exact" })
      .not("employment_status_planned", "is", null);

    if (error) {
      setOne(key, { status: "fail", details: error.message });
      return false;
    }

    const cnt = (data || []).length;
    if (cnt === 0) {
      setOne(key, { status: "ok", details: "\u041f\u043b\u0430\u043d\u043e\u0432 \u043d\u0435\u0442" });
      return true;
    }

    setOne(key, {
      status: "warn",
      details:
        "\u041f\u043b\u0430\u043d\u043e\u0432: " +
        String(cnt) +
        ". \u0410\u0432\u0442\u043e-\u043f\u0440\u0438\u043c\u0435\u043d\u0435\u043d\u0438\u0435 \u043f\u043e\u043a\u0430 \u043d\u0435 \u0432\u043a\u043b\u044e\u0447\u0435\u043d\u043e (\u0441\u0434\u0435\u043b\u0430\u0435\u043c \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u043e).",
    });
    return true;
  }


async function testRpcApplyPlans(key: string) {
  const res = await supabase.rpc("apply_driver_employment_plans");
  if (res.error) {
    setOne(key, { status: "fail", details: res.error.message });
    return false;
  }
  setOne(key, { status: "ok", details: "RPC \u0432\u044b\u0437\u0432\u0430\u043d \u0431\u0435\u0437 \u043e\u0448\u0438\u0431\u043a\u0438" });
  return true;
}

async function testRpcEnsureDayIdempotent(key: string) {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayISO = `${y}-${m}-${d}`;

  const a = await supabase.rpc("ensure_dispatcher_day_with_carryover", { p_day_date: todayISO });
  if (a.error || !a.data) {
    setOne(key, { status: "fail", details: a.error?.message || "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445" });
    return false;
  }
  const dayId1 = String(a.data);

  const b = await supabase.rpc("ensure_dispatcher_day_with_carryover", { p_day_date: todayISO });
  if (b.error || !b.data) {
    setOne(key, { status: "fail", details: b.error?.message || "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 (\u043f\u043e\u0432\u0442\u043e\u0440)" });
    return false;
  }
  const dayId2 = String(b.data);

  if (dayId1 !== dayId2) {
    setOne(key, { status: "warn", details: `UUID \u0440\u0430\u0437\u043d\u044b\u0435: ${dayId1} vs ${dayId2}` });
    return true;
  }

  setOne(key, { status: "ok", details: `UUID \u0434\u043d\u044f: ${dayId1}` });
  return true;
}


async function testDispatcherDayClosedFlag(key: string) {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayISO = `${y}-${m}-${d}`;

  // День должен существовать (создадим/получим через RPC), но без изменения флага закрытия
  const r = await supabase.rpc("ensure_dispatcher_day_with_carryover", { p_day_date: todayISO });
  if (r.error || !r.data) {
    setOne(key, { status: "fail", details: r.error?.message || "RPC не вернул day_id" });
    return false;
  }

  const q = await supabase
    .from("dispatcher_days")
    .select("id, day_date, is_closed, day_status")
    .eq("day_date", todayISO)
    .limit(1)
    .maybeSingle();

  if (q.error) {
    setOne(key, { status: "fail", details: q.error.message });
    return false;
  }

  if (!q.data) {
    setOne(key, { status: "warn", details: `День ${todayISO} не найден в dispatcher_days (странно).` });
    return true;
  }

  const isClosed = q.data.is_closed ? "закрыт" : "открыт";
  const st = q.data.day_status ? String(q.data.day_status) : "—";
  setOne(key, { status: "ok", details: `День ${todayISO}: ${isClosed}, day_status=${st}` });
  return true;
}

async function testReadDispatcherLinesByToday(key: string) {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayISO = `${y}-${m}-${d}`;

  const r = await supabase.rpc("ensure_dispatcher_day_with_carryover", { p_day_date: todayISO });
  if (r.error || !r.data) {
    setOne(key, { status: "fail", details: r.error?.message || "RPC \u043d\u0435 \u0432\u0435\u0440\u043d\u0443\u043b day_id" });
    return false;
  }
  const dayId = String(r.data);

  const q = await supabase
    .from("dispatcher_day_lines")
    .select("id, dispatcher_day_id, vehicle_id, driver_id, trailer_id, resource_status")
    .eq("dispatcher_day_id", dayId)
    .limit(5);

  if (q.error) {
    setOne(key, { status: "fail", details: q.error.message });
    return false;
  }

  const cnt = (q.data || []).length;
  setOne(key, { status: "ok", details: `\u0427\u0442\u0435\u043d\u0438\u0435 \u043e\u043a, \u0441\u0442\u0440\u043e\u043a (\u043f\u0435\u0440\u0432\u044b\u0435 5): ${cnt}` });
  return true;
}

async function testUniqueDriverConstraint(key: string) {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayISO = `${y}-${m}-${d}`;

  const r = await supabase.rpc("ensure_dispatcher_day_with_carryover", { p_day_date: todayISO });
  if (r.error || !r.data) {
    setOne(key, { status: "fail", details: r.error?.message || "\u041d\u0435\u0442 day_id" });
    return false;
  }
  const dayId = String(r.data);

  const dr = await supabase
    .from("drivers")
    .select("id")
    .eq("employment_status", "active")
    .limit(1)
    .single();

  if (dr.error || !dr.data?.id) {
    setOne(key, { status: "warn", details: "\u041d\u0435\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0433\u043e \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044f \u0434\u043b\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438" });
    return true;
  }
  const driverId = String(dr.data.id);

  const vv = await supabase.from("vehicles").select("id").limit(2);
  if (vv.error) {
    setOne(key, { status: "fail", details: vv.error.message });
    return false;
  }
  const vList = (vv.data || []).map((x: any) => String(x.id));
  if (vList.length < 2) {
    setOne(key, { status: "warn", details: "\u041d\u0443\u0436\u043d\u043e \u043c\u0438\u043d\u0438\u043c\u0443\u043c 2 \u043c\u0430\u0448\u0438\u043d\u044b \u0434\u043b\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438" });
    return true;
  }

  const ins1 = await supabase
    .from("dispatcher_day_lines")
    .insert({ dispatcher_day_id: dayId, vehicle_id: vList[0], driver_id: driverId, resource_status: "work" })
    .select("id")
    .single();

  if (ins1.error || !ins1.data?.id) {
    setOne(key, { status: "warn", details: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u0441\u0442\u0430\u0432\u0438\u0442\u044c 1-\u044e \u0441\u0442\u0440\u043e\u043a\u0443 (\u0432\u043e\u0437\u043c\u043e\u0436\u043d\u043e, \u0434\u0435\u043d\u044c \u0437\u0430\u043a\u0440\u044b\u0442 \u0438\u043b\u0438 \u0441\u0442\u0440\u043e\u0433\u0438\u0435 \u043f\u0440\u0430\u0432\u0438\u043b\u0430)." });
    return true;
  }
  const id1 = String(ins1.data.id);

  const ins2 = await supabase
    .from("dispatcher_day_lines")
    .insert({ dispatcher_day_id: dayId, vehicle_id: vList[1], driver_id: driverId, resource_status: "work" })
    .select("id")
    .single();

  // чистим 1-ю строку
  await supabase.from("dispatcher_day_lines").delete().eq("id", id1);

  if (!ins2.error) {
    if (ins2.data?.id) await supabase.from("dispatcher_day_lines").delete().eq("id", String(ins2.data.id));
    setOne(key, { status: "fail", details: "\u0414\u0443\u0431\u043b\u044c \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044f \u043f\u0440\u043e\u0448\u0451\u043b. \u041e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0438\u0435 uq_dday_driver \u043d\u0435 \u0441\u0440\u0430\u0431\u043e\u0442\u0430\u043b\u043e." });
    return false;
  }

  setOne(key, { status: "ok", details: `\u041e\u0436\u0438\u0434\u0430\u0435\u043c\u0430\u044f \u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u043a\u0430 \u0434\u0443\u0431\u043b\u044f: ${ins2.error.message}` });
  return true;
}

async function testDriverScheduleTomorrow(key: string) {
  const t = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  const tomorrowISO = `${y}-${m}-${d}`;

  const s = await supabase
    .from("driver_schedule")
    .select("id")
    .eq("work_date", tomorrowISO)
    .eq("work_status", "on_duty");

  if (s.error) {
    setOne(key, { status: "fail", details: s.error.message });
    return false;
  }

  const cnt = (s.data || []).length;
  if (cnt === 0) {
    setOne(key, { status: "warn", details: `\u041d\u0430 ${tomorrowISO} \u043d\u0435\u0442 \u0437\u0430\u043f\u0438\u0441\u0435\u0439 on_duty. \u0414\u0438\u0441\u043f\u0435\u0442\u0447\u0435\u0440 \u0431\u0443\u0434\u0435\u0442 \u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435.` });
    return true;
  }

  setOne(key, { status: "ok", details: `\u041d\u0430 ${tomorrowISO} on_duty: ${cnt}` });
  return true;
}

async function testClosedTestDayBlocksWrite(key: string) {
  const testDate = "2099-01-01";

  // 1) День через RPC (создать/получить id)
  const r = await supabase.rpc("ensure_dispatcher_day_with_carryover", { p_day_date: testDate });
  if (r.error || !r.data) {
    setOne(key, { status: "fail", details: r.error?.message || "RPC \u043d\u0435 \u0432\u0435\u0440\u043d\u0443\u043b day_id" });
    return false;
  }
  const dayId = String(r.data);

  // 2) Берём любую строку этого дня (чтобы тестировать UPDATE, а не INSERT)
  const line = await supabase
    .from("dispatcher_day_lines")
    .select("id, resource_status")
    .eq("dispatcher_day_id", dayId)
    .limit(1)
    .maybeSingle();

  if (line.error) {
    setOne(key, { status: "fail", details: line.error.message });
    return false;
  }

  if (!line.data?.id) {
    setOne(key, { status: "warn", details: "\u041d\u0430 \u0442\u0435\u0441\u0442\u043e\u0432\u044b\u0439 \u0434\u0435\u043d\u044c \u043d\u0435\u0442 \u0441\u0442\u0440\u043e\u043a \u0434\u0438\u0441\u043f\u0435\u0442\u0447\u0435\u0440\u0430 (\u043d\u0435\u0447\u0435\u0433\u043e \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0442\u044c)." });
    return true;
  }

  const lineId = String(line.data.id);
  const prevStatus = String(line.data.resource_status || "work");
  const nextStatus = prevStatus === "transfer" ? "work" : "transfer";

  // 3) Закрываем тестовый день
  const close = await supabase
    .from("dispatcher_days")
    .update({ is_closed: true, day_status: "closed" })
    .eq("id", dayId);

  if (close.error) {
    setOne(key, { status: "warn", details: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u043a\u0440\u044b\u0442\u044c \u0442\u0435\u0441\u0442\u043e\u0432\u044b\u0439 \u0434\u0435\u043d\u044c (\u043f\u0440\u0430\u0432\u0430/RLS?). \u2022 " + close.error.message });
    return true;
  }

  // 4) Пытаемся изменить строку в закрытом дне (ожидаем ошибку)
  const upd = await supabase
    .from("dispatcher_day_lines")
    .update({ resource_status: nextStatus })
    .eq("id", lineId);

  // 5) Открываем обратно
  await supabase
    .from("dispatcher_days")
    .update({ is_closed: false, day_status: "open" })
    .eq("id", dayId);

  if (!upd.error) {
    // Если вдруг прошло — это плохо: откатываем статус обратно
    await supabase
      .from("dispatcher_day_lines")
      .update({ resource_status: prevStatus })
      .eq("id", lineId);

    setOne(key, { status: "fail", details: "\u0412 \u0437\u0430\u043a\u0440\u044b\u0442\u043e\u043c \u0434\u043d\u0435 UPDATE \u043f\u0440\u043e\u0448\u0451\u043b. \u0411\u0414 \u043d\u0435 \u0431\u043b\u043e\u043a\u0438\u0440\u0443\u0435\u0442 \u043f\u0440\u0430\u0432\u043a\u0438 \u0437\u0430\u043a\u0440\u044b\u0442\u043e\u0433\u043e \u0434\u043d\u044f." });
    return false;
  }

  setOne(key, { status: "ok", details: "\u0417\u0430\u043a\u0440\u044b\u0442\u044b\u0439 \u0434\u0435\u043d\u044c \u0431\u043b\u043e\u043a\u0438\u0440\u0443\u0435\u0442 \u0437\u0430\u043f\u0438\u0441\u044c (\u043e\u0436\u0438\u0434\u0430\u0435\u043c\u0430\u044f \u043e\u0448\u0438\u0431\u043a\u0430: " + upd.error.message + ")" });
  return true;
}



  async function runAll() {
    setRunning(true);
    init();

    await testSelectOne("r_vehicles_read", "vehicles", "id, brand, vehicle_code");
    await testInsertDelete("w_vehicles_write", "vehicles", `${TXT.col_test_tag}_\u041c\u0410\u0428\u0418\u041d\u0410`, testTag);

    await testSelectOne("r_trailers_read", "trailers", "id, brand, vehicle_code");
    await testInsertDelete("w_trailers_write", "trailers", `${TXT.col_test_tag}_\u041f\u0420\u0418\u0426\u0415\u041f`, testTag);

    await testSelectOne("r_drivers_read", "drivers", "id, full_name, employment_status");
    await testDriversColumns("s_drivers_columns");
    await testDriversPlanWrite("w_drivers_plan_write");
    await testPlansCount("p_drivers_plans");

    await testSelectOne("r_logistics_vehicle_id", "logistics", "vehicle_id");


await testRpcApplyPlans("rpc_apply_driver_employment_plans");
await testRpcEnsureDayIdempotent("rpc_ensure_day_idempotent");
await testDispatcherDayClosedFlag("s_dispatcher_day_closed_flag");
await testReadDispatcherLinesByToday("r_dispatcher_lines_read");
await testUniqueDriverConstraint("s_dispatcher_unique_driver");
await testDriverScheduleTomorrow("s_driver_schedule_tomorrow");
await testClosedTestDayBlocksWrite("s_dispatcher_closed_day_blocks_write_testdate");

    setRunning(false);
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 980 }}>
      <h1>{TXT.title}</h1>

      <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
        {TXT.hint}
      </div>

      <div style={{ marginTop: 14 }}>
        <button
          onClick={runAll}
          disabled={running}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #2a2a2a",
            background: running ? "#0f0f0f" : "#151515",
            color: "#fff",
            cursor: running ? "not-allowed" : "pointer",
            opacity: running ? 0.7 : 1,
          }}
        >
          {running ? TXT.running : TXT.run}
        </button>
      </div>

      <div style={{ marginTop: 14, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #222", padding: "10px", fontSize: 12, opacity: 0.75, width: 140 }}>
                {"\u0421\u0442\u0430\u0442\u0443\u0441"}
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #222", padding: "10px", fontSize: 12, opacity: 0.75 }}>
                {"\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430"}
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #222", padding: "10px", fontSize: 12, opacity: 0.75 }}>
                {"\u0414\u0435\u0442\u0430\u043b\u0438"}
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.key}>
                <td style={{ padding: "10px", borderBottom: "1px solid #111" }}>{badge(r.status)}</td>
                <td style={{ padding: "10px", borderBottom: "1px solid #111", fontWeight: 700 }}>{r.title}</td>
                <td style={{ padding: "10px", borderBottom: "1px solid #111", fontSize: 13, opacity: 0.9, wordBreak: "break-word" }}>
                  {r.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
        {"\u041c\u0435\u0442\u043a\u0430 \u0442\u0435\u0441\u0442\u0430: "} {testTag}
      </div>
    </div>
  );
}