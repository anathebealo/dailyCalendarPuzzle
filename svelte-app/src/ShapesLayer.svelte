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
	
	let offBoardSpots = [
		{
			x: -3,
			y: 0
		},
		{
			x: 8,
			y: 0
		}
	]
	let board = {
		board: [['empty','empty','empty','empty','empty','empty',undefined],['empty','empty','empty','empty','empty','empty','  '],['empty','empty','empty','empty','empty','empty','empty'],['empty','empty','empty','empty','J7','J7','empty'],['empty','empty','empty','B2','B2','J7','empty'],['empty','empty','empty','B2','B2','J7','empty'],['empty','empty','empty','B2','empty','J7','empty'],[undefined,undefined,undefined,undefined,'empty','empty','empty']],
		piecesOnBoard: [
			{
				id: 'Z1',
				leftX: 1,
				topY: 0,
			},
			{
				id: 'L2',
				leftX: 2,
				topY: 0,
			},
			{
				id: 'J5',
				leftX: 5,
				topY: 0,
			},
			{
				id: 'N1',
				leftX: 0,
				topY: 1,
			},
			{
				id: 'T4',
				leftX: 2,
				topY: 2,
			},
			{
				id: 'I5',
				leftX: 0,
				topY: 3,
			},
			{
				id: 'S1',
				leftX: 2,
				topY: 4,
			},
			{
				id: '|1',
				leftX: 0,
				topY: 6,
			},
			{
				id: 'U3',
				leftX: 4,
				topY: 6,
			},
			{
				id: 'B7',
				leftX: 4,
				topY: 4,
			},
		]
};
</script>

<!--Show all pieces that have been placed-->
{#each board.piecesOnBoard as piece, pieceIndex}
		<Shape pieceId={piece.id} top={piece.topY} left={piece.leftX} 
			offX={offBoardSpots[pieceIndex%offBoardSpots.length].x}
			offY={offBoardSpots[pieceIndex%offBoardSpots.length].y}
			/>
{/each}