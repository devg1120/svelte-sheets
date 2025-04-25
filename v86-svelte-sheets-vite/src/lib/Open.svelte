<script lang="ts">
  import { run } from 'svelte/legacy';

  import * as XLSX from 'xlsx';
  import { convert } from './convert';

  interface Props {
    onload: (sheets: any[], sheetNames: any[]) => void;
    sheetNames: any;
    sheets?: any;
    open: any;
  }

  let {
    onload,
    sheetNames = $bindable(),
    sheets = $bindable([]),
    open = $bindable()
  }: Props = $props();

  // declare all possible table object
  let files: any = $state();


  let reader = $state();
  if (typeof FileReader != 'undefined') {
    reader = new FileReader();
    reader.onload = () => {
      sheets = [];
      const wb = XLSX.read(new Uint8Array(reader.result), {
        type: 'array',
        cellFormula: true,
        cellStyles: true
      });
      sheets = convert(wb);
      sheetNames = sheets.map((s) => s.sheetName);
      onload && onload(sheets, sheetNames);
    };
  }
  run(() => {
    files && files[0] && reader && reader.readAsArrayBuffer(files[0]);
  });
</script>

<input type="file" class="hidden" name="file" bind:this={open} bind:files />

<style>
  .hidden {
    height: 0;
    width: 0;
    opacity: 0;
  }
</style>
