
exports.init = function(io) {

	// connection
	io.sockets.on('connection', function(socket) {

		// listen for touch event and broadcast those coordinates
		socket.on('userTap', function(data) {
			socket.broadcast.emit('send_circle', {x: data.x, y: data.y});
		});

		// listen for move event and broadcast that user's andy information
		socket.on('controllerMove', function(data) {
			socket.broadcast.emit('send_move', {x: data.x, y: data.y, angle: data.angle});
		});

		// listen for rotate event and broadcast that user's andy information (client executes response in same way as move)
		socket.on('controllerRotate', function(data) {
			socket.broadcast.emit('send_move', {x: data.x, y: data.y, angle: data.angle});
		});

	})
}