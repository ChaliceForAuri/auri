/** Address an element by role + accessible name — the scheme every platform shares. */
export interface LocatorSpec {
	role: string;
	/** Matched as a case-insensitive substring of the accessible name. */
	name?: string;
}

export interface ConformanceStep {
	activate?: LocatorSpec;
	focus?: LocatorSpec;
	press?: { key: string };
	fill?: LocatorSpec & { value: string };
	/** An agent-side data update — how live behaviour (re-aggregation, gating) is exercised. */
	setData?: { path: string; value: unknown };
}

export interface ConformanceExpect {
	/** The last dispatched action. `context` is matched as a deep subset. */
	action?: { name: string; context?: Record<string, unknown> };
	noAction?: boolean;
	text?: string;
	absent?: string;
	accessibleName?: { role: string; contains: string };
}

export interface ConformanceCase {
	id: string;
	/** Why this case exists — quoted back in failures, so a port learns the rule. */
	why: string;
	stream: (string | Record<string, unknown>)[];
	steps?: ConformanceStep[];
	expect?: ConformanceExpect;
	/** Parsed `stream`, added by loadSuite. */
	messages: Record<string, unknown>[];
}

export function subsetMismatch(actual: unknown, expected: unknown, path?: string): string | null;
export function loadSuite(suite: { cases?: unknown[] }): ConformanceCase[];
export function surfaceIdOf(messages: unknown[]): string | undefined;
export function explainFailure(testCase: { id: string; why: string }, reason: string): string;
