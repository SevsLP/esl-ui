"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Tab = "vehicles" | "drivers" | "trailers";

const TXT = {
  title: "\u0421\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a\u0438",
  vehicles: "\u041c\u0430\u0448\u0438\u043d\u044b",
  drivers: "\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u0438",
  trailers: "\u041f\u0440\u0438\u0446\u0435\u043f\u044b",
  add: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c",
  loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...",
  empty: "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445",
};

export default function Page() {
  const [tab, setTab] = useState<Tab>("vehicles");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase.from(tab).select("*");

    if (!error && data) {
      setData(data);
    } else {
      setData([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [tab]);

  function getColumns() {
    if (tab === "vehicles") return ["brand", "vehicle_code"];
    if (tab === "drivers") return ["full_name", "phone"];
    if (tab === "trailers") return ["brand", "vehicle_code"];
    return [];
  }

  function renderTable() {
    if (loading) return <div>{TXT.loading}</div>;
    if (!data.length) return <div>{TXT.empty}</div>;

    const columns = getColumns();

    return (
      <div style={{ overflowX: "auto", marginTop: 15 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #222",
                    padding: "10px",
                    fontSize: 13,
                    opacity: 0.7,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td
                    key={col}
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid #111",
                      fontSize: 14,
                    }}
                  >
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function TabButton({ value, label }: { value: Tab; label: string }) {
    const active = tab === value;

    return (
      <button
        onClick={() => setTab(value)}
        style={{
          padding: "8px 14px",
          borderRadius: 10,
          border: active ? "1px solid #333" : "1px solid #222",
          background: active ? "#151515" : "#0f0f0f",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <div>
      <h1>{TXT.title}</h1>

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <TabButton value="vehicles" label={TXT.vehicles} />
        <TabButton value="drivers" label={TXT.drivers} />
        <TabButton value="trailers" label={TXT.trailers} />
      </div>

      <div style={{ marginTop: 15 }}>
        <button
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid #222",
            background: "#151515",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {TXT.add}
        </button>
      </div>

      {renderTable()}
    </div>
  );
}