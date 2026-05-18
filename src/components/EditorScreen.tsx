import { useEffect, useMemo, useState } from 'preact/hooks';
import { useStockStore } from '../store/useStockStore';
import { StockMatrix } from './StockMatrix';
import { ExportButton } from './ExportButton';
import { firstImageUrl } from '../lib/grouping';
import { parseDescricao } from '../lib/parseDescricao';

export function EditorScreen() {
  const activeParentCode = useStockStore((s) => s.activeParentCode);
  const group = useStockStore((s) =>
    s.groups.find((g) => g.parentCode === activeParentCode)
  );
  const reset = useStockStore((s) => s.reset);
  const rows = useStockStore((s) => s.rows);
  const indexByCode = useStockStore((s) => s.indexByCode);
  const persistActive = useStockStore((s) => s.persistActive);

  const [searchVar, setSearchVar] = useState('');
  const [confirmZero, setConfirmZero] = useState(false);
  const resetParentStock = useStockStore((s) => s.resetParentStock);

  useEffect(() => {
    return () => {
      persistActive();
    };
  }, [activeParentCode, persistActive]);

  const parentRow = group?.parentRow;
  const parentImg = parentRow ? firstImageUrl(parentRow) : null;

  const filteredChildren = useMemo(() => {
    if (!group) return [];

    const q = searchVar.trim().toLowerCase();
    if (!q) return group.childCodes;

    return group.childCodes.filter((code) => {
      const idx = indexByCode.get(code);
      if (idx === undefined) return false;

      const row = rows[idx];
      const parsed = parseDescricao(row['Descrição'] ?? '');

      return parsed.cor?.toLowerCase().includes(q) ?? false;
    });
  }, [group, searchVar, rows, indexByCode]);

  if (!group || !parentRow) {
    return (
      <div class="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center text-slate-500">
        <div>
          <p class="mb-4">Produto não encontrado.</p>
          <button
            type="button"
            class="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
            onClick={() => reset()}
          >
            Carregar inventário
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="flex min-h-screen flex-col bg-slate-50">
      <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div class="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 md:gap-4 md:px-8 md:py-4">
          <button
            type="button"
            onClick={() => {
              persistActive();
              reset();
            }}
            class="-ml-2 flex min-h-touch min-w-touch items-center justify-center rounded-xl text-2xl text-slate-600 hover:bg-slate-100"
            aria-label="Carregar outro inventário"
          >
            ‹
          </button>

          <div class="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 md:h-20 md:w-20">
            {parentImg && (
              <img
                src={parentImg}
                alt={parentRow['Descrição'] ?? group.parentCode}
                class="h-full w-full object-contain p-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>

          <div class="min-w-0 flex-1">
            <p class="font-mono text-xs font-semibold uppercase tracking-wide text-blue-600">
              {group.parentCode}
            </p>

            <h1 class="truncate text-base font-bold text-slate-900 md:text-xl">
              {parentRow['Descrição']}
            </h1>

            <p class="mt-1 text-xs text-slate-500 md:text-sm">
              {group.childCodes.length} variações
            </p>
          </div>
        </div>

        <div class="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 pb-3 md:flex-row md:px-8 md:pb-4">
          <input
            type="search"
            inputMode="search"
            placeholder="Buscar cor"
            value={searchVar}
            onInput={(e) => setSearchVar((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchVar('');
              }
            }}
            enterKeyHint="search"
            class="min-h-touch w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </header>

      <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-4 md:px-8 md:py-8">
        {filteredChildren.length === 0 ? (
          <div class="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            Nenhuma cor encontrada
          </div>
        ) : (
          <StockMatrix parentCode={group.parentCode} childCodes={filteredChildren} />
        )}
      </main>

      <footer class="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur">
        <div class="mx-auto flex w-full max-w-7xl justify-center md:justify-end">
          <div class="flex w-full flex-col gap-2 md:max-w-md">
            <ExportButton />
            {confirmZero ? (
              <div class="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetParentStock(group.parentCode);
                    setConfirmZero(false);
                  }}
                  class="flex-1 rounded-2xl border-2 border-red-300 bg-red-50 py-2.5 text-sm font-bold text-red-700 transition-transform active:scale-[0.98]"
                >
                  Confirmar zeragem
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmZero(false)}
                  class="flex-1 rounded-2xl border-2 border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 transition-transform active:scale-[0.98]"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmZero(true)}
                class="w-full rounded-2xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-500 transition-transform active:scale-[0.98]"
              >
                Zerar tudo
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
