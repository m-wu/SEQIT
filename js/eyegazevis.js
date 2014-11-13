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
      var trial_id = json[i].user.concat(json[i].task);
      datasets[trial_id] = json[i].fixpoints;
      addButtonToTrialView(trial_id);
    }
    drawMainView();
  })
}

function addButtonToTrialView(trial_id){  
  d3.select("#user-group")
    .append("button")
      .attr("type", "button")
      .attr("id", trial_id)
      .attr("class", "btn btn-primary")
      .attr("autocomplete","off")
      .text(trial_id);

  $('#'.concat(trial_id)).on('click', function () {
    if (!$(this).hasClass('active')){
      drawFixationPoints(mainviewsvg, trial_id);
      drawScanPath(mainviewsvg, trial_id);
    } else {
      removeFixationPoints(mainviewsvg, "#".concat(trial_id));
      removeScanPath(mainviewsvg, "#".concat(trial_id))
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

function drawFixationPoints(svg, trial_id){
  // Draw fixation points
  svg.append("g")
      .attr("class", "fixationpoints")
      .attr("id", trial_id)
    .selectAll("circle")
    .data(datasets[trial_id])
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

function removeFixationPoints(svg, trial_id){
  svg.select(".fixationpoints".concat(trial_id)).remove();
}

function drawScanPath(svg, dataset_id){
  var scanpathFunction = d3.svg.line()
                         .x(function(d) { return zoom_ratio*d.x; })
                         .y(function(d) { return zoom_ratio*d.y; })
                         .interpolate("linear");

  svg.append("path")
    .attr("class", "scanpath")
    .attr("id", dataset_id)
    .attr("d", scanpathFunction(datasets[dataset_id]))
    .attr("stroke", "blue")
    .attr("stroke-width", 2)
    .attr("fill", "none");
}

function removeScanPath(svg, trial_id){
  svg.select(".scanpath".concat(trial_id)).remove();
}
