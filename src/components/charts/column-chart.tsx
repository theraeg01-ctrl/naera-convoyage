import { cn } from "@/utils/cn";

export interface ChartSeries {
  id: string;
  label: string;
  /** Jeton CSS de la série (palette validée : --series-1…). */
  color: string;
}

interface ColumnChartProps {
  /** Nom accessible du graphique (le titre visible est porté par la section). */
  label: string;
  series: ChartSeries[];
  categories: { key: string; label: string }[];
  /** values[serieId][index de catégorie] */
  values: Record<string, number[]>;
  format: (value: number) => string;
  className?: string;
}

/** Graduations « rondes » (0, 500, 1 000…) couvrant le maximum. */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= raw) ?? raw;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
}

/**
 * Colonnes (une ou plusieurs séries, même unité, un seul axe). Survol /
 * focus : infobulle par colonne ; tableau équivalent pour les lecteurs
 * d'écran. Rendu serveur, sans bibliothèque.
 */
export function ColumnChart({ label, series, categories, values, format, className }: ColumnChartProps) {
  const max = Math.max(0, ...series.flatMap((serie) => values[serie.id] ?? []));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const lastIndex = categories.length - 1;
  return (
    <figure className={cn("space-y-3", className)}>
      {series.length > 1 ? (
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {series.map((serie) => (
            <span key={serie.id} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: `var(${serie.color})` }} />
              {serie.label}
            </span>
          ))}
        </figcaption>
      ) : null}
      <div aria-hidden className="pt-6">
        <div className="flex gap-2">
          <div className="relative h-44 w-14 shrink-0 text-right text-xs text-faint tabular">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-0 translate-y-1/2"
                style={{ bottom: `${(tick / top) * 100}%` }}
              >
                {format(tick)}
              </span>
            ))}
          </div>
          <div className="relative h-44 min-w-0 flex-1">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute inset-x-0 h-px bg-border"
                style={{ bottom: `${(tick / top) * 100}%` }}
              />
            ))}
            <div className="absolute inset-0 flex">
              {categories.map((category, index) => (
                <div
                  key={category.key}
                  tabIndex={0}
                  className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-0.5 rounded-lg outline-none hover:bg-surface-2/60 focus-visible:bg-surface-2/60"
                >
                  {series.map((serie) => {
                    const value = values[serie.id]?.[index] ?? 0;
                    return (
                      <span
                        key={serie.id}
                        className="relative block w-full max-w-6 rounded-t-[4px]"
                        style={{ height: `${(value / top) * 100}%`, background: `var(${serie.color})` }}
                      >
                        {index === lastIndex && series.length === 1 && value > 0 ? (
                          <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-xs font-semibold whitespace-nowrap text-foreground tabular">
                            {format(value)}
                          </span>
                        ) : null}
                      </span>
                    );
                  })}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden min-w-36 -translate-x-1/2 rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-float group-hover:block group-focus-visible:block">
                    <p className="mb-1 font-semibold first-letter:uppercase">{category.label}</p>
                    {series.map((serie) => (
                      <p key={serie.id} className="flex items-center justify-between gap-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-muted">
                          <span className="size-2 rounded-[2px]" style={{ background: `var(${serie.color})` }} />
                          {serie.label}
                        </span>
                        <span className="font-semibold tabular">{format(values[serie.id]?.[index] ?? 0)}</span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-2 flex pl-16">
          {categories.map((category) => (
            <span
              key={category.key}
              className="min-w-0 flex-1 truncate text-center text-xs text-faint first-letter:uppercase"
            >
              {category.label}
            </span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Période</th>
            {series.map((serie) => (
              <th key={serie.id} scope="col">
                {serie.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((category, index) => (
            <tr key={category.key}>
              <th scope="row">{category.label}</th>
              {series.map((serie) => (
                <td key={serie.id}>{format(values[serie.id]?.[index] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Barres horizontales (une série) : répartition d'un montant par catégorie. */
export function BarList({
  rows,
  format,
  color = "--series-1",
}: {
  rows: { key: string; label: string; value: number; hint?: string }[];
  format: (value: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-[15px]">
            <span className="truncate">{row.label}</span>
            <span className="shrink-0 font-semibold tabular">
              {format(row.value)}
              {row.hint ? <span className="ml-1.5 text-sm font-normal text-faint">{row.hint}</span> : null}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-2" aria-hidden>
            <div
              className="h-full rounded-full"
              style={{ width: `${(row.value / max) * 100}%`, background: `var(${color})` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
