import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types';
import { COMPONENT_NAMES } from '$lib/components-data';

export const entries: EntryGenerator = () =>
	COMPONENT_NAMES.map((name) => ({ name: name.toLowerCase() }));

export const load: PageLoad = ({ params }) => {
	const name = COMPONENT_NAMES.find((n) => n.toLowerCase() === params.name);
	if (!name) error(404, `no such component: ${params.name}`);
	return { name };
};
