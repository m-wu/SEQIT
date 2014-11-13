var datasets = new Array();

var mainviewsvg;

var canvas_width = 900;
var canvas_height = 719;


var mainview_width = 900;
var mainview_height = 719;
var mainview_bg_opacity = 0.5;

var zoom_ratio = 0.7035; // image coordinate / fixation coordinate

$(window).load(function() {
  main();
});

function main(){
  d3.json("datasets.json", function(error, json){
    for (var i in json){
      var id = json[i].user.concat(json[i].task);
      datasets[id] = json[i].fixpoints;
      addButtonToTrialView(id);
    }
    drawMainView();
  })
}

function addButtonToTrialView(id){  
  d3.select("#user-group")
    .append("button")
    .attr("type", "button")
    .attr("id", id)
    .attr("class", "btn btn-primary")
    .attr("autocomplete","off")
    .text(id);

  $('#'.concat(id)).on('click', function () {
    if (!$(this).hasClass('active')){
      drawFixationPoints(mainviewsvg, id);
      // drawScanPath(mainviewsvg, datasets["user1task15"]);
    } else {
      removeFixationPoints(mainviewsvg, "#".concat(id));
    }
  })
}

function drawMainView(){
  // Create SVG element
  mainviewsvg = d3.select("#mainview")
              .append("svg")
              .attr("width", canvas_width)
              .attr("height", canvas_height);

  // Add background image to the main view
  // Define the image as a pattern
  mainviewsvg.append("defs")
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
  mainviewsvg.append("rect")
    .attr("fill", "url(#mainviewbg)")
    .attr('width', mainview_width)
    .attr('height', mainview_height)
    .attr('fill-opacity', mainview_bg_opacity);
}

function drawFixationPoints(svg, dataset_id){
  // Draw fixation points
  svg.append("g")
      .attr("id", dataset_id)
    .selectAll("circle")
    .data(datasets[dataset_id])
    .enter()
    .append("circle")
      .attr("cx", function(d) {
        return zoom_ratio*d.x;
      })
      .attr("cy", function(d) {
        return zoom_ratio*d.y;
      })
      .attr("r", 5);
}

function removeFixationPoints(svg, group_id){
  svg.select(group_id).remove();
}

function drawScanPath(svg, dataset){
  var scanpathFunction = d3.svg.line()
                         .x(function(d) { return zoom_ratio*d.x; })
                         .y(function(d) { return zoom_ratio*d.y; })
                         .interpolate("linear");

  svg.append("path")
     .attr("d", scanpathFunction(dataset))
     .attr("stroke", "blue")
     .attr("stroke-width", 2)
     .attr("fill", "none");
}