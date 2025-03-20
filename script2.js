/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js 
--------------------------------------------------------------------*/

/*--------------------------------------------------------------------
Step 1: INITIALIZE MAP
--------------------------------------------------------------------*/
// Define access token
mapboxgl.accessToken = 'pk.eyJ1IjoiY2Fyb2xpbmVuZWUiLCJhIjoiY201b2RhZmxtMGthajJucHRxcW5heGxiNyJ9.NMKAQoQvhYJ8RQq0NQuYkA'; //****ADD YOUR PUBLIC ACCESS TOKEN*****

// Initialize map and edit to your preference
const map = new mapboxgl.Map({
    container: 'map', // container id in HTML
    style: 'mapbox://styles/carolinenee/cm8gbeqjq00cr01pa45oudfs7',  // ****ADD MAP STYLE HERE *****
    center: [-79.388, 43.715],  // starting point, longitude/latitude
    zoom: 10.2 // starting zoom level
});


/*--------------------------------------------------------------------
Step 2: VIEW GEOJSON POINT DATA ON MAP
--------------------------------------------------------------------*/
let CollisionPoints;

fetch('https://raw.githubusercontent.com/carolinenee/ggr472-lab4-main/refs/heads/main/data/pedcyc_collision_06-21.geojson')
    .then(response => response.json())
    .then(response => {
        //console.log("Fetched Data:", response); // Log to check data
        CollisionPoints = response; //adding the data values from the github file into our variable CollisionPoints 
        map.on('load', () => {
            // Add the GeoJSON collision data points to the map 
            map.addSource('collision-points', {
                type: 'geojson',
                data: CollisionPoints, 
            });
            //      First create a bounding box around the collision point data
            let envresult = turf.envelope(CollisionPoints)
            //console.log(envresult.bbox) // to check that it worked 
            //      Access and store the bounding box coordinates as an array variable
            bboxgeojson = {
                'type': 'Feature Collection',
                "features": [envresult]
            }
            //console.log(bboxgeojson) // to check that it worked 
            // creates the box around the collision points
            let box = turf.bbox(CollisionPoints);
            //create a polygon from the box variable above  
            let boxPolygon = turf.bboxPolygon(box)
            //load the bounding box data 
            map.addSource('box-source', {
                type: 'geojson',
                data: boxPolygon
            });

            // Convert bbox array to a polygon to be able to use transformscale 
            let boxPolygon2 = turf.bboxPolygon(box);
            // Expand the bounding box by 10%
            let expandedBoxPolygon = turf.transformScale(boxPolygon2, 1.1); // Scale up by 10%

            map.addSource('expandedBoxSource', {
                type: 'geojson',
                data: expandedBoxPolygon
            });

            //visualise the bounding box
            map.addLayer({
                id: 'box-layer',
                type: 'line',
                source: 'expandedBoxSource',
                paint: {
                    'line-color': '#FFFFFF', // black box line 
                    'line-width': 2
                }
            });
            //store the bounding coordinates as an array
            let BoundingCoordinates = turf.bbox(expandedBoxPolygon);
            //console.log(BoundingCoordinates)
            // innitial hexgrid before rescaling 
            var hexgrid = turf.hexGrid(BoundingCoordinates, 0.7, { units: 'kilometers' });
            // Add the hexgrid source
            map.addSource('hexgrid-source', {
                type: 'geojson',
                data: hexgrid
            });
            

            //Add the hexgrid layer
            map.addLayer({
                id: 'hexgrid-layer',
                type: 'fill',
                source: 'hexgrid-source',
                paint: {
                    'fill-color': '#888888',
                    'fill-opacity': 0.5
                }
            },);

            // Convert bbox array to a GeoJSON feature so that it can be used 
            
         // step 4 stuff 
        
            let collishex = turf.collect(hexgrid, CollisionPoints, "_id", "hexcollisions");

            let maxcollis = 0; // start collision count count at 0 
            collishex.features.forEach((feature) => { // loop through the hexegons 
                feature.properties.COUNT = feature.properties.hexcollisions.length; // creates a property in the current hexegon that stores the number of collisions 
                if (feature.properties.COUNT > maxcollis){ // check if the numbe of colisions in Count property is more than 0 
                    //console.log(feature);
                    maxcollis = feature.properties.COUNT // if it is replace value of maxcollis with the number of collisions 
                    //console.log(maxcollis)
                }
            });
            const hexagonsWithMaxCollisions = collishex.features.filter(
                feature => feature.properties.COUNT === maxcollis
            );
            
            // Step 3: Log or display the result
            console.log("Max collisions:", maxcollis);

            map.addSource('HexWithCollision', {
                type: 'geojson',
                data: collishex
            });
            map.addLayer({
                id: 'hexgrid-style',
                type: 'fill',
                source: 'HexWithCollision',
                paint: {
                    'fill-color': [
                        'interpolate',
                        ["exponential", 0.96], //exponential because linear was too blue this shows range better 
                        ['get', 'COUNT'],
                        0, '#ADD8E6',
                        maxcollis, '#FFA500'
                    ],
                    'fill-opacity': [
                        'step',
                        ['get', 'COUNT'],
                        0,
                        1, 0.9, // 10% opacity for collisions above 1 
                    ]
                } 
            });
            // visualising the collision locations as dots 
            map.addLayer({
                id: 'collision-layer',
                type: 'circle',
                source: 'collision-points',
                paint: {
                    'circle-radius': 2, // Size of the circles
                    'circle-color': '#000000', // black colour
                    'circle-stroke-width': 1, //adds a white border to distinguish between close together points 
                    'circle-stroke-color': '#FFFFFF' // colour of border 
                }
            });

        
            });
        
    })
    
    const maxCollisions = 95; // Replace with your actual max collisions value
    document.querySelector('.legend-labels span:last-child').textContent = maxCollisions;
// legend stuff 





/*--------------------------------------------------------------------
    Step 3: CREATE BOUNDING BOX AND HEXGRID
--------------------------------------------------------------------*/
//HINT: All code to create and view the hexgrid will go inside a map load event handler
//      Use bounding box coordinates as argument in the turf hexgrid function
//      **Option: You may want to consider how to increase the size of your bbox to enable greater geog coverage of your hexgrid
//                Consider return types from different turf functions and required argument types carefully here



/*--------------------------------------------------------------------
Step 4: AGGREGATE COLLISIONS BY HEXGRID
--------------------------------------------------------------------*/
 


//HINT: Use Turf collect function to collect all '_id' properties from the collision points data for each heaxagon
//      View the collect output in the console. Where there are no intersecting points in polygons, arrays will be empty



// /*--------------------------------------------------------------------
// Step 5: FINALIZE YOUR WEB MAP
// --------------------------------------------------------------------*/
//HINT: Think about the display of your data and usability of your web map.
//      Update the addlayer paint properties for your hexgrid using:
//        - an expression
//        - The COUNT attribute
//        - The maximum number of collisions found in a hexagon
//      Add a legend and additional functionality including pop-up windows
