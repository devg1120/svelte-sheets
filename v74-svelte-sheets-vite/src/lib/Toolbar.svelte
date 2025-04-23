<script lang="ts">
  import { run } from 'svelte/legacy';

  import * as XLSX from 'xlsx';
  import { convert } from './convert';

  interface Props {
    sheetNames: any;
    sheets?: any;
    active?: number;
  }

  let { sheetNames = $bindable(), sheets = $bindable([]), active = $bindable(0) }: Props = $props();

  // declare all possible table object
  let fileinput: any = $state();
  let files: any = $state();


  let reader = $state();
  if (FileReader != undefined) {
    reader = new FileReader();
    reader.onload = () => {
      sheets = [];
      active = 0;
      const wb = XLSX.read(new Uint8Array(reader.result), {
        type: 'array',
        cellFormula: true,
        cellStyles: true
      });
      sheets = convert(wb);
      sheetNames = sheets.map((s) => s.sheetName);
    };
  }
  run(() => {
    files && files[0] && reader && reader.readAsArrayBuffer(files[0]);
  });
</script>

<input type="file" class="hidden" name="file" bind:this={fileinput} bind:files />

<div class="flex">
  <button onclick={(_) => fileinput.click()}>Open XLSX file</button>
  {#each sheetNames as sn, i}
    <div
      onclick={(_) => {
        active = i;
      }}
      class={'ml-4 cursor-pointer ' + (i == active ? 'active' : '')}
    >
      {sn}
    </div>
  {/each}
</div>

<style>
  .hidden {
    height: 0;
    width: 0;
    opacity: 0;
  }
  .active {
    border-bottom: 1px solid teal;
  }
  .flex {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .ml-4 {
    margin-left: 1rem;
  }
  .cursor-pointer {
    cursor: pointer;
  }
</style>
