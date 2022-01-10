<div style="text-align: center">
  <h1>Puzzle of the Day</h1>
  <div class=flexRow>
    <button class=green on:click={clearData()}>Back To Home</button>
    <button class=blue>Hint</button>
    <button class=yellow>Solve</button>
  </div>
</div>

<script>
  export let clearData;
</script>

<style>
  .flexRow {
    display: flex;
    flex-direction: row;
    justify-content: space-evenly;
    width: 850px;
    margin: auto;
    margin-bottom: 30px;
  }
  button {
    border-radius: 5px;
    padding: 15px 25px;
    font-size: 22px;
    text-decoration: none;
    margin: 20px;
    color: #fff;
    position: relative;
    display: inline-block;
    cursor: pointer;
    border: none;
  }
  .green {
    background-color: #47c551;
    box-shadow: 0px 5px 0px 0px #3cb146;
  }
  .green:hover {
    background-color: #59ed65;
  }
  .blue {
    background-color: #55acee;
    box-shadow: 0px 5px 0px 0px #3c93d5;
  }
  .blue:hover {
    background-color: #6FC6FF;
  }
  .yellow {
    background-color: #f1c40f;
    box-shadow: 0px 5px 0px 0px #d8ab00;
  }
  .yellow:hover {
    background-color: #FFDE29;
  }
</style>