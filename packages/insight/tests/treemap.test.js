import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutTreemap } from '../src/lib/treemap.ts';

const areas = [
	{
		id: 'reporting',
		value: 312,
		children: [
			{ id: 'export-totals', value: 190 },
			{ id: 'scheduled-sends', value: 122 }
		]
	},
	{
		id: 'billing',
		value: 148,
		children: [
			{ id: 'invoice-pdf', value: 96 },
			{ id: 'proration', value: 52 }
		]
	},
	{ id: 'onboarding', value: 74 },
	{ id: 'integrations', value: 39 },
	{ id: 'mobile', value: 21 }
];

const W = 800;
const H = 500;
const tops = (r) => r.filter((x) => x.depth === 0);

test('every area gets a rect, and children are tagged with their parent', () => {
	const rects = layoutTreemap(areas, W, H, 4);
	assert.equal(tops(rects).length, 5);
	const kids = rects.filter((r) => r.depth === 1);
	assert.equal(kids.length, 4);
	assert.equal(kids.find((k) => k.id === 'export-totals')?.parentId, 'reporting');
});

test('area is proportional to value — the whole point of the encoding', () => {
	const rects = tops(layoutTreemap(areas, W, H));
	const total = areas.reduce((a, b) => a + b.value, 0);
	for (const area of areas) {
		const rect = rects.find((r) => r.id === area.id);
		const share = (rect.width * rect.height) / (W * H);
		assert.ok(
			Math.abs(share - area.value / total) < 0.005,
			`${area.id}: area share ${share.toFixed(4)} should track value share ${(area.value / total).toFixed(4)}`
		);
	}
});

test('rectangles tile the box without overlapping', () => {
	const rects = tops(layoutTreemap(areas, W, H));
	const covered = rects.reduce((sum, r) => sum + r.width * r.height, 0);
	assert.ok(Math.abs(covered - W * H) < 1, 'tiles should cover the box');

	for (let i = 0; i < rects.length; i += 1) {
		for (let j = i + 1; j < rects.length; j += 1) {
			const a = rects[i];
			const b = rects[j];
			const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
			const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
			assert.ok(overlapX < 0.01 || overlapY < 0.01, `${a.id} overlaps ${b.id}`);
		}
	}
	for (const r of rects) {
		assert.ok(r.x >= -0.01 && r.y >= -0.01, 'inside the box');
		assert.ok(r.x + r.width <= W + 0.01 && r.y + r.height <= H + 0.01, 'inside the box');
	}
});

test('squarified: even the smallest area stays labellable, not a sliver', () => {
	const rects = tops(layoutTreemap(areas, W, H));
	for (const r of rects) {
		const ratio = Math.max(r.width / r.height, r.height / r.width);
		assert.ok(ratio < 5, `${r.id}: aspect ratio ${ratio.toFixed(1)} is a sliver`);
	}
});

test('children that cannot be inset honestly are dropped, not drawn as slivers', () => {
	// A box far too small for its padding: the parent still renders, kids don't.
	const rects = layoutTreemap(
		[{ id: 'tiny', value: 1, children: [{ id: 'kid', value: 1 }] }],
		6,
		6,
		8
	);
	assert.deepEqual(
		rects.map((r) => r.id),
		['tiny']
	);
});

test('junk values are ignored rather than corrupting the layout', () => {
	const rects = layoutTreemap(
		[
			{ id: 'a', value: 10 },
			{ id: 'zero', value: 0 },
			{ id: 'neg', value: -5 },
			{ id: 'nan', value: NaN }
		],
		100,
		100
	);
	assert.deepEqual(
		rects.map((r) => r.id),
		['a']
	);
	assert.equal(Math.round(rects[0].width * rects[0].height), 10000);
});

test('an empty or impossible box yields nothing rather than throwing', () => {
	assert.deepEqual(layoutTreemap([], 100, 100), []);
	assert.deepEqual(layoutTreemap(areas, 0, 100), []);
});

test('the header band reserves room for a parent label, and children respect it', () => {
	const [parent, ...kids] = layoutTreemap(
		[
			{
				id: 'p',
				value: 100,
				children: [
					{ id: 'a', value: 60 },
					{ id: 'b', value: 40 }
				]
			}
		],
		400,
		300,
		4,
		24
	);
	assert.equal(parent.id, 'p');
	for (const kid of kids) {
		assert.ok(kid.y >= parent.y + 24, `${kid.id} must start below the label band`);
		assert.ok(kid.y + kid.height <= parent.y + parent.height + 0.01, 'and stay inside the parent');
	}
});

test('a box with no room for label + children keeps the parent, drops the children', () => {
	const rects = layoutTreemap(
		[{ id: 'p', value: 1, children: [{ id: 'a', value: 1 }] }],
		30,
		20,
		4,
		24
	);
	assert.deepEqual(
		rects.map((r) => r.id),
		['p']
	);
});
