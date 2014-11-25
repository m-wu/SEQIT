var fixation_datasets, aois, aoi_sequences = [];

var mainviewsvg, timelineviewsvg;

var canvas_width          = 900;
var canvas_height         = 719;

var mainview_width        = 900;
var mainview_height       = 719;
var mainview_bg_opacity   = 0.5;

var timeline_height       = 100;

var zoom_ratio            = 0.7035; // image coordinate / fixation coordinate

var fixation_point_radius = 2;
var scanpath_width        = 1;

var fixpoints_group_class = "fixationpoints";
var scanpath_class        = "scanpath";

var numFilesLoaded        = 0;
var numFilesToLoad        = 2;

var noneAOIName           = "None";

$(window).load(function() {
  main();
});

function main(){
  drawMainView();
  // read the JSON data file
  d3.json("fixation_datasets.json", function(error, json){
    fixation_datasets = {};
    for (var i in json){
      // Add the list of fixation points into fixation_datasets
      // with trial_id as the index.
      // trial_id contains user id and task id.
      var trial_id = json[i].user.concat(json[i].task);
      fixation_datasets[trial_id] = json[i].fixpoints;

      // Add a button for the trial in the trial view.
      
    }    
    initializeViews()
  });

  d3.tsv("atuav2.tsv", function(error, rows) {
    aois = rows;
    initializeViews()
  });

}

function initializeViews(){
  if (++numFilesLoaded < numFilesToLoad){
    return; // wait for files to load
  }

  for(var trial_id in fixation_datasets){
    addButtonToTrialView(trial_id);
  }
  populateTimelineData();
  drawTimelineView();
}

function populateTimelineData(){
  for (trial_id in fixation_datasets){
    aoi_sequences.push(getAOISequence(fixation_datasets[trial_id], aois));
  }
}

function getAOISequence(fixations, aois){
  var aoi_sequence = [];
  var sequenceStart = fixations[0].timestamp;
  for (var i in fixations){
    var fixation      = fixations[i];
    var fixationStart = fixation.timestamp - sequenceStart;
    var fixationEnd   = fixation.timestamp + fixation.duration - sequenceStart;
    var aoi           = getAOIForPoint(fixation.x, fixation.y);
    if (aoi_sequence.length == 0){ // first fixation in the trial
      aoi_sequence.push({aoi:aoi, start:fixationStart, end:fixationEnd, ids:[i]});
      continue;
    }
    var lastElement = aoi_sequence[aoi_sequence.length-1];
    if (aoi == lastElement.aoi && Math.abs(fixationStart - lastElement.end) <= 1){ // allow off-by-1
      // if the aoi is the same as the previous and there is no large gap
      lastElement.end = fixationEnd;
      lastElement.ids.push(i);
      continue;
    }
    aoi_sequence.push({aoi:aoi, start:fixationStart, end:fixationEnd, ids:[i]});
  }
  return aoi_sequence;
}

function getAOIForPoint(x, y){
  for (var i in aois){
    var aoi = aois[i];
    if (isInsideRect(x, y, aoi)){
      return aoi.Name;
    }
  }
  return noneAOIName;
}

function isInsideRect(x, y, aoi){
  return (x >= aoi.x_min && x <= aoi.x_max &&
          y >= aoi.y_min && y <= aoi.y_max);
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

function drawTimelineView(){
  timelineviewsvg = d3.select("#timelineview")
                      .append("svg")
                        .attr("width", canvas_width)
                        .attr("height", timeline_height);
  

  var timespan = aoi_sequences[aoi_sequences.length-1].end - aoi_sequences[0].start

  var xScale = d3.scale.linear()
      .domain([0, d3.max(aoi_sequences, function(s){ return s[s.length-1].end;})])
      .range([0, canvas_width]);

  var yScale = d3.scale.ordinal()
        .domain(d3.range(aoi_sequences.length))
        .rangeRoundBands([0, timeline_height], 0.05);

  var colorScale = d3.scale.category10()
      .domain(aois.map(function(aoi){return aoi.Name;}));

  var aoiTip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) { 
        return d.aoi + ": " + d.ids.length;
      });
  timelineviewsvg.call(aoiTip);

  var groups = timelineviewsvg.selectAll("g")
      .data(aoi_sequences)
      .enter()
      .append("g")
      .attr("transform", function(d,i){return "translate(0, "+yScale(i)+")";});

  var rects = groups.selectAll("rect")
      .data(function(d) { return d; })
      .enter()
      .append("rect")
      .attr("x", function(d){
        return xScale(d.start);
      })
      .attr("width", function(d){
        return xScale(d.end)-xScale(d.start);
      })
      .attr("y", 0)
      .attr("height", yScale.rangeBand())
      .style("fill", function(d){
        return colorScale(d.aoi);
      })
      .on('mouseover', aoiTip.show)
      .on('mouseout', aoiTip.hide);
}

function drawFixationPoints(svg, trial_id){
  // Draw fixation points
  svg.append("g")
      .attr("class", fixpoints_group_class)
      .attr("id", trial_id)
    .selectAll("circle")
    .data(fixation_datasets[trial_id])
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

function drawScanPath(svg, trial_id){
  var scanpathFunction = d3.svg.line()
                         .x(function(d) { return zoom_ratio*d.x; })
                         .y(function(d) { return zoom_ratio*d.y; })
                         .interpolate("linear");

  svg.append("path")
    .attr("class", scanpath_class)
    .attr("id", trial_id)
    .attr("d", scanpathFunction(fixation_datasets[trial_id]))
    .attr("stroke", "blue")
    .attr("stroke-width", scanpath_width)
    .attr("fill", "none");
}

function removeScanPath(svg, trial_id){
  svg.select(".".concat(scanpath_class).concat("#".concat(trial_id))).remove();
}
