var fixation_datasets, aois, aoi_sequences = [];

var mainviewsvg, timelineviewsvg;

var mainview_img_width    = 900.0;
var mainview_img_height   = 719.0;
var mainview_bg_opacity   = 0.5;

var timeline_height       = 800;
var timeline_label_width  = 60;

var zoom_ratio            = 0.7035; // image coordinate / fixation coordinate

var fixation_point_radius = 2;
var scanpath_width        = 1;

var fixpoints_group_class = "fixationpoints";
var scanpath_class        = "scanpath";
var timeline_class        = "timeline";
var timeline_label_class  = "triallabel";

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
    fixation_datasets = [];
    for (var i in json){
      // Add the list of fixation points into fixation_datasets
      fixation_datasets.push({user:json[i].user, task:json[i].task, fixations:json[i].fixpoints});
    }
    initializeViews();
  });

  d3.tsv("atuav2.tsv", function(error, rows) {
    aois = rows;
    initializeViews();
  });

}

function initializeViews(){
  if (++numFilesLoaded < numFilesToLoad){
    return; // wait for files to load
  }

  populateTimelineData();

  drawAllFixationPoints();
  drawAllScanPaths();
  drawTimelineView();
}

function populateTimelineData(){
  for (var i in fixation_datasets){
    var trial = fixation_datasets[i];
    var aoisequence = getAOISequence(trial.fixations, aois);
    aoi_sequences.push({user:trial.user, task:trial.task, sequence:aoisequence});
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

function getTrialID(user, task){
  return "user="+user+";task:"+task;
}

function drawMainView(){
  var mainview_width = parseFloat(d3.select(".mainviewcolumn").style("width"));
  var mainview_height = mainview_width * mainview_img_height / mainview_img_width;

  zoom_ratio = zoom_ratio * (mainview_width/mainview_img_width);

  // Create SVG element
  mainviewsvg = d3.select("#mainview")
                  .append("svg")
                    .attr("width", mainview_width)
                    .attr("height", mainview_height);

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

  mainviewsvg.append("g")
    .attr("class", fixpoints_group_class);

  mainviewsvg.append("g")
    .attr("class", scanpath_class);
}

function drawAllFixationPoints(){
  mainviewsvg.select("."+fixpoints_group_class)
    .selectAll("g")
    .data(fixation_datasets)
    .enter()
  .append("g")
    .attr("class", function(d){
      return [fixpoints_group_class, getUserClassName(d.user), getTaskClassName(d.task)].join(" ");
    })
    .style("display","none")
    .selectAll("circle")
    .data(function(d){return d.fixations;})
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

function drawAllScanPaths(){
  var scanpathFunction = d3.svg.line()
                           .x(function(d) { return zoom_ratio*d.x; })
                           .y(function(d) { return zoom_ratio*d.y; })
                           .interpolate("linear");

  mainviewsvg.select("."+scanpath_class)
    .selectAll("path")
    .data(fixation_datasets)
    .enter()
  .append("path")
    .attr("class", function(d){
      return [scanpath_class, getUserClassName(d.user), getTaskClassName(d.task)].join(" ");
    })
    .style("display","none")
    .attr("d", function(d){
      return scanpathFunction(d.fixations);
    })
    .attr("stroke", "blue")
    .attr("stroke-width", scanpath_width)
    .attr("fill", "none");
}

function drawTimelineView(){
  var timeline_width = parseInt(d3.select("#timelineview").style("width"));

  timelineviewsvg = d3.select("#timelineview")
                      .append("svg")
                        .attr("width", timeline_width)
                        .attr("height", timeline_height);
  
  var xScale = d3.scale.linear()
      .domain([0, d3.max(aoi_sequences, function(s){
        var sequence = s.sequence;
        return sequence[sequence.length-1].end;
      })])
      .range([0, timeline_width-timeline_label_width]);

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
      .attr("class", function(d){
        return [timeline_class, d.user, d.task].join(" ");
      })
      .attr("transform", function(d,i){return "translate(0, "+yScale(i)+")";});

  // Draw the label for each row in the timeline view
  groups.append("text")
      .attr("class", timeline_label_class)
      .attr("width", timeline_label_width)
      .attr("y", yScale.rangeBand())
      .attr("dy", "-.15em")
      .attr("cursor", "pointer")
      .text(function(d) { 
        return "user "+d.user.substring(0,3); // temporarily, show the 3 digits of user id
      })
      .on('click', function (d) {
        d3.selectAll("."+[fixpoints_group_class, getUserClassName(d.user), getTaskClassName(d.task)].join("."))
          .style("display", this.classList.contains("active") ? "none" : null);
        d3.selectAll("."+[scanpath_class, getUserClassName(d.user), getTaskClassName(d.task)].join("."))
          .style("display", this.classList.contains("active") ? "none" : null);
        d3.select(this).classed("active", !this.classList.contains("active"));
      })

  groups.selectAll(".aoivisit")
      .data(function(d) { return d.sequence; })
      .enter()
      .append("rect")
      .attr("class", "aoivisit")
      .attr("x", function(d){
        return xScale(d.start) + timeline_label_width;
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

function getUserClassName(user){
  return "user-" + user;
}

function getTaskClassName(task){
  return "task-" + task;
}