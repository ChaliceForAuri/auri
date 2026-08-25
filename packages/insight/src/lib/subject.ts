import { isEventAction, type Action } from 'svelte-a2ui';

/**
 * The #20 foundation, kept by the catalog: drill and feedback actions carry
 * their subject automatically. Raw-registered action props flow through here
 * so `subjectKind`/`subjectId` (and any per-fire extras like `verdict` or
 * `startSeconds`) are merged into the event context before dispatch — the
 * agent never duplicates them into `context` itself.
 */
export function withSubject(action: Action, extra: Record<string, unknown>): Action {
	return isEventAction(action)
		? { event: { ...action.event, context: { ...(action.event.context ?? {}), ...extra } } }
		: action;
}
