<script>
  export let board;
  export let clearData;
  export let dateString;
  
	import ShapesLayer from './ShapesLayer.svelte';
	import BaseBoard from './BaseBoard.svelte';
  import BoardHeader from './BoardHeader.svelte';
</script>

<BoardHeader clearData={clearData} dateString={dateString}/>
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