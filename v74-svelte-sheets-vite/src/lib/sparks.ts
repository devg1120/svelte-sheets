//import Two from 'https://cdn.skypack.dev/two.js@latest';
import Two from 'two.js';


let two;

export function make_sparks() {
     // stage-container
     //
 const ele = document.getElementById("stage-container2");
 two = new Two({
  type: Two.Types.canvas,
  fullscreen: false,
  width:300,
  height:300,
  autostart: true
}).appendTo(ele);

two.renderer.domElement.style.background = '#111';
two.renderer.ctx.globalCompositeOperation = 'screen';

var amount = 120;

for (var j = 0; j < amount; j++) {

  var x = 0, y = 0;
  var speed = 120;
  var resolution = 4;
  var points = [];
  var vx = (Math.random()  - 0.5) * speed;
  var vy = - Math.random() * speed;

  for (var i = 0; i < resolution; i++) {
    points.push(new Two.Anchor(x, y));
    x += vx;
    y += vy;
    vy += speed / (resolution * 0.66);
  }

  var sparkline = two.makeCurve(points, true);
  sparkline.noFill();
  sparkline.linewidth = 8 * Math.random();
  sparkline.cap = 'round';
  sparkline.stroke = 'rgb('
    + Math.floor(Math.random() * 255) + ','
    + Math.floor(Math.random() * 255) + ','
    + Math.floor(Math.random() * 255) + ')';
  two.add(sparkline);

}

two.scene.translation.set(two.width / 2, two.height / 2);

two.bind('resize', function() {
  two.scene.translation.set(two.width / 2, two.height / 2);
});

var mouseX = 1;

window.addEventListener('mousemove', function(e) {
  mouseX = e.clientX / two.width;
}, false);

two.bind('update', function(frameCount) {

  
  var frames = 30 + (1 - mouseX) * 240;
  var thickness = 0.2;

  for (var i = 0; i < two.scene.children.length; i++) {
    var child = two.scene.children[i];
    var pct = i / two.scene.children.length;
    var offset = frames * pct;
    var ending = ((offset + frameCount) / frames) % 1
    child.ending = ending;
    child.beginning = Math.max(ending - thickness * pct + thickness, 0);
    child.opacity = 1 - child.ending;
  }

});

}

