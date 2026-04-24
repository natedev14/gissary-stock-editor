import { useEffect, useMemo, useState } from 'preact/hooks';
import { useStockStore } from '../store/useStockStore';
import { ModeToggle } from './ModeToggle';
import { VariationCard } from './VariationCard';
import { ExportButton } from './ExportButton';
import { firstImageUrl } from '../lib/grouping';
import { parseDescricao } from '../lib/parseDescricao';

export function EditorScreen() {
  const activeParentCode = useStockStore((s) => s.activeParentCode);
  const group = useStockStore((s) =>
    s.groups.find((g) => g.parentCode === activeParentCode)
  );
  const mode = useStockStore((s) => s.mode);
  const setActive = useStockStore((s) => s.setActiveParent);
  const rows = useStockStore((s) => s.rows);
  const indexByCode = useStockStore((s) => s.indexByCode);
  const persistActive = useStockStore((s) => s.persistActive);

  const [searchVar, setSearchVar] = useState('');
  const [auditCounts, setAuditCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (mode === 'audit') {
      setAuditCounts({});
    }
  }, [mode, activeParentCode]);

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
      const desc = (row['Descrição'] ?? '').toLowerCase();
      if (code.toLowerCase().includes(q)) return true;
      if (desc.includes(q)) return true;
      const parsed = parseDescricao(row['Descrição'] ?? '');
      if (parsed.cor?.toLowerCase().includes(q)) return true;
      if (parsed.tamanho?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [group, searchVar, rows, indexByCode]);

  if (!group || !parentRow) {
    return (
      <div class="p-6 text-center text-gray-500">
        Modelo no encontrado.{' '}
        <button class="underline" onClick={() => setActive(null)}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <div class="flex flex-col min-h-screen bg-gray-50">
      <header class="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div class="flex items-center gap-3 px-3 py-3">
          <button
            type="button"
            onClick={() => {
              persistActive();
              setActive(null);
            }}
            class="min-h-touch min-w-touch flex items-center justify-center text-gray-700 text-2xl -ml-2"
            aria-label="Volver"
          >
            ‹
          </button>
          <div class="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
            {parentImg && (
              <img
                src={parentImg}
                alt=""
                class="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-gray-900 truncate">{group.parentCode}</p>
            <p class="text-xs text-gray-500 truncate">{parentRow['Descrição']}</p>
          </div>
        </div>
        <div class="px-3 pb-3 flex flex-col gap-3">
          <ModeToggle />
          <input
            type="search"
            inputMode="search"
            placeholder='Buscar variación (ej. "Rosa", "GG")'
            value={searchVar}
            onInput={(e) => setSearchVar((e.target as HTMLInputElement).value)}
            class="w-full min-h-touch px-4 rounded-xl bg-gray-100 text-gray-900 placeholder-gray-400 border-0 focus:ring-2 focus:ring-gray-900 focus:outline-none"
          />
        </div>
      </header>

      <main class="flex-1 px-3 py-4 pb-32">
        {filteredChildren.length === 0 && (
          <div class="p-8 text-center text-gray-400 text-sm">Sin variaciones que coincidan</div>
        )}
        <ul class="flex flex-col gap-3">
          {filteredChildren.map((childCode) => (
            <li key={childCode}>
              <VariationCard
                parentCode={group.parentCode}
                childCode={childCode}
                auditValue={mode === 'audit' ? auditCounts[childCode] ?? 0 : null}
                onAuditChange={(n) =>
                  setAuditCounts((prev) => ({ ...prev, [childCode]: n }))
                }
              />
            </li>
          ))}
        </ul>
      </main>

      <footer class="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-3 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <ExportButton />
      </footer>
    </div>
  );
}
