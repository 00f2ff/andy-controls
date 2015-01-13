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

// add circle function
addCircle = function(x, y) { 
	clear();clear(); // so janky
	var c = context;
	var r = 30;
	c.beginPath();
	c.arc(x, y, r, 0, 2 * Math.PI, true);
	c.closePath();
	c.fillStyle = 'rgba(255,0,0,0.2)'; // just a random opacity
	c.fill();
	c.lineWidth = 0;
	// snazzy dynamic hsla
	// c.strokeStyle = 'hsla(' + (hue = (hue + 1) % 360) + ',100%,50%,0.5)';
	c.stroke();
	

}

// start function
doOnTouchStart = function(e) {
	e.preventDefault();
	// find touch coordinates
	var newX = event.touches[0].clientX - canvasLeft;
	var newY = event.touches[0].clientY - canvasTop;
	addCircle(newX, newY);
	// send a message to the server that we created a circle (but only when screen is touched)
	socket.emit('draw', {'x': newX, 'y': newY});
}

// touch start handler
canvas.addEventListener('touchstart', doOnTouchStart);

// clear function
function clear() {
	context.fillStyle = 'rgba(255,255,255,0.2)'; // random opacity; might need to be more transparent
	context.rect(0,0, width, height);
	context.fill();
}

socket.on('send_circle', function(data) {
	// clear a couple of times and then draw a circle
	clear();clear(); // so janky
	addCircle(data.x, data.y);
})

	

