"use client";

import { useEffect, useState, useMemo } from "react";

const BASE_URL = "https://marriage-page-api.vercel.app";
const endpoint = "/people"

type Row = Record<string, unknown>;

// ── Column label map ──────────────────────────────────────────────
const columns: Array<string> = [
  'name',
  'attend',
  'menu',
  'allergies',
  'availableEscort',
  'wantsEscort',
  'escort',
  'escortMenu',
  'escortAllergies',
]

const COLUMN_LABELS: Record<string, string> = {
  name: "Nombre",
  availableEscort: "Acompañante Disponible?",
  allergies: "Alergias",
  attend: "Asiste?",
  escort: "Nombre Acompañante",
  escortAllergies: "Alergias Acompañante",
  escortMenu: "Menu Acompañante",
  menu: "Menu",
  wantsEscort: "Quiere Acompañante?"
};

// ── Helpers ───────────────────────────────────────────────────────
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Si" : "No";
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
                      {COLUMN_LABELS[col] ?? null}
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
  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 font-sans">
      <main className="px-12 py-8">
        <DataTable
          endpoint={endpoint}
          arrayKey={'people'}
        />
      </main>
    </div>
  );
}