'use client';

import { useMemo, useState, useEffect } from 'react';
import DispatcherDay from '../../components/DispatcherDay';
import DriverScheduleWeek from '../../components/DriverScheduleWeek';
import { supabase } from '../../lib/supabaseClient';

const UI = {
  title: '\u0414\u0438\u0441\u043f\u0435\u0442\u0447\u0435\u0440',
  tab_day: '\u0414\u0435\u043d\u044c',
  tab_week: '\u0413\u0440\u0430\u0444\u0438\u043a \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u0435\u0439',
};

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function DispatcherPage() {
  const [tab, setTab] = useState<'day' | 'week'>('day');
  const [workDate, setWorkDate] = useState<string>(() => toISODate(new Date()));

  useEffect(() => {
    (async () => {
      try {
        const r: any = supabase.rpc('apply_driver_employment_plans');
        await Promise.resolve(r);
      } catch (e) {}
    })();
  }, []);

  const header = useMemo(() => UI.title, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* шапка: слева заголовок+вкладки, справа календарь */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{header}</div>

          <div className="esl-tabs">
            <button
              type="button"
              className={`esl-tab ${tab === 'day' ? 'esl-tab-active' : ''}`}
              onClick={() => setTab('day')}
            >
              {UI.tab_day}
            </button>
            <button
              type="button"
              className={`esl-tab ${tab === 'week' ? 'esl-tab-active' : ''}`}
              onClick={() => setTab('week')}
            >
              {UI.tab_week}
            </button>
          </div>
        </div>

        {/* календарь */}
        <input
           className="esl-date"
  type="date"
  value={workDate}
  onChange={(e) => setWorkDate(e.target.value)}
        />
      </div>

      {tab === 'day' ? <DispatcherDay workDate={workDate} /> : <DriverScheduleWeek anchorDate={workDate} />}
    </div>
  );
}