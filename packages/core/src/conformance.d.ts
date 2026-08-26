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
	/** Leave a field — several catalogs gate error display on having been visited. */
	blur?: LocatorSpec;
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
	/** Where keyboard focus must have landed. */
	focused?: LocatorSpec;
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

export interface ConformanceHarness {
	surfaceId: string;
	actions: { name: string; context: Record<string, unknown> }[];
	locate(spec: LocatorSpec): Element;
	click(el: Element): void | Promise<void>;
	focus(el: Element): void;
	blur(el: Element): void;
	press(key: string): void;
	fill(el: Element, value: string): void;
	ingest(message: Record<string, unknown>): void;
	settle(): Promise<void>;
	text(): string;
	accessibleName(spec: LocatorSpec): string;
	isFocused(spec: LocatorSpec): boolean;
	describeFocus(): string;
}

export function runSteps(testCase: ConformanceCase, harness: ConformanceHarness): Promise<void>;
export function checkExpectations(testCase: ConformanceCase, harness: ConformanceHarness): string[];
