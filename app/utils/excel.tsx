import * as XLSX from "xlsx";
import { Row } from "../types";
import { formatValue } from "./functions";

export function exportToExcel(rows: Row[], columns: string[], labels: Record<string, string>, filename = "datos.xlsx") {
  // Mapeamos cada row a un objeto plano usando los labels en español como headers,
  // y reusamos formatValue para que el excel muestre "Si"/"No" en vez de true/false, etc.
  const exportData = rows.map((row) => {
    const formattedRow: Record<string, string> = {};
    columns.forEach((col) => {
      formattedRow[labels[col] ?? col] = formatValue(row[col]);
    });
    return formattedRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");

  // Ancho de columna automático según el contenido más largo
  const colWidths = columns.map((col) => {
    const header = labels[col] ?? col;
    const maxContentLength = Math.max(
      header.length,
      ...exportData.map((row) => String(row[header] ?? "").length)
    );
    return { wch: Math.min(maxContentLength + 2, 40) };
  });
  worksheet["!cols"] = colWidths;

  XLSX.writeFile(workbook, filename);
}