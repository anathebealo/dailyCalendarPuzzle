<style>
	.nonBoardCell {
		color: transparent;
		background-color: transparent;
	}	
	.flexCol {
		display: flex;
		flex-direction: column;
	}
	.flexRow {
		display: flex;
		flex-direction: row;
	}
	.cellDiv {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100px;
		height: 100px;
		color: #835500;
		font-size: 24px;
	}
	.absolute {
		position: absolute;
	}
	.gap {
		top: 50px;
		left: 50px;
	}
</style>

<script>
	import BoardBackground from './BoardBackground.svelte'
	let baseBoard = [['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', null],['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', null], ['1', '2', '3', '4', '5', '6', '7'], ['8', '9', '10', '11', '12', '12', '14'], ['15', '16', '17', '18', '19', '20', '21'], ['22', '23', '24', '25', '26', '27', '28'], ['29', '30', '31', 'Sun', 'Mon', 'Tues', 'Wed'], [null, null, null, null, 'Thur', 'Fri', 'Sat']];
</script>

<div>
	<div class="absolute"><BoardBackground /></div>
	<div class="flexCol absolute gap">
		{#each baseBoard as row, rowIndex}
			<div class=flexRow>
				{#each row as col, colIndex}
					<div class:nonBoardCell={!col}
							class=cellDiv>
						{#if baseBoard[rowIndex][colIndex]}
							{baseBoard[rowIndex][colIndex]}
						{:else}
							{''}
						{/if}
					</div>
				{/each}
			</div>
		{/each}
	</div>
</div>