/**
 * Pure scale geometry for VelocityScatter.
 *
 * Extracted so the degenerate cases can be tested as arithmetic rather than
 * through a rendered SVG: the failure reported in #55 was not a visual polish
 * problem but a semantic inversion produced by two lines of arithmetic, and
 * arithmetic is where it should be pinned.
 */

/**
 * The visible range for one axis, padded.
 *
 * A domain derived only from the data's own spread has nothing to work with
 * when there is no spread. Padding a zero-width range symmetrically — the
 * obvious fix, and the one this shipped with — centres the whole column in the
 * plot, and centre reads as "mid-scale". For a baseline of ~0 that inverts the
 * meaning: "something from nothing", the most alarming shape in a velocity
 * chart, is drawn as the most ordinary one.
 *
 * With no spread to show, the only honest thing position can express is the
 * value's relationship to zero, so the domain anchors there.
 */
export function domain(values: readonly number[]): [number, number] {
	if (values.length === 0) return [0, 1];

	const lo = Math.min(...values);
	const hi = Math.max(...values);

	if (hi === lo) {
		// Every point shares one value: place it truthfully against zero.
		if (lo === 0) return [0, 1];
		return lo > 0 ? [0, lo * 1.3] : [lo * 1.3, 0];
	}

	const pad = (hi - lo) * 0.15;
	return [lo - pad, hi + pad];
}
