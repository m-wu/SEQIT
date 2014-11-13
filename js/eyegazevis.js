var canvas_width = 900;
var canvas_height = 719;

var dataset;

var mainview_width = 900;
var mainview_height = 719;
var mainview_bg_opacity = 0.5;

$(window).load(function() {
  main();
});

function main(){
  d3.json("trial1.json", function(error, json){
    dataset = json;
    drawMainView();
  })
}

function drawMainView(){
  // Create SVG element
  var svg = d3.select("#mainview")
              .append("svg")
              .attr("width", canvas_width)
              .attr("height", canvas_height);

  // Add background image to the main view
  // Define the image as a pattern
  svg.append("defs")
    .append("pattern")
      .attr("id", "mainviewbg")
      .attr('width', mainview_width)
      .attr('height', mainview_height)
      .attr('patternUnits', "userSpaceOnUse")
      .append("image")
        .attr("xlink:href", "atuav2_example.png")
        .attr('width', mainview_width)
        .attr('height', mainview_height);

  // Fill a rectangle with the pattern
  svg.append("rect")
    .attr("fill", "url(#mainviewbg)")
    .attr('width', mainview_width)
    .attr('height', mainview_height)
    .attr('fill-opacity', mainview_bg_opacity);

  // Draw fixation points
  svg.selectAll("circle")
    .data(dataset)
    .enter()
    .append("circle")
      .attr("cx", function(d) {
        return 0.7035*d.x;
      })
      .attr("cy", function(d) {
        return 0.7035*d.y;
      })
      .attr("r", 5);


  // Draw scan path
  var scanpathFunction = d3.svg.line()
                           .x(function(d) { return 0.7035*d.x; })
                           .y(function(d) { return 0.7035*d.y; })
                           .interpolate("linear");

  svg.append("path")
     .attr("d", scanpathFunction(dataset))
     .attr("stroke", "blue")
     .attr("stroke-width", 2)
     .attr("fill", "none");

}

