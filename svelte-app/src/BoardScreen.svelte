<script>
  export let board;
  export let clearData;

	import ShapesLayer from './ShapesLayer.svelte';
	import BaseBoard from './BaseBoard.svelte';
  import BoardHeader from './BoardHeader.svelte';
</script>

<BoardHeader clearData={clearData} />
<div class="center">
  <BaseBoard />
  <ShapesLayer board={board}/>
</div>

<style>
  .center {
    position:relative;
    width: 850px;
    margin: auto;
    perspective: 500px
	}
</style>