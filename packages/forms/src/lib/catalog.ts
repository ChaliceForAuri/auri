import type { Catalog, CatalogEntry } from 'svelte-a2ui';

import TextField from './components/TextField.svelte';
import TextArea from './components/TextArea.svelte';
import NumberField from './components/NumberField.svelte';
import SelectField from './components/SelectField.svelte';
import RadioGroup from './components/RadioGroup.svelte';
import CheckboxGroup from './components/CheckboxGroup.svelte';
import Toggle from './components/Toggle.svelte';
import DateField from './components/DateField.svelte';
import FormSection from './components/FormSection.svelte';
import SubmitBar from './components/SubmitBar.svelte';

export const FORMS_CATALOG_ID = 'https://chaliceforauri.github.io/auri/catalogs/forms/v1.json';

const entry = (component: unknown, rest: Omit<CatalogEntry, 'component'> = {}): CatalogEntry =>
	({ component, ...rest }) as CatalogEntry;

// Every field two-way binds its answer through `value` (contract rule 1).
const field = { bindings: ['value'] } as const;

export const FORMS_COMPONENTS: Record<string, CatalogEntry> = {
	TextField: entry(TextField, field),
	TextArea: entry(TextArea, field),
	NumberField: entry(NumberField, field),
	SelectField: entry(SelectField, field),
	RadioGroup: entry(RadioGroup, field),
	CheckboxGroup: entry(CheckboxGroup, field),
	Toggle: entry(Toggle, field),
	DateField: entry(DateField, field),
	FormSection: entry(FormSection, { slots: { children: 'children' } }),
	SubmitBar: entry(SubmitBar, { actions: ['submitAction', 'cancelAction'] })
};

export const formsCatalog: Catalog = {
	id: FORMS_CATALOG_ID,
	components: FORMS_COMPONENTS
};
