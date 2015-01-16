var socket = io.connect(':8000/');

/*
 * Explanation of location data:
 * 1. App emits server request for location data that is passed along to another client
   2a. If another client is running, it sends its location data back to server and then
       to this client. That location data is saved.
   2b. If there is not another client running, this client doesn't receive new data
   3. In case of fresh start for whole app, default location data is set
   4. When andy loads, location data is retrieved from storage
   5a. If another client is running, the data loaded is their location data
   5b. If another client is not running, the data loaded is this client's previous location data
   5c. If the app has not been run on this browser yet, the default data remains
 */

// send this request when DOM is ready
$(function() {
	// check if another user is online / has location data
	socket.emit('data_check', {});
});

// when window is touched, make touch animation and send information to server
document.ontouchmove = function(e) {
	e.preventDefault();
}

// set initial canvas variables
var canvas = document.getElementById('main');	
var width = canvas.width;
var height = canvas.height;

var canvasTop = canvas.offsetTop;
var canvasLeft = canvas.offsetLeft;

var context = canvas.getContext('2d');

// initialize andy image
var andy = new Image();
andy.src = 'mini_rover.png';

// set default andy data.
var andyLocation = {x: 500, y: 500, angle: 0}
// set default circle values (fails draw case)
var circleLocation = {x: -1, y: -1}


// add andy to context
andy.onload = function() {
	// update from stored data in event of reconnect
	loadDataFromLocalStorage();
	// check for previously saved angle
	console.log(andyLocation.angle)
	redrawCanvasHandler(); // saving to local storage isn't needed here, but it happens
}

function drawAndy() {
	context.drawImage(andy, andyLocation.x, andyLocation.y);
}

// add circle function
addCircle = function(x, y) { 
	var c = context;
	var r = 30;
	c.beginPath();
	c.arc(x, y, r, 0, 2 * Math.PI, true);
	c.closePath();
	c.fillStyle = 'rgba(255,0,0,0.2)'; // just a random opacity
	c.fill();
	c.lineWidth = 0;
	c.stroke();
}

// start function
doOnTouchStart = function(e) {
	e.preventDefault();
	// find touch coordinates and add to global
	circleLocation.x = event.touches[0].clientX - canvasLeft;
	circleLocation.y = event.touches[0].clientY - canvasTop;
	// draw in andy and circle
	redrawCanvasHandler();
	// save new circle data to localstorage
	saveDataToLocalStorage();
	// send a message to the server that we created a circle (but only when screen is touched)
	socket.emit('userTap', {x: circleLocation.x, y: circleLocation.y});
}

// touch start listener
canvas.addEventListener('touchstart', doOnTouchStart);

function redrawCanvasHandler() {
	if (andyLocation.angle != 0) {
		redrawCanvasWithRotation();
	}
	else {
		redrawCanvas();
	}
}

function redrawCanvas() {
	context.clearRect (0, 0, canvas.width, canvas.height);
	if (circleLocation.x >= 0 && circleLocation.y >= 0) {
		addCircle(circleLocation.x, circleLocation.y);
	}
	// save andy data to localstorage
	saveDataToLocalStorage();
	// andy can move regardless of whether touch event is registered
	drawAndy();
}

function rotateAndy(theta) {
	// save old context
	context.save();
	// set origin of context on andy icon
	context.translate(andyLocation.x, andyLocation.y);
	// move across and down by half of width and height of icon
	context.translate(andy.width / 2, andy.height / 2);
	// rotate context (rotate uses radians)
	context.rotate(theta * Math.PI / 180);
	// draw andy onto context back and up from when we moved context across and down
	context.drawImage(andy, -andy.width / 2, -andy.height / 2);
	// restore old context (but icon is now rotated)
	context.restore();
	
}

function redrawCanvasWithRotation() { // rotation is relative to current position, so I don't need to save a variable
	context.clearRect (0, 0, canvas.width, canvas.height);
	rotateAndy(andyLocation.angle);
	if (circleLocation.x >= 0 && circleLocation.y >= 0) {
		addCircle(circleLocation.x, circleLocation.y);
	}
	// save andy data to localstorage
	saveDataToLocalStorage();
}

function moveAndy(keyCode) { // right now I'm moving with by a default of 5px
	// base case of no rotation (permits forward/backward [according to current icon direction])
	if (andyLocation.angle === 0) {
		if (keyCode === 87) {
			andyLocation.x -= 5;
		}
		else if (keyCode === 83) {
			andyLocation.x += 5;
		}
		redrawCanvas();
	}
	else {
		if (keyCode === 87) {
			// Math trig functions use radians
			andyLocation.x -= (5 * Math.cos(andyLocation.angle * Math.PI / 180));
			andyLocation.y -= (5 * Math.sin(andyLocation.angle * Math.PI / 180));
		}
		else if (keyCode === 83) {
			andyLocation.x += (5 * Math.cos(andyLocation.angle * Math.PI / 180));
			andyLocation.y += (5 * Math.sin(andyLocation.angle * Math.PI / 180));
		}
		redrawCanvasWithRotation();
	}

	// send server updated andyLocation data
	socket.emit('controllerMove', {x: andyLocation.x, y: andyLocation.y, angle: andyLocation.angle});
}

// handler for movement relative to image direction
$(document).bind('keydown', function(e) { // *** i'm disallowing sideways motion
	switch(e.keyCode) {
		case 87: // up (W)
			moveAndy(87);
			break;
		case 83: // down (S)
			moveAndy(83);
			break;
		case 65: // rotate counter-clockwise (A)
			andyLocation.angle -= 10; // IMPORTANT: the reason this is negative is because the unit circle is reversed vertically, just like the y-axis
			andyLocation.angle %= 360;
			console.log(andyLocation.angle);
			redrawCanvasWithRotation();
			// send server updated andyLocation data
			socket.emit('controllerMove', {x: andyLocation.x, y: andyLocation.y, angle: andyLocation.angle});
			break;
		case 68: // rotate clockwise (D)
			andyLocation.angle += 10;
			andyLocation.angle %= 360;
			console.log(andyLocation.angle);
			redrawCanvasWithRotation();
			// send server updated andyLocation data
			socket.emit('controllerMove', {x: andyLocation.x, y: andyLocation.y, angle: andyLocation.angle});
			break;
	}
});


function loadDataFromLocalStorage() {
	// check if data is saved yet
	if (localStorage.andyLocation && JSON.parse(localStorage.andyLocation)
		&& localStorage.circleLocation && JSON.parse(localStorage.circleLocation)) {
		// set current information to saved data
		andyLocation = JSON.parse(localStorage.andyLocation);
		circleLocation = JSON.parse(localStorage.circleLocation);
	}
}

function saveDataToLocalStorage() {
	// save andy and circle data in localStorage
	localStorage.andyLocation = JSON.stringify(andyLocation);
	localStorage.circleLocation = JSON.stringify(circleLocation);
}

/*
 * Data is loaded when socket receives messages.
 * Data is stored when touch occurs, and in both types of redraws.
 */

socket.on('request_data', function(data) {
	// send current andy / circle data
	socket.emit('send_data', {andyLocation: andyLocation, circleLocation: circleLocation});
});

socket.on('update_data', function(data) {
	andyLocation = data.andyLocation;
	circleLocation = data.circleLocation;
	saveDataToLocalStorage();
	// Redraw again in case andy load is processed before this request comes through
	redrawCanvasHandler();
})

socket.on('send_circle', function(data) {
	// set circleLocation to passed in data
	circleLocation.x = data.x;
	circleLocation.y = data.y;
	// draw in andy and circle
	redrawCanvasHandler();
});

socket.on('send_move', function(data) {
	// set andyLocation to passed in data
	andyLocation.x = data.x;
	andyLocation.y = data.y;
	andyLocation.angle = data.angle;
	// draw in andy and circle
	redrawCanvasHandler();
});


/*

 * Known Issues

 * After document is ready, andy will always be loaded before location data from another
   client comes back (if it does at all). This leads to an inital draw, followed by a
   redraw when/if the data comes through. The turnover is usually fairly quick, but it
   causes a noticable gap. I'd have to use polling on the server to fix this.

 */