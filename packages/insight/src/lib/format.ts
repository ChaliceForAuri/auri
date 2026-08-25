/** Pure formatting helpers for insight components — Intl in the host locale. */

export function formatCount(value: unknown): string {
	return typeof value === 'number' ? new Intl.NumberFormat().format(value) : '—';
}

/** ISO 4217 codes are exactly three letters; anything else is a plain unit. */
const CURRENCY_CODE = /^[A-Z]{3}$/;

/**
 * Format one metric's value. `unit` is an ISO 4217 code for money ("USD") or a
 * short unit ("ms", "%"), matching what ops `Stat` accepts — the two catalogs
 * must read the same or the same figure looks different on one surface.
 */
export function formatMetricValue(value: unknown, unit: unknown): string {
	if (typeof value !== 'number') return '—';
	const u = typeof unit === 'string' ? unit.trim() : '';
	if (CURRENCY_CODE.test(u)) {
		try {
			return new Intl.NumberFormat(undefined, {
				style: 'currency',
				currency: u,
				maximumFractionDigits: 0
			}).format(value);
		} catch {
			// A well-formed code Intl doesn't know still reads better than a bare number.
			return `${u} ${new Intl.NumberFormat().format(value)}`;
		}
	}
	const n = new Intl.NumberFormat().format(value);
	if (!u) return n;
	return u === '%' ? `${n}%` : `${n} ${u}`;
}

export function formatWindow(start: unknown, end: unknown): string {
	if (typeof start !== 'string' || typeof end !== 'string') return '';
	const s = new Date(start);
	const e = new Date(end);
	if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '';
	return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).formatRange(s, e);
}

/**
 * The contract's stance: a model emitting 0.87 claims precision it doesn't
 * have, so confidence renders as a qualitative band, never a number.
 */
export function confidenceBand(value: unknown): 'low' | 'medium' | 'high' | null {
	if (typeof value !== 'number' || value < 0 || value > 1) return null;
	return value < 1 / 3 ? 'low' : value < 2 / 3 ? 'medium' : 'high';
}

export function formatClock(totalSeconds: unknown): string {
	if (typeof totalSeconds !== 'number' || totalSeconds < 0) return '';
	const s = Math.round(totalSeconds);
	const m = Math.floor(s / 60);
	const h = Math.floor(m / 60);
	const pad = (n: number) => String(n).padStart(2, '0');
	return h > 0 ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

export function normalizeIntent(value: unknown): string {
	return typeof value === 'string' && ['good', 'bad', 'warning', 'info', 'neutral'].includes(value)
		? value
		: 'neutral';
}

/**
 * Turn a free-form domain string into display text: `churn_risk` -> "churn risk".
 *
 * This replaced a seven-entry lookup table of one customer's signal names. The
 * table was worse than the closed enum in the schema, because an unlisted value
 * returned null and the component rendered NOTHING — an agent emitting a
 * perfectly valid `policy_drift` silently lost it. Contract principle 9 applies
 * to the implementation too: domain vocabulary is data, so display it as data.
 */
export function humanizeKind(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const text = value.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
	return text.length > 0 ? text : null;
}

/** Direction words for a momentum vector — how a screen reader hears an arrow. */
export function describeVector(dx: number, dy: number, xLabel: string, yLabel: string): string {
	const parts: string[] = [];
	const word = (d: number) => (Math.abs(d) >= 8 ? 'sharply' : 'slightly');
	if (dy !== 0) parts.push(`${yLabel} ${dy > 0 ? 'rising' : 'falling'} ${word(dy)}`);
	if (dx !== 0) parts.push(`${xLabel} ${dx > 0 ? 'rising' : 'falling'} ${word(dx)}`);
	return parts.length > 0 ? parts.join(', ') : 'holding steady';
}
