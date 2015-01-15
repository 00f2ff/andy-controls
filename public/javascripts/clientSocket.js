var socket = io.connect(':8000/');


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
andy.src = 'andy_75.png';

// xy coordinates of andy icon
var andyLocation = {x: 500, y: 500, angle: 0}

// global circle coordinates for icon movement (default initial values; circle drawing doesn't occur if negative)
var circleLocation = {x: -1, y: -1}

// add andy to context
andy.onload = function() {
	context.drawImage(andy, andyLocation.x, andyLocation.y);
}

drawAndy = function() { // if i don't repeat it, nothing shows up initially
	context.drawImage(andy, andyLocation.x, andyLocation.y);
}

// add circle function
addCircle = function(x, y) { 
	
	// context.clearRect (0, 0, canvas.width, canvas.height);
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
	if (andyLocation.angle === 0) {
		redrawCanvas();
	}
	else {
		redrawCanvasWithRotation();
	}
	// send a message to the server that we created a circle (but only when screen is touched)
	socket.emit('userTap', {x: circleLocation.x, y: circleLocation.y});
}

// touch start listener
canvas.addEventListener('touchstart', doOnTouchStart);

redrawCanvas = function() {
	context.clearRect (0, 0, canvas.width, canvas.height);
	if (circleLocation.x >= 0 && circleLocation.y >= 0) {
		addCircle(circleLocation.x, circleLocation.y);
	}
	// andy can move regardless of whether touch event is registered
	drawAndy();
}

rotateAndy = function(theta) {
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

redrawCanvasWithRotation = function() { // rotation is relative to current position, so I don't need to save a variable
	context.clearRect (0, 0, canvas.width, canvas.height);
	rotateAndy(andyLocation.angle);
	if (circleLocation.x >= 0 && circleLocation.y >= 0) {
		addCircle(circleLocation.x, circleLocation.y);
	}
}

moveAndy = function(keyCode) { // right now I'm moving with by a default of 5px
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

socket.on('send_circle', function(data) {
	// set circleLocation to passed in data
	circleLocation.x = data.x;
	circleLocation.y = data.y;
	// draw in andy and circle
	if (andyLocation.angle === 0) {
		redrawCanvas();
	}
	else {
		redrawCanvasWithRotation();
	}
	// context.clearRect (0, 0, canvas.width, canvas.height);
	// addCircle(data.x, data.y);
	// // initiate Andy icon movement
	// executeMove(data.x, data.y);
});

socket.on('send_move', function(data) {
	// set andyLocation to passed in data
	andyLocation.x = data.x;
	andyLocation.y = data.y;
	andyLocation.angle = data.angle;
	// draw in andy and circle
	if (andyLocation.angle === 0) {
		redrawCanvas();
	}
	else {
		redrawCanvasWithRotation();
	}
});


