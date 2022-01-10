<script>
	export let weekday;
	export let month;
	export let day;
	export let year;
	export let boards;

	let pickDate = (e) => {
		const date = new Date(e.target.value.replace('-','/')); // dumb hack because date formatted like 2022-01-02 will be set as 2022-01-01 UTC sucks
		weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
		month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][date.getMonth()];
		day = date.getDate();
		year = date.getFullYear();
	}

	let pickButtonDate = (yearIn, monthIn, dayIn) => {
		let board = boards[yearIn][monthIn][dayIn];

		year = board.year;
		month = board.month;
		day = board.day;
		weekday = board.weekday;
	}
</script>

<div class="center">
  <h1>Select a Date</h1>
  <input type="date" id="start" name="date-pick" min="2022/01/01" max="2025/12/31" on:input={pickDate}>

	<h2>Or Select Day from below list of found boards</h2>
	{#each Object.keys(boards) as yearKey}
		<h3>{yearKey}</h3>
		{#each Object.keys(boards[yearKey]) as monthKey}
			<br />
			{#each Object.keys(boards[yearKey][monthKey]) as dayKey}
				<button on:click={pickButtonDate(yearKey, monthKey, dayKey)}>{monthKey} {dayKey}</button>
			{/each}
		{/each}
	{/each}
</div>

<style>
  .center {
    text-align: center;
  }
</style>