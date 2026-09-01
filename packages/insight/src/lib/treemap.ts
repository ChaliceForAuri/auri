/**
 * Squarified treemap layout (Bruls, Huizing & van Wijk, 2000).
 *
 * Pure geometry, no DOM: the component renders what this returns, and the
 * tests check the properties that make a treemap readable rather than pinning
 * pixel values. Naive slice-and-dice produces slivers at these ratios — a
 * 21-case area beside a 312-case one becomes an unlabellable sliver — so the
 * squarified variant is what makes small areas legible at all.
 */

export interface TreemapInput {
	id: string;
	value: number;
	children?: TreemapInput[];
}

export interface TreemapRect {
	id: string;
	/** Present on a child, so the renderer can name its parent in the drill. */
	parentId?: string;
	depth: 0 | 1;
	x: number;
	y: number;
	width: number;
	height: number;
}

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** Worst aspect ratio in a row, given the row's total area and side length. */
function worst(row: number[], side: number, scale: number): number {
	if (row.length === 0) return Infinity;
	const sum = row.reduce((a, b) => a + b, 0) * scale;
	const max = Math.max(...row) * scale;
	const min = Math.min(...row) * scale;
	const side2 = side * side;
	const sum2 = sum * sum;
	return Math.max((side2 * max) / sum2, sum2 / (side2 * min));
}

/**
 * Lay `values` (in the caller's units) into `box`, returning one rect each in
 * the same order. Zero and negative values are dropped by the caller.
 */
function squarifyInto(values: number[], box: Box): Box[] {
	const total = values.reduce((a, b) => a + b, 0);
	if (total <= 0) return values.map(() => ({ x: box.x, y: box.y, width: 0, height: 0 }));

	const out: Box[] = new Array(values.length);
	const scale = (box.width * box.height) / total;

	let free: Box = { ...box };
	let index = 0;

	while (index < values.length) {
		const side = Math.min(free.width, free.height);
		const row: number[] = [];
		let rowEnd = index;

		// Grow the row while it improves (lowers) the worst aspect ratio.
		while (rowEnd < values.length) {
			const candidate = [...row, values[rowEnd]!];
			if (row.length > 0 && worst(candidate, side, scale) > worst(row, side, scale)) break;
			row.push(values[rowEnd]!);
			rowEnd += 1;
		}

		const rowArea = row.reduce((a, b) => a + b, 0) * scale;
		const horizontal = free.width >= free.height;
		const thickness = rowArea / side;

		let offset = horizontal ? free.y : free.x;
		for (let i = 0; i < row.length; i += 1) {
			const length = (row[i]! * scale) / thickness;
			out[index + i] = horizontal
				? { x: free.x, y: offset, width: thickness, height: length }
				: { x: offset, y: free.y, width: length, height: thickness };
			offset += length;
		}

		index = rowEnd;
		free = horizontal
			? { x: free.x + thickness, y: free.y, width: free.width - thickness, height: free.height }
			: { x: free.x, y: free.y + thickness, width: free.width, height: free.height - thickness };
	}

	return out;
}

/**
 * Lay out one level of items, and the children of any item that has them.
 *
 * `padding` insets a parent's children from its frame; `header` adds extra
 * inset at the top, the band where the parent's own label goes — without it a
 * parent with children has nowhere to write its name. When a box is too small
 * to carry both, its children are dropped rather than drawn as slivers: an
 * honest omission beats an unreadable one.
 */
export function layoutTreemap(
	items: readonly TreemapInput[],
	width: number,
	height: number,
	padding = 0,
	header = 0
): TreemapRect[] {
	const usable = items.filter((i) => Number.isFinite(i.value) && i.value > 0);
	if (usable.length === 0 || width <= 0 || height <= 0) return [];

	const sorted = [...usable].sort((a, b) => b.value - a.value);
	const boxes = squarifyInto(
		sorted.map((i) => i.value),
		{ x: 0, y: 0, width, height }
	);

	const rects: TreemapRect[] = [];
	sorted.forEach((item, i) => {
		const box = boxes[i]!;
		rects.push({ id: item.id, depth: 0, ...box });

		const kids = (item.children ?? []).filter((c) => Number.isFinite(c.value) && c.value > 0);
		if (kids.length === 0) return;

		const inner = {
			x: box.x + padding,
			y: box.y + padding + header,
			width: box.width - padding * 2,
			height: box.height - padding * 2 - header
		};
		if (inner.width <= 0 || inner.height <= 0) return;

		const sortedKids = [...kids].sort((a, b) => b.value - a.value);
		const kidBoxes = squarifyInto(
			sortedKids.map((k) => k.value),
			inner
		);
		sortedKids.forEach((kid, k) => {
			rects.push({ id: kid.id, parentId: item.id, depth: 1, ...kidBoxes[k]! });
		});
	});

	return rects;
}
