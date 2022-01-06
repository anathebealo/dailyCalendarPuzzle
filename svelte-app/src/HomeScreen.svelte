<script>
	export let weekday;
	export let month;
	export let day;

	let pickDate = (e) => {
		const date = new Date(e.target.value);
		weekday = date.getDay();
		month = date.getMonth();
		day = date.getDate();
	}
</script>

<div class="center">
  <h1>Select a Date</h1>
  <input type="date" id="start" name="date-pick" min="2022-01-01" max="2022-12-31" on:input={pickDate}>
</div>

<style>
  .center {
    text-align: center;
  }
</style>