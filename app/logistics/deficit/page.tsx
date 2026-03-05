'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
function fmtDateYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10);
}
type DeficitRow = {
  order_id: string;
  order_number: string | null;
  client_name: string | null;
  load_point: string | null;
  unload_point: string | null;
  load_date: string | null;
  remaining_tons: number | null;
  remaining_vehicles_estimate: number | null;
  vehicles_required: number | null;
}; 

const T = {
  title: '\u041b\u043e\u0433\u0438\u0441\u0442\u0438\u043a\u0430 \u2014 \u0414\u0435\u0444\u0438\u0446\u0438\u0442',
  back: '\u2190 \u041d\u0430430\u0437\u0430430\u0434',
  date: '\u0414\u0430\u0442\u0430',
  refresh: '\u041e\u0431\u043d\u043043e\u0432\u0438\u0442\u044c',
  loading: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430430...',
  empty: '\u0414\u0435\u0444\u0438\u0446\u0430438\u0442\u0430430 \u043d\u0430435\u0442 \u043d\u0430430 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u0443\u044e \u0434\u0430\u0442\u0443',
  openMatrix: '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0432 \u043c\u0430\u0442\u0440\u0438\u0446\u0435',
  needLeft: '\u041e\u0441\u0442\u0430\u0442\u043e\u043a (\u043c\u0430430\u0448\u0438\u043d)',
  needTotal: '\u0422\u0440\u0435\u0431. \u0432\u0441\u0435\u0433\u043043e',
  assigned: '\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043043d\u043e',
  left: '\u041e\u0441\u0442\u0430430\u043b\u043043e\u0441\u044c',
};

function orderNum(row: DeficitRow): string {
  return row.order_number ? `#${row.order_number}` : '\u0417\u0430\u044f\u0432\u043a\u0430430';
}

export default function LogisticsDeficitPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [date, setDate] = useState<string>(() => fmtDateYYYYMMDD(new Date(Date.now() + 86400000)));
  const [rows, setRows] = useState<DeficitRow[]>([]);
  const [assignedCount, setAssignedCount] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [msg, setMsg] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setMsg('');
    try {
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders_progress_view')
        .select('order_id,order_number,client_name,load_point,unload_point,load_date,remaining_tons,remaining_vehicles_estimate,vehicles_required')
        .or(`load_date.eq.${date},and(period_from.not.is.null,period_to.not.is.null,period_from.lte.${date},period_to.gte.${date})`)
        .gt('remaining_vehicles_estimate', 0)
        .order('remaining_vehicles_estimate', { ascending: false })
        .limit(200);

      if (ordersErr) throw ordersErr;

      const { data: asgData, error: asgErr } = await supabase
        .from('logistics')
        .select('order_id')
        .is('archived_at', null)
        .not('trip_status', 'in', '("done","completed","canceled","cancelled")')
        .limit(8000);

      if (asgErr) throw asgErr;

      const m = new Map<string, number>();
      for (const a of asgData ?? []) {
        const oid = (a as any).order_id as string;
        if (oid) m.set(oid, (m.get(oid) ?? 0) + 1);
      }

      setRows((ordersData ?? []).map((x: any) => ({
        order_id: x.order_id,
        order_number: x.order_number ?? null,
        client_name: x.client_name ?? null,
        load_point: x.load_point ?? null,
        unload_point: x.unload_point ?? null,
        load_date: x.load_date ?? null,
        remaining_tons: x.remaining_tons ?? null,
        remaining_vehicles_estimate: x.remaining_vehicles_estimate ?? null,
        vehicles_required: x.vehicles_required ?? null,
      })) as DeficitRow[]);
      setAssignedCount(m);
    } catch (e: any) {
      setMsg((e?.message || String(e)) ?? '\u041e\u0448\u0438\u0431\u043a\u0430');
    } finally {
      setLoading(false);
    }
  }, [supabase, date]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="page-wrapper logistics-deficit-page" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ color: '#fff' }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{T.title}</div>
          <div style={{ marginTop: 6 }}>
            <a href="/logistics" style={{ color: '#fff', opacity: 0.85, textDecoration: 'none' }}>{T.back}</a>
          </div>
        </div>
        <button onClick={() => void load()} disabled={loading} style={{ padding: '8px 10px' }}>
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
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: 8, minWidth: 200 }} />
        </label>
      </div>

      {(!loading && rows.length === 0) ? (
        <div style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}>
          {T.empty}
        </div>
      ) : null}

      <div style={{ overflow: 'auto', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 10, background: '#0b0b0b' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
              <th style={{ textAlign: 'left', padding: 10, fontSize: 12, opacity: 0.95 }}>Заявка430</th>
              <th style={{ textAlign: 'left', padding: 10, fontSize: 12, opacity: 0.95 }}>Маршрут</th>
              <th style={{ textAlign: 'right', padding: 10, fontSize: 12, opacity: 0.95 }}>{T.needTotal}</th>
              <th style={{ textAlign: 'right', padding: 10, fontSize: 12, opacity: 0.95 }}>{T.needLeft}</th>
              <th style={{ textAlign: 'right', padding: 10, fontSize: 12, opacity: 0.95 }}>{T.assigned}</th>
              <th style={{ textAlign: 'right', padding: 10, fontSize: 12, opacity: 0.95 }}>{T.left}</th>
              <th style={{ textAlign: 'left', padding: 10, fontSize: 12, opacity: 0.95 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const needLeft = r.remaining_vehicles_estimate ?? 0;
              const needTotal = r.vehicles_required ?? 0;
              const asg = assignedCount.get(r.order_id) ?? 0;
              const left = Math.max(0, needLeft - asg);
              return (
                <tr key={r.order_id} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <td style={{ padding: 10, fontWeight: 800 }}>{orderNum(r)}</td>
                  <td style={{ padding: 10, opacity: 0.9 }}>{(r.load_point ?? '') + '→' + (r.unload_point ?? '')}</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>{needTotal}</td>
                  <td style={{ padding: 10, textAlign: 'right', fontWeight: 900 }}>{needLeft}</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>{asg}</td>
                  <td style={{ padding: 10, textAlign: 'right', fontWeight: 900 }}>{left}</td>
                  <td style={{ padding: 10 }}>
                    <a
                      href="/logistics/matrix"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 30,
                        padding: '0 10px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.22)',
                        color: '#fff',
                        textDecoration: 'none',
                        background: 'rgba(0,0,0,0.35)',
                      }}
                    >
                      {T.openMatrix}
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
