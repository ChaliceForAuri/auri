/**
 * Validates an A2UI JSONL stream against the ops contract — the shared core of
 * the contract tests and the emission-eval harness (PLAN 2.4 pillar 2): the
 * same code that gates CI fixtures scores model output, so the two can't drift.
 *
 * CLI: node scripts/validate-stream.js <file.jsonl...>
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import AjvModule from 'ajv/dist/2020.js';

const Ajv2020 = AjvModule.default ?? AjvModule;

const contractDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'contract');

export const catalog = JSON.parse(readFileSync(join(contractDir, 'catalog.json'), 'utf8'));
export const OPS_CATALOG_ID = catalog.catalogId;

// strict:false — the catalog carries spec-style non-keyword fields (catalogId,
// instructions, components) that ajv's strict mode would reject.
const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addSchema(catalog);

const validators = Object.fromEntries(
	Object.keys(catalog.components).map((name) => [
		name,
		ajv.compile({ $ref: `${catalog.$id}#/components/${name}` })
	])
);

/**
 * @param {string} text - JSONL stream (blank lines ignored)
 * @returns {{errors: string[], componentsSeen: Set<string>}} errors are
 *   human-readable, prefixed with 1-based line numbers.
 */
export function validateStream(text) {
	const errors = [];
	const componentsSeen = new Set();

	const lines = text.split('\n');
	lines.forEach((line, index) => {
		if (!line.trim()) return;
		const at = `line ${index + 1}`;

		let message;
		try {
			message = JSON.parse(line);
		} catch (cause) {
			errors.push(`${at}: not valid JSON (${cause.message})`);
			return;
		}

		if (message.version !== 'v1.0') {
			errors.push(
				`${at}: missing or wrong envelope version (got ${JSON.stringify(message.version)})`
			);
		}

		const components =
			message.updateComponents?.components ?? message.createSurface?.components ?? [];
		for (const spec of components) {
			const foreign = spec.catalogId !== undefined && spec.catalogId !== OPS_CATALOG_ID;
			if (foreign) continue; // basic-catalog (or other) components are out of scope here
			const validate = validators[spec.component];
			if (!validate) {
				errors.push(
					`${at}: '${spec.component}' (id '${spec.id}') is not an ops component and carries no foreign catalogId`
				);
				continue;
			}
			componentsSeen.add(spec.component);
			if (!validate(spec)) {
				errors.push(
					`${at}: ${spec.component} '${spec.id}': ${ajv.errorsText(validate.errors, { separator: '; ' })}`
				);
			}
		}
	});

	return { errors, componentsSeen };
}

const invokedDirectly =
	process.argv[1] &&
	fileURLToPath(import.meta.url) === (await import('node:path')).resolve(process.argv[1]);

if (invokedDirectly) {
	const files = process.argv.slice(2);
	if (files.length === 0) {
		console.error('usage: node scripts/validate-stream.js <file.jsonl...>');
		process.exit(2);
	}
	let failed = false;
	for (const file of files) {
		const { errors, componentsSeen } = validateStream(readFileSync(file, 'utf8'));
		if (errors.length === 0) {
			console.log(`ok   ${file} (${[...componentsSeen].join(', ') || 'no ops components'})`);
		} else {
			failed = true;
			console.error(`FAIL ${file}`);
			for (const error of errors) console.error(`  ${error}`);
		}
	}
	process.exit(failed ? 1 : 0);
}
