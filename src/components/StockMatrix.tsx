import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useStockStore } from '../store/useStockStore';
import { firstImageUrl } from '../lib/grouping';
import { parseDescricao } from '../lib/parseDescricao';

type MatrixCell = {
  childCode: string;
  stock: number;
  isDirty: boolean;
};

type MatrixRow = {
  color: string;
  image: string | null;
  cells: Record<string, MatrixCell>;
};

interface Props {
  parentCode: string;
  childCodes: string[];
}

const SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'U', 'ÚNICO'];

export function StockMatrix({ parentCode, childCodes }: Props) {
  const [openImage, setOpenImage] = useState<{ src: string; label: string } | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const rows = useStockStore((s) => s.rows);
  const indexByCode = useStockStore((s) => s.indexByCode);
  const dirtyByParent = useStockStore((s) => s.dirtyByParent);
  const updateChildStock = useStockStore((s) => s.updateChildStock);

  const dirtySet = dirtyByParent[parentCode] ?? new Set<string>();

  const { colors, sizes } = useMemo(() => {
    const byColor = new Map<string, MatrixRow>();
    const sizeSet = new Set<string>();

    for (const childCode of childCodes) {
      const idx = indexByCode.get(childCode);
      if (idx === undefined) continue;

      const row = rows[idx];
      const parsed = parseDescricao(row['Descrição'] ?? '');
      const color = parsed.cor || 'Sem cor';
      const size = parsed.tamanho || 'ÚNICO';
      const stock = parseStock(row['Estoque']);

      sizeSet.add(size);

      const existing = byColor.get(color) ?? {
        color,
        image: firstImageUrl(row),
        cells: {},
      };

      if (!existing.image) {
        existing.image = firstImageUrl(row);
      }

      existing.cells[size] = {
        childCode,
        stock,
        isDirty: dirtySet.has(childCode),
      };

      byColor.set(color, existing);
    }

    return {
      colors: Array.from(byColor.values()),
      sizes: sortSizes(Array.from(sizeSet)),
    };
  }, [childCodes, dirtySet, indexByCode, rows]);

  function updateCell(cell: MatrixCell, value: string) {
    const parsedValue = parseInt(value, 10);
    const safeValue = isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
    updateChildStock(parentCode, cell.childCode, String(safeValue));
  }

  useEffect(() => {
    if (!openImage) return;
    closeButtonRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenImage(null);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openImage]);

  useEffect(() => {
    if (openImage) return;
    lastTriggerRef.current?.focus();
  }, [openImage]);

  if (colors.length === 0) {
    return (
      <div class="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
        Sem variações para mostrar
      </div>
    );
  }

  return (
    <>
      <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-4 py-3 md:px-6 md:py-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Contagem
          </p>
          <h2 class="mt-0.5 text-lg font-bold text-slate-900">
            Cor x Tamanho
          </h2>
        </div>

        <div class="hidden overflow-x-auto md:block">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50">
                <th class="min-w-[240px] bg-slate-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Cor
                </th>
                {sizes.map((size) => (
                  <th key={size} class="min-w-[140px] px-3 py-3 text-center text-sm font-bold text-slate-700">
                    {size}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {colors.map((colorRow) => (
                <tr key={colorRow.color} class="border-b border-slate-100 last:border-b-0">
                  <td class="bg-white px-4 py-3 align-middle">
                    <ColorLabel
                      color={colorRow.color}
                      image={colorRow.image}
                      onOpenImage={(image, triggerEl) => {
                        lastTriggerRef.current = triggerEl;
                        setOpenImage(image);
                      }}
                    />
                  </td>

                  {sizes.map((size) => {
                    const cell = colorRow.cells[size];

                    return (
                      <td key={size} class="border-l border-slate-100 px-3 py-3 text-center align-middle">
                        {cell ? (
                          <StockInput
                            value={cell.stock}
                            isDirty={cell.isDirty}
                            onInput={(value) => updateCell(cell, value)}
                          />
                        ) : (
                          <span class="text-slate-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div class="grid gap-2 p-2.5 md:hidden">
          {colors.map((colorRow) => (
            <article
              key={colorRow.color}
              class="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm"
            >
              <div class="mb-2 flex items-center justify-between gap-2">
                <ColorLabel
                  color={colorRow.color}
                  image={colorRow.image}
                  compact
                  onOpenImage={(image, triggerEl) => {
                    lastTriggerRef.current = triggerEl;
                    setOpenImage(image);
                  }}
                />
              </div>

              <div class="grid grid-cols-2 gap-2">
                {sizes.map((size) => {
                  const cell = colorRow.cells[size];

                  return (
                    <div key={size}>
                      <p class="mb-1 text-center text-xs font-bold leading-none text-slate-500">{size}</p>
                      {cell ? (
                        <StockInput
                          value={cell.stock}
                          isDirty={cell.isDirty}
                          onInput={(value) => updateCell(cell, value)}
                        />
                      ) : (
                        <div class="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-300">
                          -
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      {openImage && (
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenImage(null)}
        >
          <button
            type="button"
            ref={closeButtonRef}
            class="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-white"
            onClick={() => setOpenImage(null)}
            aria-label="Fechar imagem"
          >
            x
          </button>

          <img
            src={openImage.src}
            alt={openImage.label}
            class="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <div class="absolute bottom-4 left-4 right-4 rounded-2xl bg-black/50 p-3 text-center text-sm font-medium text-white">
            {openImage.label}
          </div>
        </div>
      )}
    </>
  );
}

function ColorLabel({
  color,
  image,
  compact = false,
  onOpenImage,
}: {
  color: string;
  image: string | null;
  compact?: boolean;
  onOpenImage: (image: { src: string; label: string }, triggerEl: HTMLButtonElement) => void;
}) {
  return (
    <div class="flex items-center gap-2.5">
      <button
        type="button"
        tabIndex={-1}
        disabled={!image}
        onClick={(e) => {
          if (!image) return;
          onOpenImage({ src: image, label: color }, e.currentTarget as HTMLButtonElement);
        }}
        class={`${compact ? 'h-12 w-12 rounded-xl' : 'h-14 w-14 rounded-2xl'} relative flex-shrink-0 overflow-hidden bg-slate-50 ring-1 ring-slate-200 transition hover:ring-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-default`}
        aria-label={`Ampliar imagem de ${color}`}
      >
        {image && (
          <img
            src={image}
            alt={color}
            loading="lazy"
            class="h-full w-full object-contain p-1"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </button>

      <div class="min-w-0">
        <p class="truncate text-sm font-bold text-slate-900">{color}</p>
        {image && !compact && <p class="text-xs font-medium text-blue-600">Ver foto</p>}
      </div>
    </div>
  );
}

function StockInput({ value, isDirty, onInput }: { value: number; isDirty: boolean; onInput: (value: string) => void }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min="0"
      step="1"
      enterKeyHint="next"
      value={String(value)}
      onInput={(e) => onInput((e.target as HTMLInputElement).value)}
      onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
      class={`h-14 w-full rounded-xl border-2 bg-white text-center text-xl font-bold text-slate-900 focus:outline-none focus:ring-4 md:min-h-fat md:text-2xl ${
        isDirty
          ? 'border-emerald-300 bg-emerald-50 focus:border-emerald-400 focus:ring-emerald-100'
          : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'
      }`}
    />
  );
}

function parseStock(value: string | undefined): number {
  const parsed = Number(String(value ?? '0').replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const aIndex = SIZE_ORDER.indexOf(a.toUpperCase());
    const bIndex = SIZE_ORDER.indexOf(b.toUpperCase());

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    return a.localeCompare(b, 'pt-BR');
  });
}
