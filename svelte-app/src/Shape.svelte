<script>
	import { onDestroy } from 'svelte';
	export let pieceId;
	export let top;
	export let left;
	// B
	import B1 from "./shapes/B/B1.svelte";
	import B2 from "./shapes/B/B2.svelte";
	import B3 from "./shapes/B/B3.svelte";
	import B4 from "./shapes/B/B4.svelte";
	import B5 from "./shapes/B/B5.svelte";
	import B6 from "./shapes/B/B6.svelte";
	import B7 from "./shapes/B/B7.svelte";
	import B8 from "./shapes/B/B8.svelte";

	// i
	import I1 from "./shapes/i/i1.svelte";
	import I5 from "./shapes/i/i5.svelte";

	// J
	import J5 from "./shapes/J/J5.svelte";
	import J7 from "./shapes/J/J7.svelte";

	// L
	import L1 from "./shapes/L/L1.svelte";
	import L2 from "./shapes/L/L2.svelte";

	// line
	import Line1 from "./shapes/line/line1.svelte";
	import Line2 from "./shapes/line/line2.svelte";

	// n
	import N1 from "./shapes/n/n1.svelte";

	// s
	import S1 from "./shapes/s/s1.svelte";

	// T
	import T1 from "./shapes/T/T1.svelte";
	import T4 from "./shapes/T/t4.svelte";

	// u
	import U1 from "./shapes/u/u1.svelte";
	import U3 from "./shapes/u/u3.svelte";

	// Z
	import Z1 from "./shapes/Z/Z1.svelte";

	const ShapeTypes = {
		B1: B1,
		B2: B2,
		B3: B3,
		B4: B4,
		B5: B5,
		B6: B6,
		B7: B7,
		B8: B8,
		I1: I1,
		I5: I5,
		J5: J5,
		J7: J7,
		L1: L1,
		L2: L2,
		N1: N1,
		S1: S1,
		T1: T1,
		T4: T4,
		U1: U1,
		U3: U3,
		Z1: Z1,
		"|1": Line1,
		"|2": Line2
	};

	export let offX = 0;
	export let offY = 0;

	let posX = left;
	let posY = top;

	let div;

	$: posX = onBoard ? left : offX;
	$: posY = onBoard ? top : offY;

	let onBoard = false;

	let changePos;
	let targetPos;
	
	let changeScale = 50;
	let targetScale = 100;
	let everToggle;
	function toggle() {
		everToggle = true;
		onBoard = !onBoard;
		changePos = {
			x: div.offsetLeft,
			y: div.offsetTop
		};
		changeScale = onBoard ? 100 : 50;
		targetScale = onBoard ? 50 : 100;

		targetPos = onBoard
			? {
				x: coordToPx(left),
				y: coordToPx(top)
			}
			: {
				x: coordToPx(offX),
				y: coordToPx(offY)
			}
	}

	let lastPos = {
		x: posX,
		y: posY
	}
	let offBoardAngle = Math.random() * 360;
	let cssTransformValue = `transform: scale(${changeScale}%);`;
	
	const interval = setInterval(() => {
		if (!everToggle) return;
		// get current position;
		var currPos = {
			x: div.offsetLeft,
			y: div.offsetTop
		}
		var diff = {
			x: targetPos.x - currPos.x,
			y: targetPos.y - currPos.y
		}
		var total = {
			x: targetPos.x - changePos.x,
			y: targetPos.y - changePos.y
		}
		var totalDist = Math.sqrt(Math.pow(total.x, 2) + Math.pow(total.y, 2));
		var dist = Math.sqrt(Math.pow(diff.x, 2) + Math.pow(diff.y, 2));
		var normal = {
			x: diff.x / dist,
			y: diff.y / dist
		}

		var r = dist / totalDist;

	
		var degX = 40 * normal.x * Math.sin(r * 3.14 * r * r);
		var degY = 40 * normal.y * Math.sin(r * 3.14 * r * r);

		var z = onBoard ? 0 : offBoardAngle;
		var scaleP = changeScale + Math.sin(r * 3.14 * r * r) * r * r * (targetScale - changeScale);
		
		cssTransformValue = `transform: rotateY(${degX}deg) rotateX(${degY}deg) rotateZ(${z}deg) scale(${scaleP}%);`

		lastPos = currPos;
	}, 1);

	function coordToPx(x){return x * 100 + 50;}
	onDestroy(() => clearInterval(interval));

</script>

<style>
  :global(body) {
    padding: 0px;
  }
  .svgDiv {
    position: absolute;
	transition: top .3s 0s ease-out, left .3s 0s ease-out, transform .3s 0s linear;
	/* -webkit-perspective: 240px; */
	perspective: 500px;
  }
  :global(svg) {
    overflow: visible;
  }

</style>

<div
  class="svgDiv"
  style="top: {coordToPx(posY)}px; left: {coordToPx(posX)}px; {cssTransformValue}"
  class:onBoard={onBoard}
  on:click={toggle}
  bind:this={div}
  >
  <svelte:component this={ShapeTypes[pieceId]} />
</div>
