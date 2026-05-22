"use client";

import { useEffect, useState, useMemo } from "react";

const BASE_URL = "https://marriage-page-api.vercel.app";

type Row = Record<string, unknown>;

// ── Tab definitions ──────────────────────────────────────────────
const TABS = [
  {
    key: "people",
    label: "Personas",
    endpoint: "/people",
    arrayKey: "people",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: "gifts",
    label: "Lista de regalos",
    endpoint: "/gifts",
    arrayKey: "gifts",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
  },
  {
    key: "purchases",
    label: "Regalos comprados",
    endpoint: "/purchases",
    arrayKey: "purchases",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ── Column label map ──────────────────────────────────────────────
const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  name: "Nombre",
  first_name: "Nombre",
  last_name: "Apellido",
  email: "Email",
  phone: "Teléfono",
  age: "Edad",
  gender: "Género",
  status: "Estado",
  price: "Precio",
  quantity: "Cantidad",
  description: "Descripción",
  gift_id: "ID Regalo",
  person_id: "ID Persona",
  purchased_by: "Comprado por",
  purchased_at: "Fecha compra",
  created_at: "Creado",
  updated_at: "Actualizado",
};

// ── Helpers ───────────────────────────────────────────────────────
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function StatusBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();
  const color =
    lower === "active" || lower === "activo"
      ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
      : lower === "inactive" || lower === "inactivo"
      ? "bg-slate-500/10 text-slate-400 ring-slate-500/20"
      : lower === "pending" || lower === "pendiente"
      ? "bg-amber-500/10 text-amber-400 ring-amber-500/20"
      : "bg-violet-500/10 text-violet-400 ring-violet-500/20";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${color}`}>
      {value}
    </span>
  );
}

const isStatusCol = (col: string) =>
  col.toLowerCase().includes("status") || col.toLowerCase().includes("estado");

// ── DataTable ─────────────────────────────────────────────────────
function DataTable({ endpoint, arrayKey }: { endpoint: string; arrayKey: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setRows([]);
    setSearch("");
    setSortKey(null);
    setPage(1);

    fetch(`${BASE_URL}${endpoint}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        const arr = Array.isArray(data)
          ? data
          : data[arrayKey] ?? data.data ?? [];
        setRows(arr);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [endpoint, arrayKey]);

  const columns = useMemo(() => {
    if (!rows.length) return [];
    const keys = new Set<string>();
    rows.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [rows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      columns.some((col) => formatValue(r[col]).toLowerCase().includes(q))
    );
  }, [rows, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = formatValue(a[sortKey]);
      const bv = formatValue(b[sortKey]);
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
        <p className="text-slate-500 text-sm">Cargando datos…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-red-400 font-medium text-sm">{error}</p>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-slate-400 text-sm">No se encontraron registros.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search + count */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="relative w-full sm:w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar en todos los campos…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition"
          />
        </div>
        <p className="text-xs text-slate-500">
          <span className="text-slate-300 font-medium">{filtered.length}</span>
          {" "}/ {rows.length} registros
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/5 overflow-hidden shadow-2xl shadow-black/40">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/5">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 w-10">#</th>
                {columns.map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="px-4 py-3 text-left text-xs font-medium text-slate-400 whitespace-nowrap cursor-pointer hover:text-slate-200 select-none group transition"
                  >
                    <div className="flex items-center gap-1.5">
                      {COLUMN_LABELS[col] ?? col}
                      {sortKey === col ? (
                        <span className="text-violet-400">{sortDir === "asc" ? "↑" : "↓"}</span>
                      ) : (
                        <span className="text-slate-600 opacity-0 group-hover:opacity-100 transition">↕</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </td>
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-3 text-slate-300 whitespace-nowrap max-w-xs truncate">
                      {isStatusCol(col) && typeof row[col] === "string" ? (
                        <StatusBadge value={row[col] as string} />
                      ) : (
                        <span title={formatValue(row[col])}>{formatValue(row[col])}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Página <span className="text-slate-300">{page}</span> de{" "}
            <span className="text-slate-300">{totalPages}</span>
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1.5 rounded-md text-xs text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition">«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition">Anterior</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              return start + i;
            }).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-md text-xs transition ${p === page ? "bg-violet-600 text-white font-medium shadow shadow-violet-500/30" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>{p}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition">Siguiente</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1.5 rounded-md text-xs text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition">»</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("people");
  const current = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0f1117]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-wide">Panel de boda</h1>
            <p className="text-xs text-slate-500">marriage-page-api · {current.endpoint}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white/[0.03] border border-white/5 rounded-xl p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-violet-600 text-white shadow shadow-violet-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table panel */}
        <DataTable
          key={activeTab}
          endpoint={current.endpoint}
          arrayKey={current.arrayKey}
        />
      </main>
    </div>
  );
}
