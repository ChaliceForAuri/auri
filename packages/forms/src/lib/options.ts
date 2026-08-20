export interface FieldOption {
	value: string;
	label: string;
}

/**
 * The contract's forgiving `option` shape: `{value, label}` objects, or bare
 * strings when the two are identical (models emit both — gate log, round 1).
 */
export function normalizeOptions(options: unknown): FieldOption[] {
	if (!Array.isArray(options)) return [];
	const out: FieldOption[] = [];
	for (const option of options) {
		if (typeof option === 'string') {
			out.push({ value: option, label: option });
		} else if (option && typeof option === 'object') {
			const { value, label } = option as Record<string, unknown>;
			if (typeof value === 'string')
				out.push({ value, label: typeof label === 'string' ? label : value });
		}
	}
	return out;
}
