/**
 * The Svelte half of a conformance run: the twelve primitives the shared engine
 * in `@aurilabs/core/conformance` needs, implemented once for all three
 * catalogs.
 *
 * Everything about what a step or expectation MEANS lives in the engine. This
 * file only knows how to find, click, focus and read an element in a rendered
 * Svelte surface — which is exactly the boundary a React or Flutter port
 * reimplements, and nothing more.
 */
import type { ConformanceHarness, LocatorSpec } from '@aurilabs/core/conformance';
import type { AgentToRenderer, RendererAction } from 'svelte-a2ui';

interface Screen {
	container: HTMLElement;
	getByRole(role: string, options?: unknown): { element(): Element };
}

interface Client {
	ingest(message: AgentToRenderer): void;
}

/** Address by role + accessible name — the scheme every platform shares. */
export function createHarness(
	screen: Screen,
	client: Client,
	surfaceId: string,
	actions: RendererAction[]
): ConformanceHarness {
	const locate = (spec: LocatorSpec): Element =>
		screen
			.getByRole(spec.role, spec.name ? { name: new RegExp(spec.name, 'i') } : undefined)
			.element();

	const nameOf = (el: Element) =>
		el.getAttribute('aria-label') ?? (el as HTMLElement).textContent ?? '';

	return {
		surfaceId,
		actions: actions as ConformanceHarness['actions'],
		locate,
		click: (el) => (el as HTMLElement).click(),
		focus: (el) => (el as HTMLElement).focus(),
		blur: (el) => {
			// Focus first: a field that was never focused does not fire blur, and a
			// silent no-op here would make an error-gating case pass vacuously.
			(el as HTMLElement).focus();
			(el as HTMLElement).blur();
		},
		press: (key) => {
			const target = (document.activeElement ?? screen.container) as HTMLElement;
			target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
		},
		fill: (el, value) => {
			const input = el as HTMLInputElement;
			input.focus();
			input.value = value;
			input.dispatchEvent(new Event('input', { bubbles: true }));
		},
		ingest: (message) => client.ingest(message as unknown as AgentToRenderer),
		settle: () => new Promise((r) => setTimeout(r, 80)),
		text: () => screen.container.textContent ?? '',
		accessibleName: (spec) => nameOf(locate(spec)),
		isFocused: (spec) => {
			try {
				return document.activeElement === locate(spec);
			} catch {
				return false;
			}
		},
		describeFocus: () => {
			const el = document.activeElement;
			if (!el || el === document.body) return 'nothing focused';
			return `${el.tagName.toLowerCase()}${el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : ''} "${nameOf(el).trim().slice(0, 40)}"`;
		}
	};
}
