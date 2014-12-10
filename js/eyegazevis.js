var fixation_datasets, aois, userchars = {}, aoi_sequences = [];

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
var timeline_char_class   = "userchars";
var tlrow_faded_class     = "faded";

var numFilesLoaded        = 0;
var numFilesToLoad        = 3;

var noneAOIName           = "None";

var max_ps_value          = 0;
var min_ps_value          = Infinity;
var max_verbal_value      = 0;
var min_verbal_value      = Infinity;
var max_visual_value      = 0;
var min_visual_value      = Infinity;

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
      var user_id   = json[i].user.substring(0,3);
      var task_id   = json[i].task;
      var fixpoints = json[i].fixpoints;
      fixation_datasets.push({user:user_id, task:task_id, fixations:fixpoints});
    }
    initializeViews();
  });

  d3.tsv("atuav2.tsv", function(error, rows) {
    aois = rows;
    initializeViews();
  });

  d3.csv("user_chars.csv", function(d) {
    return {
      user_id: d.user_id,
      ps_score_value: +d.ps_score_value,
      ps_score_cat: d.ps_score_cat,
      verbal_score_value: +d.verbal_score_value,
      verbal_score_cat: d.verbal_score_cat,
      visual_score_value: +d.visual_score_value,
      visual_score_cat: d.visual_score_cat
    };
  }, function(error, rows) {
    for (var i in rows){
      userchars[(rows[i].user_id).toString()] = rows[i]
      max_ps_value = Math.max(max_ps_value, rows[i].ps_score_value)
      min_ps_value = Math.min(min_ps_value, rows[i].ps_score_value)
      max_verbal_value = Math.max(max_verbal_value, rows[i].verbal_score_value)
      min_verbal_value = Math.min(min_verbal_value, rows[i].verbal_score_value)
      max_visual_value = Math.max(max_visual_value, rows[i].visual_score_value)
      min_visual_value = Math.min(min_visual_value, rows[i].visual_score_value)
    }
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
  drawHeatmap();
  drawAOIs();
}

function populateTimelineData(){
  for (var i in fixation_datasets){
    var trial = fixation_datasets[i];
    var aoisequence = getAOISequence(trial.fixations, aois);
    aoi_sequences.push({user:trial.user.substring(0,3), task:trial.task, sequence:aoisequence});
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
  var mainview_width = parseFloat(d3.select("#mainview").style("width"));
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

function drawHeatmap(){
  var heatmapInstance = h337.create({
    container: document.querySelector('#mainview')
  });

  var points = [];
  var max = 0;
  for (i in fixation_datasets) {
    for (j in fixation_datasets[i].fixations){
      var fixation = fixation_datasets[i].fixations[j];
      var dataPoint = { 
        x: zoom_ratio*fixation.x, // x coordinate of the datapoint, a number 
        y: zoom_ratio*fixation.y, // y coordinate of the datapoint, a number
        value: fixation.duration // the value at datapoint(x, y)
      };
      max = Math.max(max, fixation.duration);
      points.push(dataPoint);
    }
  }

  var data = { 
    max: max, 
    data: points 
  };

  heatmapInstance.setData(data);

  $('#heatmap-toggle').change(function() {
      if ($(this).prop('checked')){
        d3.select(".heatmap-canvas")
          .classed("hidden", false)
      } else {
        d3.select(".heatmap-canvas")
          .classed("hidden", true)
      }
  })
}

function drawAOIs(){
  mainviewsvg.append("g")
    .attr("transform", "scale("+zoom_ratio+")")
    .selectAll("rect")
    .data(aois)
    .enter()
    .append("rect")
      .attr("class", function(d){return "aoi "+ d.Name})
      .attr("x", function(d){return d.x_min;})
      .attr("y", function(d){return d.y_min;})
      .attr("width", function(d){return d.x_max - d.x_min;})
      .attr("height", function(d){return d.y_max - d.y_min;})
      .attr("opacity", 0)
      .on('mouseover', function(d){
        d3.selectAll(".aoivisit").classed("faded", true);
        d3.selectAll("."+d.Name).classed("faded", false);
        d3.select(this).classed("hovered", true);
      })
      .on('mouseout', function(d){
        d3.selectAll(".aoivisit").classed("faded", false);
        d3.select(this).classed("hovered", false);
      });
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
  var timeline_chars_width = parseInt($("#sorting-widgets").width());

  var mouseentered = false;

  timelineviewsvg = d3.select("#timelineview")
      .append("svg")
        .attr("width", timeline_width)
        .attr("height", timeline_height)
        .on("mousemove", function() {
          yScaleFisheye.focus(d3.mouse(this)[1]);
          if (!mouseentered){
            setTimelineRowHeightWithTransition(yScaleFisheye, timelinerows);
            mouseentered = true;
          } else {
            setTimelineRowHeight(yScaleFisheye, timelinerows);
          }
        })
        .on("mouseleave", function(){
          setTimelineRowHeightWithTransition(yScale, timelinerows);
          mouseentered = false;
        });
  
  var xScaleAbsolute = d3.scale.linear()
      .domain([0, d3.max(aoi_sequences, function(s){
        var sequence = s.sequence;
        return sequence[sequence.length-1].end;
      })])
      .range([0, timeline_width-timeline_label_width-timeline_chars_width]);

  var xScaleRelative = d3.scale.linear()
      .domain([0, 1])
      .range([0, timeline_width-timeline_label_width-timeline_chars_width]);

  var yScale = d3.scale.ordinal()
        .domain(d3.range(aoi_sequences.length))
        .rangeRoundBands([0, timeline_height], 0.05);

  var yScaleFisheye = d3.fisheye.ordinal()
        .domain(d3.range(aoi_sequences.length))
        .rangeRoundBands([0, timeline_height], 0.05)
        .distortion(1); 

  var colorScale = d3.scale.category10()
      .domain(aois.map(function(aoi){return aoi.Name;}));

  var aoiTip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) { 
        return d.aoi + ": " + d.ids.length;
      });
  timelineviewsvg.call(aoiTip);

  var timelinerows = timelineviewsvg.selectAll("g")
      .data(aoi_sequences)
      .enter()
      .append("g")
      .attr("class", function(d){
        return [timeline_class, getUserClassName(d.user), getTaskClassName(d.task)].join(" ");
      })
      .attr("transform", function(d,i){return "translate(0, "+yScale(i)+")";})
      .on('mouseover', function(d){
        timelinerows.classed(tlrow_faded_class, true);
        d3.select(this).classed(tlrow_faded_class, false);
        drawScanpathForTrial(d);
      })
      .on('mouseout', function(d){
        timelinerows.classed(tlrow_faded_class, false);
        hideAllScanpaths();
      });

  // draw a hidden rectangle covering entire row to receive mouse events
  timelinerows.append("rect")
      .attr("class", "bg")
      .attr("width", timeline_width)
      .attr("opacity", 0);

  drawUserCharBars(timelinerows.append("g").attr("class", timeline_char_class), timeline_chars_width);
  initTimelineSorting(timelinerows, yScale);

  // Draw the label for each row in the timeline view
  timelinerows.append("text")
      .attr("class", timeline_label_class)
      .attr("width", timeline_label_width)
      .attr("x", timeline_chars_width)
      .attr("dy", "-.15em")
      .attr("cursor", "default")
      .text(function(d) { 
        return "user "+d.user;
      });

  timelinerows.append("g")
      .attr("transform", "translate("+ (timeline_label_width + timeline_chars_width) + ",0)")
      .selectAll(".aoivisit")
      .data(function(d) { return d.sequence; })
      .enter()
      .append("rect")
      .attr("class", function(d){return "aoivisit "+d.aoi;})
      .attr("y", 0)
      .style("fill", function(d){
        return colorScale(d.aoi);
      })
      .on('mouseover', aoiTip.show)
      .on('mouseout', aoiTip.hide);

  setTimelineRowHeight(yScale, timelinerows);
  setTimelineAbsoluteScale(xScaleAbsolute, timelinerows);

  $('#tl-abs-rel').change(function() {
      if ($(this).prop('checked')){
        setTimelineAbsoluteScale(xScaleAbsolute, timelinerows);
      } else {
        setTimelineRelativeScale(xScaleRelative, timelinerows);
      }
  })
}

function drawUserCharBars(parent, timeline_chars_width){
  timeline_char_width = timeline_chars_width / 3;
  timeline_char_height = timeline_char_width * 0.9;

  psScale = d3.scale.linear()
      .domain([getMinDomain(min_ps_value, max_ps_value), max_ps_value])
      .range([0, timeline_char_height]);

  parent.append("rect")
      .attr("x", 0)
      .attr("width", function(d){return psScale(userchars[d.user].ps_score_value)});

  verbalScale = d3.scale.linear()
      .domain([getMinDomain(min_verbal_value, max_verbal_value), max_verbal_value])
      .range([0, timeline_char_height]);

  parent.append("rect")
      .attr("x", timeline_char_width)
      .attr("width", function(d){return verbalScale(userchars[d.user].verbal_score_value)});

  visualScale = d3.scale.linear()
      .domain([getMinDomain(min_visual_value, max_visual_value), max_visual_value])
      .range([0, timeline_char_height]);

  parent.append("rect")
      .attr("x", timeline_char_width*2)
      .attr("width", function(d){return visualScale(userchars[d.user].visual_score_value)});
}

function getMinDomain(minValue, maxValue){
  return minValue - (maxValue - minValue)/3;
}

function setTimelineRowHeight(scale, timelinerows){
    timelinerows
      .attr("transform", function(d,i){return "translate(0, "+scale(i)+")";})

    timelinerows.selectAll("text")
      .attr("y", function(d, i, j){return scale.rangeBand(j)*.8})

    timelinerows.selectAll('rect')
      .attr("height", function(d, i, j){return scale.rangeBand(j)})

    timelinerows.selectAll('.bg')
      .attr("height", function(d, i, j){return scale.rangeBand(j)+5})
}

function setTimelineRowHeightWithTransition(scale, timelinerows){
    timelinerows.transition()
      .attr("transform", function(d,i){return "translate(0, "+scale(i)+")";})

    timelinerows.selectAll("text").transition()
      .attr("y", function(d, i, j){return scale.rangeBand(j)*.8})

    timelinerows.selectAll('rect').transition()
      .attr("height", function(d, i, j){return scale.rangeBand(j)})

    timelinerows.selectAll('.bg').transition()
      .attr("height", function(d, i, j){return scale.rangeBand(j)+5})
}

function setTimelineAbsoluteScale(xScaleAbsolute, timelinerows){
  timelinerows.transition().selectAll(".aoivisit")
      .attr("x", function(d){
        return xScaleAbsolute(d.start);
      })
      .attr("width", function(d){
        return xScaleAbsolute(d.end)-xScaleAbsolute(d.start);
      })
}

function setTimelineRelativeScale(xScaleRelative, timelinerows){
  timelinerows.transition().selectAll(".aoivisit")
      .attr("x", function(d){
        var sequence = d3.select(this.parentNode).datum().sequence;
        var max = sequence[sequence.length-1].end;
        return xScaleRelative(d.start/max);
      })
      .attr("width", function(d){
        var sequence = d3.select(this.parentNode).datum().sequence;
        var max = sequence[sequence.length-1].end;
        return xScaleRelative(d.end/max)-xScaleRelative(d.start/max);
      })
}

function initTimelineSorting(rows, scale){
  d3.select("#ps-sort")
    .on("click", function(){
      var asc = updateIcon(this);
      sortTimelineByChar(rows, scale, "ps", asc);
      rearrangeTimelineRows(rows, scale);
    });

  d3.select("#verbal-sort")
    .on("click", function(){
      var asc = updateIcon(this);
      sortTimelineByChar(rows, scale, "verbal", asc);
      rearrangeTimelineRows(rows, scale);
    });

  d3.select("#visual-sort")
    .on("click", function(){
      var asc = updateIcon(this);
      sortTimelineByChar(rows, scale, "visual", asc);
      rearrangeTimelineRows(rows, scale);
    });
}

function updateIcon(iconDOM){
  if (iconDOM.classList.contains("fa-sort")){
    // set other sort icons to unsorted
    d3.select('#sorting-widgets').selectAll('.fa-sort-asc')
      .classed("fa-sort-asc", false)
      .classed("fa-sort", true)

    d3.select('#sorting-widgets').selectAll('.fa-sort-desc')
      .classed("fa-sort-desc", false)
      .classed("fa-sort", true)
  }

  var icon = d3.select(iconDOM);
  icon.classed("fa-sort", false);

  if (iconDOM.classList.contains("fa-sort-desc")){
    icon.classed("fa-sort-desc", false);
    icon.classed("fa-sort-asc", true);
    return true;
  } else{
    icon.classed("fa-sort-asc", false);
    icon.classed("fa-sort-desc", true);
    return false;
  }
}

function sortTimelineByChar(rows, scale, char, asc){
  rows.sort(function(a,b){
    valueA = eval("userchars[a.user]."+char+"_score_value");
    valueB = eval("userchars[b.user]."+char+"_score_value");
    return asc ? valueA - valueB : valueB - valueA;
  })
}

function rearrangeTimelineRows(rows, scale){
  rows.transition().delay(function(d, i) { return i * 5; })
    .attr("transform", function(d,i){return "translate(0, "+scale(i)+")";})
}

// draw the fixation points and the scan path for a trial
function drawScanpathForTrial(d){
  d3.select("."+[fixpoints_group_class, getUserClassName(d.user), getTaskClassName(d.task)].join("."))
    .style("display", null);
  d3.select("."+[scanpath_class, getUserClassName(d.user), getTaskClassName(d.task)].join("."))
    .style("display", null);
}

function hideAllScanpaths(){
  d3.select("."+fixpoints_group_class).selectAll("g")
    .style("display", "none");
  d3.select("."+scanpath_class).selectAll("path")
    .style("display", "none");
}

function resetTimeline(){
  timelineviewsvg.selectAll("g").classed(tlrow_faded_class, false);
}

function getUserClassName(user){
  return "user-" + user;
}

function getTaskClassName(task){
  return "task-" + task;
}