Visualizing Eye Gaze Sequences – A CPSC 547 Project at UBC
=====
# Code Organization

The code is organized as follow:

* `index.html`: the main page
* `/css/eyegazevis.css`: the main stylesheet
* `/js/eyegazevis.js`: the main javascript file

Other files in the `/css` and `/js` folders are external libraries that are used in the application.

## Example dataset

* `atuav2.tsv`: definition of AOIs
* `atuav2_example.png`: visual stimulus (a screenshot of the visualization task)
* `fixation_datasets.json`: the main data file that contains the fixation data
* `user_chars.csv`: the user characteristic data (perceptual speed, verbal working memory, and visual working memory)

To run the application locally, start a server by executing
```
python -m SimpleHTTPServer
```

and then go to `http://localhost:8000`

The application running with the example dataset is available at http://cs.ubc.ca/~mikewu/cs547/
