'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Period = 'day' | 'week' | 'month';

type ToastKind = 'success' | 'error' | 'info';
type Toast = { kind: ToastKind; text: string } | null;

type OrderRow = {
  id: string;
  load_date: string | null;
  order_number: string | null;
  client_name: string | null;
  load_point: string | null;
  unload_point: string | null;
  km: number | null;
  cargo_type: string | null;
};

type TripStatus = 'plan' | 'to_loading' | 'loading' | 'to_unloading' | 'unloading' | 'done' | 'canceled';

type TripRow = {
  id: string;
  order_id: string;

  trip_status: TripStatus;

  planned_unload_at: string | null;
  to_loading_at: string | null;
  loading_at: string | null;
  to_unloading_at: string | null;
  unloading_at: string | null;
  done_at: string | null;

  vehicle_id: string | null;
  driver_id: string | null;
  trailer_id: string | null;

  vehicles?: { brand: string | null; vehicle_code: string | null } | null;
  drivers?: { full_name: string | null; phone: string | null } | null;
  trailers?: { vehicle_code: string | null } | null;
};

type DispatcherResource = {
  dispatcher_day_id: string;
  line_id: string;
  vehicle_id: string | null;
  vehicle_brand: string | null;
  vehicle_code: string | null;
  driver_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  trailer_id: string | null;
  trailer_code: string | null;
  resource_status: string;
  vehicle_comment: string | null;
  resource_other_comment: string | null;
};

type RowVM = {
  order_id: string;

  // данные заявки
  load_date: string | null;
  order_number: string | null;
  client_name: string | null;
  load_point: string | null;
  unload_point: string | null;
  km: number | null;
  cargo_type: string | null;

  // данные рейса (могут быть null, если рейса нет)
  trip_id: string | null;
  trip_status: TripStatus | null;

  vehicle_code: string | null;
  vehicle_brand: string | null;
  trailer_code: string | null;
  driver_name: string | null;
  driver_phone: string | null;

  planned_unload_at: string | null;
};
const UI = {
  title: '\u041b\u043e\u0433\u0438\u0441\u0442\u0438\u043a\u0430 \u2014 \u0420\u0435\u0439\u0441\u044b',
  back: '\u2190 \u041d\u0430\u0437\u0430\u0434',
  period_day: '\u0414\u0435\u043d\u044c',
  period_week: '\u041d\u0435\u0434\u0435\u043b\u044f',
  period_month: '\u041c\u0435\u0441\u044f\u0446',
  date: '\u0414\u0430\u0442\u0430',
  search_ph: '\u041f\u043e\u0438\u0441\u043a: \u0437\u0430\u044f\u0432\u043a\u0430 / \u043a\u043b\u0438\u0435\u043d\u0442 / \u043c\u0430\u0448\u0438\u043d\u0430 / \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044c',
  btn_create_trip: '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0440\u0435\u0439\u0441',
  btn_refresh: '\u041e\u0431\u043d\u043e\u0432\u0430438\u0442\u044c',
  th_load_date: '\u0414\u0430\u0442\u0430',
  th_order: '\u0417\u0430\u044f\u0432\u043a\u0430',
  th_client: '\u041a\u043b\u0438\u0435\u043d\u0442',
  th_vehicle: '\u041c\u0430\u0448\u0438\u043d\u0430',
  th_trailer: '\u041f\u0440\u0438\u0446\u0435\u043f',
  th_driver: '\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c',
  th_phone: '\u0422\u0435\u043b\u0435\u0444\u043e\u043d',
  th_status: '\u0421\u0442\u0430\u0442\u0443\u0441',
  th_points: '\u041c\u0430\u0440\u0448\u0440\u0443\u0442',
  th_km: '\u041a\u043c',
  th_cargo: '\u0413\u0440\u0443\u0437',
  th_plan_unload: '\u041f\u043b\u0430\u043d \u0432\u044b\u0433\u0440\u0443\u0437\u043a\u0438',
  th_actions: '\u0414\u0435\u0439\u0441\u0442\u0432\u0430438\u044f',
  act_assign: '\u041d\u0430\u0437\u043d\u0430\u0447\u0438\u0442\u044c',
  act_status: '\u0421\u0442\u0430\u0442\u0443\u0441',
  empty: '\u041d\u0435\u0442 \u0440\u0435\u0439\u0441\u043e\u0432 \u0432 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u043c \u043f\u0435\u0440\u0438\u043e\u0434\u0435.',
  modal_create_title: '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0440\u0435\u0439\u0441 \u0438\u0437 \u0437\u0430\u044f\u0432\u043a\u0438',
  modal_assign_title: '\u041d\u0430\u0437\u043d\u0430\u0447\u0438\u0442\u044c \u0440\u0435\u0441\u0443\u0440\u0441\u044b \u0438\u0437 \u0434\u0438\u0441\u043f\u0435\u0442\u0447\u0435\u0440\u0430',
  modal_close: '\u0417\u0430430\u043a\u0440\u044b\u0442\u044c',
  modal_pick_order: '\u0412\u044b\u0431\u0435\u0440\u0438 \u0437\u0430\u044f\u0432\u043a\u0443',
  modal_pick_resource: '\u0412\u044b\u0431\u0435\u0440\u0438 \u0440\u0435\u0441\u0443\u0440\u0441 \u0434\u0438\u0441\u043f\u0435\u0442\u0447\u0435\u0440\u0430',
  status_plan: '\u0441\u043e\u0437\u0434\u0430\u043d',
  status_to_loading: '\u0432 \u043f\u0443\u0442\u0438 \u043d\u0430 \u043f\u043e\u0433\u0440\u0443\u0437\u043a\u0443',
  status_loading: '\u043d\u0430 \u043f\u043e\u0433\u0440\u0443\u0437\u043a\u0435',
  status_to_unloading: '\u0432 \u043f\u0443\u0442\u0438 \u043d\u0430 \u0432\u044b\u0433\u0440\u0443\u0437\u043a\u0443',
  status_unloading: '\u043d\u0430 \u0432\u044b\u0433\u0440\u0443\u0437\u043a\u0435',
  status_done: '\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d',
  status_canceled: '\u043e\u0442\u043c\u0435\u043d\u0451\u043d',
};

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function startOfWeekISO(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const day = d.getDay(); // 0..6, 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}

function endOfWeekISO(iso: string) {
  const d = new Date(`${startOfWeekISO(iso)}T00:00:00`);
  d.setDate(d.getDate() + 6);
  return toISODate(d);
}

function startOfMonthISO(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(1);
  return toISODate(d);
}

function endOfMonthISO(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return toISODate(d);
}

function fmtDate(iso: string | null) {
  if (!iso) return '';
  // iso might be timestamptz in string; for date we take first 10
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return s;
  return `${d}.${m}.${y}`;
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

function statusLabel(s: TripStatus) {
  switch (s) {
    case 'plan':
      return UI.status_plan;
    case 'to_loading':
      return UI.status_to_loading;
    case 'loading':
      return UI.status_loading;
    case 'to_unloading':
      return UI.status_to_unloading;
    case 'unloading':
      return UI.status_unloading;
    case 'done':
      return UI.status_done;
    case 'canceled':
      return UI.status_canceled;
    default:
      return s;
  }
}

function statusDotColor(s: TripStatus) {
  if (s === 'to_loading' || s === 'loading') return 'rgba(77,163,255,0.95)'; // \u0441\u0438\u043d\u0438\u0439
  if (s === 'to_unloading' || s === 'unloading') return 'rgba(247,209,84,0.95)'; // \u0436\u0451\u043b\u0442\u044b\u0439
  if (s === 'done') return 'rgba(57,211,83,0.95)'; // \u0437\u0435\u043b\u0451\u043d\u044b\u0439
  if (s === 'canceled') return 'rgba(255,107,107,0.95)'; // \u043a\u0440\u0430\u0441\u043d\u044b\u0439
  return 'rgba(154,160,166,0.95)'; // \u0441\u0435\u0440\u044b\u0439
}

function SmallButton({
  text,
  onClick,
  disabled,
}: {
  text: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!disabled}
      className="esl-btn"
      style={{
        padding: '6px 10px',
        fontSize: 12,
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.18)',
        background: 'rgba(0,0,0,0.20)',
        color: '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {text}
    </button>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: 'min(980px, 96vw)',
          maxHeight: '86vh',
          overflow: 'auto',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.18)',
          background: 'rgba(10,10,10,0.98)',
          boxShadow: '0 18px 60px rgba(0,0,0,0.65)',
          color: '#fff',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: 'rgba(10,10,10,0.98)',
            borderBottom: '1px solid rgba(255,255,255,0.10)',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            zIndex: 2,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 900 }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 10px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(0,0,0,0.20)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {UI.modal_close}
          </button>
        </div>

        <div style={{ padding: 14 }}>{children}</div>
      </div>
    </div>
  );
}

export default function LogisticsTripsPage() {
  const [period, setPeriod] = useState<Period>('day');
  const [anchorDate, setAnchorDate] = useState<string>(() => toISODate(new Date()));
  const [q, setQ] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<Toast>(null);

  const [rows, setRows] = useState<RowVM[]>([]);
  const [ordersInRange, setOrdersInRange] = useState<OrderRow[]>([]);

  // create trip modal
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [createSearch, setCreateSearch] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);

  // assign modal
  const [assignOpen, setAssignOpen] = useState<boolean>(false);
  const [assignTripId, setAssignTripId] = useState<string | null>(null);
  const [assignOrderDate, setAssignOrderDate] = useState<string>(() => toISODate(new Date()));
  const [assignLoading, setAssignLoading] = useState<boolean>(false);
  const [assignList, setAssignList] = useState<DispatcherResource[]>([]);
  const [assignErr, setAssignErr] = useState<string | null>(null);

  function pushToast(kind: ToastKind, text: string) {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 2800);
  }

  const range = useMemo(() => {
    if (period === 'day') return { from: anchorDate, to: anchorDate };
    if (period === 'week') return { from: startOfWeekISO(anchorDate), to: endOfWeekISO(anchorDate) };
    return { from: startOfMonthISO(anchorDate), to: endOfMonthISO(anchorDate) };
  }, [period, anchorDate]);

  async function loadData() {
  setLoading(true);
  try {
    // 1) заявки за период (это источник правды)
    const { data: orders, error: ordErr } = await supabase
      .from('orders')
      .select('id, load_date, order_number, client_name, load_point, unload_point, km, cargo_type')
      .gte('load_date', range.from)
      .lte('load_date', range.to)
      .order('load_date', { ascending: false })
      .order('order_number', { ascending: false })
      .limit(800);

    if (ordErr) throw ordErr;

    const ordList: OrderRow[] = (orders || []).map((o: any) => ({
      id: String(o.id),
      load_date: o.load_date ?? null,
      order_number: o.order_number ?? null,
      client_name: o.client_name ?? null,
      load_point: o.load_point ?? null,
      unload_point: o.unload_point ?? null,
      km: o.km ?? null,
      cargo_type: o.cargo_type ?? null,
    }));

    setOrdersInRange(ordList);

    const orderIds = ordList.map((o) => o.id);
    if (orderIds.length === 0) {
      setRows([]);
      return;
    }

    // 2) рейсы по этим заявкам
    const { data: trips, error: tripErr } = await supabase
      .from('logistics')
      .select(
        'id, order_id, trip_status, planned_unload_at, vehicle_id, driver_id, trailer_id, updated_at,' +
          'vehicles:vehicle_id(brand, vehicle_code),' +
          'drivers:driver_id(full_name, phone),' +
          'trailers:trailer_id(vehicle_code)'
      )
      .in('order_id', orderIds)
      .order('updated_at', { ascending: false })
      .limit(3000);

    if (tripErr) throw tripErr;

    // 3) если по заявке несколько рейсов — берём самый свежий (updated_at)
    const tripByOrderId = new Map<string, any>();
    (trips || []).forEach((t: any) => {
      const oid = String(t.order_id);
      if (!tripByOrderId.has(oid)) tripByOrderId.set(oid, t);
    });

    // 4) строим строки: 1 заявка = 1 строка, рейс подставляем если есть
    const vm: RowVM[] = ordList.map((o) => {
      const t = tripByOrderId.get(o.id) || null;

      return {
        order_id: o.id,

        load_date: o.load_date,
        order_number: o.order_number,
        client_name: o.client_name,
        load_point: o.load_point,
        unload_point: o.unload_point,
        km: o.km,
        cargo_type: o.cargo_type,

        trip_id: t ? String(t.id) : null,
        trip_status: t ? ((t.trip_status as TripStatus) || 'plan') : null,

        vehicle_code: t?.vehicles?.vehicle_code ?? null,
        vehicle_brand: t?.vehicles?.brand ?? null,
        trailer_code: t?.trailers?.vehicle_code ?? null,
        driver_name: t?.drivers?.full_name ?? null,
        driver_phone: t?.drivers?.phone ?? null,

        planned_unload_at: t?.planned_unload_at ?? null,
      };
    });

    setRows(vm);
  } catch (e: any) {
    pushToast('error', `\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438: ${String(e?.message || e)}`);
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, anchorDate]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    const has = (v: any) => (v ? String(v).toLowerCase().includes(s) : false);

    return rows.filter((r) => {
      return (
        has(r.order_number) ||
        has(r.client_name) ||
        has(r.vehicle_code) ||
        has(r.driver_name) ||
        has(r.trailer_code) ||
        has(r.load_point) ||
        has(r.unload_point)
      );
    });
  }, [rows, q]);

  const createCandidates = useMemo(() => {
    const s = createSearch.trim().toLowerCase();
    const list = ordersInRange;

    if (!s) return list.slice(0, 120);

    const has = (v: any) => (v ? String(v).toLowerCase().includes(s) : false);

    return list
      .filter((o) => has(o.order_number) || has(o.client_name) || has(o.load_point) || has(o.unload_point))
      .slice(0, 160);
  }, [ordersInRange, createSearch]);

  async function doCreateTrip(orderId: string) {
    setCreating(true);
    try {
      const { error } = await supabase.from('logistics').insert({ order_id: orderId });
      if (error) throw error;

      pushToast('success', '\u0420\u0435\u0439\u0441 \u0441\u043e\u0437\u0434\u0430\u043d');
      setCreateOpen(false);
      setCreateSearch('');
      await loadData();
    } catch (e: any) {
      pushToast('error', `\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0440\u0435\u0439\u0441: ${String(e?.message || e)}`);
    } finally {
      setCreating(false);
    }
  }

  async function openAssign(tripId: string, defaultDate: string | null) {
    setAssignTripId(tripId);
    setAssignOrderDate(defaultDate || anchorDate);
    setAssignList([]);
    setAssignErr(null);
    setAssignOpen(true);

    // \u0441\u0440\u0430\u0437\u0443 \u0433\u0440\u0443\u0437\u0438\u043c \u0440\u0435\u0441\u0443\u0440\u0441\u044b \u043d\u0430 \u0434\u0430\u0442\u0443
    await loadDispatcherResources(defaultDate || anchorDate);
  }

  async function loadDispatcherResources(dayDate: string) {
    setAssignLoading(true);
    setAssignErr(null);
    try {
      const { data, error } = await supabase.rpc('get_dispatcher_resources', { p_day_date: dayDate });

      if (error) throw error;

      const list: DispatcherResource[] = (data || []).map((x: any) => ({
        dispatcher_day_id: String(x.dispatcher_day_id),
        line_id: String(x.line_id),
        vehicle_id: x.vehicle_id ? String(x.vehicle_id) : null,
        vehicle_brand: x.vehicle_brand ?? null,
        vehicle_code: x.vehicle_code ?? null,
        driver_id: x.driver_id ? String(x.driver_id) : null,
        driver_name: x.driver_name ?? null,
        driver_phone: x.driver_phone ?? null,
        trailer_id: x.trailer_id ? String(x.trailer_id) : null,
        trailer_code: x.trailer_code ?? null,
        resource_status: String(x.resource_status || ''),
        vehicle_comment: x.vehicle_comment ?? null,
        resource_other_comment: x.resource_other_comment ?? null,
      }));
      const filteredList = list.filter((x) => !!x.vehicle_id);
setAssignList(filteredList);
return;

      setAssignList(list);
    } catch (e: any) {
      setAssignErr(String(e?.message || e));
    } finally {
      setAssignLoading(false);
    }
  }

  async function applyAssign(r: DispatcherResource) {
    if (!assignTripId) return;
    setAssignLoading(true);
    try {
      const patch: any = {
        vehicle_id: r.vehicle_id,
        driver_id: r.driver_id,
        trailer_id: r.trailer_id,
      };

      const { error } = await supabase.from('logistics').update(patch).eq('id', assignTripId);
      if (error) throw error;

      pushToast('success', '\u0420\u0435\u0441\u0443\u0440\u0441\u044b \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u044b');
      setAssignOpen(false);
      setAssignTripId(null);
      await loadData();
    } catch (e: any) {
      pushToast('error', `\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043d\u0430\u0437\u043d\u0430\u0447\u0438\u0442\u044c: ${String(e?.message || e)}`);
    } finally {
      setAssignLoading(false);
    }
  }

  async function changeStatus(tripId: string, next: TripStatus) {
    try {
      const { error } = await supabase.from('logistics').update({ trip_status: next }).eq('id', tripId);
      if (error) throw error;

      pushToast('success', '\u0421\u0442\u0430\u0442\u0443\u0441 \u043e\u0431\u043d\u043e\u0432\u043b\u0451\u043d');
      await loadData();
    } catch (e: any) {
      pushToast('error', `\u041d\u0435 \u0443\u0434\u0430430\u043b\u043e\u0441\u044c \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0441\u0442\u0430\u0442\u0443\u0441: ${String((e as any)?.message || e)}`);
    }
  }

  return (
    <div className="page-wrapper logistics-trips-page" style={{ padding: 16, color: '#fff' }}>
      {/* \u0448\u0430\u043f\u043a\u0430 */}
      <div className="esl-page-header" style={{ marginBottom: 12 }}>
        <div className="esl-page-header-left" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="esl-page-title">{UI.title}</div>
            <div style={{ marginTop: 6 }}>
              <a href="/logistics" style={{ color: '#fff', opacity: 0.85, textDecoration: 'none' }}>
                {UI.back}
              </a>
            </div>
          </div>

          <div className="esl-tabs" style={{ marginLeft: 10 }}>
            <button
              type="button"
              className={`esl-tab ${period === 'day' ? 'esl-tab-active' : ''}`}
              onClick={() => setPeriod('day')}
            >
              {UI.period_day}
            </button>
            <button
              type="button"
              className={`esl-tab ${period === 'week' ? 'esl-tab-active' : ''}`}
              onClick={() => setPeriod('week')}
            >
              {UI.period_week}
            </button>
            <button
              type="button"
              className={`esl-tab ${period === 'month' ? 'esl-tab-active' : ''}`}
              onClick={() => setPeriod('month')}
            >
              {UI.period_month}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{UI.date}</div>
            <input
              className="esl-date"
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
            />
          </div>
        </div>

        <div className="esl-page-header-right">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={UI.search_ph}
            style={{
              width: 360,
              maxWidth: '46vw',
              padding: '8px 10px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(0,0,0,0.25)',
              color: '#fff',
              outline: 'none',
            }}
          />

          <SmallButton text={UI.btn_refresh} onClick={loadData} disabled={loading} />
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={loading}
            style={{
              padding: '8px 12px',
              borderRadius: 12,
              border: '1px solid rgba(242,140,40,0.55)',
              background: 'rgba(242,140,40,0.14)',
              color: '#fff',
              fontWeight: 900,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.65 : 1,
            }}
          >
            {UI.btn_create_trip}
          </button>
        </div>
      </div>

      {/* \u043f\u043e\u0434\u0441\u043a\u0430\u0437\u043a\u0430 \u043f\u0435\u0440\u0438\u043e\u0434\u0430 */}
      <div
        style={{
          marginBottom: 12,
          padding: 10,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(0,0,0,0.22)',
          fontSize: 12,
          opacity: 0.9,
        }}
      >
        <span style={{ opacity: 0.9 }}>
          {'\u041f\u0435\u0440\u0438\u043e\u0434: '}
        </span>
        <b style={{ opacity: 1 }}>
          {fmtDate(range.from)}{' \u2014 '} {fmtDate(range.to)}
        </b>
        {loading ? <span style={{ marginLeft: 10, opacity: 0.8 }}>{'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026'}</span> : null}
      </div>

      {/* \u0442\u0430\u0431\u043b\u0438\u0446\u0430 */}
      <div
        style={{
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 12,
          overflow: 'hidden',
          background: 'rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1280 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                <th style={thStyle}>{UI.th_load_date}</th>
                <th style={thStyle}>{UI.th_order}</th>
                <th style={thStyle}>{UI.th_client}</th>
                <th style={thStyle}>{UI.th_vehicle}</th>
                <th style={thStyle}>{UI.th_trailer}</th>
                <th style={thStyle}>{UI.th_driver}</th>
                <th style={thStyle}>{UI.th_phone}</th>
                <th style={thStyle}>{UI.th_status}</th>
                <th style={thStyle}>{UI.th_points}</th>
                <th style={thStyle}>{UI.th_km}</th>
                <th style={thStyle}>{UI.th_cargo}</th>
                <th style={thStyle}>{UI.th_plan_unload}</th>
                <th style={thStyle}>{UI.th_actions}</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: 14, opacity: 0.85 }}>
                    {UI.empty}
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 600).map((r) => (
                  <tr key={r.trip_id} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <td style={tdStyle}>{fmtDate(r.load_date)}</td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 900 }}>{r.order_number || ''}</div>
                      <div style={{ fontSize: 12, opacity: 0.78 }}>{r.order_id.slice(0, 8)}</div>
                    </td>
                    <td style={tdStyle}>{r.client_name || ''}</td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 900 }}>{r.vehicle_code || ''}</div>
                      <div style={{ fontSize: 12, opacity: 0.78 }}>{r.vehicle_brand || ''}</div>
                    </td>
                    <td style={tdStyle}>{r.trailer_code || ''}</td>
                    <td style={tdStyle}>{r.driver_name || ''}</td>
                    <td style={tdStyle}>{r.driver_phone || ''}</td>
                    <td style={tdStyle}>
                      <span
                        className="status-badge"
                        style={{
                          borderColor: 'rgba(255,255,255,0.18)',
                          background: 'rgba(255,255,255,0.04)',
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                           background: statusDotColor(r.trip_status ?? "plan"),
                            boxShadow: '0 0 0 3px rgba(255,255,255,0.04)',
                          }}
                        />
                       {statusLabel(r.trip_status ?? "plan")}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>
                        <b>{'\u041f\u0433: '}</b>
                        {r.load_point || ''}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                        <b>{'\u0412\u0433: '}</b>
                        {r.unload_point || ''}
                      </div>
                    </td>
                    <td style={tdStyle}>{r.km ?? ''}</td>
                    <td style={tdStyle}>{r.cargo_type || ''}</td>
                    <td style={tdStyle}>{fmtDateTime(r.planned_unload_at)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <SmallButton
                          text={UI.act_assign}
                         onClick={() => r.trip_id && openAssign(r.trip_id, r.order_id)}
                          disabled={assignLoading}
                        />

                        <select
                          value={r.trip_status ?? "plan"}
                          onChange={(e) => r.trip_id && changeTripStatus(r.trip_id, e.target.value as TripStatus)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.18)',
                            background: 'rgba(0,0,0,0.20)',
                            color: '#fff',
                            fontSize: 12,
                            outline: 'none',
                          }}
                        >
                          <option value="plan">{UI.status_plan}</option>
                          <option value="to_loading">{UI.status_to_loading}</option>
                          <option value="loading">{UI.status_loading}</option>
                          <option value="to_unloading">{UI.status_to_unloading}</option>
                          <option value="unloading">{UI.status_unloading}</option>
                          <option value="done">{UI.status_done}</option>
                          <option value="canceled">{UI.status_canceled}</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* \u0422\u043e\u0441\u0442\u044b */}
      <div className="esl-toast-stack">
        {toast ? (
          <div
            className={`esl-toast ${
              toast.kind === 'success' ? 'esl-toast-success' : toast.kind === 'error' ? 'esl-toast-error' : 'esl-toast-info'
            }`}
          >
            {toast.text}
          </div>
        ) : null}
      </div>

      {/* \u041c\u043e\u0434\u0430\u043b\u043a\u0430: \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0435 \u0440\u0435\u0439\u0441\u0430 */}
      <Modal open={createOpen} title={UI.modal_create_title} onClose={() => setCreateOpen(false)}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{UI.modal_pick_order}</div>
          <input
            value={createSearch}
            onChange={(e) => setCreateSearch(e.target.value)}
            placeholder={UI.search_ph}
            style={{
              flex: '1 1 420px',
              minWidth: 260,
              padding: '8px 10px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(0,0,0,0.25)',
              color: '#fff',
              outline: 'none',
            }}
          />
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            {`\u0417\u0430\u044f\u0432\u043e\u043a \u0432 \u043f\u0435\u0440\u0438\u043e\u0434\u0435: ${ordersInRange.length}`}
          </div>
        </div>

        <div
          style={{
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <th style={thStyle}>{UI.th_load_date}</th>
                  <th style={thStyle}>{UI.th_order}</th>
                  <th style={thStyle}>{UI.th_client}</th>
                  <th style={thStyle}>{UI.th_points}</th>
                  <th style={thStyle}>{UI.th_km}</th>
                  <th style={thStyle}>{UI.th_cargo}</th>
                  <th style={thStyle}>{UI.th_actions}</th>
                </tr>
              </thead>
              <tbody>
                {createCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 14, opacity: 0.85 }}>
                      {'\u041d\u0435\u0442 \u0437\u0430430\u044f\u0432\u043e\u043a \u043f\u043e \u0444\u0438\u043b\u044c\u0442\u0440\u0443.'}
                    </td>
                  </tr>
                ) : (
                  createCandidates.map((o) => (
                    <tr key={o.id} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <td style={tdStyle}>{fmtDate(o.load_date)}</td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 900 }}>{o.order_number || ''}</div>
                        <div style={{ fontSize: 12, opacity: 0.78 }}>{o.id.slice(0, 8)}</div>
                      </td>
                      <td style={tdStyle}>{o.client_name || ''}</td>
                      <td style={tdStyle}>
                        <div style={{ fontSize: 12, opacity: 0.9 }}>
                          <b>{'\u041f\u0433: '}</b>
                          {o.load_point || ''}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                          <b>{'\u0412\u0433: '}</b>
                          {o.unload_point || ''}
                        </div>
                      </td>
                      <td style={tdStyle}>{o.km ?? ''}</td>
                      <td style={tdStyle}>{o.cargo_type || ''}</td>
                      <td style={tdStyle}>
                        <SmallButton
                          text={creating ? '\u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435\u2026' : UI.btn_create_trip}
                          onClick={() => doCreateTrip(o.id)}
                          disabled={creating}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* \u041c\u043e\u0434\u0430\u043b\u043a\u0430: \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u0440\u0435\u0441\u0443\u0440\u0441\u043e\u0432 */}
      <Modal open={assignOpen} title={UI.modal_assign_title} onClose={() => setAssignOpen(false)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{UI.date}</div>
          <input
            className="esl-date"
            type="date"
            value={assignOrderDate}
            onChange={async (e) => {
              const v = e.target.value;
              setAssignOrderDate(v);
              await loadDispatcherResources(v);
            }}
          />
          <div style={{ fontSize: 12, opacity: 0.85 }}>{UI.modal_pick_resource}</div>
          {assignLoading ? <div style={{ fontSize: 12, opacity: 0.8 }}>{'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026'}</div> : null}
          {assignErr ? (
            <div style={{ fontSize: 12, color: 'rgba(255,107,107,0.95)' }}>
            {`\u041e\u0448\u0438\u0431\u043a\u0430: ${assignErr}`}
            </div>
          ) : null}
        </div>

        <div
          style={{
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <th style={thStyle}>{UI.th_vehicle}</th>
                  <th style={thStyle}>{UI.th_trailer}</th>
                  <th style={thStyle}>{UI.th_driver}</th>
                  <th style={thStyle}>{UI.th_phone}</th>
                  <th style={thStyle}>{UI.th_status}</th>
                  <th style={thStyle}>{UI.th_actions}</th>
                </tr>
              </thead>
              <tbody>
                {assignList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 14, opacity: 0.85 }}>
                      {'\u041d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0445 \u0440\u0435\u0441\u0443\u0440\u0441\u043e\u0432 work/transfer \u043d\u0430 \u044d\u0442\u0443 \u0434\u0430\u0442\u0443.'}
                    </td>
                  </tr>
                ) : (
                  assignList.map((r) => (
                    <tr key={r.line_id} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 900 }}>{r.vehicle_code || ''}</div>
                        <div style={{ fontSize: 12, opacity: 0.78 }}>{r.vehicle_brand || ''}</div>
                      </td>
                      <td style={tdStyle}>{r.trailer_code || ''}</td>
                      <td style={tdStyle}>{r.driver_name || ''}</td>
                      <td style={tdStyle}>{r.driver_phone || ''}</td>
                      <td style={tdStyle}>
                        <span className="status-badge status-work" style={{ fontWeight: 800 }}>
                          {r.resource_status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <SmallButton
                          text={UI.act_assign}
                          onClick={() => applyAssign(r)}
                          disabled={assignLoading}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: 12,
  opacity: 0.9,
  borderBottom: '1px solid rgba(255,255,255,0.10)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  verticalAlign: 'top',
};