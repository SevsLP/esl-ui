'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type UUID = string;

type Vehicle = { id: UUID; brand: string | null; vehicle_code: string | null };
type Driver = { id: UUID; full_name: string | null; phone: string | null; employment_status: string | null };
type Trailer = { id: UUID; brand: string | null; vehicle_code: string | null };

type DayRow = {
  id: UUID;
  dispatcher_day_id: UUID;
  vehicle_id: UUID | null;
  driver_id: UUID | null;
  trailer_id: UUID | null;
  resource_status: string;
  resource_other_comment: string | null;
  vehicle_comment: string | null;
  responsible_user_id: UUID | null;
};

const UI = {
  addRow: '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0441\u0442\u0440\u043e\u043a\u0443',
  refresh: '\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c',
  deleteRow: '\u0423\u0434\u0430\u043b\u0438\u0442\u044c',
  closeDay: '\u0417\u0430\u043a\u0440\u044b\u0442\u044c \u0434\u0435\u043d\u044c',
  openDay: '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0434\u0435\u043d\u044c',
  saving: '\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435...',
  saved: '\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e',
  readonly: '\u0414\u0435\u043d\u044c \u0437\u0430\u043a\u0440\u044b\u0442. \u0422\u043e\u043b\u044c\u043a\u043e \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440.',
  err: '\u041e\u0448\u0438\u0431\u043a\u0430',
  conflictVehicle: '\u042d\u0442\u0430 \u043c\u0430\u0448\u0438\u043d\u0430 \u0443\u0436\u0435 \u0432\u044b\u0431\u0440\u0430\u043d\u0430 \u0432 \u0434\u0440\u0443\u0433\u043e\u0439 \u0441\u0442\u0440\u043e\u043a\u0435',
  conflictDriver: '\u042d\u0442\u043e\u0442 \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044c \u0443\u0436\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d \u0432 \u0434\u0440\u0443\u0433\u043e\u0439 \u0441\u0442\u0440\u043e\u043a\u0435',
  conflictTrailer: '\u042d\u0442\u043e\u0442 \u043f\u0440\u0438\u0446\u0435\u043f \u0443\u0436\u0435 \u0432\u044b\u0431\u0440\u0430\u043d \u0432 \u0434\u0440\u0443\u0433\u043e\u0439 \u0441\u0442\u0440\u043e\u043a\u0435',
  otherNeedCommentTitle: '\u0421\u0442\u0430\u0442\u0443\u0441 "\u041f\u0440\u043e\u0447\u0435\u0435"',
  otherNeedCommentText: '\u0412\u0432\u0435\u0434\u0438 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 (\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e)',
  cancel: '\u041e\u0442\u043c\u0435\u043d\u0430',
  save: '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c',
  colVehicle: '\u041c\u0430\u0448\u0438\u043d\u0430',
  colTrailer: '\u041f\u0440\u0438\u0446\u0435\u043f',
  colDriver: '\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c',
  colStatus: '\u0421\u0442\u0430\u0442\u0443\u0441',
  colComment: '\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439',
  colActions: '',
  cardTitle: '\u041a\u0430\u0440\u0442\u043e\u0447\u043a\u0430 \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044f',
  noSelection: '\u0412\u044b\u0431\u0435\u0440\u0438 \u0441\u0442\u0440\u043e\u043a\u0443 \u0432 \u0442\u0430\u0431\u043b\u0438\u0446\u0435',
  docs: '\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b',
  saveDocs: '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b',
  lastChange: '\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u0435 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435',
  responsible: '\u041e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u0439',
};

const STATUS_OPTIONS = [
  { code: 'work', label: '\u0412 \u0440\u0430\u0431\u043e\u0442\u0435' },
  { code: 'transfer', label: '\u041f\u0435\u0440\u0435\u0441\u0430\u0434\u043a\u0430' },
  { code: 'repair', label: '\u0420\u0435\u043c\u043e\u043d\u0442' },
  { code: 'no_driver', label: '\u041d\u0435\u0442 \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044f' },
  { code: 'no_trailer', label: '\u041d\u0435\u0442 \u043f\u0440\u0438\u0446\u0435\u043f\u0430' },
  { code: 'other', label: '\u041f\u0440\u043e\u0447\u0435\u0435' },
];

function fmtVehicle(v: Vehicle) {
  const a = (v.brand || '').trim();
  const b = (v.vehicle_code || '').trim();
  return [a, b].filter(Boolean).join(' ');
}
function fmtTrailer(t: Trailer) {
  const a = (t.brand || '').trim();
  const b = (t.vehicle_code || '').trim();
  return [a, b].filter(Boolean).join(' ');
}
function fmtDriver(d: Driver) {
  const a = (d.full_name || '').trim();
  const b = (d.phone || '').trim();
  return [a, b ? `(${b})` : ''].filter(Boolean).join(' ');
}
function safeMsg(e: any) {
  const m = e?.message || e?.error_description || String(e);
  if (m.includes('uq_dispatcher_day_vehicle')) return UI.conflictVehicle;
  if (m.includes('uq_dday_driver')) return UI.conflictDriver;
  if (m.includes('uq_dday_trailer')) return UI.conflictTrailer;
  return m;
}

function isDriverScheduleError(msg: string) {
  const m = (msg || '').toLowerCase();
  // сообщения БД/триггеров могут быть разными, ловим по ключевым словам
  return (
    m.includes('driver_schedule') ||
    m.includes('on_duty') ||
    m.includes('schedule') ||
    m.includes('график') ||
    m.includes('не на смене') ||
    m.includes('не на работе') ||
    m.includes('нельзя назнач') ||
    m.includes('запись в графике')
  );
}
function glowClass(code: string) {
  const c = (code || '').trim() || 'other';
  return `esl-select-${c}`;
}

export default function DispatcherDay({
  workDate,
  currentUserEmail,
}: {
  workDate: string;
  currentUserEmail?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);
  const [dayId, setDayId] = useState<UUID | null>(null);
  const [isClosed, setIsClosed] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [rows, setRows] = useState<DayRow[]>([]);

  const [toast, setToast] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string>('');

  const [selectedRowId, setSelectedRowId] = useState<UUID | null>(null);
  const selectedRow = useMemo(() => rows.find((r) => r.id === selectedRowId) || null, [rows, selectedRowId]);

  const [otherModal, setOtherModal] = useState<{ rowId: UUID; draft: string } | null>(null);

  const vehiclesById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const driversById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);
  const trailersById = useMemo(() => new Map(trailers.map((t) => [t.id, t])), [trailers]);

  const usedVehicleIds = useMemo(() => new Set(rows.map((r) => r.vehicle_id).filter(Boolean) as string[]), [rows]);
  const usedDriverIds = useMemo(() => new Set(rows.map((r) => r.driver_id).filter(Boolean) as string[]), [rows]);
  const usedTrailerIds = useMemo(() => new Set(rows.map((r) => r.trailer_id).filter(Boolean) as string[]), [rows]);

  useEffect(() => {
    let alive = true;

    async function loadAll() {
      try {
        setLoading(true);
        setToast(null);

        // важное: при смене дня сбрасываем выбор и таблицу,
        // чтобы не было "склеек" между днями
        setSelectedRowId(null);
        setRows([]);

        // применяем планы увольнения (правило ЕСЛ)
        try {
          const p = await supabase.rpc('apply_driver_employment_plans');
          if (p.error) {
            setToast({ kind: 'err', text: `${UI.err}: ${safeMsg(p.error)}` });
          }
        } catch (e: any) {
          setToast({ kind: 'err', text: `${UI.err}: ${safeMsg(e)}` });
        }

        // текущий пользователь
        try {
          const u = await supabase.auth.getUser();
          const uid = (u.data?.user as any)?.id || '';
          if (uid) setCurrentUserId(uid);
        } catch (e) {}

        // создаём день + переносим строки (если надо)
        const rpc = await supabase.rpc('ensure_dispatcher_day_with_carryover', { p_day_date: workDate });
        if (rpc.error) throw rpc.error;

        const createdDayId = rpc.data as string;
        setDayId(createdDayId);

        // флаги дня
        const dayRes = await supabase
          .from('dispatcher_days')
          .select('id, is_closed, day_status')
          .eq('id', createdDayId)
          .single();

        if (dayRes.error) throw dayRes.error;
        setIsClosed(Boolean(dayRes.data.is_closed) || dayRes.data.day_status === 'closed');

        // справочники
        const [vRes, dRes, tRes] = await Promise.all([
          supabase.from('vehicles').select('id, brand, vehicle_code').order('brand', { ascending: true }),
          supabase.from('drivers').select('id, full_name, phone, employment_status').order('full_name', { ascending: true }),
          supabase.from('trailers').select('id, brand, vehicle_code').order('brand', { ascending: true }),
        ]);

        if (vRes.error) throw vRes.error;
        if (dRes.error) throw dRes.error;
        if (tRes.error) throw tRes.error;
        if (!alive) return;

        const vList = (vRes.data || []) as Vehicle[];
        setVehicles(vList);
        setDrivers((dRes.data || []) as Driver[]);
        setTrailers((tRes.data || []) as Trailer[]);

        // строки диспетчера
        const linesRes = await supabase
          .from('dispatcher_day_lines')
          .select('id, dispatcher_day_id, vehicle_id, driver_id, trailer_id, resource_status, resource_other_comment, vehicle_comment, responsible_user_id')
          .eq('dispatcher_day_id', createdDayId)
          .order('created_at', { ascending: true });

        if (linesRes.error) throw linesRes.error;

        let finalRows = (linesRes.data || []) as DayRow[];

        // если строк нет — создаём по всем машинам
        if (finalRows.length === 0 && vList.length > 0) {
          const u = await supabase.auth.getUser();
          const userId = (u.data?.user as any)?.id || null;

          const bulk = vList.map((v) => ({
            dispatcher_day_id: createdDayId,
            vehicle_id: v.id,
            resource_status: 'work',
            responsible_user_id: userId,
          }));

          const insBulk = await supabase
            .from('dispatcher_day_lines')
            .insert(bulk)
            .select('id, dispatcher_day_id, vehicle_id, driver_id, trailer_id, resource_status, resource_other_comment, vehicle_comment, responsible_user_id');

          if (insBulk.error) throw insBulk.error;
          finalRows = (insBulk.data || []) as DayRow[];
        }

        setRows(finalRows);

        // всегда выбираем первую строку (в новом дне)
        if (finalRows.length > 0) {
          setSelectedRowId(finalRows[0].id);
        }
      } catch (e: any) {
        setToast({ kind: 'err', text: `${UI.err}: ${safeMsg(e)}` });
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadAll();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workDate, reloadTick]);

  function reload() {
    // \u043f\u0440\u043e\u0441\u0442\u043e \u043f\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0434\u0430\u043d\u043d\u044b\u0435 \u0442\u0435\u043a\u0443\u0449\u0435\u0433\u043e \u0434\u043d\u044f
    setReloadTick((x) => x + 1);
  }

  function patchRow(id: UUID, patch: Partial<DayRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function currentRowById(id: UUID) {
    return rows.find((x) => x.id === id) as DayRow | undefined;
  }

  async function saveRow(r: DayRow) {
    const effectiveDayId = r.dispatcher_day_id || dayId;
    if (!effectiveDayId) return;

    if (r.resource_status === 'other') {
      const c = (r.resource_other_comment || '').trim();
      if (!c) {
        setOtherModal({ rowId: r.id, draft: '' });
        return;
      }
    }

    setSavingId(r.id);
    setToast({ kind: 'info', text: UI.saving });

    try {
      let userId: string | null = currentUserId || null;
      if (!userId) {
        const userRes = await supabase.auth.getUser();
        userId = (userRes.data?.user as any)?.id || null;
        if (userId) setCurrentUserId(userId);
      }

      const payload: any = {
        id: r.id,
        dispatcher_day_id: effectiveDayId, // ключевой фикс: пишем в день самой строки
        vehicle_id: r.vehicle_id,
        driver_id: r.driver_id,
        trailer_id: r.trailer_id,
        resource_status: r.resource_status,
        resource_other_comment: r.resource_other_comment,
        vehicle_comment: r.vehicle_comment,
        responsible_user_id: userId,
      };

      const res = await supabase.from('dispatcher_day_lines').upsert(payload).select('id').single();
      if (res.error) throw res.error;

      setToast({ kind: 'ok', text: UI.saved });
    } catch (e: any) {
      const msg = safeMsg(e);

      // если БД отклонила назначение водителя (не на смене/нет записи графика) — очищаем строку в UI
      if (isDriverScheduleError(msg)) {
        patchRow(r.id, { driver_id: null, resource_status: 'transfer' });
      }

      setToast({ kind: 'err', text: `${UI.err}: ${msg}` });
    } finally {
      setSavingId(null);
    }
  }

  async function addRow() {
    if (!dayId || isClosed) return;

    try {
      let userId: string | null = currentUserId || null;
      if (!userId) {
        const u = await supabase.auth.getUser();
        userId = (u.data?.user as any)?.id || null;
        if (userId) setCurrentUserId(userId);
      }

      const ins = await supabase
        .from('dispatcher_day_lines')
        .insert({ dispatcher_day_id: dayId, resource_status: 'work', responsible_user_id: userId })
        .select('id, dispatcher_day_id, vehicle_id, driver_id, trailer_id, resource_status, resource_other_comment, vehicle_comment, responsible_user_id')
        .single();

      if (ins.error) throw ins.error;
      setRows((prev) => [...prev, ins.data as any]);
      setSelectedRowId((ins.data as any).id);
    } catch (e: any) {
      setToast({ kind: 'err', text: `${UI.err}: ${safeMsg(e)}` });
    }
  }

  async function deleteRow(rowId: UUID) {
    if (!dayId || isClosed) return;
    try {
      const del = await supabase.from('dispatcher_day_lines').delete().eq('id', rowId);
      if (del.error) throw del.error;
      setRows((prev) => {
        const nextRows = prev.filter((r) => r.id !== rowId);
        if (selectedRowId === rowId) {
          setSelectedRowId(nextRows.length ? nextRows[0].id : null);
        }
        return nextRows;
      });
      setToast({ kind: 'ok', text: UI.saved });
    } catch (e: any) {
      setToast({ kind: 'err', text: `${UI.err}: ${safeMsg(e)}` });
    }
  }

  async function setClosed(nextClosed: boolean) {
    if (!dayId) return;

    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data?.user?.id || null;

      const patch: any = nextClosed
        ? { day_status: 'closed', is_closed: true, closed_at: new Date().toISOString(), closed_by: userId }
        : { day_status: 'open', is_closed: false, closed_at: null, closed_by: null };

      const upd = await supabase.from('dispatcher_days').update(patch).eq('id', dayId).select('id, is_closed, day_status').single();
      if (upd.error) throw upd.error;

      setIsClosed(Boolean(upd.data.is_closed) || upd.data.day_status === 'closed');
    } catch (e: any) {
      setToast({ kind: 'err', text: `${UI.err}: ${safeMsg(e)}` });
    }
  }

  function changeVehicle(row: DayRow, nextId: string) {
    const v = nextId || null;
    if (v && rows.some((r) => r.id !== row.id && r.vehicle_id === v)) {
      setToast({ kind: 'err', text: UI.conflictVehicle });
      return;
    }
    patchRow(row.id, { vehicle_id: v });
  }

  function changeDriver(row: DayRow, nextId: string) {
    const d = nextId || null;
    if (d && rows.some((r) => r.id !== row.id && r.driver_id === d)) {
      setToast({ kind: 'err', text: UI.conflictDriver });
      return;
    }
    patchRow(row.id, { driver_id: d });
  }

  function changeTrailer(row: DayRow, nextId: string) {
    const t = nextId || null;
    if (t && rows.some((r) => r.id !== row.id && r.trailer_id === t)) {
      setToast({ kind: 'err', text: UI.conflictTrailer });
      return;
    }
    patchRow(row.id, { trailer_id: t });
  }

  function changeStatus(row: DayRow, nextStatus: string) {
    const patch: Partial<DayRow> = { resource_status: nextStatus };
    if (nextStatus === 'no_driver') patch.driver_id = null;
    if (nextStatus === 'no_trailer') patch.trailer_id = null;

    patchRow(row.id, patch);

    if (nextStatus === 'other') {
      setOtherModal({ rowId: row.id, draft: (row.resource_other_comment || '').trim() });
    }
  }

  function rowClick(id: UUID) {
    setSelectedRowId(id);
  }

  async function saveOtherComment() {
    if (!otherModal) return;
    const r = currentRowById(otherModal.rowId);
    if (!r) return;

    const text = (otherModal.draft || '').trim();
    if (!text) {
      setToast({ kind: 'err', text: UI.otherNeedCommentText });
      return;
    }

    patchRow(r.id, { resource_other_comment: text, resource_status: 'other' });
    setOtherModal(null);

    const rr = currentRowById(r.id);
    if (rr) await saveRow({ ...rr, resource_other_comment: text, resource_status: 'other' });
  }

  if (loading) {
    return <div style={{ opacity: 0.8 }}>{'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...'}</div>;
  }

  const cardDriver = selectedRow?.driver_id ? driversById.get(selectedRow.driver_id) : null;
  const cardVehicle = selectedRow?.vehicle_id ? vehiclesById.get(selectedRow.vehicle_id) : null;
  const cardTrailer = selectedRow?.trailer_id ? trailersById.get(selectedRow.trailer_id) : null;

  return (
    <div>
      <div className="esl-toast-stack">
        {toast ? (
          <div
            className={[
              'esl-toast',
              toast.kind === 'ok' ? 'esl-toast-success' : '',
              toast.kind === 'err' ? 'esl-toast-error' : '',
              toast.kind === 'info' ? 'esl-toast-info' : '',
            ].join(' ')}
          >
            {toast.text}
          </div>
        ) : null}
      </div>

      {otherModal ? (
        <div className="esl-modal-backdrop" onMouseDown={() => {}}>
          <div className="esl-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="esl-modal-title">{UI.otherNeedCommentTitle}</div>

            <div className="esl-modal-row">
              <div className="esl-card-muted">{UI.otherNeedCommentText}</div>
              <textarea
                className="esl-textarea"
                value={otherModal.draft}
                onChange={(e) => setOtherModal({ ...otherModal, draft: e.target.value })}
                placeholder={'\u041e\u043f\u0438\u0448\u0438 \u043f\u0440\u0438\u0447\u0438\u043d\u0443...'}
              />
            </div>

            <div className="esl-modal-actions">
              <button className="esl-btn" type="button" onClick={() => setOtherModal(null)}>
                {UI.cancel}
              </button>
              <button className="esl-btn" type="button" onClick={saveOtherComment}>
                {UI.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" onClick={addRow} disabled={isClosed || loading} className="esl-btn">
            {UI.addRow}
          </button>

          <button type="button" onClick={reload} disabled={loading} className="esl-btn">
            {UI.refresh}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isClosed ? <div style={{ opacity: 0.75, fontSize: 12 }}>{UI.readonly}</div> : null}

          <button type="button" onClick={() => setClosed(true)} disabled={isClosed || loading} className="esl-btn">
            {UI.closeDay}
          </button>
          <button type="button" onClick={() => setClosed(false)} disabled={!isClosed || loading} className="esl-btn">
            {UI.openDay}
          </button>
        </div>
      </div>

      <div className="esl-split">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <Th>{UI.colVehicle}</Th>
                <Th>{UI.colTrailer}</Th>
                <Th>{UI.colDriver}</Th>
                <Th>{UI.colStatus}</Th>
                <Th>{UI.colComment}</Th>
                <Th>{UI.colActions}</Th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const saving = savingId === r.id;
                const isSelected = r.id === selectedRowId;

                const safeBlurSave = () => {
                  const rr = currentRowById(r.id);
                  if (rr) saveRow(rr);
                };

                return (
                  <tr
                    key={r.id}
                    onClick={() => rowClick(r.id)}
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      background: isSelected ? 'rgba(242, 140, 40, 0.06)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <Td>
                      <select
                        className={`esl-select ${saving ? 'esl-select-saving' : ''}`}
                        value={r.vehicle_id || ''}
                        disabled={isClosed}
                        onChange={(e) => changeVehicle(r, e.target.value)}
                        onBlur={safeBlurSave}
                      >
                        <option value="">{'\u2014'}</option>
                        {vehicles.map((vv) => {
                          const usedByOther = usedVehicleIds.has(vv.id) && vv.id !== r.vehicle_id;
                          return (
                            <option key={vv.id} value={vv.id} disabled={usedByOther}>
                              {fmtVehicle(vv)}
                            </option>
                          );
                        })}
                      </select>
                    </Td>

                    <Td>
                      <select
                        className={`esl-select ${saving ? 'esl-select-saving' : ''}`}
                        value={r.trailer_id || ''}
                        disabled={isClosed}
                        onChange={(e) => changeTrailer(r, e.target.value)}
                        onBlur={safeBlurSave}
                      >
                        <option value="">{'\u2014'}</option>
                        {trailers.map((tt) => {
                          const usedByOther = usedTrailerIds.has(tt.id) && tt.id !== r.trailer_id;
                          return (
                            <option key={tt.id} value={tt.id} disabled={usedByOther}>
                              {fmtTrailer(tt)}
                            </option>
                          );
                        })}
                      </select>
                    </Td>

                    <Td>
                      <select
                        className={`esl-select ${saving ? 'esl-select-saving' : ''}`}
                        value={r.driver_id || ''}
                        disabled={isClosed}
                        onChange={(e) => changeDriver(r, e.target.value)}
                        onBlur={safeBlurSave}
                      >
                        <option value="">{'\u2014'}</option>
                        {drivers
                          .filter((dd) => (dd.employment_status || '').toLowerCase() !== 'fired')
                          .map((dd) => {
                            const usedByOther = usedDriverIds.has(dd.id) && dd.id !== r.driver_id;
                            return (
                              <option key={dd.id} value={dd.id} disabled={usedByOther}>
                                {fmtDriver(dd)}
                              </option>
                            );
                          })}
                      </select>
                    </Td>

                    <Td>
                      <select
                        className={`esl-select ${glowClass(r.resource_status)} ${saving ? 'esl-select-saving' : ''}`}
                        value={r.resource_status || 'work'}
                        disabled={isClosed}
                        onChange={(e) => changeStatus(r, e.target.value)}
                        onBlur={safeBlurSave}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </Td>

                    <Td>
                      <input
                        className="esl-date-input"
                        value={r.resource_other_comment || ''}
                        disabled={isClosed}
                        onChange={(e) => patchRow(r.id, { resource_other_comment: e.target.value })}
                        onBlur={safeBlurSave}
                        placeholder={r.resource_status === 'other' ? '\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e \u0434\u043b\u044f "\u041f\u0440\u043e\u0447\u0435\u0435"' : '\u2014'}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 10,
                          border: '1px solid #2a2a2a',
                          background: '#0b0b0b',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 12,
                          outline: 'none',
                          opacity: isClosed ? 0.6 : 1,
                        }}
                      />
                    </Td>

                    <Td>
                      <button
                        type="button"
                        className="esl-icon-btn"
                        title={UI.deleteRow}
                        disabled={isClosed}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRow(r.id);
                        }}
                      >
                        {'\u00d7'}
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="esl-card">
          <div className="esl-card-title">{UI.cardTitle}</div>

          {!selectedRow ? (
            <div className="esl-card-muted">{UI.noSelection}</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="esl-avatar" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontWeight: 900 }}>
                    {cardDriver ? (cardDriver.full_name || '\u2014') : '\u2014'}
                  </div>
                  <div className="esl-card-muted">
                    {cardDriver ? (cardDriver.phone || '\u2014') : '\u2014'}
                  </div>
                  <div>
                    <span className={`status-badge ${cardDriver && (cardDriver.employment_status === 'fired') ? 'status-fired' : 'status-active'}`}>
                      {cardDriver && cardDriver.employment_status === 'fired' ? '\u0423\u0432\u043e\u043b\u0435\u043d' : '\u0420\u0430\u0431\u043e\u0442\u0430\u0435\u0442'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="esl-card-block">
                <div className="esl-card-muted">
                  {'\u041c\u0430\u0448\u0438\u043d\u0430: '} {cardVehicle ? fmtVehicle(cardVehicle) : '\u2014'}
                </div>
                <div className="esl-card-muted" style={{ marginTop: 6 }}>
                  {'\u041f\u0440\u0438\u0446\u0435\u043f: '} {cardTrailer ? fmtTrailer(cardTrailer) : '\u2014'}
                </div>
              </div>

              <div className="esl-card-block">
                <div style={{ fontWeight: 900 }}>{UI.docs}</div>
                <div className="esl-card-muted" style={{ marginTop: 6 }}>
                  {'\u0422\u0443\u0442 \u0431\u0443\u0434\u0435\u0442 \u0445\u0440\u0430\u043d\u0438\u043b\u0438\u0449\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432 (v2).'}
                </div>
                <button className="esl-btn" type="button" style={{ marginTop: 10 }}>
                  {UI.saveDocs}
                </button>
              </div>

              <div className="esl-card-block">
                <div style={{ fontWeight: 900 }}>{UI.lastChange}</div>
                <div className="esl-card-muted" style={{ marginTop: 6 }}>
                  {UI.responsible}{': '}
                  {selectedRow.responsible_user_id
                    ? (selectedRow.responsible_user_id === (supabase as any)?._auth?.user?.id
                        ? (currentUserEmail || selectedRow.responsible_user_id.slice(0, 8))
                        : selectedRow.responsible_user_id.slice(0, 8))
                    : (currentUserEmail || '\u2014')}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Th({ children }: any) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '10px 10px',
        fontSize: 12,
        opacity: 0.85,
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: any) {
  return (
    <td style={{ padding: '8px 10px', verticalAlign: 'middle', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      {children}
    </td>
  );
}