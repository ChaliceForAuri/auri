/// <reference types="vite/client" />

import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { A2uiClient, Surface, createCatalogRegistry, basicCatalog } from 'svelte-a2ui';
import type { AgentToRenderer, ComponentSpec, RendererAction } from 'svelte-a2ui';
import { formsCatalog, normalizeOptions } from '../../src/lib/index.js';

const SURFACE = 'test';
const catalog = createCatalogRegistry([formsCatalog, basicCatalog]);

function makeClient(onAction?: (action: RendererAction) => void): A2uiClient {
	return new A2uiClient(onAction ? { onAction } : {});
}

function boot(
	client: A2uiClient,
	components: ComponentSpec[],
	dataModel: Record<string, unknown> = {}
): void {
	client.ingest({
		version: 'v1.0',
		createSurface: { surfaceId: SURFACE, catalogId: formsCatalog.id, components, dataModel }
	});
}

function setData(client: A2uiClient, path: string, value: unknown): void {
	client.ingest({ version: 'v1.0', updateDataModel: { surfaceId: SURFACE, path, value } });
}

function model(client: A2uiClient): Record<string, unknown> {
	return client.state.surfaces[SURFACE]!.dataModel as Record<string, unknown>;
}

function type(input: HTMLInputElement | HTMLTextAreaElement, text: string): void {
	input.value = text;
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ----------------------------------------------------------------- options */

test('normalizeOptions accepts bare strings and {value,label} objects', () => {
	expect(normalizeOptions(['Email', { value: 'sev1', label: 'Sev 1' }])).toEqual([
		{ value: 'Email', label: 'Email' },
		{ value: 'sev1', label: 'Sev 1' }
	]);
	expect(normalizeOptions(undefined)).toEqual([]);
});

/* ---------------------------------------------------------- fixture replay */

const fixtures = import.meta.glob('../../contract/examples/*.jsonl', {
	eager: true,
	query: '?raw',
	import: 'default'
}) as Record<string, string>;

// One visible marker per fixture proves the stream painted its component.
// Locators are page-scoped and match case-insensitive substrings, and every
// rendered fixture stays mounted for the rest of the sweep — so each marker
// must be unique across ALL fixtures, not just its own.
const MARKERS: Record<string, string> = {
	'text-field': 'We only use this for receipts.',
	'text-area': 'What happened?',
	'number-field': 'Replica count',
	'select-field': 'Choose a region…',
	'radio-group': 'Sev 2 — degraded',
	'checkbox-group': 'PagerDuty',
	toggle: 'Email me a copy',
	'date-field': 'Start date',
	'form-section': 'Contact details',
	'submit-bar': 'Subscribe'
};

test('every contract fixture replays into a live surface', async () => {
	const names = Object.keys(fixtures);
	expect(names).toHaveLength(10);
	for (const file of names) {
		const stem = file.split('/').pop()!.replace('.jsonl', '');
		const client = makeClient();
		const screen = await render(Surface, { props: { client, catalog, surfaceId: 'f' } });
		for (const line of fixtures[file]!.split('\n')) {
			if (line.trim()) client.ingest(JSON.parse(line) as AgentToRenderer);
		}
		await expect.element(screen.getByText(MARKERS[stem]!, { exact: false })).toBeInTheDocument();
	}
});

/* ------------------------------------------------------- two-way bindings */

test('TextField writes the answer back to its bound path', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(
		client,
		[{ id: 'root', component: 'TextField', label: 'Name', value: { path: '/name' } } as never],
		{ name: '' }
	);
	await expect.element(screen.getByText('Name')).toBeInTheDocument();

	const input = screen.container.querySelector('input.auri-control') as HTMLInputElement;
	type(input, 'Auri');
	expect(model(client).name).toBe('Auri');
});

test('NumberField writes a raw number, and empties to null', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(
		client,
		[{ id: 'root', component: 'NumberField', label: 'Replicas', value: { path: '/n' } } as never],
		{ n: 4 }
	);
	await expect.element(screen.getByText('Replicas')).toBeInTheDocument();

	const input = screen.container.querySelector('input[type="number"]') as HTMLInputElement;
	type(input, '7');
	expect(model(client).n).toBe(7);
	type(input, '');
	expect(model(client).n).toBeNull();
});

test('Toggle flips the bound boolean', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(
		client,
		[
			{
				id: 'root',
				component: 'Toggle',
				label: 'Email me a copy',
				value: { path: '/copy' }
			} as never
		],
		{ copy: false }
	);
	await expect.element(screen.getByText('Email me a copy')).toBeInTheDocument();

	const box = screen.container.querySelector('input[type="checkbox"]') as HTMLInputElement;
	box.click();
	expect(model(client).copy).toBe(true);
});

test('RadioGroup and CheckboxGroup write value and value-array', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(
		client,
		[
			{
				id: 'root',
				component: 'Column',
				catalogId: 'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json',
				children: ['sev', 'channels']
			} as never,
			{
				id: 'sev',
				component: 'RadioGroup',
				label: 'Severity',
				value: { path: '/sev' },
				options: [
					{ value: 'sev1', label: 'Sev 1' },
					{ value: 'sev2', label: 'Sev 2' }
				]
			} as never,
			{
				id: 'channels',
				component: 'CheckboxGroup',
				label: 'Notify via',
				value: { path: '/channels' },
				options: ['Email', 'Slack']
			} as never
		],
		{ sev: 'sev2', channels: [] }
	);
	await expect.element(screen.getByText('Severity')).toBeInTheDocument();

	const radio = screen.container.querySelector(
		'input[type="radio"][value="sev1"]'
	) as HTMLInputElement;
	radio.click();
	expect(model(client).sev).toBe('sev1');

	const slack = screen.container.querySelector(
		'input[type="checkbox"][value="Slack"]'
	) as HTMLInputElement;
	slack.click();
	expect(model(client).channels).toEqual(['Slack']);
	slack.click();
	expect(model(client).channels).toEqual([]);
});

test('SelectField picks an option and shows its placeholder until then', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(
		client,
		[
			{
				id: 'root',
				component: 'SelectField',
				label: 'Region',
				placeholder: 'Choose a region…',
				value: { path: '/region' },
				options: [{ value: 'eu-west-1', label: 'Europe (Ireland)' }]
			} as never
		],
		{ region: '' }
	);
	await expect.element(screen.getByText('Choose a region…')).toBeInTheDocument();

	const select = screen.container.querySelector('select.auri-control') as HTMLSelectElement;
	select.value = 'eu-west-1';
	select.dispatchEvent(new Event('change', { bubbles: true }));
	expect(model(client).region).toBe('eu-west-1');
});

/* ------------------------------------------------------------------ checks */

test('checks surface after touch, with the bound value injected', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(
		client,
		[
			{
				id: 'root',
				component: 'TextField',
				label: 'Work email',
				kind: 'email',
				value: { path: '/email' },
				checks: [{ call: 'email', message: 'Not an email.' }]
			} as never
		],
		{ email: '' }
	);
	await expect.element(screen.getByText('Work email')).toBeInTheDocument();
	const input = screen.container.querySelector('input.auri-control') as HTMLInputElement;

	// Untouched: invalid but silent (never on first paint).
	expect(screen.container.textContent).not.toContain('Not an email.');

	type(input, 'nope');
	input.dispatchEvent(new Event('blur', { bubbles: true }));
	await expect.element(screen.getByText('Not an email.')).toBeInTheDocument();
	expect(input.getAttribute('aria-invalid')).toBe('true');

	type(input, 'auri@example.dev');
	await expect.poll(() => screen.container.textContent).not.toContain('Not an email.');
});

test('TextArea shows a live counter when maxLength is set', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(
		client,
		[
			{
				id: 'root',
				component: 'TextArea',
				label: 'Details',
				maxLength: 100,
				value: { path: '/details' }
			} as never
		],
		{ details: '' }
	);
	await expect.element(screen.getByText('0/100')).toBeInTheDocument();
	const area = screen.container.querySelector('textarea.auri-control') as HTMLTextAreaElement;
	type(area, 'hello');
	await expect.element(screen.getByText('5/100')).toBeInTheDocument();
});

/* --------------------------------------------------------------- SubmitBar */

test('SubmitBar gates on surface validity and fires with context', async () => {
	const actions: RendererAction[] = [];
	const client = makeClient((action) => actions.push(action));
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(
		client,
		[
			{
				id: 'root',
				component: 'Column',
				catalogId: 'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json',
				children: ['email', 'submit']
			} as never,
			{
				id: 'email',
				component: 'TextField',
				label: 'Work email',
				kind: 'email',
				value: { path: '/email' },
				checks: [{ call: 'required', message: 'Enter your email.' }]
			} as never,
			{
				id: 'submit',
				component: 'SubmitBar',
				submitLabel: 'Subscribe',
				submitAction: { event: { name: 'subscribe', context: { email: { path: '/email' } } } }
			} as never
		],
		{ email: '' }
	);
	await expect.element(screen.getByText('Subscribe')).toBeInTheDocument();
	const submit = screen.container.querySelector('button.submit') as HTMLButtonElement;

	// The required check fails on the empty model — the gate holds.
	expect(submit.disabled).toBe(true);
	submit.click();
	expect(actions).toHaveLength(0);

	setData(client, '/email', 'auri@example.dev');
	await expect.poll(() => submit.disabled).toBe(false);
	submit.click();
	expect(actions).toHaveLength(1);
	expect(actions[0]!.name).toBe('subscribe');
	expect(actions[0]!.context.email).toBe('auri@example.dev');
});

test('SubmitBar pending state disables and announces busy', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(
		client,
		[
			{
				id: 'root',
				component: 'SubmitBar',
				submitLabel: 'Save',
				pending: { path: '/pending' },
				submitAction: { event: { name: 'save' } }
			} as never
		],
		{ pending: false }
	);
	await expect.element(screen.getByText('Save')).toBeInTheDocument();
	const submit = screen.container.querySelector('button.submit') as HTMLButtonElement;
	expect(submit.disabled).toBe(false);

	setData(client, '/pending', true);
	await expect.poll(() => submit.disabled).toBe(true);
	expect(submit.getAttribute('aria-busy')).toBe('true');
});

test('SubmitBar renders a cancel button only when the wire declares one', async () => {
	const actions: RendererAction[] = [];
	const client = makeClient((action) => actions.push(action));
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(client, [
		{
			id: 'root',
			component: 'SubmitBar',
			submitLabel: 'Save',
			cancelLabel: 'Discard',
			submitAction: { event: { name: 'save' } },
			cancelAction: { event: { name: 'discard' } }
		} as never
	]);
	await expect.element(screen.getByText('Discard')).toBeInTheDocument();
	(screen.container.querySelector('button.cancel') as HTMLButtonElement).click();
	expect(actions[0]!.name).toBe('discard');
});

/* ------------------------------------------------------------- FormSection */

test('FormSection renders title, description, and its children', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(
		client,
		[
			{
				id: 'root',
				component: 'FormSection',
				title: 'Contact details',
				description: 'How we reach you.',
				children: ['name']
			} as never,
			{ id: 'name', component: 'TextField', label: 'Full name', value: { path: '/name' } } as never
		],
		{ name: '' }
	);
	await expect.element(screen.getByText('Contact details')).toBeInTheDocument();
	await expect.element(screen.getByText('How we reach you.')).toBeInTheDocument();
	await expect.element(screen.getByText('Full name')).toBeInTheDocument();
});
