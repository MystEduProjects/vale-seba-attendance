"use client";

import { useEffect, useState, useMemo } from "react";
import { Row } from "./types";
import { formatValue, normalizeSearchText } from "./utils/functions";
import { exportToExcel } from "./utils/excel";

const BASE_URL = "https://marriage-page-api.vercel.app";
const endpoint = "/people"

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
  allergies: "Alergias/Restricciones",
  attend: "Asiste?",
  escort: "Nombre Acompañante",
  escortAllergies: "Alergias/Restricciones Acompañante",
  escortMenu: "Menu Acompañante",
  menu: "Menu",
  wantsEscort: "Quiere Acompañante?"
};

// ── Helpers ───────────────────────────────────────────────────────
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

const NEW_ROW_PREFIX = "new-";

function getRowId(row: Row): string {
  return String(row._id ?? row.id ?? "");
}

function isNewRow(row: Row): boolean {
  return getRowId(row).startsWith(NEW_ROW_PREFIX);
}

function createEmptyRow(): Row {
  return {
    id: `${NEW_ROW_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    attend: null,
    menu: "",
    allergies: "",
    availableEscort: false,
    wantsEscort: false,
    escort: "",
    escortMenu: "",
    escortAllergies: "",
  };
}

function EditableCell({
  column,
  value,
  onChange,
}: {
  column: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (column === "attend") {
    const selectValue =
      value === true || value === "true"
        ? "true"
        : value === false || value === "false"
        ? "false"
        : "";

    return (
      <select
        value={selectValue}
        onChange={(event) => {
          const selectedValue = event.target.value;
          onChange(selectedValue === "" ? null : selectedValue === "true");
        }}
        className="w-full min-w-32 rounded-md border border-violet-500/50 bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-violet-500/50"
      >
        <option value="">Sin definir</option>
        <option value="true">Si</option>
        <option value="false">No</option>
      </select>
    );
  }

  if (typeof value === "boolean") {
    return (
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-violet-500"
      />
    );
  }

  const textValue = value === null || value === undefined ? "" : formatValue(value);
  return (
    <input
      type="text"
      value={textValue}
      onChange={(event) => onChange(event.target.value)}
      className="w-full min-w-32 rounded-md border border-violet-500/50 bg-white/10 px-2 py-1 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-violet-500/50"
    />
  );
}

// ── DataTable ─────────────────────────────────────────────────────
function DataTable({ endpoint, arrayKey }: { endpoint: string; arrayKey: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [draftRows, setDraftRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const PAGE_SIZE = 15;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setRows([]);
    setDraftRows(null);
    setSaveError(null);
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

  const isEditing = draftRows !== null;
  const workingRows = draftRows ?? rows;

  const filtered = useMemo(() => {
    if (!search.trim()) return workingRows;
    const q = normalizeSearchText(search);
    return workingRows.filter((r) =>
      [getRowId(r), ...columns.map((col) => formatValue(r[col]))]
        .some((value) => normalizeSearchText(value).includes(q))
    );
  }, [workingRows, search, columns]);

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

  const startEditing = () => {
    setDraftRows(rows.map((row) => ({ ...row })));
    setError(null);
    setSaveError(null);
  };

  const startAdding = () => {
    setDraftRows([createEmptyRow(), ...rows.map((row) => ({ ...row }))]);
    setSearch("");
    setSortKey(null);
    setPage(1);
    setError(null);
    setSaveError(null);
  };

  const cancelEditing = () => {
    if (saving) return;
    setDraftRows(null);
    setSaveError(null);
  };

  const updateDraftValue = (rowId: string, column: string, value: unknown) => {
    setDraftRows((currentRows) =>
      currentRows?.map((row) => getRowId(row) === rowId ? { ...row, [column]: value } : row) ?? null
    );
  };

  const saveChanges = async () => {
    if (!draftRows) return;

    const newRows = draftRows.filter(isNewRow);
    const changedRows = draftRows.filter((draftRow) => {
      if (isNewRow(draftRow)) return false;
      const originalRow = rows.find((row) => getRowId(row) === getRowId(draftRow));
      return originalRow && JSON.stringify(draftRow) !== JSON.stringify(originalRow);
    });

    if (!changedRows.length && !newRows.length) {
      setDraftRows(null);
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const updatedRows = await Promise.all(changedRows.map(async (draftRow) => {
        const id = getRowId(draftRow);
        if (!id) throw new Error(`La persona "${formatValue(draftRow.name)}" no tiene un ID válido.`);
        const originalRow = rows.find((row) => getRowId(row) === id);
        if (!originalRow) throw new Error("No se encontró la fila original.");

        const updateData = Object.fromEntries(
          columns
            .filter((column) => JSON.stringify(draftRow[column]) !== JSON.stringify(originalRow[column]))
            .map((column) => [column, draftRow[column]])
        );

        const response = await fetch(`${BASE_URL}${endpoint}/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          throw new Error(`No se pudo actualizar "${formatValue(draftRow.name)}" (Error ${response.status}).`);
        }

        return await response.json() as Row;
      }));

      const createdRows = await Promise.all(newRows.map(async (newRow) => {
        const createData = Object.fromEntries(columns.map((column) => [column, newRow[column]]));
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createData),
        });

        if (!response.ok) {
          throw new Error(`No se pudo agregar "${formatValue(newRow.name)}" (Error ${response.status}).`);
        }

        return await response.json() as Row;
      }));

      setRows((currentRows) => [
        ...currentRows.map((row) =>
          updatedRows.find((updatedRow) => getRowId(updatedRow) === getRowId(row)) ?? row
        ),
        ...createdRows,
      ]);
      setDraftRows(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row: Row) => {
    const id = getRowId(row);
    if (!id || isNewRow(row) || saving) return;
    if (!window.confirm(`¿Eliminar a "${formatValue(row.name)}"? Esta acción no se puede deshacer.`)) return;

    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(`${BASE_URL}${endpoint}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`No se pudo eliminar "${formatValue(row.name)}" (Error ${response.status}).`);
      }
      setRows((currentRows) => currentRows.filter((currentRow) => getRowId(currentRow) !== id));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "No se pudo eliminar la persona.");
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div>
      {/* Search + count + export */}
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

        {isEditing ? (
          <>
            <button
              onClick={cancelEditing}
              disabled={saving}
              className="px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Cancelar
            </button>
            <button
              onClick={saveChanges}
              disabled={saving}
              className="px-3 py-2 rounded-lg text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? "Guardando…" : "Confirmar"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startAdding}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 transition"
            >
              Añadir
            </button>
            <button
              onClick={startEditing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 text-white/70 hover:text-white hover:bg-white/10 border border-white/30 hover:border-white/60 transition"
            >
              Editar
            </button>
            <button
              onClick={() => exportToExcel(sorted, columns, COLUMN_LABELS)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 text-white/70 hover:text-white hover:bg-white/10 border border-white/30 hover:border-white/60 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Descargar Excel
            </button>
          </>
        )}

        <p className="text-xs text-slate-500">
          <span className="text-slate-300 font-medium">{filtered.length}</span>
          {" "}/ {workingRows.length} registros
        </p>
      </div>
      {saveError && (
        <p className="mb-4 text-sm text-red-400">{saveError}</p>
      )}

      {/* Table */}
      <div className="rounded-xl border border-white/5 overflow-hidden shadow-2xl shadow-black/40">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/5">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Acciones</th>
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
                <tr key={getRowId(row)} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteRow(row)}
                      disabled={isEditing || saving || isNewRow(row)}
                      className="rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30 transition"
                    >
                      Eliminar
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </td>
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-3 text-slate-300 whitespace-nowrap max-w-xs truncate">
                      {isEditing ? (
                        <EditableCell
                          column={col}
                          value={row[col]}
                          onChange={(value) => updateDraftValue(getRowId(row), col, value)}
                        />
                      ) : isStatusCol(col) && typeof row[col] === "string" ? (
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