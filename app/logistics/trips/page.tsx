'use client';

import React from 'react';

const T = {
  title: '\u041b\u043e\u0433\u0438\u0441\u0442\u0438\u043a\u0430 \u2014 \u0420\u0435\u0439\u0441\u044b',
  back: '\u2190 \u041d\u0430430\u0437\u0430430\u0434',
  wip: '\u0412 \u0440\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u043043a\u0435: \u0442\u0430\u0431\u043b\u0438\u0446\u0430 \u0440\u0435\u0439\u0441\u043043e\u0432 + \u043a\u0430\u0440\u0442\u043e\u0447\u043043a\u0430 + \u043b\u0435\u043d\u0442\u0430430 \u0441\u043e\u0431\u044b\u0442\u0438\u0439.',
};

export default function LogisticsTripsPage() {
  return (
    <div className="page-wrapper logistics-trips-page" style={{ padding: 16, color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{T.title}</div>
          <div style={{ marginTop: 6 }}>
            <a href="/logistics" style={{ color: '#fff', opacity: 0.85, textDecoration: 'none' }}>{T.back}</a>
          </div>
        </div>
      </div>

      <div style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)' }}>
        {T.wip}
      </div>
    </div>
  );
}
