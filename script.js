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
    style: 'mapbox://styles/carolinenee/cm8gbeqjq00cr01pa45oudfs7',  // Monochromatic MAP STYLE *****
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
    })
map.on('load', () => {
    //create a bounding box around the collision point data
    let envresult = turf.envelope(CollisionPoints)
    //console.log(envresult.bbox) // to check that it worked 
    //Access and store the bounding box coordinates as an array variable
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
        data: boxPolygon,
    });

    // Convert bbox array to a polygon to be able to use transformscale 
    let boxPolygon2 = turf.bboxPolygon(box);
    // Expand the bounding box by 10%
    let expandedBoxPolygon = turf.transformScale(boxPolygon2, 1.1); // Scale up by 10% 
    //load box data to map 
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
    //store the expanded bounding coordinates as an array
    let BoundingCoordinates = turf.bbox(expandedBoxPolygon);
    // innitial hexgrid before rescaling 
    var hexgrid = turf.hexGrid(BoundingCoordinates, 0.7, { units: 'kilometers' });
    // Add the hexgrid source
    map.addSource('hexgrid-source', {
        type: 'geojson',
        data: hexgrid
    });
    map.addLayer({
        id: 'hexgrid-layer',
        type: 'fill',
        source: 'hexgrid-source',
        paint: {
            'fill-color': 'rgba(173, 216, 230, 0.05)', // rgb so that i can make the fill mostly opaque but still see the outilne of the hexegons
            'fill-opacity': 0.8, // opacity of the entire layer 
            'fill-outline-color': '#000000', //  black outline color  
        }
    },);
    // combine hexgrid with collision data by creating new array of collisions within collishex stored under hexcollisions 
    let collishex = turf.collect(hexgrid, CollisionPoints, "_id", "hexcollisions");
    // 
    let maxcollis = 0; // start collision count count at 0 
    collishex.features.forEach((feature) => { // loop through the hexegons 
        feature.properties.COUNT = feature.properties.hexcollisions.length; // creates a property in the current hexegon that stores the number of collisions 
        if (feature.properties.COUNT > maxcollis) { // check if the numbe of colisions in Count property is more than 0 
            //console.log(feature);
            maxcollis = feature.properties.COUNT // if it is replace value of maxcollis with the number of collisions 
            //console.log(maxcollis)
        }
    });
    //adds data into our collishex so that count represents the maximum number of collisions in that hexegon 
    const hexagonsWithMaxCollisions = collishex.features.filter(
        feature => feature.properties.COUNT === maxcollis
    );
    //console.log(collishex)
    //load hex data that includes collisions 
    map.addSource('HexWithCollision', {
        type: 'geojson',
        data: collishex
    });
    //style the hex data to create a choropleth 
    map.addLayer({
        id: 'hexgrid-style',
        type: 'fill',
        source: 'HexWithCollision',
        paint: {
            'fill-color': [
                'interpolate', // so that there is continuous colours instead of classified 
                ["exponential", 0.96], //exponential because linear was too blue this shows range better 
                ['get', 'COUNT'], // finds the numbers of collisions and assigns colour based on that 
                0, '#ADD8E6', // colour for 0 collisions 
                maxcollis, '#FFA500' // colour for the max number of collisions (95), everything else will be a gradient between the two
            ],
            'fill-opacity': [
                'step', // because we want contrast between hexegons with 0 collision value and >0 collision value 
                ['get', 'COUNT'],
                0, // sets opacity 0 as default 
                1, 0.9, // mostly opaque for collisions above 1 
            ]
        }
    });
    // Add the GeoJSON collision data points to the map 
    map.addSource('collision-points', {
        type: 'geojson',
        data: CollisionPoints,
    });
    // visualising the collision locations as dots 
    map.addLayer({
        id: 'collision-layer',
        type: 'circle',
        source: 'collision-points',
        layout: {
            visibility: 'none' // Set default visibility to off but can be toggled on later 
        },
        paint: {
            'circle-radius': 2, // Size of the circles
            'circle-color': '#000000', // black colour
            'circle-stroke-width': 0.5, //adds a white border to distinguish between close together points 
            'circle-stroke-color': '#FFFFFF' // colour of border 
        }
    });
    // popup event listener that responds to when you click on a hexegon 
    map.on('click', 'hexgrid-style', (e) => {
        const count = e.features[0].properties.COUNT;
        new mapboxgl.Popup()
            .setLngLat(e.lngLat) // popup showsup where you clicked
            .setHTML(`Collisions: ${count} `) // content of the popup says collisions: and the value of count aka numebr of collisions 
            .addTo(map);

        const bbox = turf.bbox(e.features[0].geometry); // Get the bounding box of the hexagon when you click on  it
        
        map.flyTo({ // Fly to the bounding box 
            center: turf.centerOfMass(e.features[0].geometry).geometry.coordinates, // Center on the hexagon
            zoom: 14, // how close to the hexegon
            speed: 1.2, // how fast it zooms 
            curve: 1.42, // how smooth the zoom is 
            essential: true // Ensure the animation is not interrupted by user interactions

        });

    });
    // Toggles hexgrid layer visibility when you click on the button 
    document.getElementById('toggle-hexgrid').addEventListener('click', () => {
        const visibility = map.getLayoutProperty('hexgrid-style', 'visibility');
        if (visibility === 'visible') { // if the current visibility is visible you set it to none 
            map.setLayoutProperty('hexgrid-style', 'visibility', 'none');
        } else { // if it is currently not visible set it to visible 
            map.setLayoutProperty('hexgrid-style', 'visibility', 'visible');
        }
    });

    // Toggle collision layer visibility the same way as above 
    document.getElementById('toggle-collisions').addEventListener('click', () => {
        const visibility = map.getLayoutProperty('collision-layer', 'visibility');
        if (visibility === 'visible') {
            map.setLayoutProperty('collision-layer', 'visibility', 'none');
        } else {
            map.setLayoutProperty('collision-layer', 'visibility', 'visible');
        }
    });

    // Toggle frame layer visibility same way as above too 
    document.getElementById('toggle-frame').addEventListener('click', () => {
        const visibility = map.getLayoutProperty('box-layer', 'visibility');
        if (visibility === 'visible') {
            map.setLayoutProperty('box-layer', 'visibility', 'none');
        } else {
            map.setLayoutProperty('box-layer', 'visibility', 'visible');
        }
    });

    // Store the initial map center and zoom level
    const initialCenter = [-79.388, 43.715]; // map center
    const initialZoom = 10.2; // zoom level

    // Add event listener for the zoom-back button 
    document.getElementById('zoom-back').addEventListener('click', () => {
        map.flyTo({
            center: initialCenter,
            zoom: initialZoom,
            speed: 1.2, // Animation speed
            curve: 1.42, // Animation curve
            essential: true // Ensure the animation is not interrupted by user interactions
        });
    });

    //legend stuff 
    function createLegend() {
        const legend = document.getElementById('legend');
        legend.innerHTML = "<strong>Collision Count</strong><br>"; // title of legent 
    
        // Define color stops based on your fill-color interpolation
        const colorStops = [
            { count: 0, color: "rgba(173, 216, 230, 0.1)" },  // doing RGP becuase Hex codes don't allow opacity changes
            { count: (1), color: "#a6c9cf" }, // did the colours manually with screenshots and a hex identifier because it wasn't working the other way :(
            { count: (5), color: "#b2c1b1" },
            { count: (10), color: "#bfbb92" },
            { count: (20), color: "#ceb162" },
            { count: (42), color: "#e2a42a" },
            { count: (65), color: "#ea9f13" }, 
            { count: 95, color: "#ee9c08" } // max collisions
        ];
    
        // Loop through each color stop and create legend items
        colorStops.forEach(stop => {
            const item = document.createElement('div');
            item.className = 'legend-item';
    
            const colorBox = document.createElement('span');
            colorBox.className = 'legend-color';
            colorBox.style.backgroundColor = stop.color;
    
            const label = document.createElement('span');
            label.innerText = `${stop.count}`; // the numbers asociated with the colorStops variable above 
    
            item.appendChild(colorBox); 
            item.appendChild(label);
            legend.appendChild(item);
        });
    }
    
    // Call the function to create the legend 
    createLegend();
})

