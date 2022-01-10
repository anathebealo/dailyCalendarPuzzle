<script>	
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
	import I2 from "./shapes/i/i2.svelte";
	import I3 from "./shapes/i/i3.svelte";
	import I4 from "./shapes/i/i4.svelte";
	import I5 from "./shapes/i/i5.svelte";
	import I6 from "./shapes/i/i6.svelte";
	import I7 from "./shapes/i/i7.svelte";
	import I8 from "./shapes/i/i8.svelte";

	// J
	import J1 from "./shapes/J/J1.svelte";
	import J2 from "./shapes/J/J2.svelte";
	import J3 from "./shapes/J/J3.svelte";
	import J4 from "./shapes/J/J4.svelte";
	import J5 from "./shapes/J/J5.svelte";
	import J6 from "./shapes/J/J6.svelte";
	import J7 from "./shapes/J/J7.svelte";
	import J8 from "./shapes/J/J8.svelte";

	// L
	import L1 from "./shapes/L/L1.svelte";
	import L2 from "./shapes/L/L2.svelte";
	import L3 from "./shapes/L/L3.svelte";
	import L4 from "./shapes/L/L4.svelte";

	// line
	import Line1 from "./shapes/line/line1.svelte";
	import Line2 from "./shapes/line/line2.svelte";

	// n
	import N1 from "./shapes/n/n1.svelte";
	import N2 from "./shapes/n/n2.svelte";
	import N3 from "./shapes/n/n3.svelte";
	import N4 from "./shapes/n/n4.svelte";
	import N5 from "./shapes/n/n5.svelte";
	import N6 from "./shapes/n/n6.svelte";
	import N7 from "./shapes/n/n7.svelte";
	import N8 from "./shapes/n/n8.svelte";

	// s
	import S1 from "./shapes/s/s1.svelte";
	import S2 from "./shapes/s/s2.svelte";
	import S5 from "./shapes/s/s5.svelte";
	import S6 from "./shapes/s/s6.svelte";

	// T
	import T1 from "./shapes/T/T1.svelte";
	import T2 from "./shapes/T/t2.svelte";
	import T3 from "./shapes/T/T3.svelte";
	import T4 from "./shapes/T/t4.svelte";

	// u
	import U1 from "./shapes/u/u1.svelte";
	import U2 from "./shapes/u/u2.svelte";
	import U3 from "./shapes/u/u3.svelte";
	import U4 from "./shapes/u/u4.svelte";

	// Z
	import Z1 from "./shapes/Z/Z1.svelte";
	import Z2 from "./shapes/Z/Z2.svelte";
	import Z5 from "./shapes/Z/Z5.svelte";
	import Z6 from "./shapes/Z/Z6.svelte";

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
		I2: I2,
		I3: I3,
		I4: I4,
		I5: I5,
		I6: I6,
		I7: I7,
		I8: I8,

		J1: J1,
		J2: J2,
		J3: J3,
		J4: J4,
		J5: J5,
		J6: J6,
		J7: J7,
		J8: J8,

		L1: L1,
		L2: L2,
		L3: L3,
		L4: L4,

		N1: N1,
		N2: N2,
		N3: N3,
		N4: N4,
		N5: N5,
		N6: N6,
		N7: N7,
		N8: N8,

		S1: S1,
		S2: S2,
		S5: S5,
		S6: S6,

		T1: T1,
		T2: T2,
		T3: T3,
		T4: T4,

		U1: U1,
		U2: U2,
		U3: U3,
		U4: U4,

		Z1: Z1,
		Z2: Z2,
		Z5: Z5,
		Z6: Z6,	

		"|1": Line1,
		"|2": Line2
	};

	import { onDestroy } from 'svelte';
	export let pieceId;
	export let top;
	export let left;
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