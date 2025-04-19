import * as d3 from 'd3'

// https://qiita.com/HikaruMatsunaka/items/d35c0e3a9c488b84eb0e
//
export function make_graph(root, id, type) {
 //const ele = document.getElementById(id);
 const ele = root.querySelector("#" + id);
 
 if ( type == "bou" ) {
  const width = 500;
  const height = 300;
  const margin = { top: 20, right: 30, bottom: 40, left: 40 };
  const data = [30, 86, 168, 281, 303, 365];

  const x = d3.scaleBand()
      .domain(d3.range(data.length))
      .range([margin.left, width - margin.right])
      .padding(0.1);

  const y = d3.scaleLinear()
      .domain([0, d3.max(data)])
      .range([height - margin.bottom, margin.top]);

  //const svg = d3.create("svg")  // d3.createを使用
  const svg = d3.select(ele).append('svg')
      .attr("width", width)
      .attr("height", height);

  // 棒を追加
  svg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d, i) => x(i))
      .attr("y", d => y(d))
      .attr("height", d => y(0) - y(d))
      .attr("width", x.bandwidth())
      .attr("fill", "steelblue");

  // X軸を追加
  svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x));

  // Y軸を追加
  svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

 } else if ( type == "oresen" ) {


  // 1. データの準備
  var dataset = [
    [5, 20],
    [25, 67],
    [85, 21],
    [100, 33],
    [220, 88],
    [250, 50],
    [330, 95],
    [410, 12],
    [475, 44],
    [480, 90]
  ];
 
  var width = 400; // グラフの幅
  var height = 300; // グラフの高さ
  var margin = { "top": 30, "bottom": 60, "right": 30, "left": 60 };
 
  // 2. SVG領域の設定
  //var svg = d3.select("body").append("svg").attr("width", width).attr("height", height);
  const svg = d3.select(ele).append('svg').attr("width", width).attr("height", height);
 
  // 3. 軸スケールの設定
  var xScale = d3.scaleLinear()
    .domain([0, d3.max(dataset, function(d) { return d[0]; })])
    .range([margin.left, width - margin.right]);
 
  var yScale = d3.scaleLinear()
    .domain([0, d3.max(dataset, function(d) { return d[1]; })])
    .range([height - margin.bottom, margin.top]);
 
  // 4. 軸の表示
  var axisx = d3.axisBottom(xScale).ticks(5);
  var axisy = d3.axisLeft(yScale).ticks(5);
 
  svg.append("g")
    .attr("transform", "translate(" + 0 + "," + (height - margin.bottom) + ")")
    .call(axisx)
    .append("text")
    .attr("fill", "black")
    .attr("x", (width - margin.left - margin.right) / 2 + margin.left)
    .attr("y", 35)
    .attr("text-anchor", "middle")
    .attr("font-size", "10pt")
    .attr("font-weight", "bold")
    .text("X Label");
 
  svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + 0 + ")")
    .call(axisy)
    .append("text")
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .attr("x", -(height - margin.top - margin.bottom) / 2 - margin.top)
    .attr("y", -35)
    .attr("transform", "rotate(-90)")
    .attr("font-weight", "bold")
    .attr("font-size", "10pt")
    .text("Y Label");
 
  // 5. ラインの表示
  svg.append("path")
    .datum(dataset)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", d3.line()
      .x(function(d) { return xScale(d[0]); })
      .y(function(d) { return yScale(d[1]); }));

 } else if (type == "circle") {

// 1. データの準備
  var dataset = [
    { "name": "A", "value": 5 },
    { "name": "B", "value": 6 },
    { "name": "C", "value": 8 },
    { "name": "D", "value": 1 },
    { "name": "E", "value": 2 },
    { "name": "F", "value": 6 },
    { "name": "G", "value": 8 },
    { "name": "H", "value": 6 },
    { "name": "I", "value": 10 },
    { "name": "J", "value": 9 }
  ]
 
  var width = 400; // グラフの幅
  var height = 300; // グラフの高さ
  var radius = Math.min(width, height) / 2 - 10;
 
  // 2. SVG領域の設定
  var svg = d3.select(ele).append("svg").attr("width", width).attr("height", height);
 
  var g = svg.append("g").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
 
  // 3. カラーの設定
  var color = d3.scaleOrdinal()
    .range(["#DC3912", "#3366CC", "#109618", "#FF9900", "#990099"]);
 
  // 4. pieチャートデータセット用関数の設定
  var pie = d3.pie()
    .value(function(d) { return d.value; })
    .sort(null);
 
  // 5. pieチャートSVG要素の設定
  var pieGroup = g.selectAll(".pie")
    .data(pie(dataset))
    .enter()
    .append("g")
    .attr("class", "pie");
 
  var arc = d3.arc()
    .outerRadius(radius)
    .innerRadius(0);
 
  pieGroup.append("path")
    .attr("d", arc)
    .attr("fill", function(d) { return color(d.index) })
    .attr("opacity", 0.75)
    .attr("stroke", "white");
 
  // 6. pieチャートテキストSVG要素の設定
  var text = d3.arc()
    .outerRadius(radius - 30)
    .innerRadius(radius - 30);
 
  pieGroup.append("text")
    .attr("fill", "black")
    .attr("transform", function(d) { return "translate(" + text.centroid(d) + ")"; })
    .attr("dy", "5px")
    .attr("font", "10px")
    .attr("text-anchor", "middle")
    .text(function(d) { return d.data.name; });


 } else if (type == "oresen2") {

 // 1. データの準備
  var dataset = [
    [5, 20],
    [25, 67],
    [85, 50],
    [150, 70],
    [220, 88],
    [250, 50],
    [330, 95],
    [410, 12],
    [475, 44],
    [480, 90]
  ];
 
  var width = 800; // グラフの幅
  var height = 400; // グラフの高さ
  var margin = { "top": 30, "bottom": 60, "right": 30, "left": 60 };
 
  // 2. SVG領域の設定
  var svg = d3.select(ele).append("svg").attr("width", width).attr("height", height);
 
  // 3. 軸スケールの設定
  var xScale = d3.scaleLinear()
    .domain([0, d3.max(dataset, function(d) { return d[0]; })])
    .range([margin.left, width - margin.right]);
 
  var yScale = d3.scaleLinear()
    .domain([0, d3.max(dataset, function(d) { return d[1]; })])
    .range([height - margin.bottom, margin.top]);
 
  // 4. 軸の表示
  var axisx = d3.axisBottom(xScale).ticks(5);
  var axisy = d3.axisLeft(yScale).ticks(5);
 
  svg.append("g")
    .attr("transform", "translate(" + 0 + "," + (height - margin.bottom) + ")")
    .call(axisx)
    .append("text")
    .attr("fill", "black")
    .attr("x", (width - margin.left - margin.right) / 2 + margin.left)
    .attr("y", 35)
    .attr("text-anchor", "middle")
    .attr("font-size", "10pt")
    .attr("font-weight", "bold")
    .text("X Label");
 
  svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + 0 + ")")
    .call(axisy)
    .append("text")
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .attr("x", -(height - margin.top - margin.bottom) / 2 - margin.top)
    .attr("y", -35)
    .attr("transform", "rotate(-90)")
    .attr("font-weight", "bold")
    .attr("font-size", "10pt")
    .text("Y Label");
 
  // 5. ライン、プロットの表示
  svg.append("path")
    .datum(dataset)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", d3.line()
      .x(function(d) { return xScale(d[0]); })
      .y(function(d) { return yScale(d[1]); })
    );
 
  svg.append("g")
    .selectAll("circle")
    .data(dataset)
    .enter()
    .append("circle")
    .attr("cx", function(d) { return xScale(d[0]); })
    .attr("cy", function(d) { return yScale(d[1]); })
    .attr("fill", "steelblue")
    .attr("r", 4);


 } else if (type == "tree") {

  var data = {
    "name": "A",
    "children": [
      { "name": "B" },
      {
        "name": "C",
        "children": [{ "name": "D" }, { "name": "E" }, { "name": "F" }]
      },
      { "name": "G" },
      {
        "name": "H",
        "children": [{ "name": "I" }, { "name": "J" }]
      },
      { "name": "K" }
    ]
  };
 

var width = 300;
var height = 150;

var g = d3.select(ele).append("svg").append("g")
    .attr("transform", "translate(8,0)");


//d3.json("test.json")
d3.json("test.json")
    .then((data) => {
        var root = d3.hierarchy(data);
        var tree = d3.tree(root).size([height, width - 16]);
        tree(root);

        var link = g.selectAll(".link")
            .data(root.descendants().slice(1))
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("d", (d) => {
                return "M" + d.y + "," + d.x +
                    "C" + (d.parent.y + 1) + "," + d.x +
                    " " + (d.parent.y + 1) + "," + d.parent.x +
                    " " + d.parent.y + "," + d.parent.x;
            });

        var node = g.selectAll(".node")
            .data(root.descendants())
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })

        node.append("circle")
            .attr("r", 8)
            .attr("fill", "#999");

        node.append("text")
            .attr("dy", 3)
            .attr("x", function(d) { return d.children ? -12 : 12; })
            .style("text-anchor", function(d) { return d.children ? "end" : "start"; })
            .attr("font-size", "200%")
            .text(function(d) { return d.data.name; });
        })
   .catch((error)=>{
    
   }
  )
 } else if (type == "other") {
 }
}

