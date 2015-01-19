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

// set rotational angle and movement step
var turn = 0.5;
var step = 0.25;


// add andy to context
andy.onload = function() {
	// update from stored data in event of reconnect
	loadDataFromLocalStorage();
	redrawCanvasHandler(); // saving to local storage isn't needed here, but it happens
}

function drawAndy() {
	context.drawImage(andy, andyLocation.x, andyLocation.y);
}

// checks whether the andy icon is within bounds of the touch circle
// addCircle is called on every redraw so an andy movement will be registered as updating the circle if need be
function atTarget(radius) {
	var center = findAndyCenter();
	var distance = Math.sqrt(Math.pow((center.x - circleLocation.x), 2) + Math.pow((center.y - circleLocation.y), 2));
	console.log("Distance: ",distance,", proper: ",radius+andy.width/2-2);
	// just checking for andy.width / 2 + radius distance to simplify calculations
	// more accurate calc is what distance could be on diagonal, but i'm not doing that
	if (distance <= radius + andy.width / 2 - 2) { // small inset area
		console.log("Distance: ",distance);
		return true;
	}
	return false;
}

// add circle function
function addCircle(x, y) { 
	var c = context;
	var r = 30;
	c.beginPath();
	c.arc(x, y, r, 0, 2 * Math.PI, true);
	c.closePath();
	c.fillStyle = 'rgba(255,0,0,0.4)'; // just a random opacity
	c.fill();
	if (atTarget(r)) { // light up edge of circle if andy is within it
		c.lineWidth = 5;
		c.strokeStyle = 'rgba(0,0,255,0.4)';
	}
	else {
		c.lineWidth = 0;
	}
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

function findAndyCenter() {
	// since rotation is a translate, andyLocation x and y stay same until forward/backward movement occurs
	return {
		x: andyLocation.x + andy.width / 2,
		y: andyLocation.y + andy.height / 2,
	}
}

// Right now permitMovement allows rotation to go over edge. I can prevent that, but it might mean 
// that physical Andy operation will stop matching up with virtual, which is bad
// if the icon would start going over the edge, don't let it
function permitMovement(keyCode) { // hard-coding in canvas sizing
	var center = findAndyCenter();
	// var padding = andy.width * Math.sqrt(2) / 2;
	var padding = andy.width / 2;

	if (andyLocation.angle === 0) {
		if (keyCode === 87) {
			if (center.x < padding) {
				andyLocation.x -= step;
			}
		}
		else if (keyCode === 83) {
			if (center.x > 1024 - padding) {
				andyLocation.x += step;
			}
		}
	}
	else {
		// icon could be anywhere when rotation occurs, so checks are not keyCode dependent
		if ((center.x < padding) || (center.x > 1024 - padding) 
			|| (center.y < padding) || (center.y > 690 - padding)) {
			// however, changes to values are
			if (keyCode === 87) {
				andyLocation.x += (step * Math.cos(andyLocation.angle * Math.PI / 180));
				andyLocation.y += (step * Math.sin(andyLocation.angle * Math.PI / 180));
			}
			else if (keyCode === 83) {
			andyLocation.x -= (step * Math.cos(andyLocation.angle * Math.PI / 180));
			andyLocation.y -= (step * Math.sin(andyLocation.angle * Math.PI / 180));
			}
		}
	}
}


function moveAndy(keyCode) {
	// base case of no rotation (permits forward/backward [according to current icon direction])
	if (andyLocation.angle === 0) {
		if (keyCode === 87) {
			andyLocation.x += step;
		}
		else if (keyCode === 83) {
			andyLocation.x -= step;
		}
		permitMovement(keyCode)
		redrawCanvas();
	}
	else {
		if (keyCode === 87) {
			// Math trig functions use radians
			andyLocation.x -= (step * Math.cos(andyLocation.angle * Math.PI / 180));
			andyLocation.y -= (step * Math.sin(andyLocation.angle * Math.PI / 180));
		}
		else if (keyCode === 83) {
			andyLocation.x += (step * Math.cos(andyLocation.angle * Math.PI / 180));
			andyLocation.y += (step * Math.sin(andyLocation.angle * Math.PI / 180));
		}
		permitMovement(keyCode)
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
			andyLocation.angle -= turn; 
			andyLocation.angle %= 360;
			redrawCanvasWithRotation();
			// send server updated andyLocation data
			socket.emit('controllerMove', {x: andyLocation.x, y: andyLocation.y, angle: andyLocation.angle});
			break;
		case 68: // rotate clockwise (D)
			andyLocation.angle += turn;
			andyLocation.angle %= 360;
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
	// make a beep sound for controller
	document.getElementById('beep').load()
	document.getElementById('beep').play();
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