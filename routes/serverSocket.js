
exports.init = function(io) {

	// connection
	io.sockets.on('connection', function(socket) {

		// listen for touch event and broadcast those coordinates
		socket.on('draw', function(data) {
			socket.broadcast.emit('send_circle', {'x': data.x, 'y': data.y});
		});

	})
}