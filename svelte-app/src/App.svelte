<script>
	import HomeScreen from './HomeScreen.svelte';
	import BoardScreen from './BoardScreen.svelte';
	let weekday;
	let month;
	let day;
</script>


{#if !weekday && !month && !day}
	<HomeScreen bind:weekday bind:month bind:day/>
{:else}
	<BoardScreen />
{/if}
