"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AnyRow = Record<string, any>;

const TRANSPORT_TYPE_OPTIONS = [
  "\u0431\u043e\u0440\u0442\u043e\u0432\u043e\u0439 \u043f\u043e\u043b\u0443\u043f\u0440\u0438\u0446\u0435\u043f",
  "\u0441\u0430\u043c\u043e\u0441\u0432\u0430\u043b",
  "\u0441\u0446\u0435\u043f\u043a\u0430",
  "\u0442\u043e\u043d\u0430\u0440",
  "\u0431\u043e\u0440\u0442\u043e\u0432\u043e\u0439 \u0441\u0446\u0435\u043f\u043a\u0430",
] as const;

const TRANSPORT_KIND_OPTIONS = ["\u0437\u0435\u0440\u043d\u043e\u0432\u043e\u0437", "\u043c\u0430\u0441\u043b\u043e\u0432\u043e\u0437"] as const;

const RATE_UNIT_OPTIONS = [
  { value: "", label: "\u2014" },
  { value: "per_trip", label: "\u0437\u0430 \u0440\u0435\u0439\u0441" },
  { value: "per_ton", label: "\u0437\u0430 \u0442\u043e\u043d\u043d\u0443" },
  { value: "per_kg", label: "\u0437\u0430 \u043a\u0433" },
] as const;

function pick(row: AnyRow, keys: string[], fallback: any = null) {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
}

function fmtDate(value: any) {
  if (!value) return "\u2014";
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function fmtNum(value: any) {
  if (value === undefined || value === null || value === "") return "\u2014";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return String(n);
}

function fmtMoney(value: any) {
  if (value === undefined || value === null || value === "") return "\u2014";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `${n} \u20bd`;
}

function rateUnitLabel(code: any) {
  const v = String(code ?? "");
  const found = RATE_UNIT_OPTIONS.find((x) => x.value === v);
  return found ? found.label : v || "\u2014";
}

function toNumberOrNull(v: any) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s.replace(",", "."));
  if (Number.isNaN(n)) return null;
  return n;
}

function toIntOrNull(v: any) {
  const n = toNumberOrNull(v);
  if (n === null) return null;
  return Math.trunc(n);
}

type Toast = { kind: "ok" | "err"; text: string } | null;

type FormState = {
  id: string | null;

  load_date: string;
  order_number: string;
  client_name: string;

  load_point: string;
  unload_point: string;

  km: string;
  preferred_transport_type: string;
  vehicles_required: string;

  cargo_type: string;
  note: string;

  volume_per_vehicle: string;
  trailer_required: boolean;

  rate_value: string;
  rate_unit: string;
  transport_kind: string;
};

function emptyForm(): FormState {
  const today = new Date();
  const yyyy = String(today.getFullYear());
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  return {
    id: null,

    load_date: `${yyyy}-${mm}-${dd}`,
    order_number: "",
    client_name: "",

    load_point: "",
    unload_point: "",

    km: "0",
    preferred_transport_type: "",
    vehicles_required: "1",

    cargo_type: "",
    note: "",

    volume_per_vehicle: "0",
    trailer_required: true,

    rate_value: "",
    rate_unit: "",
    transport_kind: "",
  };
}

function formFromRow(r: AnyRow): FormState {
  return {
    id: String(r.id),

    load_date: String(pick(r, ["load_date"], "")),
    order_number: String(pick(r, ["order_number"], "")),
    client_name: String(pick(r, ["client_name"], "")),

    load_point: String(pick(r, ["load_point"], "")),
    unload_point: String(pick(r, ["unload_point"], "")),

    km: String(pick(r, ["km"], "0")),
    preferred_transport_type: String(pick(r, ["preferred_transport_type"], "")),
    vehicles_required: String(pick(r, ["vehicles_required"], "1")),

    cargo_type: String(pick(r, ["cargo_type"], "")),
    note: String(pick(r, ["note"], "")),

    volume_per_vehicle: String(pick(r, ["volume_per_vehicle"], "0")),
    trailer_required: Boolean(pick(r, ["trailer_required"], true)),

    rate_value: String(pick(r, ["rate_value"], "")),
    rate_unit: String(pick(r, ["rate_unit"], "")),
    transport_kind: String(pick(r, ["transport_kind"], "")),
  };
}

function computeVolumeTotal(volumePerVehicle: string, vehiclesRequired: string) {
  const v = toNumberOrNull(volumePerVehicle) ?? 0;
  const c = toNumberOrNull(vehiclesRequired) ?? 0;
  return v * c;
}

export default function CommercePage() {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<AnyRow | null>(null);
  const selectedId = useMemo(() => (selected ? String(selected.id) : ""), [selected]);

  const [toast, setToast] = useState<Toast>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [filterLoadDate, setFilterLoadDate] = useState<string>("");
  const [filterTransportKind, setFilterTransportKind] = useState<string>("");

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(kind: "ok" | "err", text: string) {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 2400);
  }

  async function loadOrders() {
    setLoading(true);

    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });

    if (!error && data) {
      const list = data as AnyRow[];
      setRows(list);

      if (selected?.id) {
        const found = list.find((x) => String(x.id) === String(selected.id));
        setSelected(found ?? null);
      }
    } else {
      setRows([]);
      console.error("orders load error:", error);
      showToast("err", "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0438");
    }

    setLoading(false);
  }

  const visibleRows = useMemo(() => {
    let list = rows;
    if (filterLoadDate) {
      list = list.filter((r) => fmtDate(pick(r, ["load_date"], "")) === filterLoadDate);
    }
    if (filterTransportKind) {
      list = list.filter((r) => String(pick(r, ["transport_kind"], "")) === filterTransportKind);
    }
    return list;
  }, [rows, filterLoadDate, filterTransportKind]);

  function openCreate() {
    setModalMode("create");
    setForm(emptyForm());
    setIsModalOpen(true);
  }

  function openEditFromSelected() {
    if (!selected) {
      showToast("err", "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u044b\u0431\u0435\u0440\u0438 \u0437\u0430\u044f\u0432\u043a\u0443 \u0432 \u0442\u0430\u0431\u043b\u0438\u0446\u0435");
      return;
    }
    setModalMode("edit");
    setForm(formFromRow(selected));
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
    setForm(emptyForm());
  }

  function validateForm(f: FormState) {
    if (!f.load_date || f.load_date.trim() === "") return "\u041d\u0443\u0436\u043d\u0430 \u0434\u0430\u0442\u0430 \u043f\u043e\u0433\u0440\u0443\u0437\u043a\u0438";
    if (!f.order_number || f.order_number.trim() === "") return "\u041d\u0443\u0436\u0435\u043d \u043d\u043e\u043c\u0435\u0440 \u0437\u0430\u044f\u0432\u043a\u0438";
    if (!f.load_point || f.load_point.trim() === "") return "\u041d\u0443\u0436\u0435\u043d \u043f\u0443\u043d\u043a\u0442 \u043f\u043e\u0433\u0440\u0443\u0437\u043a\u0438";
    if (!f.unload_point || f.unload_point.trim() === "") return "\u041d\u0443\u0436\u0435\u043d \u043f\u0443\u043d\u043a\u0442 \u0432\u044b\u0433\u0440\u0443\u0437\u043a\u0438";

    const km = toNumberOrNull(f.km);
    if (km === null || km < 0) return "\u041a\u043c \u0434\u043e\u043b\u0436\u043d\u044b \u0431\u044b\u0442\u044c \u0447\u0438\u0441\u043b\u043e\u043c \u2265 0";

    const vr = toIntOrNull(f.vehicles_required);
    if (vr === null || vr <= 0) return "\u041c\u0430\u0448\u0438\u043d \u0434\u043e\u043b\u0436\u043d\u043e \u0431\u044b\u0442\u044c \u0447\u0438\u0441\u043b\u043e\u043c \u2265 1";

    const vpv = toNumberOrNull(f.volume_per_vehicle);
    if (vpv === null || vpv < 0) return "\u041e\u0431\u044a\u0435\u043c \u043d\u0430 1 \u043c\u0430\u0448\u0438\u043d\u0443 \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0447\u0438\u0441\u043b\u043e\u043c \u2265 0";

    const rate = toNumberOrNull(f.rate_value);
    if (f.rate_value.trim() !== "" && (rate === null || rate < 0)) {
      return "\u0421\u0442\u0430\u0432\u043a\u0430 \u0434\u043e\u043b\u0436\u043d\u0430 \u0431\u044b\u0442\u044c \u0447\u0438\u0441\u043b\u043e\u043c \u2265 0";
    }

    return null;
  }

  async function saveForm() {
    const errText = validateForm(form);
    if (errText) {
      showToast("err", errText);
      return;
    }

    setSaving(true);

    const payload: AnyRow = {
      load_date: form.load_date,
      order_number: form.order_number.trim(),
      client_name: form.client_name.trim() === "" ? null : form.client_name.trim(),
      load_point: form.load_point.trim(),
      unload_point: form.unload_point.trim(),
      km: toNumberOrNull(form.km) ?? 0,
      cargo_type: form.cargo_type.trim() === "" ? null : form.cargo_type.trim(),
      note: form.note.trim() === "" ? null : form.note.trim(),
      preferred_transport_type: form.preferred_transport_type.trim() === "" ? null : form.preferred_transport_type.trim(),
      vehicles_required: toIntOrNull(form.vehicles_required) ?? 1,
      volume_per_vehicle: toNumberOrNull(form.volume_per_vehicle) ?? 0,
      volume_total: computeVolumeTotal(form.volume_per_vehicle, form.vehicles_required),
      trailer_required: Boolean(form.trailer_required),
      rate_value: form.rate_value.trim() === "" ? null : toNumberOrNull(form.rate_value),
      rate_unit: form.rate_unit.trim() === "" ? null : form.rate_unit.trim(),
      transport_kind: form.transport_kind.trim() === "" ? null : form.transport_kind.trim(),
    };

    try {
      if (modalMode === "create") {
        const { data, error } = await supabase.from("orders").insert(payload).select("*").single();

        if (error) {
          console.error("orders insert error:", error);
          showToast("err", `\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u044f: ${error.message}`);
          setSaving(false);
          return;
        }

        showToast("ok", "\u0417\u0430\u044f\u0432\u043a\u0430 \u0441\u043e\u0437\u0434\u0430\u043d\u0430");
        await loadOrders();
        if (data) setSelected(data as AnyRow);
        setIsModalOpen(false);
        setForm(emptyForm());
      } else {
        if (!form.id) {
          showToast("err", "\u041d\u0435\u0442 ID \u0434\u043b\u044f \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f");
          setSaving(false);
          return;
        }

        const { data, error } = await supabase.from("orders").update(payload).eq("id", form.id).select("*").single();

        if (error) {
          console.error("orders update error:", error);
          showToast("err", `\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f: ${error.message}`);
          setSaving(false);
          return;
        }

        showToast("ok", "\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e");
        await loadOrders();
        if (data) setSelected(data as AnyRow);
        setIsModalOpen(false);
        setForm(emptyForm());
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleOriginalForSelected() {
    if (!selected?.id) {
      showToast("err", "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u044b\u0431\u0435\u0440\u0438 \u0437\u0430\u044f\u0432\u043a\u0443 \u0432 \u0442\u0430\u0431\u043b\u0438\u0446\u0435");
      return;
    }

    const current = Boolean(pick(selected, ["has_original"], false));
    const next = !current;

    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    if (next && !userId) {
      showToast("err", "\u041d\u0435\u0442 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u0438: \u043d\u0435 \u043c\u043e\u0433\u0443 \u043e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u043e\u0440\u0438\u0433\u0438\u043d\u0430\u043b");
      return;
    }

    const patch: AnyRow = next
      ? { has_original: true, original_received_at: new Date().toISOString(), original_received_by: userId }
      : { has_original: false, original_received_at: null, original_received_by: null };

    const { data, error } = await supabase.from("orders").update(patch).eq("id", selected.id).select("*").single();

    if (error) {
      console.error("toggle original error:", error);
      showToast("err", `\u041d\u0435 \u0441\u043c\u043e\u0433 \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u043e\u0440\u0438\u0433\u0438\u043d\u0430\u043b: ${error.message}`);
      return;
    }

    showToast("ok", next ? "\u041e\u0440\u0438\u0433\u0438\u043d\u0430\u043b \u043e\u0442\u043c\u0435\u0447\u0435\u043d" : "\u041e\u0440\u0438\u0433\u0438\u043d\u0430\u043b \u0441\u043d\u044f\u0442");
    setSelected(data as AnyRow);
    await loadOrders();
  }

  function requireSelected(action: () => void) {
    if (!selected) {
      showToast("err", "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u044b\u0431\u0435\u0440\u0438 \u0437\u0430\u044f\u0432\u043a\u0443 \u0432 \u0442\u0430\u0431\u043b\u0438\u0446\u0435");
      return;
    }
    action();
  }

  return (
    <div className="page-wrapper commerce-page">
      <div className="commerce-header">
        <div className="commerce-header-left">
          <h1 className="commerce-title">{"\u041a\u043e\u043c\u043c\u0435\u0440\u0446\u0438\u044f"}</h1>

          <div className="commerce-filter">
            <span className="commerce-filter-label">{"\u0414\u0430\u0442\u0430 \u043f\u043e\u0433\u0440\u0443\u0437\u043a\u0438:"}</span>
            <input
              className="commerce-filter-input"
              type="date"
              value={filterLoadDate}
              onChange={(e) => setFilterLoadDate(e.target.value)}
            />

            <span className="commerce-filter-label">{"\u0422\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442 (\u0432\u0438\u0434):"}</span>
            <select
              className="commerce-filter-input commerce-filter-select"
              value={filterTransportKind}
              onChange={(e) => setFilterTransportKind(e.target.value)}
            >
              <option value={""}>{"\u0412\u0441\u0435"}</option>
              {TRANSPORT_KIND_OPTIONS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <button
              className="btn btn-ghost"
              onClick={() => {
                setFilterLoadDate("");
                setFilterTransportKind("");
              }}
              disabled={!filterLoadDate && !filterTransportKind}
              title={"\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u0444\u0438\u043b\u044c\u0442\u0440\u044b"}
            >
              {"\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c"}
            </button>
          </div>
        </div>

        <div className="commerce-header-right">
          <button className="btn btn-primary" onClick={openCreate}>
            {"\u002b \u041d\u043e\u0432\u0430\u044f \u0437\u0430\u044f\u0432\u043a\u0430"}
          </button>

          <div className="commerce-actions">
            <button className="btn btn-outline" onClick={() => requireSelected(openEditFromSelected)}>
              {"\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c"}
            </button>

            <button className="btn btn-outline" onClick={() => requireSelected(() => void loadOrders())}>
              {"\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c"}
            </button>

            <button
              className="btn btn-outline"
              onClick={() =>
                requireSelected(() => showToast("err", "\u041c\u0430\u0440\u0448\u0440\u0443\u0442 \u0441\u0434\u0435\u043b\u0430\u0435\u043c \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u043c \u0448\u0430\u0433\u043e\u043c"))
              }
            >
              {"\u041c\u0430\u0440\u0448\u0440\u0443\u0442"}
            </button>

            <button
              className="btn btn-outline"
              onClick={() =>
                requireSelected(() => showToast("err", "\u041a\u0430\u043b\u044c\u043a\u0443\u043b\u044f\u0442\u043e\u0440 \u0441\u0434\u0435\u043b\u0430\u0435\u043c \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u043c \u0448\u0430\u0433\u043e\u043c"))
              }
            >
              {"\u041a\u0430\u043b\u044c\u043a\u0443\u043b\u044f\u0442\u043e\u0440"}
            </button>
          </div>
        </div>
      </div>

      <div className="commerce-grid">
        <div className="commerce-table-panel">
          {loading ? (
            <div className="loading-block">{"\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026"}</div>
          ) : (
            <div className="table-wrapper commerce-table-wrapper">
              <table className="esl-table esl-table-fixed commerce-table">
                <colgroup>
                  <col style={{ width: 120 }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 160 }} />
                  <col style={{ width: 180 }} />
                  <col style={{ width: 180 }} />
                  <col style={{ width: 70 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 70 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 90 }} />
                </colgroup>

                <thead>
                  <tr>
                    <th>{"\u0414\u0430\u0442\u0430 \u043f\u043e\u0433\u0440\u0443\u0437\u043a\u0438"}</th>
                    <th>{"\u041d\u043e\u043c\u0435\u0440 \u0437\u0430\u044f\u0432\u043a\u0438"}</th>
                    <th>{"\u041a\u043b\u0438\u0435\u043d\u0442"}</th>
                    <th>{"\u041f\u043e\u0433\u0440\u0443\u0437\u043a\u0430"}</th>
                    <th>{"\u0412\u044b\u0433\u0440\u0443\u0437\u043a\u0430"}</th>
                    <th>{"\u041a\u043c"}</th>
                    <th>{"\u0422\u0438\u043f \u0422\u0421"}</th>
                    <th>{"\u041c\u0430\u0448\u0438\u043d"}</th>
                    <th>{"\u0421\u0442\u0430\u0432\u043a\u0430"}</th>
                    <th>{"\u041e\u0440\u0438\u0433\u0438\u043d\u0430\u043b"}</th>
                    <th>{"\u041f\u0440\u0438\u0446\u0435\u043f"}</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ opacity: 0.7 }}>
                        {(filterLoadDate || filterTransportKind) ? "\u041d\u0435\u0442 \u0437\u0430\u044f\u0432\u043e\u043a \u043f\u043e \u0444\u0438\u043b\u044c\u0442\u0440\u0443" : "\u0417\u0430\u044f\u0432\u043e\u043a \u043d\u0435\u0442"}
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((r) => {
                      const loadDate = pick(r, ["load_date"]);
                      const orderNumber = pick(r, ["order_number"]);
                      const client = pick(r, ["client_name"], "\u2014");
                      const loadPoint = pick(r, ["load_point"], "\u2014");
                      const unloadPoint = pick(r, ["unload_point"], "\u2014");
                      const km = pick(r, ["km"], 0);
                      const transportType = pick(r, ["preferred_transport_type"], "\u2014");
                      const vehiclesRequired = pick(r, ["vehicles_required"], 1);
                      const rate = pick(r, ["rate_value"], null);
                      const trailerRequired = Boolean(pick(r, ["trailer_required"], false));
                      const hasOriginal = Boolean(pick(r, ["has_original"], false));

                      const isActive = selectedId && String(r.id) === selectedId;

                      return (
                        <tr
                          key={String(r.id)}
                          onClick={() => setSelected(r)}
                          className={isActive ? "row-active" : ""}
                          style={{ cursor: "pointer" }}
                        >
                          <td title={fmtDate(loadDate)}>{fmtDate(loadDate)}</td>
                          <td title={orderNumber ? String(orderNumber) : "\u2014"}>{orderNumber ? String(orderNumber) : "\u2014"}</td>
                          <td title={String(client)}>{String(client)}</td>
                          <td title={String(loadPoint)}>{String(loadPoint)}</td>
                          <td title={String(unloadPoint)}>{String(unloadPoint)}</td>
                          <td title={fmtNum(km)}>{fmtNum(km)}</td>
                          <td title={String(transportType)}>{String(transportType)}</td>
                          <td title={fmtNum(vehiclesRequired)}>{fmtNum(vehiclesRequired)}</td>
                          <td title={fmtMoney(rate)}>{fmtMoney(rate)}</td>
                          <td>
                            {hasOriginal ? (
                              <span className="status-badge status-success">{"\u0414\u0430"}</span>
                            ) : (
                              <span className="status-badge status-warning">{"\u041d\u0435\u0442"}</span>
                            )}
                          </td>
                          <td>
                            {trailerRequired ? (
                              <span className="status-badge status-success">{"\u0414\u0430"}</span>
                            ) : (
                              <span className="status-badge status-warning">{"\u041d\u0435\u0442"}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <div className="commerce-card side-card">
            <div className="commerce-card-head">
              <h2 className="commerce-card-title">{"\u0417\u0430\u044f\u0432\u043a\u0430"}</h2>
              <button className="btn btn-ghost" onClick={() => setSelected(null)} title={"\u0417\u0430\u043a\u0440\u044b\u0442\u044c"}>
                {"\u2715"}
              </button>
            </div>

            <div className="commerce-card-block">
              <div className="commerce-card-row">
                <div className="commerce-card-label">{"\u0417\u0430\u044f\u0432\u043a\u0430 \u043d\u0430 \u0440\u0443\u043a\u0430\u0445:"}</div>
                <button className="btn btn-outline" onClick={() => void toggleOriginalForSelected()}>
                  {Boolean(pick(selected, ["has_original"], false)) ? "\u0421\u043d\u044f\u0442\u044c" : "\u041e\u0442\u043c\u0435\u0442\u0438\u0442\u044c"}
                </button>
              </div>

              <div className="commerce-card-sep" />

              <div className="commerce-card-mini">
                <div>
                  <strong>{"\u0412\u0438\u0434 \u0433\u0440\u0443\u0437\u0430:"}</strong> {pick(selected, ["cargo_type"], "\u2014")}
                </div>
                <div>
                  <strong>{"\u041e\u0431\u044a\u0435\u043c \u043d\u0430 1:"}</strong> {fmtNum(pick(selected, ["volume_per_vehicle"], 0))}
                </div>
                <div>
                  <strong>{"\u041e\u0431\u0449\u0438\u0439 \u043e\u0431\u044a\u0435\u043c:"}</strong> {fmtNum(pick(selected, ["volume_total"], 0))}
                </div>
                <div>
                  <strong>{"\u0415\u0434\u0438\u043d\u0438\u0446\u0430 \u0441\u0442\u0430\u0432\u043a\u0438:"}</strong> {rateUnitLabel(pick(selected, ["rate_unit"], ""))}
                </div>
                <div>
                  <strong>{"\u0422\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442 (\u0432\u0438\u0434):"}</strong> {pick(selected, ["transport_kind"], "\u2014")}
                </div>

                <div>
                  <strong>{"\u041f\u0440\u0438\u043c\u0435\u0447\u0430\u043d\u0438\u0435:"}</strong>
                  <div style={{ opacity: 0.9, marginTop: 6, whiteSpace: "pre-wrap" }}>{pick(selected, ["note"], "\u2014")}</div>
                </div>

                <div style={{ opacity: 0.6, marginTop: 10, fontSize: 12 }}>
                  {"ID: "}{String(selected.id)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="commerce-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="commerce-modal">
            <div className="commerce-modal-head">
              <h2 className="commerce-modal-title">
                {modalMode === "create" ? "\u041d\u043e\u0432\u0430\u044f \u0437\u0430\u044f\u0432\u043a\u0430" : "\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0437\u0430\u044f\u0432\u043a\u0438"}
              </h2>
              <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>
                {"\u0417\u0430\u043a\u0440\u044b\u0442\u044c"}
              </button>
            </div>

            <div className="commerce-modal-grid">
              <div className="commerce-modal-col">
                <label className="field">
                  <span className="field-label">{"\u0414\u0430\u0442\u0430 \u043f\u043e\u0433\u0440\u0443\u0437\u043a\u0438 *"}</span>
                  <input
                    className="field-input"
                    type="date"
                    value={form.load_date}
                    onChange={(e) => setForm((p) => ({ ...p, load_date: e.target.value }))}
                  />
                </label>

                <label className="field">
                  <span className="field-label">{"\u041d\u043e\u043c\u0435\u0440 \u0437\u0430\u044f\u0432\u043a\u0438 *"}</span>
                  <input
                    className="field-input"
                    value={form.order_number}
                    onChange={(e) => setForm((p) => ({ ...p, order_number: e.target.value }))}
                    placeholder={"\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: 123/\u0410"}
                  />
                </label>

                <label className="field">
                  <span className="field-label">{"\u041a\u043b\u0438\u0435\u043d\u0442"}</span>
                  <input
                    className="field-input"
                    value={form.client_name}
                    onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))}
                    placeholder={"\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043a\u043b\u0438\u0435\u043d\u0442\u0430"}
                  />
                </label>

                <label className="field">
                  <span className="field-label">{"\u041f\u0443\u043d\u043a\u0442 \u043f\u043e\u0433\u0440\u0443\u0437\u043a\u0438 *"}</span>
                  <input
                    className="field-input"
                    value={form.load_point}
                    onChange={(e) => setForm((p) => ({ ...p, load_point: e.target.value }))}
                    placeholder={"\u0413\u043e\u0440\u043e\u0434, \u0430\u0434\u0440\u0435\u0441"}
                  />
                </label>

                <label className="field">
                  <span className="field-label">{"\u041f\u0443\u043d\u043a\u0442 \u0432\u044b\u0433\u0440\u0443\u0437\u043a\u0438 *"}</span>
                  <input
                    className="field-input"
                    value={form.unload_point}
                    onChange={(e) => setForm((p) => ({ ...p, unload_point: e.target.value }))}
                    placeholder={"\u0413\u043e\u0440\u043e\u0434, \u0430\u0434\u0440\u0435\u0441"}
                  />
                </label>

                <label className="field">
                  <span className="field-label">{"\u041f\u0440\u0438\u043c\u0435\u0447\u0430\u043d\u0438\u0435"}</span>
                  <textarea
                    className="field-input"
                    rows={4}
                    value={form.note}
                    onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                    placeholder={"\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 \u043a \u0437\u0430\u044f\u0432\u043a\u0435"}
                  />
                </label>
              </div>

              <div className="commerce-modal-col">
                <div className="commerce-inline-3">
                  <label className="field">
                    <span className="field-label">{"\u041a\u043c *"}</span>
                    <input
                      className="field-input"
                      inputMode="decimal"
                      value={form.km}
                      onChange={(e) => setForm((p) => ({ ...p, km: e.target.value }))}
                      placeholder={"0"}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">{"\u041c\u0430\u0448\u0438\u043d *"}</span>
                    <input
                      className="field-input"
                      inputMode="numeric"
                      value={form.vehicles_required}
                      onChange={(e) => setForm((p) => ({ ...p, vehicles_required: e.target.value }))}
                      placeholder={"1"}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">{"\u041e\u0431\u044a\u0435\u043c \u043d\u0430 1"}</span>
                    <input
                      className="field-input"
                      inputMode="decimal"
                      value={form.volume_per_vehicle}
                      onChange={(e) => setForm((p) => ({ ...p, volume_per_vehicle: e.target.value }))}
                      placeholder={"0"}
                    />
                  </label>
                </div>

                <div className="commerce-hint">
                  {"\u041e\u0431\u0449\u0438\u0439 \u043e\u0431\u044a\u0435\u043c: "}
                  <strong>{String(computeVolumeTotal(form.volume_per_vehicle, form.vehicles_required))}</strong>
                </div>

                <label className="field">
                  <span className="field-label">{"\u0422\u0438\u043f \u0442\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442\u0430"}</span>
                  <select
                    className="field-input field-select"
                    value={form.preferred_transport_type}
                    onChange={(e) => setForm((p) => ({ ...p, preferred_transport_type: e.target.value }))}
                  >
                    <option value={""}>{"\u2014"}</option>
                    {TRANSPORT_TYPE_OPTIONS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span className="field-label">{"\u0412\u0438\u0434 \u0433\u0440\u0443\u0437\u0430"}</span>
                  <input
                    className="field-input"
                    value={form.cargo_type}
                    onChange={(e) => setForm((p) => ({ ...p, cargo_type: e.target.value }))}
                    placeholder={"\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: \u0437\u0435\u0440\u043d\u043e"}
                  />
                </label>

                <div className="commerce-inline-2">
                  <label className="field">
                    <span className="field-label">{"\u0421\u0442\u0430\u0432\u043a\u0430"}</span>
                    <input
                      className="field-input"
                      inputMode="decimal"
                      value={form.rate_value}
                      onChange={(e) => setForm((p) => ({ ...p, rate_value: e.target.value }))}
                      placeholder={"\u0411\u0435\u0437 \u041d\u0414\u0421"}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">{"\u0415\u0434\u0438\u043d\u0438\u0446\u0430"}</span>
                    <select
                      className="field-input field-select"
                      value={form.rate_unit}
                      onChange={(e) => setForm((p) => ({ ...p, rate_unit: e.target.value }))}
                    >
                      {RATE_UNIT_OPTIONS.map((x) => (
                        <option key={x.value || "_"} value={x.value}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="commerce-inline-2">
                  <label className="field">
                    <span className="field-label">{"\u0422\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442 (\u0432\u0438\u0434)"}</span>
                    <select
                      className="field-input field-select"
                      value={form.transport_kind}
                      onChange={(e) => setForm((p) => ({ ...p, transport_kind: e.target.value }))}
                    >
                      <option value={""}>{"\u2014"}</option>
                      {TRANSPORT_KIND_OPTIONS.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field field-checkbox">
                    <span className="field-label">{"\u041f\u0440\u0438\u0446\u0435\u043f \u043d\u0443\u0436\u0435\u043d"}</span>
                    <div className="field-checkbox-row">
                      <input
                        type="checkbox"
                        checked={form.trailer_required}
                        onChange={(e) => setForm((p) => ({ ...p, trailer_required: e.target.checked }))}
                      />
                      <span>{form.trailer_required ? "\u0414\u0430" : "\u041d\u0435\u0442"}</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="commerce-modal-foot">
              <button className="btn btn-outline" onClick={closeModal} disabled={saving}>
                {"\u041e\u0442\u043c\u0435\u043d\u0430"}
              </button>
              <button className="btn btn-primary" onClick={() => void saveForm()} disabled={saving}>
                {saving ? "\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435\u2026" : "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.kind === "ok" ? "toast-ok" : "toast-err"}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
