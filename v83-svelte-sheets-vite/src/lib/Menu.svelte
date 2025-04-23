<script lang="ts">
  
  interface Props {
    show?: boolean;
    x: any;
    y: any;
    data?: (string | number | boolean)[][];
    selected: string;
    copy: (e: any) => void;
    cut: (e: any) => void;
    paste: (e: any) => any[][];
    clear: (e: any) => any[][];
    // delete is a reserved word...
    delet: (e: any) => any[][];
  }

  let {
    show = false,
    x,
    y,
    data = [],
    selected,
    copy,
    cut,
    paste,
    clear,
    delet
  }: Props = $props();
</script>

<div class="menu" class:hidden={!show} style={`top: ${y}px; left: ${x}px`}>
  <div class="item flex justify-between" onclick={(e) => cut(e)}>
    <div>Cut</div>
    <div class="disabled">⌘X</div>
  </div>
  <div class="item flex justify-between" onclick={(e) => copy(e)}>
    <div>Copy</div>
    <div class="disabled">⌘C</div>
  </div>
  <div class="item flex justify-between" onclick={(e) => paste(e)}>
    <div>Paste</div>
    <div class="disabled">⌘P</div>
  </div>
  <div class="divider"></div>
  <div class="item">Insert</div>
  <div class="item" onclick={(e) => delet(e)}>Delete</div>
  <div class="item" onclick={(e) => clear(e)}>Clear contents</div>
</div>

<style>
  .menu {
    padding: 0.5rem 0.25rem;
    position: fixed;
    z-index: 20;
    min-width: 10rem;
    background: #ddd;
    border-radius: 10px;
  }
  .disabled {
    color: #aaa;
  }
  .divider {
    padding-top: 0.5rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid #aaa;
  }
  .hidden {
    display: none;
  }
  .flex {
    display: flex;
  }
  .justify-between {
    justify-content: space-between;
  }
  .item {
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }
  .item:hover {
    background-color: rgb(79, 194, 194);
  }
</style>
