/** Pure formatting helpers for intel components — Intl in the host locale. */

export function formatCount(value: unknown): string {
	return typeof value === 'number' ? new Intl.NumberFormat().format(value) : '—';
}

export function formatMoney(value: unknown, currency: unknown): string {
	if (typeof value !== 'number') return '—';
	if (typeof currency === 'string' && currency) {
		try {
			return new Intl.NumberFormat(undefined, {
				style: 'currency',
				currency,
				maximumFractionDigits: 0
			}).format(value);
		} catch {
			return `${currency} ${new Intl.NumberFormat().format(value)}`;
		}
	}
	return new Intl.NumberFormat().format(value);
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

const SIGNAL_LABELS: Record<string, string> = {
	churn_risk: 'churn risk',
	expansion: 'expansion',
	friction: 'friction',
	kb_gap: 'knowledge gap',
	automation_drift: 'automation drift',
	outage: 'outage',
	advocacy: 'advocacy'
};

export function signalLabel(value: unknown): string | null {
	return typeof value === 'string' ? (SIGNAL_LABELS[value] ?? null) : null;
}

/** Direction words for a momentum vector — how a screen reader hears an arrow. */
export function describeVector(dx: number, dy: number, xLabel: string, yLabel: string): string {
	const parts: string[] = [];
	const word = (d: number) => (Math.abs(d) >= 8 ? 'sharply' : 'slightly');
	if (dy !== 0) parts.push(`${yLabel} ${dy > 0 ? 'rising' : 'falling'} ${word(dy)}`);
	if (dx !== 0) parts.push(`${xLabel} ${dx > 0 ? 'rising' : 'falling'} ${word(dx)}`);
	return parts.length > 0 ? parts.join(', ') : 'holding steady';
}
