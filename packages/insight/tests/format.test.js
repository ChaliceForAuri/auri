import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatWindow } from '../src/lib/format.ts';

test('a window with both ends renders as a range', () => {
	assert.match(formatWindow('2026-08-01T00:00:00Z', '2026-08-31T00:00:00Z'), /Aug/);
});

test('an open-ended window is kept, not silently dropped', () => {
	assert.match(formatWindow('2026-08-01T00:00:00Z', undefined), /^since /);
	assert.match(formatWindow(undefined, '2026-08-31T00:00:00Z'), /^until /);
});

test('junk yields nothing rather than "Invalid Date"', () => {
	assert.equal(formatWindow('not-a-date', undefined), '');
	assert.equal(formatWindow(undefined, undefined), '');
	assert.equal(formatWindow(42, {}), '');
});
