import {
	evaluateChecks,
	resolveDynamic,
	ROOT_SCOPE,
	type CheckRule,
	type EvalContext,
	type FunctionRegistry,
	type RenderContext,
	type ValidationResult
} from 'svelte-a2ui';

/**
 * The forms contract promises that every check receives the field's current
 * value without the wire ever passing it — `args.value` is not part of the
 * vocabulary. The base renderer resolves check args verbatim, so that
 * injection is this catalog's job: each rule's args gain the bound value
 * before evaluation. (This is why field components compute their own
 * validation instead of using the renderer-provided one.)
 */
export function validateField(
	checks: readonly CheckRule[] | undefined,
	value: unknown,
	ctx: EvalContext
): ValidationResult {
	if (!checks || checks.length === 0) return { valid: true, errors: [] };
	const rules = checks.map((rule) =>
		'call' in rule ? { ...rule, args: { ...rule.args, value } } : rule
	);
	return evaluateChecks(rules, ctx);
}

/** The evaluation context for a field on the current surface. Called inside a
 * `$derived`, so reading `client.state` keeps validation live as data changes. */
export function fieldCtx(rc: RenderContext): EvalContext {
	return {
		data: rc.client.state.surfaces[rc.surfaceId]?.dataModel,
		scope: ROOT_SCOPE,
		functions: rc.catalog.functions
	};
}

interface SurfaceLike {
	components: Readonly<Record<string, Record<string, unknown>>>;
	dataModel: unknown;
}

/**
 * SubmitBar's gate: every checked component on the surface must pass. Each
 * spec's bound `value` is resolved from the data model and injected, mirroring
 * what the field itself would compute.
 */
export function surfaceValid(surface: SurfaceLike, functions: FunctionRegistry): boolean {
	const ctx: EvalContext = { data: surface.dataModel, scope: ROOT_SCOPE, functions };
	for (const spec of Object.values(surface.components)) {
		const checks = spec.checks as CheckRule[] | undefined;
		if (!checks || checks.length === 0) continue;
		const value = spec.value === undefined ? undefined : resolveDynamic(spec.value, ctx);
		if (!validateField(checks, value, ctx).valid) return false;
	}
	return true;
}
