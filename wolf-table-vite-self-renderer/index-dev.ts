import WolfTable, { h } from './src';

console.log("window.devicePixelRatio ", window.devicePixelRatio);
window.devicePixelRatio =1.3;


const longText = {
  value: 'you are a good boy, a very good boy-------!!!',
  style: 0,
};

function cellText(ri: number, ci: number): string | Cell {

  if (ri === 3 && ci === 3) return longText;
  const value = `${ri}-${ci}`;
  if (ri <= 14 && ri >= 13 && ci <= 12 && ci >= 9) {
    return { value, style: 1 };
  }
  if (ri === 4 && ci === 4) return { type: 'select', value };
  if (ri === 4 && ci === 8) return { type: 'bool', value };
  return value;
}



function cellRenderer_(canvas: Canvas, { x, y, width, height }, cell) {
  const type = (cell && cell.type) || '';
  if (type === 'bool') {
    canvas
      .prop({ strokeStyle: '#0069c2', lineWidth: 2 })
      .roundRect((width - 12) / 2, height / 2 - 5, 10, 10, 2)
      .stroke();
  } else if (type === 'select') {
    canvas
      .prop({ fillStyle: '#0069c2' })
      .beginPath()
      .moveTo(width - 12, 2)
      .lineTo(width - 2, 2)
      .lineTo(width - 7, 10)
      .closePath()
      .fill();
  }
  return true;
}

function cellRenderer(canvas: Canvas, { x, y, width, height }, cell) {

    if ( cell && cell.value === 'option' ) {
         canvas
           .prop({ fillStyle: '#0069c2' })
           .beginPath()
           .moveTo(width - 12, 2)
           .lineTo(width - 2, 2)
           .lineTo(width - 7, 10)
           .closePath()
           .fill();

    }

  return true;
}
const t = WolfTable.create(
  '#table',
  () => 1400,
  () => 600,
  {
    scrollable: true,
    resizable: true,
    selectable: true,
    editable: true,
    copyable: true,
  }
)
  .freeze('D5')
  .merge('F10:G11')
  .merge('I10:K11')
  .addBorder('B8', 'all', 'thin', '#21ba45')
  .addBorder('B10', 'all', 'double', 'brack')
  .addBorder('E15:G17', 'all', 'double', 'brack')
  .addBorder('E19:G21', 'all', 'double2', 'brack')
  //.addBorder('E15:G20', 'outside', 'double', 'brack')

  // table-renderer/render.ts
  //
  /*  borderType
   *    all outside inside horizontal vertical
   *    top bottom left right
   */
  .addBorder('E8:L12', 'all', 'medium', '#21ba45')
  //.addBorder('E8:L12', 'all', 'thick', 'red')
  //.addBorder('E8:L12', 'all', 'dashed', 'blue')
  //.addBorder('E8:L12', 'all', 'dotted', 'green')
  //.addBorder('E8:L12', 'all', 'double', 'red')
  .formulaParser((v) => `${v}-formula`)
  .data({
    styles: [
      {
        bold: true,
        strikethrough: true,
        color: '#21ba45',
        italic: true,
        align: 'center',
        fontSize: 12,
      },
    ],
    cells: [
      [0, 0, 'abc'],
      [1, 1, 100],
      [2, 6, { value: 'formua', style: 0 }],
      [9, 5, { value: '', formula: '=sum(A1:A10)' }],
    ],
  })
  .onClick((cell, evt) => {
    // console.log('cell:', cell, evt);
  })
  .onContextmenu((cell, evt) => {
    console.log('contetmenu:', cell);
    const { x, y, width, height } = cell;
    const content = h('div')
      .css({ background: '#ddd', padding: '10px', 'z-index': '100' })
      .css({
        left: x,
        top: y,
        width,
        height,
        position: 'absolute',
      });
    content.html('---abc--');
    t.container().append(content);
  })

  //.cellFunc(cellText)
  .cellRenderer(cellRenderer)

  .render();

// add style
const si = t.addStyle({
  bold: true,
  italic: true,
  underline: true,
  color: '#1b1c1d',
});
// set cell
t.cell(2, 2, { value: 'set-value', style: si });
t.cell(15, 7, {
  type: 'text',
  value: 'option',
  options: async (q) =>
    ['option1', 'option2', 'option3', 'option4', 'option5', 'option6'].filter(
      (it) => it.startsWith(q)
    ),
});
t.render();

// get cell
console.log('cell[2,2]:', t.cell(2, 2));

/*
const t2 = WolfTable.create(
  '#table2',
  () => 1400,
  () => 600,
  {
    scrollable: true,
    resizable: true,
    selectable: true,
    editable: true,
    copyable: true,
  }
)

t2.set_sync_data(t.data());
t2._cells = t._cells;
t2.render();
t.set_sync_table(t2);

*/
