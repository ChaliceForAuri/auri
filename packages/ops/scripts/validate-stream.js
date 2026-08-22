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

/**
 * Build a validator for any contract document — the shipped ops contract or a
 * composed subset (compose keeps the source catalogId, so a model emitting a
 * component that was cut from the composition fails here as "not a component
 * of this contract", which is exactly the vocabulary-escape signal an eval of
 * a composition needs).
 *
 * @param {object} contractJson - a catalog.json-shaped contract document
 */
export function createValidator(contractJson) {
	// strict:false — the catalog carries spec-style non-keyword fields
	// (catalogId, instructions, components) that ajv's strict mode would reject.
	const ajv = new Ajv2020({ allErrors: true, strict: false });
	ajv.addSchema(contractJson);
	const catalogId = contractJson.catalogId;

	const validators = Object.fromEntries(
		Object.keys(contractJson.components).map((name) => [
			name,
			ajv.compile({ $ref: `${contractJson.$id}#/components/${name}` })
		])
	);

	/**
	 * @param {string} text - JSONL stream (blank lines ignored)
	 * @returns {{errors: string[], componentsSeen: Set<string>}} errors are
	 *   human-readable, prefixed with 1-based line numbers.
	 */
	function validateStream(text) {
		const errors = [];
		const componentsSeen = new Set();
		/*
		 * Failure CLASS, not just pass/fail. A dropped brace and a wrong prop
		 * shape are opposite problems: the first is a model slip that recurs at
		 * some low rate on the deepest structures, the second means our contract
		 * is teaching something models can't emit. Collapsing both to "fail"
		 * makes a red nightly ambiguous, and an ambiguous alarm is one you learn
		 * to ignore. (Taxonomy borrowed from thesysdev/openui's benchmark, which
		 * classifies the same way.)
		 */
		const classes = new Set();
		// Every component id declared anywhere in the stream. Ids accumulate
		// across messages because updateComponents merges by id (the batching
		// rule), so `root` may legitimately arrive in a later batch than the
		// components it references.
		const declaredIds = new Set();

		const lines = text.split('\n');
		lines.forEach((line, index) => {
			if (!line.trim()) return;
			const at = `line ${index + 1}`;

			let message;
			try {
				message = JSON.parse(line);
			} catch (cause) {
				errors.push(`${at}: not valid JSON (${cause.message})`);
				classes.add('malformed-syntax');
				return;
			}

			if (message.version !== 'v1.0') {
				errors.push(
					`${at}: missing or wrong envelope version (got ${JSON.stringify(message.version)})`
				);
				classes.add('envelope');
			}

			const components =
				message.updateComponents?.components ?? message.createSurface?.components ?? [];
			for (const spec of components) {
				// Recorded before the foreign-catalog skip: a surface whose root is a
				// basic-catalog Column still has a root.
				if (typeof spec?.id === 'string') declaredIds.add(spec.id);
				const foreign = spec.catalogId !== undefined && spec.catalogId !== catalogId;
				if (foreign) continue; // basic-catalog (or other) components are out of scope here
				const validate = validators[spec.component];
				if (!validate) {
					errors.push(
						`${at}: '${spec.component}' (id '${spec.id}') is not a component of this contract and carries no foreign catalogId`
					);
					classes.add('vocabulary-escape');
					continue;
				}
				componentsSeen.add(spec.component);
				if (!validate(spec)) {
					errors.push(
						`${at}: ${spec.component} '${spec.id}': ${ajv.errorsText(validate.errors, { separator: '; ' })}`
					);
					classes.add('schema-violation');
				}
			}
		});

		/*
		 * Nothing paints until a component with the id `root` exists. An emission
		 * that is schema-perfect but rootless renders a blank surface, and until
		 * this check existed the harness scored that a PASS.
		 *
		 * This is not hypothetical: on the only independent cross-format benchmark
		 * of A2UI emission (thesysdev/openui, benchmarks/openui-bench), "renderer
		 * surface has no root" is the second-largest failure class — 35 of ~1,100
		 * runs, behind only malformed syntax. A gate that cannot see the dominant
		 * real-world failure is not gating the thing that matters.
		 */
		if (declaredIds.size > 0 && !declaredIds.has('root')) {
			errors.push(
				`no component with the id 'root' was declared — the surface renders blank (ids seen: ${[...declaredIds].slice(0, 8).join(', ')})`
			);
			classes.add('root-missing');
		}

		return { errors, componentsSeen, classes };
	}

	return { validateStream };
}

export const { validateStream } = createValidator(catalog);

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
