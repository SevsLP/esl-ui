"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavItem = {
  href: string;
  label: string;
};

const ACCENT = "#f28c28"; // оранжевый контур
const ACTIVE_BG = "rgba(242,140,40,0.10)"; // лёгкая подложка

const TXT = {
  brand: "\u0415\u0421\u041b",

  section_manage: "\u0423\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435",
  section_reports: "\u041e\u0442\u0447\u0451\u0442\u044b",
  section_settings: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438",
  section_system: "\u0421\u0438\u0441\u0442\u0435\u043c\u0430",

  dispatcher: "\u0414\u0438\u0441\u043f\u0435\u0442\u0447\u0435\u0440",
  logistics: "\u041b\u043e\u0433\u0438\u0441\u0442\u0438\u043a\u0430",
  commerce: "\u041a\u043e\u043c\u043c\u0435\u0440\u0446\u0438\u044f",

  catalogs_group: "\u0421\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a\u0438",
  catalogs_vehicles: "\u041c\u0430\u0448\u0438\u043d\u044b",
  catalogs_drivers: "\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u0438",
  catalogs_trailers: "\u041f\u0440\u0438\u0446\u0435\u043f\u044b",

  reports: "\u041e\u0442\u0447\u0451\u0442\u044b",
  settings: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438",

  system_test: "\u0422\u0435\u0441\u0442 \u0441\u0438\u0441\u0442\u0435\u043c\u044b",
  system_roles: "\u0420\u043e\u043b\u0438 \u0438 \u0434\u043e\u0441\u0442\u0443\u043f\u044b",

  notifications_soon: "\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f: \u0441\u043a\u043e\u0440\u043e",
};

function SectionTitle({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 12, opacity: 0.65, margin: "10px 0 6px" }}>
      {text}
    </div>
  );
}

function NavLink({ href, label }: NavItem) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "10px 12px",
        borderRadius: 10,
        textDecoration: "none",
        border: active ? `1px solid ${ACCENT}` : "1px solid transparent",
        background: active ? ACTIVE_BG : "transparent",
        color: "#fff", // текст всегда белый
        fontWeight: active ? 700 : 600,
      }}
    >
      {label}
    </Link>
  );
}

function SubLink({ href, label }: NavItem) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "8px 12px 8px 30px",
        borderRadius: 10,
        textDecoration: "none",
        border: active ? `1px solid ${ACCENT}` : "1px solid transparent",
        background: active ? ACTIVE_BG : "transparent",
        color: "#fff", // текст всегда белый
        opacity: active ? 1 : 0.9,
        fontSize: 13,
        fontWeight: active ? 700 : 600,
      }}
    >
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  const isCatalogsRoute = useMemo(() => {
    return pathname.startsWith("/catalogs");
  }, [pathname]);

  const [catalogsOpen, setCatalogsOpen] = useState<boolean>(isCatalogsRoute);

  useEffect(() => {
    if (isCatalogsRoute) setCatalogsOpen(true);
  }, [isCatalogsRoute]);

  return (
    <aside
      style={{
        width: 270,
        padding: 14,
        borderRight: "1px solid #222",
        height: "100vh",
        position: "sticky",
        top: 0,
        overflowY: "auto",
        background: "#0f0f0f",
      }}
    >
      <div style={{ marginBottom: 14, fontWeight: 800, fontSize: 16 }}>
        {TXT.brand}
      </div>

      <div style={{ marginBottom: 14 }}>
        <SectionTitle text={TXT.section_manage} />
        <NavLink href="/dispatcher" label={TXT.dispatcher} />
        <NavLink href="/logistics" label={TXT.logistics} />
        <NavLink href="/commerce" label={TXT.commerce} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <button
          onClick={() => setCatalogsOpen((v) => !v)}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "10px 12px",
            borderRadius: 10,
            border: isCatalogsRoute ? `1px solid ${ACCENT}` : "1px solid #2a2a2a",
            background: isCatalogsRoute ? ACTIVE_BG : "#0f0f0f",
            color: "#fff",
            cursor: "pointer",
            fontWeight: isCatalogsRoute ? 700 : 600,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              border: `1px solid ${catalogsOpen ? ACCENT : "#444"}`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: catalogsOpen ? ACCENT : "#bbb",
              fontSize: 12,
              flex: "0 0 auto",
            }}
          >
            {catalogsOpen ? "\u25cf" : "\u25cb"}
          </span>

          <span style={{ flex: "1 1 auto" }}>{TXT.catalogs_group}</span>
        </button>

        {catalogsOpen ? (
          <div style={{ marginTop: 6 }}>
            <SubLink href="/catalogs/vehicles" label={TXT.catalogs_vehicles} />
            <SubLink href="/catalogs/drivers" label={TXT.catalogs_drivers} />
            <SubLink href="/catalogs/trailers" label={TXT.catalogs_trailers} />
          </div>
        ) : null}
      </div>

      <div style={{ marginBottom: 14 }}>
        <SectionTitle text={TXT.section_reports} />
        <NavLink href="/reports" label={TXT.reports} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <SectionTitle text={TXT.section_settings} />
        <NavLink href="/settings" label={TXT.settings} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <SectionTitle text={TXT.section_system} />
        <NavLink href="/system/test" label={TXT.system_test} />
        <NavLink href="/system/roles" label={TXT.system_roles} />
      </div>

      <div style={{ marginTop: 18, fontSize: 12, opacity: 0.7 }}>
        {TXT.notifications_soon}
      </div>
    </aside>
  );
}