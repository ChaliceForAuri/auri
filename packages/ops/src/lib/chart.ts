/**
 * Pure geometry for the hand-rolled charts (PLAN 3.2: zero runtime deps; the
 * wire contract stays independent of this so internals can be swapped).
 */

export interface SeriesData {
	label: string;
	values: number[];
}

/** Wire series arrive deep-resolved; tolerate anything else by dropping it. */
export function normalizeSeries(series: unknown): SeriesData[] {
	if (!Array.isArray(series)) return [];
	return series
		.filter(
			(s): s is { label?: unknown; values: unknown[] } =>
				Boolean(s) && typeof s === 'object' && Array.isArray((s as { values?: unknown }).values)
		)
		.map((s) => ({
			label: String(s.label ?? ''),
			values: s.values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
		}));
}

/** Smallest 1/2/2.5/5 × 10^k at or above `value` — the top of the y axis. */
export function niceCeil(value: number): number {
	if (!Number.isFinite(value) || value <= 0) return 1;
	const power = Math.pow(10, Math.floor(Math.log10(value)));
	for (const m of [1, 2, 2.5, 5, 10]) {
		if (m * power >= value) return m * power;
	}
	return 10 * power;
}

/** Evenly spaced ticks from 0 to niceCeil(max), inclusive. */
export function ticks(maxValue: number, count = 4): number[] {
	const top = niceCeil(maxValue);
	return Array.from({ length: count + 1 }, (_, i) => (top / count) * i);
}

/** Indices to label on the x axis: at most `max`, always first and last. */
export function sampleIndices(length: number, max = 6): number[] {
	if (length <= max) return Array.from({ length }, (_, i) => i);
	const step = (length - 1) / (max - 1);
	return Array.from(new Set(Array.from({ length: max }, (_, i) => Math.round(i * step))));
}
