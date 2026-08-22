export interface ConformanceCase {
	id: string;
	/** Why this case exists — quoted back in failures, so a port learns the rule. */
	why: string;
	stream: (string | Record<string, unknown>)[];
	steps?: Record<string, never>[];
	expect?: Record<string, never>;
	messages: Record<string, unknown>[];
}
export function subsetMismatch(actual: unknown, expected: unknown, path?: string): string | null;
export function loadSuite(suite: { cases?: unknown[] }): ConformanceCase[];
export function surfaceIdOf(messages: unknown[]): string | undefined;
export function explainFailure(testCase: { id: string; why: string }, reason: string): string;
