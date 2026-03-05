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

function fmtDateTime(value: any) {
  if (!value) return "\u2014";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    const s = String(value);
    return s.length >= 16 ? s.slice(0, 16).replace("T", " ") : s;
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
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

  has_original: boolean;
  original_received_at: string | null;
  original_received_by: string | null;

  cargo_type: string;
  note: string;

  volume_per_vehicle: string;
  trailer_required: boolean;

  rate_value: string;
  rate_unit: string;
  transport_kind: string;

  period_from: string;
  period_to: string;
  total_tonnage: string;
  planned_hired_vehicles_per_day: string;
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

    has_original: false,
    original_received_at: null,
    original_received_by: null,

    period_from: "",
    period_to: "",
    total_tonnage: "",
    planned_hired_vehicles_per_day: "",
  };
}

function formFromRow(r: AnyRow): FormState {
  const preferred = String(pick(r, ["preferred_transport_type"], "")).trim();
  const hasOriginal = Boolean(pick(r, ["has_original"], false));
  const origAt = pick(r, ["original_received_at"], null);
  const origBy = pick(r, ["original_received_by"], null);

return {
    id: String(r.id),

    load_date: String(pick(r, ["load_date"], "")),
    order_number: String(pick(r, ["order_number"], "")),
    client_name: String(pick(r, ["client_name"], "")),

    load_point: String(pick(r, ["load_point"], "")),
    unload_point: String(pick(r, ["unload_point"], "")),

    km: String(pick(r, ["km"], "0")),
    preferred_transport_type: preferred,
    vehicles_required: String(pick(r, ["vehicles_required"], "1")),

    cargo_type: String(pick(r, ["cargo_type"], "")),
    note: String(pick(r, ["note"], "")),

    volume_per_vehicle: String(pick(r, ["volume_per_vehicle"], "0")),
    trailer_required: Boolean(pick(r, ["trailer_required"], true)),

    has_original: hasOriginal,
    original_received_at: origAt ? String(origAt) : null,
    original_received_by: origBy ? String(origBy) : null,

    rate_value: String(pick(r, ["rate_value"], "")),
    rate_unit: String(pick(r, ["rate_unit"], "")),
    transport_kind: String(pick(r, ["transport_kind","cargo_type"], "")),

    period_from: String(pick(r, ["period_from"], "")),
    period_to: String(pick(r, ["period_to"], "")),
    total_tonnage: String(pick(r, ["total_tonnage"], "")),
    planned_hired_vehicles_per_day: String(pick(r, ["planned_hired_vehicles_per_day"], "")),
  };
}

type PeriodMode = "day" | "week" | "month";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // понедельник
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function inRange(dateValue: any, from: Date, to: Date) {
  if (!dateValue) return false;
  const s = String(dateValue);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() >= from.getTime() && d.getTime() <= to.getTime();
}

type ShipmentRow = {
  id: string;
  order_id: string;
  shipment_date: string;
  shipment_type: "own" | "hired";
  payload_tons: number;
  note: string | null;
};

function computeVolumeTotal(volumePerVehicle: string, vehiclesRequired: string) {
  const v = toNumberOrNull(volumePerVehicle) ?? 0;
  const c = toNumberOrNull(vehiclesRequired) ?? 0;
  return v * c;
}

function displayTransportTypes(r: AnyRow) {
  const legacy = String(pick(r, ["preferred_transport_type"], "")).trim();
  return legacy || "—";
}

function tripStatusLabel(code: any) {
  const c = String(code || "");
  if (c === "plan") return "план";
  if (c === "to_loading") return "в пути на погрузку";
  if (c === "loading") return "на погрузке";
  if (c === "to_unloading") return "в пути на выгрузку";
  if (c === "unloading") return "на выгрузке";
  if (c === "done") return "завершён";
  if (c === "canceled") return "отменён";
  return c || "—";
}

export default function CommercePage() {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");

  const [selected, setSelected] = useState<AnyRow | null>(null);
  const selectedId = useMemo(() => (selected ? String(selected.id) : ""), [selected]);
  const [viewMode, setViewMode] = useState<"active" | "archive">("active");
  const [expandedId, setExpandedId] = useState<string>("");
  const [assignedByOrder, setAssignedByOrder] = useState<Record<string, number>>({});

  const [toast, setToast] = useState<Toast>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [filterLoadDate, setFilterLoadDate] = useState<string>("");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("day");
  const [filterTransportKind, setFilterTransportKind] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [expandedPanelId, setExpandedPanelId] = useState<string>("");
  const [panelTab, setPanelTab] = useState<"details" | "trips" | "shipments">("details");


  const [defaultPayloadTons, setDefaultPayloadTons] = useState<number>(30);

  const [trips, setTrips] = useState<AnyRow[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);

  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  const [shipmentDraft, setShipmentDraft] = useState<{
    shipment_date: string;
    shipment_type: "own" | "hired";
    payload_tons: string;
    note: string;
  }>(() => {
    const today = new Date();
    const yyyy = String(today.getFullYear());
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return { shipment_date: `${yyyy}-${mm}-${dd}`, shipment_type: "own", payload_tons: "30", note: "" };
  });

  useEffect(() => {
    void loadOrders();
    void loadSettings();
    void (async () => {
      const { data, error } = await supabase.auth.getUser();
      setUserId(error ? null : data.user?.id ?? null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSettings() {
    const { data, error } = await supabase.from("settings_singleton_view").select("default_payload_tons").limit(1);
    if (error) {
      console.error("settings load error:", error);
      return;
    }
    const v = Number((data as any[] | null)?.[0]?.default_payload_tons);
    if (!Number.isNaN(v) && v > 0) setDefaultPayloadTons(v);
  }

  function showToast(kind: "ok" | "err", text: string) {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 2400);
  }

  async function loadAssignedCounts(orderIds: string[]) {
    if (!orderIds || orderIds.length === 0) {
      setAssignedByOrder({});
      return;
    }

    // Берём активные рейсы (вью) и считаем, сколько рейсов на каждую заявку.
    const { data, error } = await supabase.from("logistics_active_view").select("order_id");

    if (error) {
      console.error("assigned counts error:", error);
      // Не блокируем страницу, просто обнуляем счётчики.
      setAssignedByOrder({});
      return;
    }

    const map: Record<string, number> = {};
    (data as any[] | null)?.forEach((r) => {
      const oid = r?.order_id ? String(r.order_id) : "";
      if (!oid) return;
      map[oid] = (map[oid] || 0) + 1;
    });

    setAssignedByOrder(map);
  }

  async function loadOrders() {
    setLoading(true);

    setLoadError("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const list = data as AnyRow[];
      setRows(list);

      // Счётчики назначенных машин (активные рейсы) по заявкам.
      void loadAssignedCounts(list.map((x) => String(x.id)));

      if (selected?.id) {
        const found = list.find((x) => String(x.id) === String(selected.id));
        setSelected(found ?? null);
      }
    } else {
      setRows([]);
      void loadAssignedCounts([]);
      console.error("orders load error:", error);
      setLoadError(String((error as any)?.message ?? (error as any)?.details ?? error));
      showToast("err", "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0438");
    }

    setLoading(false);
  }

  const visibleRows = useMemo(() => {
    let list = rows;
    // Режим: активные / архив
    list = list.filter((r) => {
      const archived = Boolean(pick(r, ["is_archived"], false));
      return viewMode === "archive" ? archived : !archived;
    });
    if (filterLoadDate) {
      const base = new Date(filterLoadDate);
      if (!Number.isNaN(base.getTime())) {
        let from = base;
        let to = endOfDay(base);

        if (periodMode === "week") {
          from = startOfWeek(base);
          to = endOfDay(addDays(from, 6));
        } else if (periodMode === "month") {
          from = startOfMonth(base);
          const nextMonth = new Date(from.getFullYear(), from.getMonth() + 1, 1);
          to = endOfDay(addDays(nextMonth, -1));
        }

        list = list.filter((r) => inRange(pick(r, ["load_date"], null), from, to));
      }
    }
    if (filterTransportKind) {
      list = list.filter((r) => String(pick(r, ["transport_kind"], "")) === filterTransportKind);
    }

    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const orderNumber = String(pick(r, ["order_number"], "")).toLowerCase();
        const client = String(pick(r, ["client_name"], "")).toLowerCase();
        const loadPoint = String(pick(r, ["load_point"], "")).toLowerCase();
        const unloadPoint = String(pick(r, ["unload_point"], "")).toLowerCase();
        return orderNumber.includes(q) || client.includes(q) || loadPoint.includes(q) || unloadPoint.includes(q);
      });
    }

    return list;
  }, [rows, filterLoadDate, filterTransportKind, periodMode, searchText, viewMode]);

  const kpi = useMemo(() => {
    let totalRequired = 0;
    let totalAssigned = 0;
    let totalUnassigned = 0;
    let overloadOrders = 0;

    visibleRows.forEach((r) => {
      const oid = String(r.id);
      const required = Number(pick(r, ["vehicles_required"], 0)) || 0;
      const assigned = Number(assignedByOrder[oid] || 0) || 0;

      totalRequired += required;
      totalAssigned += assigned;

      const unassigned = Math.max(required - assigned, 0);
      totalUnassigned += unassigned;

      if (required > 0 && assigned > required) overloadOrders += 1;
    });

    return {
      ordersCount: visibleRows.length,
      totalRequired,
      totalAssigned,
      totalUnassigned,
      overloadOrders,
    };
  }, [visibleRows, assignedByOrder]);


  useEffect(() => {
    if (!selected?.id) {
      setShipments([]);
      setTrips([]);
      return;
    }
    void loadShipments(String(selected.id));
    void loadTrips(String(selected.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function loadTrips(orderId: string) {
    setTripsLoading(true);
    const { data, error } = await supabase
      .from("logistics")
      .select(
        "id, created_at, trip_status, planned_unload_at, to_loading_at, loading_at, to_unloading_at, unloading_at, done_at, vehicle_id, driver_id, trailer_id, vehicle:vehicles(brand,vehicle_code), driver:drivers(full_name), trailer:trailers(brand,vehicle_code)"
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("trips load error:", error);
      setTrips([]);
      showToast("err", "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0440\u0435\u0439\u0441\u044b");
    } else {
      setTrips((data as any[] | null) ?? []);
    }
    setTripsLoading(false);
  }

  async function loadShipments(orderId: string) {
    setShipmentsLoading(true);
    const { data, error } = await supabase
      .from("order_shipments")
      .select("id, order_id, shipment_date, shipment_type, payload_tons, note")
      .eq("order_id", orderId)
      .order("shipment_date", { ascending: false });

    if (error) {
      console.error("shipments load error:", error);
      setShipments([]);
      showToast("err", "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043e\u0442\u0433\u0440\u0443\u0437\u043a\u0438");
    } else {
      setShipments((data as any as ShipmentRow[]) ?? []);
    }
    setShipmentsLoading(false);
  }

  async function addShipmentForSelected() {
    if (!selected?.id) {
      showToast("err", "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u044b\u0431\u0435\u0440\u0438 \u0437\u0430\u044f\u0432\u043a\u0443 \u0432 \u0442\u0430\u0431\u043b\u0438\u0446\u0435");
      return;
    }

    const d = shipmentDraft.shipment_date.trim();
    if (!d) {
      showToast("err", "\u041d\u0443\u0436\u043d\u0430 \u0434\u0430\u0442\u0430 \u043e\u0442\u0433\u0440\u0443\u0437\u043a\u0438");
      return;
    }
    const tons = toNumberOrNull(shipmentDraft.payload_tons);
    if (tons === null || tons <= 0) {
      showToast("err", "\u0422\u043e\u043d\u043d\u0430\u0436 \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0447\u0438\u0441\u043b\u043e\u043c \u003e 0");
      return;
    }

    const { data: { user } }  = await supabase.auth.getUser();
const userId = user?.id ?? null;

    const payload: AnyRow = {
      order_id: selected.id,
      shipment_date: d,
      shipment_type: shipmentDraft.shipment_type,
      payload_tons: tons,
      note: shipmentDraft.note.trim() === "" ? null : shipmentDraft.note.trim(),
      created_by: userId,
    };

    const { error } = await supabase.from("order_shipments").insert(payload);
    if (error) {
      console.error("shipments insert error:", error);
      showToast("err", `\u041d\u0435 \u0441\u043c\u043e\u0433 \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043e\u0442\u0433\u0440\u0443\u0437\u043a\u0443: ${error.message}`);
      return;
    }

    showToast("ok", "\u041e\u0442\u0433\u0440\u0443\u0437\u043a\u0430 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430");
    await loadShipments(String(selected.id));
    await loadOrders();
  }

  async function deleteShipment(id: string) {
    if (!selected?.id) return;
    const { error } = await supabase.from("order_shipments").delete().eq("id", id);
    if (error) {
      console.error("shipments delete error:", error);
      showToast("err", `\u041d\u0435 \u0441\u043c\u043e\u0433 \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043e\u0442\u0433\u0440\u0443\u0437\u043a\u0443: ${error.message}`);
      return;
    }
    showToast("ok", "\u041e\u0442\u0433\u0440\u0443\u0437\u043a\u0430 \u0443\u0434\u0430\u043b\u0435\u043d\u0430");
    await loadShipments(String(selected.id));
    await loadOrders();
  }

  async function toggleOriginalInline(orderId: string, nextValue: boolean) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id ? String(user.id) : null;

      if (nextValue && !userId) {
        showToast("err", "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f. \u041e\u0442\u043c\u0435\u0442\u043a\u0430 \u00ab\u041e\u0440\u0438\u0433\u0438\u043d\u0430\u043b: \u0414\u0430\u00bb \u043d\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u0441\u044f.");
        return;
      }

      const payload: any = nextValue
        ? {
            has_original: true,
            original_received_at: new Date().toISOString(),
            original_received_by: userId,
          }
        : {
            has_original: false,
            original_received_at: null,
            original_received_by: null,
          };

      const { error } = await supabase.from("orders").update(payload).eq("id", orderId);
      if (error) throw error;

      showToast("ok", "\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e");
      await loadOrders();

      if (selectedId === String(orderId)) {
        const updated = rows.find((x) => String(x.id) === String(orderId));
        if (updated) setSelected(updated);
      }
    } catch (e: any) {
      console.error("toggleOriginalInline error:", e);
      showToast("err", e?.message || "\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f");
    }
  }


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
    const required: Array<[string, string]> = [
      ["load_date", form.load_date],
      ["order_number", form.order_number],
      ["load_point", form.load_point],
      ["unload_point", form.unload_point],
    ];

    for (const [k, v] of required) {
      if (!String(v || "").trim()) {
        showToast("err", `\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u043f\u043e\u043b\u0435: ${k}`);
        return;
      }
    }

    const numOrNull = (v: any): number | null => {
      const s = String(v ?? "").trim();
      if (!s) return null;
      const n = Number(s.replace(",", "."));
      return Number.isFinite(n) ? n : null;
    };

    const intOrNull = (v: any): number | null => {
      const n = numOrNull(v);
      if (n === null) return null;
      return Math.trunc(n);
    };

        setSaving(true);

        try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userId = user?.id ? String(user.id) : null;

      // если нет пользователя, но ставим "Оригинал: Да" — пробуем взять админа из user_roles
      let effectiveUserId: string | null = userId;

      if (form.has_original && !effectiveUserId) {
        const { data: adminRow, error: adminErr } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role_code", "admin")
          .limit(1)
          .maybeSingle();

        if (!adminErr && adminRow?.user_id) {
          effectiveUserId = String(adminRow.user_id);
        }
      }

      if (form.has_original && !effectiveUserId) {
        showToast(
          "err",
          "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f. \u041e\u0442\u043c\u0435\u0442\u043a\u0430 \u00ab\u041e\u0440\u0438\u0433\u0438\u043d\u0430\u043b: \u0414\u0430\u00bb \u043d\u0435\u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u0441\u044f."
        );
        setSaving(false);
        return;
      }
  async function toggleOriginalInline(orderId: string, checked: boolean) {
    // Включение "Оригинал" требует пользователя (original_received_by)
    let userId: string | null = null;

    if (checked) {
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id ? String(data.user.id) : null;

      if (!userId) {
        showToast("err", "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f. \u041e\u0442\u043c\u0435\u0442\u043a\u0430 \u00ab\u041e\u0440\u0438\u0433\u0438\u043d\u0430\u043b\u00bb \u043d\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u0441\u044f.");
        return;
      }
    }

    const patch: AnyRow = checked
      ? { has_original: true, original_received_at: new Date().toISOString(), original_received_by: userId }
      : { has_original: false, original_received_at: null, original_received_by: null };

    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    if (error) {
      console.error("toggleOriginalInline error:", error);
      showToast("err", `\u041e\u0448\u0438\u0431\u043a\u0430: ${error.message}`);
      return;
    }

    // локально обновим строку, чтобы UI сразу отразился
    setRows((prev) =>
      prev.map((r) => (String(r.id) === String(orderId) ? { ...r, ...patch } : r))
    );
  }
      const payload: any = {
        load_date: form.load_date,
        order_number: String(form.order_number || "").trim(),
        client_name: String(form.client_name || "").trim() || null,

        load_point: String(form.load_point || "").trim(),
        unload_point: String(form.unload_point || "").trim(),

        km: numOrNull(form.km) ?? 0,
        vehicles_required: intOrNull(form.vehicles_required) ?? 1,

        preferred_transport_type: String(form.preferred_transport_type || "").trim() || null,

        cargo_type: String(form.cargo_type || "").trim() || null,
        note: String(form.note || "").trim() || null,

        volume_per_vehicle: numOrNull(form.volume_per_vehicle),
        trailer_required: Boolean(form.trailer_required),

        rate_value: numOrNull(form.rate_value),
        rate_unit: String(form.rate_unit || "").trim() || null,
        transport_kind: String(form.transport_kind || "").trim() || null,

        has_original: Boolean(form.has_original),
        original_received_at: form.has_original ? (form.original_received_at || new Date().toISOString()) : null,
        original_received_by: form.has_original ? effectiveUserId! : null,

        period_from: form.period_from ? form.period_from : null,
        period_to: form.period_to ? form.period_to : null,
        total_tonnage: numOrNull(form.total_tonnage),
        planned_hired_vehicles_per_day: intOrNull(form.planned_hired_vehicles_per_day),
      };

      // if period fields are partially set, normalize
      if (!payload.period_from && !payload.period_to) {
        payload.period_from = null;
        payload.period_to = null;
        payload.total_tonnage = payload.total_tonnage ?? null;
      }

      // Ensure original consistency
      if (!payload.has_original) {
        payload.original_received_at = null;
        payload.original_received_by = null;
      } else {
        if (!payload.original_received_at) payload.original_received_at = new Date().toISOString();
        if (!payload.original_received_by) payload.original_received_by = effectiveUserId;
      }

      let res;
      if (modalMode === "create") {
        res = await supabase.from("orders").insert(payload).select("*").single();
      } else {
        if (!form.id) throw new Error("missing id");
        res = await supabase.from("orders").update(payload).eq("id", form.id).select("*").single();
      }

      if (res.error) throw res.error;

      closeModal();
      showToast("ok", "\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e");
      await loadOrders();
    } catch (e: any) {
      showToast("err", e?.message || "\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f");
    } finally {
      setSaving(false);
    }
  }

  function requireSelected(action: () => void) {
    if (!selected) {
      showToast("err", "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u044b\u0431\u0435\u0440\u0438 \u0437\u0430\u044f\u0432\u043a\u0443 \u0432 \u0442\u0430\u0431\u043b\u0438\u0446\u0435");
      return;
    }
    action();
  }


  async function setArchiveForSelected(nextArchived: boolean) {
    if (!selected?.id) {
      showToast("err", "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u044b\u0431\u0435\u0440\u0438 \u0437\u0430\u044f\u0432\u043a\u0443 \u0432 \u0442\u0430\u0431\u043b\u0438\u0446\u0435");
      return;
    }

    // getSession() works from local storage and is more reliable than getUser() for client actions
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id ? String(session.user.id) : null;

    const patch: AnyRow = {
      is_archived: nextArchived,
      archived_at: nextArchived ? new Date().toISOString() : null,
      archived_by: nextArchived ? userId : null,
    };

    const { error } = await supabase.from("orders").update(patch).eq("id", selected.id);

    if (error) {
      console.error("orders archive update error:", error);
      showToast("err", `\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0430\u0440\u0445\u0438\u0432: ${error.message}`);
      return;
    }

    setSelected((prev: any) => (prev ? { ...prev, is_archived: nextArchived } : prev));
    await loadOrders();
    showToast("ok", nextArchived ? "\u0412 \u0430\u0440\u0445\u0438\u0432" : "\u0418\u0437 \u0430\u0440\u0445\u0438\u0432\u0430");
  }


  return (
    <div className="page-wrapper commerce-page">
      <div className="commerce-header">
        <div className="commerce-header-left">
          <h1 className="commerce-title">{"\u041a\u043e\u043c\u043c\u0435\u0440\u0446\u0438\u044f"}</h1>

          <div className="commerce-filter">
            <span className="commerce-filter-label">{"\u0420\u0435\u0436\u0438\u043c:"}</span>
            <div className="commerce-segment">
              <button
                className={viewMode === "active" ? "btn btn-outline btn-active" : "btn btn-ghost"}
                onClick={() => setViewMode("active")}
              >
                {"\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435"}
              </button>
              <button
                className={viewMode === "archive" ? "btn btn-outline btn-active" : "btn btn-ghost"}
                onClick={() => setViewMode("archive")}
              >
                {"\u0410\u0440\u0445\u0438\u0432"}
              </button>
            </div>
            <span className="commerce-filter-label">{"\u0414\u0430\u0442\u0430 \u043f\u043e\u0433\u0440\u0443\u0437\u043a\u0438:"}</span>
            <input
              className="commerce-filter-input"
              type="date"
              value={filterLoadDate}
              onChange={(e) => setFilterLoadDate(e.target.value)}
            />

            <span className="commerce-filter-label">{"\u041f\u0435\u0440\u0438\u043e\u0434:"}</span>
            <select
              className="commerce-filter-input commerce-filter-select"
              value={periodMode}
              onChange={(e) => setPeriodMode((e.target.value as PeriodMode) || "day")}
            >
              <option value={"day"}>{"\u0414\u0435\u043d\u044c"}</option>
              <option value={"week"}>{"\u041d\u0435\u0434\u0435\u043b\u044f"}</option>
              <option value={"month"}>{"\u041c\u0435\u0441\u044f\u0446"}</option>
            </select>

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

            <span className="commerce-filter-label">{"\u041f\u043e\u0438\u0441\u043a:"}</span>
            <input
              className="commerce-filter-input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={"\u041d\u043e\u043c\u0435\u0440, \u043a\u043b\u0438\u0435\u043d\u0442, \u043f\u0443\u043d\u043a\u0442"}
            />

            <button
              className="btn btn-ghost"
              onClick={() => {
                setFilterLoadDate("");
                setFilterTransportKind("");
                setSearchText("");
                setPeriodMode("day");
              }}
              disabled={!filterLoadDate && !filterTransportKind && !searchText && periodMode === "day"}
              title={"\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u0444\u0438\u043b\u044c\u0442\u0440\u044b"}
            >
              {"\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c"}
            </button>

            {loadError && (
              <div className="commerce-load-error">
                {loadError}
              </div>
            )}

          </div>
          <div className="commerce-kpi">
            <div className="commerce-kpi-item">
              <div className="commerce-kpi-label">{"\u0417\u0430\u044f\u0432\u043e\u043a"}</div>
              <div className="commerce-kpi-value"><span className="status-badge status-info">{kpi.ordersCount}</span></div>
            </div>
            <div className="commerce-kpi-item">
              <div className="commerce-kpi-label">{"\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u043c\u0430\u0448\u0438\u043d"}</div>
              <div className="commerce-kpi-value"><span className="status-badge status-info">{kpi.totalRequired}</span></div>
            </div>
            <div className="commerce-kpi-item">
              <div className="commerce-kpi-label">{"\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043e"}</div>
              <div className="commerce-kpi-value"><span className="status-badge status-success">{kpi.totalAssigned}</span></div>
            </div>
            <div className="commerce-kpi-item">
              <div className="commerce-kpi-label">{"\u041d\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043e"}</div>
              <div className="commerce-kpi-value">{kpi.totalUnassigned > 0 ? (<span className="status-badge status-warning">{kpi.totalUnassigned}</span>) : (<span className="status-badge status-success">{"0"}</span>)}</div>
            </div>
            <div className="commerce-kpi-item">
              <div className="commerce-kpi-label">{"\u041f\u0435\u0440\u0435\u043b\u0438\u043c\u0438\u0442"}</div>
              <div className="commerce-kpi-value">{kpi.overloadOrders > 0 ? (<span className="status-badge status-warning">{kpi.overloadOrders}</span>) : (<span className="status-badge status-success">{"0"}</span>)}</div>
            </div>
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
                  <col style={{ width: 44 }} />
                  <col style={{ width: 44 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 180 }} />
                  <col style={{ width: 200 }} />
                  <col style={{ width: 200 }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 90 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>{""}</th>
                    <th>{""}</th>
                    <th>{"\u0414\u0430\u0442\u0430 \u043f\u043e\u0433\u0440\u0443\u0437\u043a\u0438"}</th>
                    <th>{"\u041d\u043e\u043c\u0435\u0440 \u0437\u0430\u044f\u0432\u043a\u0438"}</th>
                    <th>{"\u041a\u043b\u0438\u0435\u043d\u0442"}</th>
                    <th>{"\u041f\u043e\u0433\u0440\u0443\u0437\u043a\u0430"}</th>
                    <th>{"\u0412\u044b\u0433\u0440\u0443\u0437\u043a\u0430"}</th>
                    <th>{"\u0422\u0438\u043f \u0422\u0421"}</th>
                    <th>{"\u0421\u0442\u0430\u0432\u043a\u0430"}</th>
                    <th>{"\u041e\u0440\u0438\u0433\u0438\u043d\u0430\u043b"}</th>
                    <th>{"\u041f\u0440\u0438\u0446\u0435\u043f"}</th>
                  </tr>
                </thead>
<tbody>
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ opacity: 0.7 }}>
                        {(filterLoadDate || filterTransportKind || searchText.trim() !== "")
                          ? "\u041d\u0435\u0442 \u0437\u0430\u044f\u0432\u043e\u043a \u043f\u043e \u0444\u0438\u043b\u044c\u0442\u0440\u0443"
                          : "\u0417\u0430\u044f\u0432\u043e\u043a \u043d\u0435\u0442"}
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
                      const transportType = displayTransportTypes(r);
                      const vehiclesRequired = pick(r, ["vehicles_required"], 1);
                      const rate = pick(r, ["rate_value"], null);
                      const trailerRequired = Boolean(pick(r, ["trailer_required"], false));
                      const hasOriginal = Boolean(pick(r, ["has_original"], false));

                      const isActive = selectedId && String(r.id) === selectedId;

                      const oid = String(r.id);
                      const requiredNum = Number(vehiclesRequired || 0) || 0;
                      const assignedNum = Number(assignedByOrder[oid] || 0) || 0;
                      const unassignedNum = Math.max(requiredNum - assignedNum, 0);

                      const isExpanded = expandedId && oid === expandedId;

                      return (
                        <>
                          <tr
                            key={oid}
                            onClick={() => setSelected(r)}
                            className={isActive ? "row-active" : ""}
                            style={{ cursor: "pointer" }}
                          >
                            <td>
                              <button
                                className="btn btn-ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelected(r);
                                  setExpandedId((p) => (p === oid ? "" : oid));
                                }}
                                title={isExpanded ? "\u0421\u0432\u0435\u0440\u043d\u0443\u0442\u044c" : "\u041f\u043e\u0434\u0440\u043e\u0431\u043d\u0435\u0435"}
                                style={{ padding: "2px 8px", fontSize: 12 }}
                              >
                                {isExpanded ? "\u25b2" : "\u25bc"}
                              </button>
                            </td>

                            <td>
                              <button
                                className="btn btn-ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelected(r);
                                  setExpandedPanelId((p) => {
                                    const next = p === oid ? "" : oid;
                                    if (next) {
                                      setPanelTab("details");
                                      void loadTrips(oid);
                                      void loadShipments(oid);
                                    }
                                    return next;
                                  });
                                }}
                                title={expandedPanelId === oid ? "\u0421\u0432\u0435\u0440\u043d\u0443\u0442\u044c" : "\u0414\u0435\u0442\u0430\u043b\u0438 / \u0440\u0435\u0439\u0441\u044b / \u043e\u0442\u0433\u0440\u0443\u0437\u043a\u043a\u0438"}
                                style={{ padding: "2px 8px", fontSize: 12 }}
                              >
                                {expandedPanelId === oid ? "\u25c0" : "\u25b6"}
                              </button>
                            </td>

                            <td title={fmtDate(loadDate)}>{fmtDate(loadDate)}</td>
                            <td title={orderNumber ? String(orderNumber) : "\u2014"}>{orderNumber ? String(orderNumber) : "\u2014"}</td>
                            <td title={String(client)}>{String(client)}</td>
                            <td title={String(loadPoint)}>{String(loadPoint)}</td>
                            <td title={String(unloadPoint)}>{String(unloadPoint)}</td>
                            <td title={transportType}>
                              <span style={{ fontSize: 12, opacity: 0.95 }}>{transportType}</span>
                            </td>
                            <td>{rate ? fmtNum(rate) : "\u2014"}</td>
                            <td>
                              <label className="commerce-inline-check" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={hasOriginal}
                                  onChange={(e) => {
                                    void toggleOriginalInline(oid, e.target.checked);
                                  }}
                                />
                                {hasOriginal ? (
                                  <span className="status-badge status-success">{"\u0414\u0430"}</span>
                                ) : (
                                  <span className="status-badge status-warning">{"\u041d\u0435\u0442"}</span>
                                )}
                              </label>
                            </td>
                            <td>
                              {trailerRequired ? (
                                <span className="status-badge status-success">{"\u0414\u0430"}</span>
                              ) : (
                                <span className="status-badge status-warning">{"\u041d\u0435\u0442"}</span>
                              )}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr key={`${oid}-left`} className="commerce-details-row">
                              <td colSpan={11} style={{ padding: 12, background: "rgba(255,255,255,0.02)" }}>
                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    <span className="status-badge status-info">
                                      {"\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f: "} {requiredNum}
                                    </span>
                                    <span className="status-badge status-success">
                                      {"\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043e: "} {assignedNum}
                                    </span>
                                    <span className={unassignedNum > 0 ? "status-badge status-warning" : "status-badge status-success"}>
                                      {"\u041d\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043e: "} {unassignedNum}
                                    </span>
                                  </div>

                                  <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    <button className="btn btn-outline" onClick={() => { setSelected(r); openEditFromSelected(); }}>
                                      {"\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c"}
                                    </button>

                                    <button
                                      className="btn btn-outline"
                                      onClick={() => showToast("err", "\u041c\u0430\u0440\u0448\u0440\u0443\u0442: \u0434\u043e\u0431\u0430\u0432\u0438\u043c \u043f\u043e\u0437\u0436\u0435 (\u042f\u043d\u0434\u0435\u043a\u0441)")}
                                    >
                                      {"\u041c\u0430\u0440\u0448\u0440\u0443\u0442"}
                                    </button>

                                    <button
                                      className="btn btn-outline"
                                      onClick={() => showToast("err", "\u041a\u0430\u043b\u044c\u043a\u0443\u043b\u044f\u0442\u043e\u0440: \u0434\u043e\u0431\u0430\u0432\u0438\u043c \u043f\u043e\u0437\u0436\u0435")}
                                    >
                                      {"\u041a\u0430\u043b\u044c\u043a\u0443\u043b\u044f\u0442\u043e\u0440"}
                                    </button>

                                    <button
                                      className="btn btn-outline"
                                      onClick={() => {
                                        setSelected(r);
                                        const archived = Boolean(pick(r, ["is_archived"], false));
                                        void setArchiveForSelected(!archived);
                                      }}
                                    >
                                      {Boolean(pick(r, ["is_archived"], false))
                                        ? "\u0412\u0435\u0440\u043d\u0443\u0442\u044c \u0438\u0437 \u0430\u0440\u0445\u0438\u0432\u0430"
                                        : "\u0412 \u0430\u0440\u0445\u0438\u0432"}
                                    </button>

                                    <button
                                      className="btn btn-outline"
                                      onClick={() => {
                                        setSelected(r);
                                        setExpandedPanelId(oid);
                                        setPanelTab("trips");
                                        void loadTrips(oid);
                                      }}
                                      disabled={tripsLoading}
                                    >
                                      {"\u0420\u0435\u0439\u0441\u044b"}
                                    </button>

                                    <button
                                      className="btn btn-outline"
                                      onClick={() => {
                                        setSelected(r);
                                        setExpandedPanelId(oid);
                                        setPanelTab("shipments");
                                        void loadShipments(oid);
                                      }}
                                      disabled={shipmentsLoading}
                                    >
                                      {"\u041e\u0442\u0433\u0440\u0443\u0437\u043a\u0438"}
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}

                          {expandedPanelId === oid && (
                            <tr key={`${oid}-right`} className="commerce-details-row">
                              <td colSpan={11} style={{ padding: 12, background: "rgba(255,255,255,0.015)" }}>
                                <div className="commerce-panel-tabs">
                                  <button
                                    className={panelTab === "details" ? "btn btn-primary" : "btn btn-outline"}
                                    onClick={() => setPanelTab("details")}
                                  >
                                    {"\u0414\u0435\u0442\u0430\u043b\u0438"}
                                  </button>
                                  <button
                                    className={panelTab === "trips" ? "btn btn-primary" : "btn btn-outline"}
                                    onClick={() => {
                                      setPanelTab("trips");
                                      void loadTrips(oid);
                                    }}
                                  >
                                    {"\u0420\u0435\u0439\u0441\u044b"}
                                  </button>
                                  <button
                                    className={panelTab === "shipments" ? "btn btn-primary" : "btn btn-outline"}
                                    onClick={() => {
                                      setPanelTab("shipments");
                                      void loadShipments(oid);
                                    }}
                                  >
                                    {"\u041e\u0442\u0433\u0440\u0443\u0437\u043a\u043a\u0438"}
                                  </button>
                                </div>

                                {panelTab === "details" && (
                                  <div className="commerce-panel-details">
                                    <div className="commerce-panel-kv">
                                      <div className="commerce-panel-k">{ "\u041a\u043b\u0438\u0435\u043d\u0442" }</div>
                                      <div className="commerce-panel-v">{String(client)}</div>
                                    </div>
                                    <div className="commerce-panel-kv">
                                      <div className="commerce-panel-k">{ "\u041f\u043e\u0433\u0440\u0443\u0437\u043a\u0430" }</div>
                                      <div className="commerce-panel-v">{String(loadPoint)}</div>
                                    </div>
                                    <div className="commerce-panel-kv">
                                      <div className="commerce-panel-k">{ "\u0412\u044b\u0433\u0440\u0443\u0437\u043a\u0430" }</div>
                                      <div className="commerce-panel-v">{String(unloadPoint)}</div>
                                    </div>
                                    <div className="commerce-panel-kv">
                                      <div className="commerce-panel-k">{ "\u041a\u043c" }</div>
                                      <div className="commerce-panel-v">{fmtNum(km)}</div>
                                    </div>
                                    <div className="commerce-panel-kv">
                                      <div className="commerce-panel-k">{ "\u0421\u0442\u0430\u0432\u043a\u0430" }</div>
                                      <div className="commerce-panel-v">{fmtNum(rate)} {rateUnitLabel(pick(r, ["rate_unit"], ""))}</div>
                                    </div>
                                    <div className="commerce-panel-kv">
                                      <div className="commerce-panel-k">{ "\u041f\u0435\u0440\u0438\u043e\u0434" }</div>
                                      <div className="commerce-panel-v">
                                        {pick(r, ["period_from"], null) || pick(r, ["period_to"], null)
                                          ? `${fmtDate(pick(r, ["period_from"], null))} — ${fmtDate(pick(r, ["period_to"], null))}`
                                          : "\u2014"}
                                      </div>
                                    </div>
                                    <div className="commerce-panel-kv">
                                      <div className="commerce-panel-k">{ "\u041f\u0440\u0438\u043c\u0435\u0447\u0430\u043d\u0438\u0435" }</div>
                                      <div className="commerce-panel-v" style={{ opacity: 0.9 }}>{String(pick(r, ["note"], "\u2014"))}</div>
                                    </div>
                                  </div>
                                )}

                                {panelTab === "trips" && (
                                  <div>
                                    {tripsLoading ? (
                                      <div style={{ opacity: 0.75 }}>{"\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0440\u0435\u0439\u0441\u043e\u0432\u2026"}</div>
                                    ) : trips.length === 0 ? (
                                      <div style={{ opacity: 0.75 }}>{"\u0420\u0435\u0439\u0441\u043e\u0432 \u043d\u0435\u0442"}</div>
                                    ) : (
                                      <div className="table-wrapper">
                                        <table className="esl-table esl-table-fixed" style={{ width: "100%" }}>
                                          <thead>
                                            <tr>
                                              <th>{"\u0421\u0442\u0430\u0442\u0443\u0441"}</th>
                                              <th>{"\u041c\u0430\u0448\u0438\u043d\u0430"}</th>
                                              <th>{"\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c"}</th>
                                              <th>{"\u041f\u0440\u0438\u0446\u0435\u043f"}</th>
                                              <th>{"\u041f\u043b\u0430\u043d \u0432\u044b\u0433\u0440"}</th>
                                              <th>{"\u0420\u0435\u0439\u0441"}</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {trips.map((t) => {
                                              const v = (t as any)?.vehicle;
                                              const d = (t as any)?.driver;
                                              const tr = (t as any)?.trailer;
                                              const vText = v ? `${String(v.brand || "")} ${String(v.vehicle_code || "")}`.trim() : String(t.vehicle_id || "\u2014");
                                              const dText = d ? String(d.full_name || "\u2014") : String(t.driver_id || "\u2014");
                                              const trText = tr ? `${String(tr.brand || "")} ${String(tr.vehicle_code || "")}`.trim() : String(t.trailer_id || "\u2014");

                                              return (
                                                <tr key={String(t.id)}>
                                                  <td>
                                                    <span className="status-badge status-info">{tripStatusLabel(t.trip_status)}</span>
                                                  </td>
                                                  <td style={{ opacity: 0.95 }}>{vText || "\u2014"}</td>
                                                  <td style={{ opacity: 0.95 }}>{dText || "\u2014"}</td>
                                                  <td style={{ opacity: 0.95 }}>{trText || "\u2014"}</td>
                                                  <td>{fmtDateTime(t.planned_unload_at)}</td>
                                                  <td style={{ opacity: 0.8 }}>{String(t.id).slice(0, 8)}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {panelTab === "shipments" && (
                                  <div>
                                    <div className="commerce-shipments-add">
                                      <div className="commerce-inline-3">
                                        <label className="field">
                                          <span className="field-label">{"\u0414\u0430\u0442\u0430"}</span>
                                          <input
                                            className="field-input"
                                            type="date"
                                            value={shipmentDraft.shipment_date}
                                            onChange={(e) => setShipmentDraft((p) => ({ ...p, shipment_date: e.target.value }))}
                                          />
                                        </label>
                                        <label className="field">
                                          <span className="field-label">{"\u0422\u0438\u043f"}</span>
                                          <select
                                            className="field-input field-select"
                                            value={shipmentDraft.shipment_type}
                                            onChange={(e) => setShipmentDraft((p) => ({ ...p, shipment_type: (e.target.value as any) || "own" }))}
                                          >
                                            <option value={"own"}>{"\u0421\u0432\u043e\u0438"}</option>
                                            <option value={"hired"}>{"\u041f\u0440\u0438\u0432\u043b\u0435\u0447\u0451\u043d\u043d\u044b\u0435"}</option>
                                          </select>
                                        </label>
                                        <label className="field">
                                          <span className="field-label">{"\u0422\u043e\u043d\u043d\u0430\u0436 (\u0442)"}</span>
                                          <input
                                            className="field-input"
                                            value={shipmentDraft.payload_tons}
                                            onChange={(e) => setShipmentDraft((p) => ({ ...p, payload_tons: e.target.value }))}
                                            placeholder={String(defaultPayloadTons)}
                                          />
                                        </label>
                                      </div>

                                      <label className="field" style={{ marginTop: 10 }}>
                                        <span className="field-label">{"\u041f\u0440\u0438\u043c\u0435\u0447\u0430\u043d\u0438\u0435"}</span>
                                        <input
                                          className="field-input"
                                          value={shipmentDraft.note}
                                          onChange={(e) => setShipmentDraft((p) => ({ ...p, note: e.target.value }))}
                                          placeholder={"\u041e\u043f\u0446\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e"}
                                        />
                                      </label>

                                      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                                        <button className="btn btn-primary" onClick={() => { setSelected(r); void addShipmentForSelected(); }}>
                                          {"\u002b \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043e\u0442\u0433\u0440\u0443\u0437\u043a\u0443"}
                                        </button>
                                        <button
                                          className="btn btn-outline"
                                          onClick={() => { setSelected(r); void loadShipments(oid); }}
                                          disabled={shipmentsLoading}
                                        >
                                          {shipmentsLoading ? "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026" : "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c"}
                                        </button>
                                      </div>
                                    </div>

                                    {shipmentsLoading ? (
                                      <div style={{ marginTop: 10, opacity: 0.8 }}>{"\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043e\u0442\u0433\u0440\u0443\u0437\u043e\u043a\u2026"}</div>
                                    ) : shipments.length > 0 ? (
                                      <div style={{ marginTop: 10 }}>
                                        <table className="esl-table esl-table-fixed" style={{ width: "100%" }}>
                                          <thead>
                                            <tr>
                                              <th>{"\u0414\u0430\u0442\u0430"}</th>
                                              <th>{"\u0422\u0438\u043f"}</th>
                                              <th>{"\u0422\u043e\u043d\u043d\u0430\u0436"}</th>
                                              <th>{"\u041f\u0440\u0438\u043c\u0435\u0447\u0430\u043d\u0438\u0435"}</th>
                                              <th>{"\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435"}</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {shipments.map((s) => (
                                              <tr key={s.id}>
                                                <td>{fmtDate(s.shipment_date)}</td>
                                                <td>
                                                  {s.shipment_type === "own" ? (
                                                    <span className="status-badge status-success">{"\u0421\u0432\u043e\u0438"}</span>
                                                  ) : (
                                                    <span className="status-badge status-warning">{"\u041f\u0440\u0438\u0432\u043b\u0435\u0447\u0451\u043d\u043d\u044b\u0435"}</span>
                                                  )}
                                                </td>
                                                <td>{fmtNum(s.payload_tons)}</td>
                                                <td style={{ opacity: 0.9 }}>{s.note || "\u2014"}</td>
                                                <td>
                                                  <button className="btn btn-ghost" onClick={() => void deleteShipment(s.id)}>
                                                    {"\u0423\u0434\u0430\u043b\u0438\u0442\u044c"}
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div style={{ marginTop: 10, opacity: 0.7 }}>{"\u041e\u0442\u0433\u0440\u0443\u0437\u043e\u043a \u043d\u0435\u0442"}</div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

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

                <div className="field">
                  <div className="field-label">{"\u0422\u0438\u043f \u0442\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442\u0430"}</div>
                  <select
                    className="commerce-filter-input commerce-filter-select"
                    value={form.preferred_transport_type}
                    onChange={(e) => setForm((p) => ({ ...p, preferred_transport_type: e.target.value }))}
                  >
                    <option value="">{"\u2014"}</option>
                    {TRANSPORT_TYPE_OPTIONS.map((x) => (
                      <option key={x} value={x}>{x}</option>
                    ))}
                  </select>
</div>

                <label className="field">
                  <span className="field-label">{"\u0412\u0438\u0434 \u0433\u0440\u0443\u0437\u0430"}</span>
                  <input
                    className="field-input"
                    value={form.cargo_type}
                    onChange={(e) => setForm((p) => ({ ...p, cargo_type: e.target.value }))}
                    placeholder={"\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: \u0437\u0435\u0440\u043d\u043e"}
                  />
                </label>

                <div className="commerce-card-sep" style={{ margin: "12px 0" }} />

                <div className="commerce-inline-2">
                  <label className="field">
                    <span className="field-label">{"\u041f\u0435\u0440\u0438\u043e\u0434 \u0441"}</span>
                    <input
                      className="field-input"
                      type="date"
                      value={form.period_from}
                      onChange={(e) => setForm((p) => ({ ...p, period_from: e.target.value }))}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">{"\u041f\u0435\u0440\u0438\u043e\u0434 \u043f\u043e"}</span>
                    <input
                      className="field-input"
                      type="date"
                      value={form.period_to}
                      onChange={(e) => setForm((p) => ({ ...p, period_to: e.target.value }))}
                    />
                  </label>
                </div>

                <div className="commerce-inline-2">
                  <label className="field">
                    <span className="field-label">{"\u041e\u0431\u0449\u0438\u0439 \u0442\u043e\u043d\u043d\u0430\u0436 (\u0442)"}</span>
                    <input
                      className="field-input"
                      inputMode="decimal"
                      value={form.total_tonnage}
                      onChange={(e) => setForm((p) => ({ ...p, total_tonnage: e.target.value }))}
                      placeholder={"\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: 3000"}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">{"\u041f\u043b\u0430\u043d \u043f\u0440\u0438\u0432\u043b\u0435\u0447\u0451\u043d\u043d\u044b\u0445/\u0434\u0435\u043d\u044c"}</span>
                    <input
                      className="field-input"
                      inputMode="numeric"
                      value={form.planned_hired_vehicles_per_day}
                      onChange={(e) => setForm((p) => ({ ...p, planned_hired_vehicles_per_day: e.target.value }))}
                      placeholder={"0"}
                    />
                  </label>
                </div>

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

                  <label className="field field-checkbox">
                    <span className="field-label">{"\u041e\u0440\u0438\u0433\u0438\u043d\u0430\u043b \u0437\u0430\u044f\u0432\u043a\u0438"}</span>
                    <div className="field-checkbox-row">
                      <input
                        type="checkbox"
                        checked={form.has_original}
                        onChange={(e) => setForm((p) => ({ ...p, has_original: e.target.checked }))}
                      />
                      <span>{form.has_original ? "\u0414\u0430" : "\u041d\u0435\u0442"}</span>
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
