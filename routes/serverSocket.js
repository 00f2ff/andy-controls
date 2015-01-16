
exports.init = function(io) {

	// connection
	io.sockets.on('connection', function(socket) {

		// listen for data request on connect
		socket.on('data_check', function(data) {
			socket.broadcast.emit('request_data', {});
		});

		// listen for data sent from another user
		socket.on('send_data', function(data) {
			socket.broadcast.emit('update_data', {andyLocation: data.andyLocation, circleLocation: data.circleLocation});
		})

		// listen for touch event and broadcast those coordinates
		socket.on('userTap', function(data) {
			socket.broadcast.emit('send_circle', {x: data.x, y: data.y});
		});

		// listen for move event and broadcast that user's andy information (handles rotate as well)
		socket.on('controllerMove', function(data) {
			socket.broadcast.emit('send_move', {x: data.x, y: data.y, angle: data.angle});
		});


	})
}