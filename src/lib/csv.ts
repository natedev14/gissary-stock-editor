import Papa from 'papaparse';
import type { CsvMeta, CsvRow } from '../types';

export interface ParseResult {
  rows: CsvRow[];
  meta: CsvMeta;
}

/**
 * Parser CSV. Punto crítico del PRD (R2):
 * capturamos meta.fields DINÁMICAMENTE para garantizar que el re-export
 * preserve el orden y nombre exacto de las columnas que vinieron del ERP.
 */
export function parseCsv(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      // dynamicTyping:false → mantenemos TODO como string. Un "10.0" no se
      // vuelve 10, un "16,99" no se toca. La columna Estoque la tratamos
      // como integer solo en la UI, pero se exporta string.
      dynamicTyping: false,
      delimiter: ';',
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (!results.meta.fields || results.meta.fields.length === 0) {
          reject(new Error('Archivo de ERP no compatible: no se detectaron cabeceras.'));
          return;
        }
        resolve({
          rows: results.data as CsvRow[],
          meta: { fields: results.meta.fields },
        });
      },
      error: (err) => reject(err),
    });
  });
}

/**
 * Export CSV fiel al original:
 * - Usa meta.fields como columns → orden y nombres exactos
 * - quotes: true global → protege comas en precios ("16,99") y HTML en Descrição Complementar
 * - newline: \r\n → coincide con el formato de Bling (Windows line endings)
 * - BOM UTF-8 prefix → garantiza que Excel/Bling lean caracteres portugueses correctamente
 */
export function exportCsv(rows: CsvRow[], meta: CsvMeta): Blob {
  const csv = Papa.unparse(
    {
      fields: meta.fields,
      data: rows,
    },
    {
      quotes: true,           // quote every field — decisión deliberada para máxima fidelidad
      delimiter: ',',
      newline: '\r\n',
      header: true,
    }
  );

  // BOM UTF-8 al principio. Bling y Excel lo esperan.
  const BOM = '\uFEFF';
  return new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Liberar después de un tick para que el download arranque
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function buildExportFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  return `gissary_estoque_editado_${ts}.csv`;
}
