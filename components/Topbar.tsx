"use client";

import { useState } from "react";

const TXT = {
  title: "\u0415\u0421\u041b",
  notifications: "\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f",
  empty: "\u041f\u043e\u043a\u0430 \u043f\u0443\u0441\u0442\u043e",
  close: "\u0417\u0430\u043a\u0440\u044b\u0442\u044c",
  test_hint:
    "\u041f\u043e\u0437\u0436\u0435 \u0442\u0443\u0442 \u0431\u0443\u0434\u0443\u0442: \u043f\u0440\u043e\u0441\u0440\u043e\u0447\u043a\u0430 \u0441\u0442\u0430\u0442\u0443\u0441\u0430, \u0434\u0443\u0431\u043b\u0438 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0439, \u0440\u0438\u0441\u043a\u0438, \u043e\u0448\u0438\u0431\u043a\u0438 \u043f\u0440\u0430\u0432.",
};

function BellIcon() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 18,
        height: 18,
        lineHeight: "18px",
        textAlign: "center",
        borderRadius: 6,
        border: "1px solid #333",
        fontSize: 12,
        opacity: 0.9,
      }}
    >
      {"\u25cf"}
    </span>
  );
}

export function Topbar() {
  // Пока заглушка: потом заменим на реальные уведомления из БД (risks/view + system_logs)
  const [open, setOpen] = useState(false);
  const unreadCount = 0;

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 12px",
          borderBottom: "1px solid #1f1f1f",
          background: "#000",
        }}
      >
        <div style={{ fontWeight: 700, opacity: 0.9 }}>{TXT.title}</div>

        <div style={{ marginLeft: "auto", position: "relative" }}>
          <button
            onClick={() => setOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #2a2a2a",
              background: "#0f0f0f",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <BellIcon />
            <span style={{ fontSize: 13 }}>{TXT.notifications}</span>

            <span
              style={{
                marginLeft: 6,
                minWidth: 18,
                height: 18,
                padding: "0 6px",
                borderRadius: 999,
                border: "1px solid #333",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                opacity: 0.9,
              }}
            >
              {unreadCount}
            </span>
          </button>

          {open ? (
            <div
              style={{
                position: "absolute",
                right: 0,
                marginTop: 8,
                width: 360,
                borderRadius: 12,
                border: "1px solid #2a2a2a",
                background: "#0b0b0b",
                padding: 12,
                boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 700 }}>{TXT.notifications}</div>
                <div style={{ marginLeft: "auto" }}>
                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: "1px solid #2a2a2a",
                      background: "#0f0f0f",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    {TXT.close}
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
                {TXT.empty}
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
                {TXT.test_hint}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}