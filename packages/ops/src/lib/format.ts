/**
 * Locale-aware formatting for wire values (DESIGN 6): the wire carries raw
 * numbers and ISO timestamps; these helpers turn them into what the user sees,
 * in the host locale. Pure — `locale` is injectable for tests, `undefined`
 * means the browser's own.
 */

/** ISO 4217 alpha code — the contract blesses currency codes in `unit`. */
const CURRENCY_CODE = /^[A-Z]{3}$/;

export interface FormattedValue {
	text: string;
	/** Rendered after the value when the unit isn't part of the number itself. */
	unitText: string | null;
}

export function formatStatValue(value: unknown, unit?: string, locale?: string): FormattedValue {
	if (typeof value === 'number' && Number.isFinite(value)) {
		if (unit && CURRENCY_CODE.test(unit)) {
			try {
				return {
					text: new Intl.NumberFormat(locale, { style: 'currency', currency: unit }).format(value),
					unitText: null
				};
			} catch {
				// Unknown code (e.g. "XXY"): fall through to plain number + unit text.
			}
		}
		return {
			text: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value),
			unitText: unit ?? null
		};
	}
	return {
		text: value === undefined || value === null ? '' : String(value),
		unitText: unit ?? null
	};
}

export function formatDelta(delta: number, unit?: string, locale?: string): string {
	if (!Number.isFinite(delta)) return '';
	if (unit && CURRENCY_CODE.test(unit)) {
		try {
			return new Intl.NumberFormat(locale, {
				style: 'currency',
				currency: unit,
				signDisplay: 'exceptZero'
			}).format(delta);
		} catch {
			// Fall through, as above.
		}
	}
	const text = new Intl.NumberFormat(locale, {
		maximumFractionDigits: 2,
		signDisplay: 'exceptZero'
	}).format(delta);
	return unit ? `${text} ${unit}` : text;
}

export function formatCellNumber(value: number, locale?: string): string {
	return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

/** Invalid input renders verbatim — never garbage, never a throw (DESIGN 5). */
export function formatCellDateTime(iso: string, locale?: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/** Hour:minute for feed entries; the full timestamp belongs in a title attr. */
export function formatTimelineTime(iso: string, locale?: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
}

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** KeyValue cells: numbers and ISO datetimes format; everything else verbatim. */
export function formatKeyValue(value: unknown, locale?: string): string {
	if (typeof value === 'number' && Number.isFinite(value)) return formatCellNumber(value, locale);
	if (typeof value === 'string' && ISO_DATETIME.test(value))
		return formatCellDateTime(value, locale);
	return value === undefined || value === null ? '—' : String(value);
}

/** The generated text alternative for a sparkline (DESIGN 7: not optional). */
export function sparklineSummary(values: number[], locale?: string): string {
	if (values.length === 0) return 'no data yet';
	const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
	const latest = nf.format(values[values.length - 1]!);
	const min = nf.format(Math.min(...values));
	const max = nf.format(Math.max(...values));
	return `${values.length} readings, latest ${latest}, range ${min} to ${max}`;
}

const INTENTS = ['good', 'bad', 'warning', 'info', 'neutral'] as const;
export type Intent = (typeof INTENTS)[number];

/** Out-of-scale values degrade to the component's resting intent (DESIGN 5). */
export function normalizeIntent(value: unknown, resting: Intent = 'neutral'): Intent {
	return INTENTS.includes(value as Intent) ? (value as Intent) : resting;
}
