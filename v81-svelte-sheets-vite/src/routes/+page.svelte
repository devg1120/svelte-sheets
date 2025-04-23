<script>

  import { Pane, Splitpanes } from 'svelte-splitpanes';

  import * as XLSX from 'xlsx';

  import { Open, Sheet, download } from '../lib';
  import example from './_example.json';
  let open = $state();
  let currentValue = $state("");
  let selected = $state(false);
  let selected1 = $state(false);
  let selected2 = $state(false);
  let active = $state(0);
  let sheets = $state([example]);
  let sheetNames = $state([]);

  function onload(loadedSheets, loadedSheetNames) {
    sheets = loadedSheets;
    sheetNames = loadedSheetNames;
  }

  const decode = XLSX.utils.decode_cell;

  let sheet = $derived(sheets[active]);

  //let decoded = $derived(selected?.[0] ? decode(selected[0]) : { c: 0, r: 0 });

  let decoded = $derived.by(() => {
        if (selected) {
             if (selected[0]) {
                 //console.log(selected[0]);
                 return decode(selected[0])  ;
             } else {
                 return  { c: 0, r:0  } ;

            }
        }
                 return  { c: 0, r:0  } ;
   });

</script>

<Open bind:open {onload} />

<button class="btn secondary" onclick={(_) => open.click()}>
  <i class="fas fa-folder-open mr-1"></i>Open .xlsx File
</button>

{#if sheet}
  <button class="btn secondary" onclick={(_) => download(sheets, 'example' + '.xlsx')}>
    <i class="fas fa-download mr-1"></i>Download file
  </button>
{/if}

{#if sheet}
  <input
    bind:value={sheet.data[decoded.r][decoded.c]}
    style={{ width: '50vw' }}
    onchange={(v) => console.log('change', v)}
  />
<!--
  <Sheet
    bind:data={sheet.data}
    columns={sheet.columns}
    rows={sheet.rows}
    mergeCells={sheet.mergeCells || {}}
    options={{ tableHeight: '90vh' }}
    style={sheet.style || {}}
    bind:currentValue
    bind:selected
  />
-->
<!--
  <Sheet
    bind:data={sheet.data}
    columns={sheet.columns}
    rows={sheet.rows}
    mergeCells={sheet.mergeCells || {}}
    options={{ tableHeight: '90vh' }}
    style={sheet.style || {}}
    bind:currentValue={currentValue}
    bind:selected={selected}
  />
-->

 <Splitpanes horizontal={true} style="height: 900px">

<!--
 <Splitpanes >
 -->
  <Pane>
  <Sheet
    bind:data={sheet.data}
    bind:columns={sheet.columns}
    bind:rows={sheet.rows}
    mergeCells={sheet.mergeCells || {}}
    freeze={sheet.freeze || ""}
    options={{ tableHeight: '90vh' }}
    style={sheet.style || {}}
    bind:currentValue={currentValue}
    bind:selected={selected1}
  />
  </Pane>
  <Pane>

  <Sheet
    bind:data={sheet.data}
    bind:columns={sheet.columns}
    bind:rows={sheet.rows}
    mergeCells={sheet.mergeCells || {}}
    freeze={sheet.freeze || ""}
    options={{ tableHeight: '90vh' }}
    style={sheet.style || {}}
    bind:currentValue={currentValue}
    bind:selected={selected2}
  />
  </Pane>
 </Splitpanes>


{/if}

<!--
<a href="https://github.com/ticruz38/svelte-sheets" class="github-link">
  <span />
</a>
-->

<div class="sheet-names">
  {#each sheetNames as sn, i (sn)}
    <span class:selected={sheet.sheetName == sn} onclick={(_) => (active = i)}>{sn}</span>
  {/each}
</div>

<style>
  .sheet-names {
    text-align: center;
    position: fixed;
    bottom: 0;
    width: 100%;
    padding: 1rem;
  }
  .github-link {
    position: fixed;
    top: 0.5rem;
    right: 0.5rem;
    background-image: url('/github.png');
    height: 2rem;
    width: 2rem;
    background-position: center;
    background-repeat: none;
    background-size: cover;
  }
  .selected {
    text-decoration: underline;
  }
</style>
