<script lang="ts">
  import { onMount, tick } from 'svelte';
  import * as XLSX from 'xlsx';
  import { resizable } from './actions';
  import { draggable } from './actions/draggable';
  import type { Config } from './defaultconfig';
  import { defaultconfig } from './defaultconfig';
//  import hotkeys from 'hotkeys-js';
  import Menu from './Menu.svelte';
  import {
    clearSelection,
    computeStyles,
    deleteSelection,
    GetColSpan,
    GetRowSpan,
    mergeSelectExtends,
    pasteSelection
  } from './utilities';
//
  import { make_clock } from './clock';
  import { make_sparks } from './sparks';
  import { make_graph } from './graph';

  const encode = ({ c, r }) => XLSX.utils.encode_cell({ c: Number(c), r: Number(r) });
  const decode = XLSX.utils.decode_cell;
  // Containers
  let history: string[] = [];
  let highlighted = [];

  // Internal controllers
  let cmdz = $state(false);
  let selection = false;
  let extension = $state(false);
  let cursor = null;
  let historyIndex = 0;
  let ignoreEvents = false;
  let ignoreHistory = false;
  let edition = $state(null);
  let canvas_cell = null;
  let hashString = null;
  let resizing = null;
  let dragging = null;
  let keypressed = $state({});

  let root;
  
  interface Props {
    data?: (string | number | boolean)[][];
    columns?: any[];
    rows?: any[];
    mergeCells?: Record<string, number[]>;
    freeze?: string;
    // export let rows: Record<string, any> = [];
    style?: { [cellIndex: string]: string };
    selected?: [string, string]; // either null, or coordinates [[x, y], [x, y]]
    extended?: [string, string];
    currentValue?: string | number | boolean;
    clipboard: [string, string];
    options: Config;
    // implement virtual list
    startY?: number;
    startX?: number;
    endY?: number;
    endX?: number;
  }

  let {
    data = $bindable([]),
    columns = $bindable([]),
    rows = $bindable([]),
    mergeCells = {},
    freeze = "",
    style = {},
    selected = $bindable(null),
    extended = $bindable(null),
    currentValue = $bindable(''),
    clipboard = $bindable(),
    options,
    startY = $bindable(0),
    startX = $bindable(0),
    endY = $bindable(0),
    endX = $bindable(0)
  }: Props = $props();

  // virtual list state
  let height_map = $state([]);
  let width_map = $state([]);
  let rowElements = $state();
  let colElements = $state();
  let viewport = $state();
  let contents;
  let viewport_height = $state(0);
  let viewport_width = $state(0);

  let xcolumns: sny[]  =
    $derived(endX > columns.length ? Array.from({ length: endX - columns.length }, (v, i) => ({})) : []);
  let xrows: any[] = $derived(endY > data.length ? Array.from({ length: endY - data.length }) : []);






  let visibleY: { i: number; data: (string | number | boolean)[] }[] = $derived([...data, ...xrows].slice(startY, endY).map((d, i) => {
    return { i: i + startY, data: d };
  }));
  let visibleX: { i: number; data: (string | number | boolean)[] }[] = $derived([...columns, ...xcolumns].slice(startX, endX).map((d, i) => {
    return { i: i + startX, data: d };
  }));
  let mounted = $state();
  //let top = $state(0);  //GS
  //let left = $state(0); //GS
  let top_buffer = 2500;
  let bottom_buffer = 2500;
  let left_buffer = 2500;
  let right_buffer = 2500;
  //let bottom = $state(0); //GS
  //let right = $state(0);  //GS
  let average_height = $state();
  let average_width = $state();

  canvas_cell = [encode({ c:5 , r: 3 }), encode({ c: 7, r: 5 })];  // F4:H6

  console.log("freeze:", freeze, decode(freeze));
  //let freeze_ = decode(freeze);
  //console.log("freeze_c:", freeze_.c);
  //console.log("freeze_r:", freeze_.r);

  function getColumnsWidth(i: number) {
    return Number(
      typeof columns[i]?.width == 'string'
        ? columns[i]?.width.replace('px', '')
        : columns[i]?.width || config.defaultColWidth
    );
  }

  function getRowHeight(i: number) {
    try {
      const height = Number(
        typeof rows[i]?.height == 'string'
          ? rows[i]?.height?.replace('px', '')
          : rows[i]?.height || 24 // consider adding a config.defaultRowHeight
      );
      return height > 24 ? height : 24;
    } catch (e) {
      return 24;
    }
  }

  export function onInputKeyDown(e, r, c) {
    //console.log("onInputKeyDown:", e.key, r, x)

    if (e.key == 'Enter') {
      let r2 = String(parseInt(r.i) + 1);
      let c2 = String(parseInt(c.i) + 0);
      let next_cell = [encode({ c: c2, r: r2 }), encode({ c: c2, r: r2 })];
      e.target.remove();
      selected = next_cell;
      //edition = null;
      edition = next_cell;



      let table = document.getElementById('sheet_table');
      //let table = root.querySelector('sheet_table');

      /*
      for (let row of table.rows) {
          for(let cell of row.cells){
             console.log(cell.innerText);
          }
      }
      */

      let element = table.rows[parseInt(r2) + 1].cells[parseInt(c2) + 1];
      let event = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
      element.dispatchEvent(event);

      //table.rows[r2].cells[c+1].click();

      async function next_input_focus() {
        await tick();
        //console.log(document.getElementById('cell_editor'))
        let cell_editor = document.getElementById('cell_editor');
        cell_editor.focus();
        cell_editor.click();
      }
      next_input_focus();
    }
  }

  export function onInputChange(value, row, column) {
    //console.log('onInputChange:', value);
    cmdz = true;
    if (row.i > data.length - 1) {
      data = [
        ...data,
        ...Array.from({ length: row.i - data.length + 1 }, (v, i) => {
          if (i == row.i) {
            return Array.from({ length: columns.length }, (_, i) => {
              if (i == column.i) {
                return value;
              } else {
                return '';
              }
            });
          } else {
            return Array.from({ length: columns.length }, (_) => '');
          }
        })
      ];
    } else {
      data[row.i][column.i] = value;
    }
  }

  function freezeStyle_head_tr() {
      let style = "position: sticky;  top: 0px;  background: white; z-index: 20; ";
      return style;

  }
  function freezeStyle_head_td(c) {
     //return "";
     //let freeze_ = decode(freeze);
     //console.log("freeze_c:", freeze_.c);
     //console.log("freeze_r:", freeze_.r);

     if ( c == 0 ) {
        let style = "position: sticky; left: 50px; width: 100px;  min-width: 100px;  background: white; z-index:18; "
        return style;

     } else {
        return ''
     }
  }

  function freezeStyle_tr(r) {
     //return "";
     //let freeze_ = decode(freeze);
     //console.log("freeze_c:", freeze_.c);
     //console.log("freeze_r:", freeze_.r);

     if ( r == 0 ) {
        let style = "color:blue; position: sticky;  top: 27px;  background: white; z-index: 20; ";
        return style;

     } else {
        return ''
     }
  }
  function freezeStyle_td(c,r) {
     //return "";
     //let freeze_ = decode(freeze);
     //console.log("freeze_c:", freeze_.c);
     //console.log("freeze_r:", freeze_.r);

     if ( c == 0 ) {
        let style = "color: red; position: sticky; left: 50px; width: 100px;  min-width: 100px;  background: white; z-index:18; "
        return style;

     } else {
        return ''
     }
  }

  async function refresh(data, viewport_height, viewport_width) {
    const { scrollTop, scrollLeft } = viewport;
    await tick(); // wait until the DOM is up to date
    let content_height = top - scrollTop - bottom_buffer;
    let content_width = left - scrollLeft - left_buffer;
    // vertical
    let y = startY;
    while (content_height < viewport_height) {
      let row = rowElements[y - startY];
      if (!row) {
        endY = y + 1;
        await tick(); // render the newly visible row
        row = rowElements[y - startY];
      }
      const row_height = (height_map[y] = getRowHeight(y));
      content_height += row_height;
      y += 1;
    }
    endY = y;
    let remaining = data.length - endY;
    average_height = (top + content_height) / endY;
    bottom = remaining * average_height;
    height_map.length = data.length;
    // horizontal
    let x = startX;
    while (content_width < viewport_width) {
      let col = colElements[x - startX];
      if (!col) {
        endX = x + 1;
        await tick(); // render the newly visible col
        col = colElements[x - startX];
      }
      const col_width = (width_map[x] = getColumnsWidth(x));
      content_width += col_width;
      x += 1;
    }
    endX = x;
    let remains = columns.length - endX;
    average_width = (left + content_width) / endX;
    right = remains * average_width;
    width_map.length = columns.length;

    canvas_draw();
    svg_draw();
    if (root != null) {
     //make_clock(root);
     //make_sparks(root);
     //make_graph(root,"stage-container3", "bou");
    
    //make_graph("stage-container3", "oresen");
    //make_graph("stage-container3", "oresen2");
    //make_graph("stage-container3", "circle");
    //make_graph("stage-container3", "tree");
    }
/*
    let freeze_ = decode(freeze);
    console.log("freeze_c:", freeze_.c);
    console.log("freeze_r:", freeze_.r);
    let tr = root.querySelector('#tr_0' );
    console.log("tr",tr);
    tr.style = "position: sticky;  top: 28px;  background: white; z-index: 20; ";
  */ 
  }

  let scrollLeft = $state();
  let scrollTop = $state();


  function canvas_draw() {
      //const canvas001 = root.getElementById("canvas001");
      const canvas001 = root.querySelector("#canvas001");
      //console.log("canvas", canvas001);
      if (canvas001 != null) {
         
         const ctx = canvas001.getContext("2d");
	 ctx.fillStyle = "green";
         ctx.fillRect(100, 100, 100, 100);

          ctx.fillStyle = "rgb(200 0 0)";
          ctx.fillRect(10, 10, 50, 50);

          ctx.fillStyle = "rgb(0 0 200 / 50%)";
          ctx.fillRect(30, 30, 50, 50);
	 
       } else {
          console.log("canvas_draw  not element");
       }


  }

  function svg_draw() {
       //let svg1=document.getElementById('svg1');
       let svg1=root.querySelector('#svg1');
       if (svg1 != null) {
           let line1=document.createElementNS('http://www.w3.org/2000/svg','line');
           line1.setAttribute('x1',-30);
           line1.setAttribute('y1',-30);
           line1.setAttribute('x2',30);
           line1.setAttribute('y2',30);
           line1.setAttribute('stroke','red');
           svg1.appendChild(line1);
           const polygon = document.createElementNS('http://www.w3.org/2000/svg','polygon');
           const x1=40, y1=0, x2=50, y2=50, x3=90, y3=0;
           polygon.setAttribute('points',x1+","+y1+" "+x2+","+y2+" "+x3+","+y3); 
           svg1.appendChild(polygon);
       } else {
          console.log("svg_draw  not element");

       }

  }

  function handle_scroll(e) {
    scrollTop = viewport.scrollTop;
    scrollLeft = viewport.scrollLeft;
  }

  onMount(() => {
    if (window && window.document) {
      rowElements = document?.getElementsByClassName('virtual-row');
      colElements = document?.getElementsByClassName('virtual-col');
      mounted = true;
      // document.addEventListener("mouseup", jexcel.mouseUpControls);
      // document.addEventListener("mousedown", jexcel.mouseDownControls);
      // document.addEventListener("mousemove", jexcel.mouseMoveControls);
      // document.addEventListener("mouseover", jexcel.mouseOverControls);
      // document.addEventListener("dblclick", jexcel.doubleClickControls);
      // document.addEventListener("paste", jexcel.pasteControls);
      // document.addEventListener("contextmenu", jexcel.contextMenuControls);
      // document.addEventListener("touchstart", jexcel.touchStartControls);
      // document.addEventListener("touchend", jexcel.touchEndControls);
      // document.addEventListener("touchcancel", jexcel.touchEndControls);
      // document.addEventListener("touchmove", jexcel.touchEndControls);
      document?.addEventListener('keydown', onKeyDown);
      document?.addEventListener('keyup', onKeyUp);







    }
  });

  function onMouseDown(e) {
    // if right click
    if (e.which == 3) return;
    if (e.target.id == 'square') {
      extension = true;
      selection = false;
      return;
    }
    if (!e.target.dataset.x || !e.target.dataset.y) return;
    if (keypressed[16] && selected && selected[0]) {
      edition = null;
      selected = [selected[0], encode({ c: e.target.dataset.x, r: e.target.dataset.y })];
      return;
    }
    edition = null;
    // extension = false;
    selection = true;
    selected = [
      encode({ c: e.target.dataset.x, r: e.target.dataset.y }),
      encode({ c: e.target.dataset.x, r: e.target.dataset.y })
    ];
  }

  function onMouseUp(e) {
    if (!!selected && !selection && extension) {
      extension = false;
      data = mergeSelectExtends(data, selected, extended);
      selected = extended;
      return;
    }
    if (!!edition || !selected || !selection) return;
    selection = false;
    extended = selected;
  }

  function onMouseOver(e) {
    if (!!edition) return;
    if (!!selected && !selection && extension && e.target?.dataset?.x) {
      if (
        // extended is inside selected
        e.target?.dataset?.x >= topLeft.c &&
        e.target?.dataset?.x < bottomRight.c &&
        e.target?.dataset?.y >= topLeft.r &&
        e.target?.dataset?.y < bottomRight.r
      ) {
        extended = [
          encode(topLeft),
          encode({
            c: e.target.dataset.x,
            r: e.target.dataset.y
          })
        ];
        return;
      }
      if (e.target?.dataset?.y >= topLeft.r && e.target?.dataset?.y < bottomRight.r) {
        extended = [
          squareX < 0 ? encode({ c: bottomRight.c - 1, r: topLeft.r }) : selected[0],
          encode({ r: decoded[1].r, c: e.target.dataset.x })
        ];
      }
      if (e.target?.dataset?.x >= topLeft.c && e.target?.dataset?.x < bottomRight.c) {
        extended = [
          squareY < 0 ? encode({ r: bottomRight.r - 1, c: topLeft.c }) : selected[0],
          encode({ r: e.target.dataset.y, c: decoded[1].c })
        ];
      }
      return;
    }
    if (selection && !!selected && e.target?.dataset?.x) {
      selected = [
        selected[0] ||
          encode({
            c: e.target.dataset.x,
            r: e.target.dataset.y
          }),
        encode({
          c: e.target.dataset.x,
          r: e.target.dataset.y
        })
      ];
    }
  }

  function onKeyUp(e) {
    // on keyup just reinitialize everything
    keypressed[e.keyCode] = false;
  }

/*
  hotkeys('ctrl+z, command+z', function (e) {
    e.preventDefault();
    cmdz = true;
    if (historyIndex == 0) return;
    historyIndex -= 1;
    const res = JSON.parse(history[historyIndex]);
    data = res.data;
    columns = res.columns;
    rows = res.rows;
    style = res.style;
    setTimeout((_) => (cmdz = false), 10);
  });

  hotkeys('ctrl+shift+z, command+shift+z', function (e) {
    console.log('redo');
    e.preventDefault();
    cmdz = true;
    if (history.length - 1 == historyIndex) return;
    historyIndex = historyIndex + 1;
    const res = JSON.parse(history[historyIndex]);
    data = res.data;
    columns = res.columns;
    rows = res.rows;
    style = res.style;
    setTimeout((_) => (cmdz = false), 10);
  });

  hotkeys('ctrl+c, command+c, ctrl+x, command+x', function (e) {
    e.preventDefault();
    clipboard = JSON.stringify(selected);
  });

  hotkeys('ctrl+v, command+v', function (e) {
    e.preventDefault();
    if (!clipboard) return;
    data = pasteSelection(data, JSON.parse(clipboard), selected);
  });
*/

  function onKeyDown(e) {
    keypressed[e.keyCode] = true;
    if (!!edition) {
      if (e.key == 'Escape') {
        edition = null;
      }
      return;
    }
    if (!selected) return;
    switch (e.key) {
      case 'ArrowDown':
        var s = encode({
          c: decoded[0].c,
          r: decoded[0].r + 1
        });
        selected = [s, s];
        break;
      case 'ArrowUp':
        if (decoded[0].r <= 0) {   // GUSA
           decoded[0].r = 1;
        }
        var s = encode({
          c: decoded[0].c,
          r: decoded[0].r - 1
        });
        selected = [s, s];
        //console.log(">", selected);
        break;
      case 'ArrowLeft':
        var s = encode({
          c: decoded[0].c - 1,
          r: decoded[0].r
        });
        selected = [s, s];
        break;
      case 'ArrowRight':
        var s = encode({
          c: decoded[0].c + 1,
          r: decoded[0].r
        });
        selected = [s, s];
        break;
      default:
        break;
    }
  }

  let menuX = $state();
  let menuY = $state();
  function showMenu(e) {
    e.preventDefault();
    // e.stopImmediatePropagation();
    e.stopPropagation();
    menuX = e.screenX;
    menuY = e.screenY - 70;
  }
  // square selection


  let tops = $state();
  let rights = $state();
  let lefts = $state();
  let bottoms = $state();
  let topextend = $state();
  let rightextend = $state();
  let leftextend = $state();
  let bottomextend = $state();

  let colLine = $state(); //GS
  let rowLine = $state(); //GS
  let square = $state(); //GS
  let sticky_table = $state();

  let squareX = $state();
  let squareY = $state();
  //let topLeft = $state(); //GS
  //let bottomRight = $state(); //GS

  //let selectWidth: number = $state();  //GS
  //let selectHeight: number = $state(); //GS

  //let root;
 
  let { top, left, right, bottom, topLeft, bottomRight,  selectWidth, selectHeight } =  $derived.by(() => {

    let top  = 0;
    let left = 0;
    let right = 0;
    let bottom = 0;
    let topLeft = 0;
    let bottomRight  =0;
    let selectWidth = 0;
    let selectHeight = 0;

   if (mounted) {
      let tl = (selected && decode(selected[0])) || { c: 0, r: 0 };
      let br = (selected && decode(selected[1])) || { c: 0, r: 0 };
      topLeft = {
        c: br.c < tl.c ? br.c : tl.c,
        r: br.r < tl.r ? br.r : tl.r
      };
      bottomRight = {
        c: br.c > tl.c ? br.c + 1 : tl.c + 1,
        r: br.r > tl.r ? br.r + 1 : tl.r + 1
      };


      let tlid = 'td_' + String(topLeft.r) + '_' + String(topLeft.c);
      let brid = 'td_' + String(bottomRight.r) + '_' + String(bottomRight.c);

      let tl_ele = root.querySelector('#' + tlid);
      let br_ele = root.querySelector('#' + brid);
      //let tr = root.querySelector('#tr_0' );
      //console.log("tr",tr);

      if (tl_ele != null && br_ele != null) {
        //console.dir(tl_ele);
        //console.log('clientHeight:', tl_ele.clientHeight);
        //console.log('clientWidth :', tl_ele.clientWidth);
        //console.log('clientLeft  :', tl_ele.clientLeft);
        //console.log('clientTop   :', tl_ele.clientTop);

        //console.log('offsetHeight:', tl_ele.offsetHeight);
        //console.log('offsetWidth :', tl_ele.offsetWidth);
        //console.log('offsetLeft  :', tl_ele.offsetLeft);
        //console.log('offsetTop   :', tl_ele.offsetTop);

        //console.log('top', top);
        //console.log('left', left);
        //console.log('right', right);
        //console.log('bottom', bottom);

        //top = tl_ele.offsetTop;
        //left = tl_ele.offsetLeft;
        //right = left + tl_ele.clientWidth;
        //bottom = top + tl_ele.clientHeight;

        top = tl_ele.offsetTop;
        left = tl_ele.offsetLeft;
        right = br_ele.offsetLeft;
        bottom = br_ele.offsetTop;
        selectWidth = right - left;
        selectHeight = bottom - top;
      }
      return { top, left, right, bottom, topLeft, bottomRight,  selectWidth, selectHeight } ;

    } else {
      return { top, left, right, bottom, topLeft, bottomRight,  selectWidth, selectHeight } ;

    }
   });
 

  // history logic

  function historyPush(data, rows, columns, style) {
    if (!cmdz) {
      const step = { data, rows, columns, style };
      if (history[historyIndex] != JSON.stringify(step)) {
        history = [...history.slice(0, historyIndex + 1), JSON.stringify(step)];
        historyIndex = history.length - 1;
      }
    }
  }
  let decoded = $derived(selected
    ? [decode(selected[0]), decode(selected[1])]
    : [
        { c: 0, r: 0 },
        { c: 0, r: 0 }
      ]);
  let config = $derived({
    ...defaultconfig,
    ...(options || {})
  });

  // initialize and refactor data
  $effect(() => {
    (() => {
      if (data[0]) {
        if (!Array.isArray(data[0])) {
          columns = Object.keys(data[0]).map((k) => ({ name: k }));
          var d = [];
          for (var j = 0; j < data.length; j++) {
            var row = [];
            for (var i = 0; i < columns.length; i++) {
              row[i] = data[j][columns[i].name];
            }
            d.push(row);
          }
          data = d;
        }
      }

      // Adjust minimal dimensions
      var j = 0;
      var i = 0;
      var size_i = columns.length;
      var size_j = data.length;
      var min_i = config.minDimensions[0];
      var min_j = config.minDimensions[1];
      var max_i = min_i > size_i ? min_i : size_i;
      var max_j = min_j > size_j ? min_j : size_j;

      for (j = 0; j < max_j; j++) {
        for (i = 0; i < max_i; i++) {
          if (data[j] == undefined) {
            data[j] = [];
          }

          if (data[j][i] == undefined) {
            data[j][i] = '';
          }
        }
      }
    })();
  });

  $effect(() => {
    (function scrollY() {
      if (!scrollTop || !rowElements) return;

      // vertical scrolling
      for (let v = 0; v < rowElements.length; v += 1) {
        height_map[startY + v] = getRowHeight(startY + v);
      }
      let r = 0;
      let y = 0;
      while (true) {
        const row_height = height_map[r] || average_height;
        if (y + row_height > scrollTop - top_buffer) {
          startY = r;
          top = y;
          break;
        }
        y += row_height;
        r += 1;
      }
      while (true) {
        y += height_map[r] || average_height;
        r += 1;
        if (y > scrollTop + viewport_height + bottom_buffer) break;
      }
      endY = r;
      const remaining =
        endY > data.length ? (viewport_height + bottom_buffer) / 24 : data.length - endY;
      average_height = y / endY;
      // while (r < data.length) height_map[r++] = average_height;
      bottom = remaining * average_height;
    })();
  });

  $effect(() => {
    (function scrollX() {
      if (!scrollLeft || !colElements) return;
      // if (!scrollLeft) ;
      // horizontal scrolling
      for (let v = 0; v < colElements.length; v += 1) {
        width_map[startX + v] = getColumnsWidth(startX + v);
      }
      let c = 0;
      let x = 0;
      while (true) {
        const col_width = width_map[c] || average_width;
        if (x + col_width > scrollLeft - left_buffer) {
          startX = c;
          left = x;
          break;
        }
        x += col_width;
        c += 1;
      }
      while (true) {
        x += width_map[c] || average_width;
        c += 1;
        if (x > scrollLeft + viewport_width + right_buffer) break;
      }
      endX = c;
      const remaining =
        endX > columns.length ? (viewport_width + right_buffer) / 24 : columns.length - endX;
      average_width = x / endX;
      // while (c < columns.length) width_map[c++] = average_width;
      right = remaining * average_width;
    })();
  });
  
  
  // whenever `items` changes, invalidate the current heightmap

  $effect(() => {
    if (mounted) refresh(data, viewport_height, viewport_width);
  });


  $effect(() => {
    try {
      currentValue = data[decoded[0].r][decoded[0].c];
    } catch (e) {
      currentValue = '';
    }
  });

/*
  $effect(() => {
    if (mounted) {

  let freeze_ = decode(freeze);
  console.log("freeze_c:", freeze_.c);
  console.log("freeze_r:", freeze_.r);

//  let tr0 = document.querySelector('#tr_0');
//  console.log(tr0);

  let thead = root.querySelector('#thead');
  let tbody = root.querySelector('#tbody');
  console.log(thead);
  console.log(tbody);
  thead.style.color = "blue";
  tbody.style.color = "red";



  let table1 = root.querySelector("#sheet_table");
  console.log(table1);
  
  if (table1) {
    let tr0 = root.querySelector('#tr_0');
    console.log(tr, tr0);
    let thead = table1.tHead;
    console.log(thead)
    if (thead) {
      thead.style.color = "red";
    }
  
    let tbody = table1.tBodies[0]; // Note the property name and index accessor here
    if (tbody) {
      tbody.style.color = "blue";
      //tbody.style = "color: yellow;";
       //tr.style = "position: sticky;  top: 28px;  background: white; z-index: 20; ";
       let rows = tbody.rows;
       for(let i = 0; i < rows.length; i++){
              console.log(rows[i]);
       }
    }
  
    let tfoot = table1.tFoot;
    if (tfoot) {
      tfoot.style.color = "#ffff50";
    }
  }
  }
       //tr.style = "position: sticky;  top: 28px;  background: white; z-index: 20; ";
}
  });
*/


  $effect(() => {
    if (extension && extended) {
      let tl = (selected && decode(extended[0])) || { c: 0, r: 0 };
      let br = (selected && decode(extended[1])) || { c: 0, r: 0 };
      topLeft = {
        c: br.c < tl.c ? br.c : tl.c,
        r: br.r < tl.r ? br.r : tl.r
      };
      bottomRight = {
        c: br.c > tl.c ? br.c + 1 : tl.c + 1,
        r: br.r > tl.r ? br.r + 1 : tl.r + 1
      };


      let top = 28;
      let right = 51;
      let bottom = 28;
      let left = 51;
      for (let i = 0; i < topLeft.r; i++) {
        top = top + getRowHeight(i);
      }

      for (let i = 0; i < topLeft.c; i++) {
        left = left + getColumnsWidth(i);
      }
      for (let i = 0; i < bottomRight.r; i++) {
        bottom = bottom + getRowHeight(i);
      }
      for (let i = 0; i < bottomRight.c; i++) {
        right = right + getColumnsWidth(i);
      }
      topextend.style = `width: ${right - left}px; left: ${left}px; top: ${top}px`;
      rightextend.style = `height: ${bottom - top}px; left: ${right}px; top: ${top}px`;
      bottomextend.style = `width: ${right - left}px; left: ${left}px; top: ${bottom}px`;
      leftextend.style = `height: ${bottom - top}px; left: ${left}px; top: ${top}px`;
    }
  });

  $effect(() => {
    if (mounted) {
      let tl = (selected && decode(selected[0])) || { c: 0, r: 0 };
      let br = (selected && decode(selected[1])) || { c: 0, r: 0 };
      let topLeft = {
        c: br.c < tl.c ? br.c : tl.c,
        r: br.r < tl.r ? br.r : tl.r
      };
      let bottomRight = {
        c: br.c > tl.c ? br.c + 1 : tl.c + 1,
        r: br.r > tl.r ? br.r + 1 : tl.r + 1
      };

      //console.log('topLeft', topLeft);
      //console.log('bottomRight', bottomRight);

      let tlid = 'td_' + String(topLeft.r) + '_' + String(topLeft.c);
      let brid = 'td_' + String(bottomRight.r) + '_' + String(bottomRight.c);

      let tl_ele = root.querySelector('#' + tlid);
      let br_ele = root.querySelector('#' + brid);
      //let tr = root.querySelector('#tr_0' );
      //console.log("tr",tr);

      if (tl_ele != null && br_ele != null) {

        let top = tl_ele.offsetTop;
        let left = tl_ele.offsetLeft;
        let right = br_ele.offsetLeft;
        let bottom = br_ele.offsetTop;

        tops.style = `width: ${right - left}px; left: ${left}px; top: ${top}px`;
        rights.style = `height: ${bottom - top}px; left: ${right}px; top: ${top}px`;
        bottoms.style = `width: ${right - left}px; left: ${left}px; top: ${bottom}px`;
        lefts.style = `height: ${bottom - top}px; left: ${left}px; top: ${top}px`;
        colLine.style = `width: ${right - left}px; left: ${left}px; top: 28px;`;
        rowLine.style = `height: ${bottom - top}px; left: 51px; top: ${top}px`;
        square.style = `left:${right}px; top:${bottom}px`;
      }
    }
  });


</script>

<div class="sticky_table_wrapper" bind:this={root}>
  <div
    class="w-full sheet_container"
    class:fullscreen={!!config.fullscreen}
    class:with-toolbar={config.tableOverflow != true && config.toolbar}
    oncontextmenu={(e) => showMenu(e)}
    onmousedown={onMouseDown}
    onmouseup={onMouseUp}
    onmouseover={onMouseOver}
    tabindex="1"
  >
    <div
      class="jexcel_content"
      style={config.tableWidth
        ? 'overflow-x: auto; width: ' + config.tableWidth + ';'
        : '' + config.tableHeight
          ? 'overflow-y: auto; max-height: ' + config.tableHeight + ';'
          : ''}
      bind:this={viewport}
      bind:offsetHeight={viewport_height}
      bind:offsetWidth={viewport_width}
      onscroll={handle_scroll}
    >
      <div class="top-extend absolute" class:hidden={!extension} bind:this={topextend}></div>
      <div class="bottom-extend absolute" class:hidden={!extension} bind:this={bottomextend}></div>
      <div class="left-extend absolute" class:hidden={!extension} bind:this={leftextend}></div>
      <div class="right-extend absolute" class:hidden={!extension} bind:this={rightextend}></div>

      <div class="top-select absolute" bind:this={tops}></div>
      <div class="bottom-select absolute" bind:this={bottoms}></div>
      <div class="left-select absolute" bind:this={lefts}></div>
      <div class="right-select absolute" bind:this={rights}></div>
      <div class="col-line absolute" bind:this={colLine}></div>
      <div class="row-line absolute" bind:this={rowLine}></div>
      <div
        tabindex={-1}
        use:draggable
        ondragging={(e) => {
          squareX = e.detail.x;
          squareY = e.detail.y;
        }}
        class="square absolute"
        id="square"
        bind:this={square}
></div>

      <Menu
        show={!!menuX}
        x={menuX}
        y={menuY}
        copy={(e) => (clipboard = selected)}
        cut={(e) => (clipboard = selected)}
        paste={(e) => (data = pasteSelection(data, clipboard, selected))}
        clear={(e) => (data = clearSelection(data, selected))}
        delet={(e) => (data = deleteSelection(data, selected))}
      />

      <table id="sheet_table" class="sticky_table" bind:this={sticky_table}>
        <colgroup>
          <col width={50} />
          {#each visibleX as v}
            <col width={getColumnsWidth(v.i)} />
          {/each}
        </colgroup>
        <thead
	  id="thead"
          class:draggable={config.columnDrag || config.rowDrag}
          class:resizable={config.columnResize || config.rowResize}
          class="resizable"
        >
          <tr style={freezeStyle_head_tr()}>
            <th class="jexcel_selectall virtual-col"></th>
            {#each visibleX as c, i}
              <td
                onclick={(_) =>
                  (selected =
                    keypressed[16] && selected && selected[0]
                      ? [
                          encode({
                            c: decoded[0].c,
                            r: 0
                          }),
                          encode({
                            c: c.i,
                            r: data.length - 1
                          })
                        ]
                      : [
                          encode({
                            c: c.i,
                            r: 0
                          }),
                          encode({ c: c.i, r: data.length - 1 })
                        ])}
                data-x={c.i}
                title={c.data.title || ''}
                class="virtual-col"
                class:selected={selected && c.i >= topLeft.c && bottomRight.c - 1 >= c.i}
                class:hidden={c.data.type == 'hidden'}
                style={`text-align: ${c.data.align || config.defaultColAlign};` + freezeStyle_head_td(c.i)}
              >
                {c.data.title || XLSX.utils.encode_col(c.i)}
                <div
                  use:resizable
                  onresizing={(e) =>
                    c.i != 0 &&
                    (columns[c.i - 1] = {
                      ...(columns[c.i - 1] || {}),
                      width: getColumnsWidth(c.i - 1) + e.detail.x
                    })}
                  class="col-resize left"
></div>
                <div
                  class="col-resize right"
                  use:resizable
                  onresizing={(e) =>
                    (columns[c.i] = {
                      ...(columns[c.i] || {}),
                      width: getColumnsWidth(c.i) + e.detail.x
                    })}
></div>
              </td>
            {/each}
          </tr>
        </thead>

        <tbody id="tbody" class="draggable" bind:this={viewport} onscroll={handle_scroll}>
          {#each visibleY as r}
            <tr 
               id={'tr_' + String(r.i) }
	       class="virtual-row" data-y={r.i} style={`height: ${getRowHeight(r.i)}px` + freezeStyle_tr(r.i)}>
              <th
                data-y={r.i}
                class:selected={selected && r.i >= topLeft.r && bottomRight.r - 1 >= r.i}
                style={`background-color:
              #f3f3f3;
              text-align:
              center;
              height:
              ${getRowHeight(r.i)}px;`}
                onclick={(e) =>
                  (selected =
                    keypressed[16] && selected && selected[0]
                      ? [
                          encode({
                            c: 0,
                            r: decoded[0].r
                          }),
                          encode({
                            c: data[0].length - 1,
                            r: r.i
                          })
                        ]
                      : [
                          encode({
                            c: 0,
                            r: r.i
                          }),
                          encode({ c: data[0].length - 1, r: r.i })
                        ])}
              >
                <div
                  class="row-resize top"
                  use:resizable
                  onresizing={(e) =>
                    r.i != 0 &&
                    (rows[r.i - 1] = {
                      ...(rows[r.i - 1] || {}),
                      height: getRowHeight(r.i - 1) + e.detail.y
                    })}
></div>
                <div
                  class="row-resize bottom"
                  use:resizable
                  onresizing={(e) =>
                    (rows[r.i] = {
                      ...(rows[r.i] || {}),
                      height: getRowHeight(r.i) + e.detail.y
                    })}
></div>
                {r.i + 1}
              </th>
              {#each visibleX as x, i}
                <td
                  id={'td_' + String(r.i) + '_' + String(x.i)}
                  tabindex="-1"
                  data-x={x.i}
                  data-y={r.i}
                  data-merged={GetColSpan(mergeCells, x.i, r.i) || GetRowSpan(mergeCells, x.i, r.i)}
                  colspan={GetColSpan(mergeCells, x.i, r.i)}
                  rowspan={GetRowSpan(mergeCells, x.i, r.i)}
                  class:selected={x.i >= topLeft.c &&
                    x.i < bottomRight.c &&
                    r.i >= topLeft.r &&
                    r.i < bottomRight.r}
                  ondblclick={(_) => (edition = [x.i, r.i])}
                  class:readonly={columns[x.i] && columns[x.i].readOnly}
                  style={computeStyles(
                    x.i,
                    r.i,
                    rows[r.i],
                    style,
                    config,
                    r.data && r.data[x.i],
                    r.data && r.data[x.i + 1]
                  ) + freezeStyle_td(x.i,r.i)}
                >
                  {#if String(edition) == String([x.i, r.i])}
                    <input
                      id="cell_editor"
                      onblur={(e) => {
                        cmdz = false;
                        historyPush(data, rows, columns, style);
                      }}
                      oninput={(e) => onInputChange(e.target.value, r, x)}
                      onkeydown={(e) => onInputKeyDown(e, r, x)}
                      value={(data[r.i] && data[r.i][x.i]) || ''}
                      style={`width: ${getColumnsWidth(
                        x.i
                      )}px; height: ${getRowHeight(r.i)}px; min-height: 22px;`}
                    />

		  <!--
                  {:else if x.i == 5 && r.i == 3}
                    <canvas id="canvas001" width="200" height="200">
                    </canvas>
                     <p>{encode({c:x.i, r:r.i})}</p>
		  -->
                  {:else if encode({c:x.i, r:r.i}) == "F4"}
                    <canvas id="canvas001" width="200" height="200">
                    </canvas>
                  {:else if encode({c:x.i, r:r.i}) == "F15"}
                     <svg id="svg1" width="200" height="200"  viewBox="-120 -120 240 240" xmlns="http://www.w3.org/2000/svg"> 
                     </svg> 
                  {:else if encode({c:x.i, r:r.i}) == "F21"}
                     <div  id="stage-container">
                     </div>
                  {:else if encode({c:x.i, r:r.i}) == "F31"}
                     <div  id="stage-container2">
                     </div>
                  {:else if encode({c:x.i, r:r.i}) == "F41"}
                     <div  id="stage-container3">
                     </div>
                  {:else}
                      {#if r.data && (typeof  r.data[x.i] === 'string') }
                          {#if r.data[x.i].split('\n').length < 2}
                              {(r.data && r.data[x.i]) || '' }
                          {:else}
                              {#each r.data[x.i].split('\n') as line}
                               {line}<br>
                              {/each}
                          {/if}
                      {:else}
                              {(r.data && r.data[x.i]) || '' }
                      {/if}
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  *,
  ::before,
  ::after {
    box-sizing: border-box; 
    /* box-sizing: content-box;*/
    border-width: 0px;
    border-style: solid;
    border-color: #e0e0e0;

  }

  :root {
    tab-size: 4;
  }

  .sticky_table_wrapper {
    overflow: scroll;
    width: calc(100vw - 1rem);
    height: 75vh;
  }

  .jexcel_content {
    overflow-x: auto;
    overflow-y: auto;
    max-width: 100vw;
    max-height: 100vh;
  }

  .sheet_container {
    display: block;
    padding-right: 2px;
    //box-sizing: border-box;
    overscroll-behavior: contain;
    outline: none;
    position: relative;
    user-select: none;
  }

  .sticky_table  {
    position: absolute;
    //border-collapse: collapse; 
    border-collapse: sepalate; 
    border-spacing: 0px;

    //boz-sizing: content-box;

    table-layout: fixed;
    white-space: nowrap;
    empty-cells: show;
    border: 0px;
    background-color: #fff;
    width: 0;
    //border-top: 1px solid transparent;
    //border-left: 1px solid transparent;
    border-right: 1px solid #ccc;
    border-bottom: 1px solid #ccc;
    text-indent: 0;
  }

  .sticky_table thead > tr > th {
    background-color: #f3f3f3;
    border-top: 1px solid #ccc;
    border-bottom: 1px solid #ccc;
    border-left: 1px solid #ccc;
    border-right: 1px solid #ccc;
    padding: 2px;
    cursor: s-resize;
    //box-sizing: border-box;
    overflow: hidden;
    position: sticky;
    top: 0px;
    left:0px;
    z-index: 10;
    height: 27px;
  }

  .sticky_table thead > tr > td.selected {
    background-color: #dcdcdc;
    color: teal;
  }


  .sticky_table  thead > tr > td {
    background-color: #f3f3f3;
    border-top: 1px solid #ccc;
    border-bottom: 1px solid #ccc;
    border-left: 1px solid #ccc;
    border-right: 1px solid #ccc;
    padding: 2px;
    cursor: s-resize;
    //box-sizing: border-box;
    overflow: hidden;
    position: sticky;
    top: 0;
    z-index: 9;
   
  }

  .sticky_table td {
    outline: none;
    cursor: default;
    line-height: 14px;
    font-size: 14px;
    border-top: 1px solid #ccc;
    border-left: 1px solid #ccc;
    //border-right: 1px solid transparent;
    //border-bottom: 1px solid transparent;
  }

  .sticky_table tbody > tr > td {
    padding: 4px;
    white-space: nowrap;
    //box-sizing: border-box;
    line-height: 1em;
    text-align: end;
    cursor: cell;
    border-top: 1px solid #ccc; /* GUSA */
    border-left: 1px solid #ccc;
    //border-right: 0px solid transparent;
    //border-bottom: 0px solid transparent;
  }

  .sticky_table tbody > tr > td.selected {
    background-color: #ddd;
    transition: all 0.1s linear;
  }

  .sticky_table tbody > tr > th {
    position: sticky;
    left: 0;
    cursor: e-resize;
    top: auto;
    background: #f3f3f3;
    border-top: 1px solid #ccc;
    border-left: 1px solid #ccc;
    border-right: 1px solid #ccc;
    z-index: 1;
    font-weight: normal;
    height: 27px;
  }

  /* tbody > tr > td:first-child {
    position: relative;
    background-color: #f3f3f3;
    text-align: center;
  } */

  .sticky_table tbody > tr > th.selected {
    background-color: #dcdcdc !important;
    color: teal;
  }

  div.col-resize {
    position: absolute;
    top: 0;
    cursor: col-resize;
    width: 1rem;
    height: 100%;
  }
  div.col-resize.right {
    right: 0;
  }
  div.col-resize.left {
    left: 0;
  }

  div.row-resize {
    position: absolute;
    left: 0;
    cursor: row-resize;
    width: 100%;
    height: 0.5rem;
  }

  div.row-resize.top {
    top: 0;
  }
  div.row-resize.bottom {
    bottom: 0;
  }
  input {
    background: none;
    margin: -4px 0;
    outline: none;
  }

  .absolute {
    position: absolute;
    z-index: 10;
    transition: all 0.1s linear;
  }

  .relative {
    position: relative;
    z-index: 10;
    transition: all 0.1s linear;
  }

  .top-select,
  .bottom-select,
  .col-line {
    border-bottom: 2px solid #1e90ff;
    z-index: 1;
  }
  .left-select,
  .right-select {
    border-left: 2px solid #1e90ff;
    z-index: 1;
  }

  .top-extend,
  .bottom-extend {
    border-bottom: 2px solid #aaa;
  }
  .left-extend,
  .right-extend {
    border-left: 2px solid #aaa;
  }
  .row-line {
    border-right: 2px solid #1e90ff;
  }
  .square {
    height: 8px;
    width: 8px;
    cursor: crosshair;
    border: 1px solid white;
    background: #1e90ff;
    transform: translate3D(-40%, -40%, 0);
  }
  .hidden {
    display: none;
  }

/******************************************************************/
/*

.sticky_table  thead > tr:nth-child(1){
    position: sticky;  
    top: 0px;
    z-index: 20; 
}

.sticky_table  tbody > tr:nth-child(1){
    position: sticky;  
    top: 28px;
    background: white;
    z-index: 20; 
}

.sticky_table tbody > tr:nth-child(2){
    position: -webkit-sticky;
    position: sticky;
    top: 52px;
    background: white;
    z-index: 20;
}

.sticky_table tbody >  tr:nth-child(3){
    position: -webkit-sticky;
    position: sticky;
    top: 75px;
    background: white;
    z-index: 20;
}


.sticky_table  td:nth-child(2) {
    color: red;
    position: sticky;
    left: 50px;
    width: 100px;
    min-width: 100px;
    background: white;
    z-index:18;
}
.sticky_table  td:nth-child(3) {
    position: sticky;
    left: 200px;
    width: 100px;
    min-width: 100px;
    background: white;
    z-index:18;
}
*/

/******************************************************************/

</style>
