$(window).load(function() {
    
  //Width and height
  var canvas_width = 900;
  var canvas_height = 719;
      
  var dataset = [
                  [505,786], [487,852], [360,786], [322,817], [322,857], [345,829], [311,809], [364,834], [414,835], [492,825], [573,831], [616,830], [684,826], [792,838], [827,836], [880,835], [667,839], [504,846], [445,837], [369,846], [441,820], [558,585], [1074,579], [1081,621], [1047,609], [815,529], [858,720], [848,771], [651,858], [536,825], [475,836], [564,841], [625,839], [719,762], [484,746], [411,738], [340,746], [361,643], [378,378], [356,674], [358,709], [403,733], [339,523], [360,410], [576,845], [682,836], [749,833], [686,841], [629,841], [767,838], [830,838], [898,836], [809,849], [644,903]
                ];

  var mainview_width = 900;
  var mainview_height = 719;
  var mainview_bg_opacity = 0.5;

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
           return 0.7035*d[0];
      })
      .attr("cy", function(d) {
           return 0.7035*d[1];
      })
      .attr("r", 5);


  // Draw scan path

  var scanpathFunction = d3.svg.line()
                           .x(function(d) { return 0.7035*d[0]; })
                           .y(function(d) { return 0.7035*d[1]; })
                           .interpolate("linear");

  svg.append("path")
     .attr("d", scanpathFunction(dataset))
     .attr("stroke", "blue")
     .attr("stroke-width", 2)
     .attr("fill", "none");

});
