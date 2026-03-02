import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export const metadata: Metadata = {
  title: "ESL",
  description: "ESL System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          background: "#000",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar />

          <div style={{ flex: 1, minWidth: 0 }}>
            <Topbar />
            <main style={{ padding: 20 }}>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}