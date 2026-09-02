import test from 'node:test';
import assert from 'node:assert/strict';
import { domain } from '../src/lib/scatter.ts';

/*
 * Reported from production (#55): a workspace whose baseline is ~0 for every
 * point — the normal shape for a quiet period followed by a burst — rendered
 * as a column in the middle of the plot. Centre reads as mid-scale, so the
 * most alarming signal available was drawn as the most ordinary one.
 */
test('a zero-width domain anchors at zero instead of centring the column', () => {
	// Every point at exactly 0: the column belongs at the origin, not mid-plot.
	assert.deepEqual(domain([0, 0, 0]), [0, 1]);

	// The old behaviour, for contrast: a symmetric window would have been
	// [-0.15, 0.15], putting 0 at the exact centre of the plot.
	const [lo, hi] = domain([0, 0, 0]);
	const positionOfZero = (0 - lo) / (hi - lo);
	assert.equal(positionOfZero, 0, 'zero must render at the axis origin');
});

test('a zero-width domain at a non-zero value stays honest about magnitude', () => {
	// All points at 40: the column should sit high on a zero-based axis, so its
	// position still means something, rather than defaulting to the middle.
	const [lo, hi] = domain([40, 40]);
	assert.equal(lo, 0);
	const position = (40 - lo) / (hi - lo);
	assert.ok(position > 0.7, `expected 40 to read as large, got ${position}`);
});

test('negative zero-width domains anchor at zero from the other side', () => {
	const [lo, hi] = domain([-8, -8]);
	assert.equal(hi, 0);
	const position = (-8 - lo) / (hi - lo);
	assert.ok(position < 0.3, `expected -8 to read as far below zero, got ${position}`);
});

test('a normal spread is unchanged, and padded proportionally', () => {
	// The fix must not disturb the ordinary case.
	assert.deepEqual(domain([10, 20]), [8.5, 21.5]);
});

test('a tiny but real spread still spreads', () => {
	// 0 to 0.05 is a real range, not a degenerate one: keep showing the
	// variation rather than collapsing it away.
	const [lo, hi] = domain([0, 0.05]);
	assert.ok(hi > lo);
	assert.ok(lo < 0 && hi > 0.05, 'padded on both sides');
});

test('an empty domain is a unit domain, not NaN', () => {
	// Math.min() of nothing is Infinity; the guard keeps that off the axis.
	assert.deepEqual(domain([]), [0, 1]);
});
