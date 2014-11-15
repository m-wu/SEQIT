var datasets = new Array();

var mainviewsvg;

var canvas_width = 900;
var canvas_height = 719;

var mainview_width = 900;
var mainview_height = 719;
var mainview_bg_opacity = 0.5;

var zoom_ratio = 0.7035; // image coordinate / fixation coordinate

var fixation_point_radius = 2;
var scanpath_width = 1;

var fixpoints_group_class = "fixationpoints";
var scanpath_class = "scanpath";

$(window).load(function() {
  main();
});

function main(){
  // read the JSON data file
  d3.json("datasets.json", function(error, json){
    for (var i in json){
      // Add the list of fixation points into datasets array
      // with trial_id as the index.
      // trial_id contains user id and task id.
      var trial_id = json[i].user.concat(json[i].task);
      datasets[trial_id] = json[i].fixpoints;

      // Add a button for the trial in the trial view.
      addButtonToTrialView(trial_id);
    }
    
    drawMainView();
  })
}


function addButtonToTrialView(trial_id){  
  // Add a button in the trial view
  d3.select("#user-group")
    .append("button")
      .attr("type", "button")
      .attr("id", trial_id)
      .attr("class", "btn btn-primary")
      .attr("autocomplete","off")
      .text(trial_id);

  // Define the on-click action:
  // show or hide fixation points and scan path.
  $('#'.concat(trial_id)).on('click', function () {
    if (!$(this).hasClass('active')){
      drawFixationPoints(mainviewsvg, trial_id);
      drawScanPath(mainviewsvg, trial_id);
    } else {
      removeFixationPoints(mainviewsvg, trial_id);
      removeScanPath(mainviewsvg, trial_id);
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
      .attr("class", fixpoints_group_class)
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
      .attr("r", fixation_point_radius);
}

function removeFixationPoints(svg, trial_id){
  svg.select(".".concat(fixpoints_group_class).concat("#".concat(trial_id))).remove();
}

function drawScanPath(svg, dataset_id){
  var scanpathFunction = d3.svg.line()
                         .x(function(d) { return zoom_ratio*d.x; })
                         .y(function(d) { return zoom_ratio*d.y; })
                         .interpolate("linear");

  svg.append("path")
    .attr("class", scanpath_class)
    .attr("id", dataset_id)
    .attr("d", scanpathFunction(datasets[dataset_id]))
    .attr("stroke", "blue")
    .attr("stroke-width", scanpath_width)
    .attr("fill", "none");
}

function removeScanPath(svg, trial_id){
  svg.select(".".concat(scanpath_class).concat("#".concat(trial_id))).remove();
}
