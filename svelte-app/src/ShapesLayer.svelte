<style>
	:global(body) {
		padding: 0px;
	}
	.svgDiv {
		position: absolute;
	}
	:global(svg) {
		overflow: visible;
	}
</style>

<script>
	import Shape from './Shape.svelte';
	export let board;
	let offBoardSpots = [
		{
			x: -3,
			y: 0
		},
		{
			x: -3,
			y: 3
		},
		{
			x: -3,
			y: 6
		},
		{
			x: 8,
			y: 0
		},
		{
			x: 8,
			y: 3
		},
		{
			x: 8,
			y: 6
		}
	];
</script>

<!--Show all pieces that have been placed-->
{#each Object.values(board.locations) as piece, pieceIndex}
		<Shape pieceId={piece.id} top={piece.topY} left={piece.leftX} 
			offX={offBoardSpots[pieceIndex%offBoardSpots.length].x}
			offY={offBoardSpots[pieceIndex%offBoardSpots.length].y}
		/>
{/each}