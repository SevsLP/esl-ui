'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * ЕСЛ — Логистика: Матрица парк × заявки (вариант C) — v5
 * Что улучшено (не ломая логику):
 * - Статус назначения: INSERT logistics c trip_status='plan' (как ты попросил)
 * - Таблица стала компактнее: фиксированная ширина колонки машины + нормальная ширина колонок заявок
 * - Клетка стала "кнопкой": видно назначено/не назначено
 * - Цвета принудительно тёмные внутри таблицы (чтобы тёмная тема не "съедала" текст)
 */

type OrderRow = { 
  order_id: string; 
  order_number: string | null;
  client_name: string | null;
  load_date: string | null;
  period_from: string | null;
  period_to: string | null;
  load_point: string | null;
  unload_point: string | null;
  remaining_tons: number | null;
  remaining_vehicles_estimate: number | null;
  vehicles_required: number | null;
};

type VehicleRow = {
  vehicle_id: string;
  brand: string | null;
  vehicle_code: string | null;
  is_available_tomorrow: boolean;
};

type Assignment = {
  logistics_id: string;
  order_id: string;
  vehicle_id: string;
  trip_status: string;
};

const T = {
  title: '\u041b\u043e\u0433\u0438\u0441\u0442\u0438\u043a\u0430 \u2014 \u041c\u0430\u0442\u0440\u0438\u0446\u0430 \u043f\u0430\u0440\u043a \u00d7 \u0437\u0430\u044f\u0432\u043a\u0438',
  sub: '\u0412\u0430\u0440\u0438\u0430\u043d\u0442 C: \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u043c\u0430\u0448\u0438\u043d \u043a\u043b\u0438\u043a\u043e\u043c \u043f\u043e \u044f\u0447\u0435\u0439\u043a\u0435',
  refresh: '\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c',
  loading: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...',
  date: '\u0414\u0430\u0442\u0430 (\u0434\u043b\u044f \u0437\u0430\u044f\u0432\u043e\u043a)',
  filtVehicles: '\u0424\u0438\u043b\u044c\u0442\u0440 \u043c\u0430\u0448\u0438\u043d',
  filtOrders: '\u0424\u0438\u043b\u044c\u0442\u0440 \u0437\u0430\u044f\u0432\u043e\u043a',
  showAllOrders: '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0432\u0441\u0435 \u0437\u0430\u044f\u0432\u043a\u0438',
  colsLimit: '\u041a\u043e\u043b\u043e\u043d\u043e\u043a \u0437\u0430\u044f\u0432\u043e\u043a (\u0442\u043e\u043f)',
  limitMode: '\u041b\u0438\u043c\u0438\u0442',
  byRemaining: '\u041f\u043e \u043e\u0441\u0442\u0430\u0442\u043a\u0443',
  byPlan: '\u041f\u043e \u043f\u043b\u0430\u043d\u0443',
  noDataTitle: '\u0417\u0430\u044f\u0432\u043e\u043a \u043d\u0435\u0442 \u043d\u0430 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u0443\u044e \u0434\u0430\u0442\u0443',
  noDataHint: '\u0415\u0441\u043b\u0438 \u0432 \u0411\u0414 \u0442\u043e\u0447\u043d\u043e \u0435\u0441\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0438 \u2014 \u043f\u0440\u043e\u0432\u0435\u0440\u044c RLS \u043d\u0430 orders / order_shipments / settings / places.',
  vehicleCol: '\u041c\u0430\u0448\u0438\u043d\u0430 (\u0441\u0432\u043e\u0431\u043e\u0434\u043d\u0430 \u0437\u0430\u0432\u0442\u0440\u0430)',
  order: '\u0417\u0430\u044f\u0432\u043a\u0430',
  need: '\u041d\u0443\u0436\u043d\u043e:',
  needRemaining: '\u041e\u0441\u0442\u0430\u0442\u043e\u043a:',
  needPlan: '\u041f\u043b\u0430\u043d:',
  free: '\u0421\u0432\u043e\u0431\u043e\u0434\u043d\u0430',
  busy: '\u0417\u0430\u043d\u044f\u0442\u0430 (\u0435\u0441\u0442\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0439 \u0440\u0435\u0439\u0441)',
  saved: '\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043e',
  removed: '\u0421\u043d\u044f\u0442\u043e',
  alreadyBusy: '\u041c\u0430\u0448\u0438\u043d\u0430 \u0443\u0436\u0435 \u0437\u0430\u043d\u044f\u0442\u0430 \u0434\u0440\u0443\u0433\u0438\u043c \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u043c \u0440\u0435\u0439\u0441\u043e\u043c.',
  limitReached: '\u041b\u0438\u043c\u0438\u0442 \u043f\u043e \u0437\u0430\u044f\u0432\u043a\u0435 \u0434\u043e\u0441\u0442\u0438\u0433\u043d\u0443\u0442: \u0443\u0436\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043e \u043d\u0435 \u043c\u0435\u043d\u044c\u0448\u0435, \u0447\u0435\u043c \u201c\u041d\u0443\u0436\u043d\u043e\u201d.',
};

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('\u041d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

function fmtDateYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function orderLabel(o: OrderRow): string {
  const num = o.order_number ? `#${o.order_number}` : T.order;
  const lp = (o.load_point ?? '').trim();
  const up = (o.unload_point ?? '').trim();
  const route = lp && up ? `${lp}\u2192${up}` : (lp || up || '\u041c\u0430\u0440\u0448\u0440\u0443\u0442');
  const rem = o.remaining_vehicles_estimate ?? 0;
  const plan = o.vehicles_required ?? 0;
  return `${num} \u2022 ${route} \u2022 ${T.needRemaining} ${rem} \u2022 ${T.needPlan} ${plan}`;
}

function vehicleLabel(v: VehicleRow): string {
  const code = (v.vehicle_code ?? '').trim();
  const brand = (v.brand ?? '').trim();
  return [code, brand].filter(Boolean).join(' \u00b7 ') || v.vehicle_id;
}

export default function LogisticsMatrixPage() {
  const supabase = useMemo(() => getSupabase(), []);

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [msg, setMsg] = useState<string>('');
  const [debug, setDebug] = useState<string>('');

  const [maxOrders, setMaxOrders] = useState<number>(12);
  const [searchVehicle, setSearchVehicle] = useState<string>('');
  const [searchOrder, setSearchOrder] = useState<string>('');

  const [ordersDate, setOrdersDate] = useState<string>(() => fmtDateYYYYMMDD(new Date(Date.now() + 86400000)));

  const [focusOrderId, setFocusOrderId] = useState<string | null>(null);

  type LimitMode = 'remaining' | 'plan';
  const [limitMode, setLimitMode] = useState<LimitMode>(() => {
    if (typeof window === 'undefined') return 'remaining';
    const v = window.localStorage.getItem('esl_logistics_matrix_limit_mode');
    return v === 'plan' ? 'plan' : 'remaining';
  });

  useEffect(() => {
    try { window.localStorage.setItem('esl_logistics_matrix_limit_mode', limitMode); } catch {}
  }, [limitMode]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMsg('');
    setDebug('');

    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id ?? null;

      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders_progress_view')
        .select('order_id,order_number,client_name,load_date,period_from,period_to,load_point,unload_point,remaining_tons,remaining_vehicles_estimate,vehicles_required')
        .or(
          `load_date.eq.${ordersDate},and(period_from.not.is.null,period_to.not.is.null,period_from.lte.${ordersDate},period_to.gte.${ordersDate})`
        )
        .gt('remaining_vehicles_estimate', 0)
        .order('remaining_vehicles_estimate', { ascending: false })
        .limit(120);

      if (ordersErr) throw ordersErr;

      const { data: vehiclesData, error: vehiclesErr } = await supabase
        .from('supply_tomorrow_view')
        .select('vehicle_id,brand,vehicle_code,is_available_tomorrow')
        .order('vehicle_code', { ascending: true })
        .limit(400);

      if (vehiclesErr) throw vehiclesErr;

      const { data: asgData, error: asgErr } = await supabase
        .from('logistics')
        .select('id,order_id,vehicle_id,trip_status')
        .is('archived_at', null)
        .not('trip_status', 'in', '("done","canceled")')
        .limit(5000);

      if (asgErr) throw asgErr;

      const o = (ordersData ?? []).map((x: any) => ({
        order_id: x.order_id,
        order_number: x.order_number ?? null,
        client_name: x.client_name ?? null,
        load_date: x.load_date ?? null,
        period_from: x.period_from ?? null,
        period_to: x.period_to ?? null,
        load_point: x.load_point ?? null,
        unload_point: x.unload_point ?? null,
        remaining_tons: x.remaining_tons ?? null,
        remaining_vehicles_estimate: x.remaining_vehicles_estimate ?? null,
        vehicles_required: x.vehicles_required ?? null,
      })) as OrderRow[];

      const v = (vehiclesData ?? []).map((x: any) => ({
        vehicle_id: x.vehicle_id,
        brand: x.brand ?? null,
        vehicle_code: x.vehicle_code ?? null,
        is_available_tomorrow: !!x.is_available_tomorrow,
      })) as VehicleRow[];

      const a = (asgData ?? []).map((x: any) => ({
        logistics_id: x.id,
        order_id: x.order_id,
        vehicle_id: x.vehicle_id,
        trip_status: x.trip_status,
      })) as Assignment[];

      setOrders(o);
      setVehicles(v);
      setAssignments(a);

      setDebug(`date=${ordersDate} | uid=${uid ?? 'null'} | orders=${o.length} | vehicles=${v.length} | assignments=${a.length}`);
    } catch (e: any) {
      const m = (e?.message || String(e)) ?? '\u041e\u0448\u0438\u0431\u043a\u0430';
      setMsg(m);
      setDebug(`date=${ordersDate} | error=${m}`);
    } finally {
      setLoading(false);
    }
  }, [supabase, ordersDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const ordersFiltered = useMemo(() => {
    const q = searchOrder.trim().toLowerCase();
    let base = orders.slice(0, Math.max(1, Math.min(120, maxOrders)));

    // Фокус на одну заявку (удобно “добивать” конкретную заявку)
    if (focusOrderId) base = base.filter(o => o.order_id === focusOrderId);

    if (!q) return base;
    return base.filter(o => orderLabel(o).toLowerCase().includes(q));
  }, [orders, maxOrders, searchOrder, focusOrderId]);

  const vehiclesFiltered = useMemo(() => {
    const q = searchVehicle.trim().toLowerCase();
    const list = (!q ? vehicles : vehicles.filter(v => vehicleLabel(v).toLowerCase().includes(q)));

    // Сортировка: свободные сверху, затем по коду
    return [...list].sort((a, b) => {
      const af = a.is_available_tomorrow ? 1 : 0;
      const bf = b.is_available_tomorrow ? 1 : 0;
      if (af !== bf) return bf - af;
      const ac = (a.vehicle_code ?? '').toLowerCase();
      const bc = (b.vehicle_code ?? '').toLowerCase();
      return ac.localeCompare(bc);
    });
  }, [vehicles, searchVehicle]);

  const assignedSet = useMemo(() => {
    const s = new Set<string>();
    for (const a of assignments) {
      if (!a.vehicle_id || !a.order_id) continue;
      s.add(`${a.vehicle_id}::${a.order_id}`);
    }
    return s;
  }, [assignments]);

  const vehicleAssignedAny = useMemo(() => {
    const m = new Map<string, Assignment>();
    for (const a of assignments) {
      if (a.vehicle_id) m.set(a.vehicle_id, a);
    }
    return m;
  }, [assignments]);

  const assignedCountByOrder = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignments) {
      if (!a.order_id) continue;
      m.set(a.order_id, (m.get(a.order_id) ?? 0) + 1);
    }
    return m;
  }, [assignments]);


  const onAssign = useCallback(async (vehicle_id: string, order_id: string) => {
    setMsg('');
    try {
      if (assignedSet.has(`${vehicle_id}::${order_id}`)) return;

      const ord = orders.find(o => o.order_id === order_id);
      const need = (limitMode === 'plan' ? (ord?.vehicles_required ?? 0) : (ord?.remaining_vehicles_estimate ?? 0)) || 0;
      const already = assignedCountByOrder.get(order_id) ?? 0;
      if (need > 0 && already >= need) {
        setMsg(T.limitReached);
        return;
      }

      const any = vehicleAssignedAny.get(vehicle_id);
      if (any && any.order_id !== order_id) {
        setMsg(T.alreadyBusy);
        return;
      }

      const { error } = await supabase
        .from('logistics')
        .insert({ order_id, vehicle_id, trip_status: 'plan' });

      if (error) throw error;

      setMsg(T.saved);
      void loadData();
    } catch (e: any) {
      setMsg((e?.message || String(e)) ?? '\u041e\u0448\u0438\u0431\u043a\u0430');
    }
  }, [supabase, assignedSet, vehicleAssignedAny, assignedCountByOrder, orders, limitMode, loadData]);

  const onUnassign = useCallback(async (vehicle_id: string, order_id: string) => {
    setMsg('');
    try {
      const a = assignments.find(x => x.vehicle_id === vehicle_id && x.order_id === order_id);
      if (!a) return;

      const { error } = await supabase
        .from('logistics')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', a.logistics_id);

      if (error) throw error;

      setMsg(T.removed);
      void loadData();
    } catch (e: any) {
      setMsg((e?.message || String(e)) ?? '\u041e\u0448\u0438\u0431\u043a\u0430');
    }
  }, [supabase, assignments, loadData]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ color: '#fff' }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{T.title}</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{T.sub}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>{debug}</div>
        </div>
        <button onClick={() => void loadData()} disabled={loading} style={{ padding: '8px 10px' }}>
          {loading ? T.loading : T.refresh}
        </button>
      </div>

      {msg ? (
        <div style={{ marginBottom: 10, padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', color: '#fff' }}>
          {msg}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', color: '#fff' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, opacity: 0.85 }}>{T.date}</span>
          <input type="date" value={ordersDate} onChange={e => setOrdersDate(e.target.value)} style={{ padding: 8, minWidth: 200 }} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, opacity: 0.85 }}>{T.filtVehicles}</span>
          <input value={searchVehicle} onChange={e => setSearchVehicle(e.target.value)} style={{ padding: 8, minWidth: 220 }} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, opacity: 0.85 }}>{T.filtOrders}</span>
          <input value={searchOrder} onChange={e => setSearchOrder(e.target.value)} style={{ padding: 8, minWidth: 260 }} />
        </label>

        {focusOrderId ? (
          <button
            type="button"
            onClick={() => setFocusOrderId(null)}
            style={{
              alignSelf: 'flex-end',
              height: 36,
              padding: '0 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(0,0,0,0.35)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
            }}
            title={T.showAllOrders}
          >
            {T.showAllOrders}
          </button>
        ) : null}

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, opacity: 0.85 }}>{T.colsLimit}</span>
          <input
            type="number"
            value={maxOrders}
            min={6}
            max={40}
            onChange={e => setMaxOrders(Number(e.target.value || 12))}
            style={{ padding: 8, width: 150, background: '#0f0f10', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8 }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, opacity: 0.85 }}>{T.limitMode}</span>
          <select
            value={limitMode}
            onChange={e => setLimitMode((e.target.value as any) === 'plan' ? 'plan' : 'remaining')}
            style={{ padding: 8, width: 150, background: '#0f0f10', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8 }}
          >
            <option value="remaining" style={{ background: '#0f0f10', color: '#fff' }}>{T.byRemaining}</option>
            <option value="plan" style={{ background: '#0f0f10', color: '#fff' }}>{T.byPlan}</option>
          </select>
        </label>
      </div>

      {orders.length === 0 ? (
        <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>{T.noDataTitle}</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>{T.noDataHint}</div>
        </div>
      ) : null}

      <div style={{ overflow: 'auto', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 10, background: '#fff', color: '#111' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content', minWidth: 860 }}>
          <thead>
            <tr>
              <th
                style={{
                  position: 'sticky',
                  left: 0,
                  top: 0,
                  zIndex: 3,
                  background: '#fff',
                  color: '#111',
                  textAlign: 'left',
                  padding: 10,
                  borderBottom: '1px solid rgba(0,0,0,0.12)',
                  width: 280,
                  minWidth: 280,
                }}
              >
                {T.vehicleCol}
              </th>

              {ordersFiltered.map(o => (
                <th
                  key={o.order_id}
                  title={orderLabel(o)}
                  onClick={() => setFocusOrderId(prev => (prev === o.order_id ? null : o.order_id))}
                  style={{
                    top: 0,
                    position: 'sticky',
                    zIndex: 2,
                    background: '#fff',
                    color: '#111',
                    padding: 10,
                    cursor: 'pointer',
                    boxShadow: focusOrderId === o.order_id ? 'inset 0 0 0 2px rgba(0,0,0,0.55)' : undefined,
                    borderBottom: '1px solid rgba(0,0,0,0.12)',
                    width: 240,
                    minWidth: 240,
                    maxWidth: 260,
                    verticalAlign: 'top',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 900 }}>{o.order_number ? `#${o.order_number}` : T.order}</div>
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                    {(o.load_point ?? '').trim()}
                    {'\u2192'}
                    {(o.unload_point ?? '').trim()}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                    {T.needRemaining} {o.remaining_vehicles_estimate ?? 0} • {T.needPlan} {o.vehicles_required ?? 0}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                    {(limitMode === 'plan' ? T.byPlan : T.byRemaining)} • {'\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043e'}: {assignedCountByOrder.get(o.order_id) ?? 0} {'\u2022'} {'\u041e\u0441\u0442\u0430\u043b\u043e\u0441\u044c'}: {Math.max(0, (((limitMode === 'plan' ? (o.vehicles_required ?? 0) : (o.remaining_vehicles_estimate ?? 0)) || 0) - (assignedCountByOrder.get(o.order_id) ?? 0)))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {vehiclesFiltered.map(v => {
              const any = vehicleAssignedAny.get(v.vehicle_id);
              const isBusy = !!any;

              return (
                <tr key={v.vehicle_id}>
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      background: '#fff',
                      color: '#111',
                      padding: 10,
                      borderBottom: '1px solid rgba(0,0,0,0.08)',
                      width: 280,
                      minWidth: 280,
                      maxWidth: 280,
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: 13 }}>{vehicleLabel(v)}</div>
                    <div style={{ fontSize: 11, opacity: 0.75 }}>{v.is_available_tomorrow ? T.free : T.busy}</div>
                  </td>

                  {ordersFiltered.map(o => {
                    const key = `${v.vehicle_id}::${o.order_id}`;
                    const assignedHere = assignedSet.has(key);

                    const disabled = isBusy && !assignedHere;

                    return (
                      <td
                        key={key}
                        style={{
                          padding: 8,
                          borderBottom: '1px solid rgba(0,0,0,0.08)',
                          borderLeft: '1px solid rgba(0,0,0,0.06)',
                          textAlign: 'center',
                          width: 240,
                          minWidth: 240,
                          background: assignedHere ? 'rgba(0,0,0,0.04)' : '#fff',
                          color: '#111',
                          opacity: disabled ? 0.35 : 1,
                        }}
                      >
                        <button
                          disabled={disabled}
                          onClick={() => {
                            if (disabled) return;
                            if (assignedHere) void onUnassign(v.vehicle_id, o.order_id);
                            else void onAssign(v.vehicle_id, o.order_id);
                          }}
                          style={{
                            width: 34,
                            height: 28,
                            borderRadius: 8,
                            border: assignedHere ? '2px solid rgba(0,0,0,0.45)' : '1px solid rgba(0,0,0,0.22)',
                            background: assignedHere ? 'rgba(0,0,0,0.06)' : '#fff',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            fontWeight: 900,
                            lineHeight: '28px',
                          }}
                          title={
                            disabled
                              ? T.alreadyBusy
                              : assignedHere
                                ? '\u0421\u043d\u044f\u0442\u044c \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435'
                                : '\u041d\u0430\u0437\u043d\u0430\u0447\u0438\u0442\u044c \u043c\u0430\u0448\u0438\u043d\u0443'
                          }
                        >
                          {assignedHere ? '\u2714' : '+'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}