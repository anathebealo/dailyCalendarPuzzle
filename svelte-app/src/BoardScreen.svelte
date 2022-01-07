<script>
	import ShapesLayer from './ShapesLayer.svelte';
	import BaseBoard from './BaseBoard.svelte';
  import BoardHeader from './BoardHeader.svelte';
</script>

<BoardHeader />
  <div class="center">
    <BaseBoard />
    <ShapesLayer />
  </div>

<style>
  .center {
    position:relative;
    width: 850px;
    margin: auto;
    perspective: 500px
	}
</style>