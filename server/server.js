var err = require('debug')('pong:server:error');
var warn = require('debug')('pong:server:warning');
var log = require('debug')('pong:server:log');

function server(io) {
    var debug = false;
    var timeOutDelay = 2500;
    var maxPlayers = 2;

    var theHost = {};

    var hostToGame = {};
    var clientToGame = {};
    var gameToPlayers = {};

    var clientPlayers = {};
    var clients = {};
    var hosts = {};
    var games = [];

    function in_array(search, array) {
        return array.indexOf(search) >= 0;
    }

    function makeGameId() {
        var r;
        do {
            r = (0|Math.random()*9e6).toString(36).substring(0,4);
        }
        while (in_array(r, games));
        games.push(r);
        return r;
    }

    function roomExists(room) {
        return io.of("/").adapter.rooms[room] != undefined;
    }

    function getSocket(socketId) {
        return io.sockets.sockets.get(socketId);
    }

    function getRoom(room) {
        return io.of("/").adapter.rooms[room];;
    }

    function socketsInRoom(room) {
        if (io == undefined) {
            err('io is undefined :\\');
        }

        if (io.of("/") == undefined) {
            err('/ namespace is undefined :\\');
        }

        if (io.of("/").adapter == undefined) {
            err('adapter is undefined :\\');
        }

        if (io.of("/").adapter.rooms == undefined) {
            err('rooms is undefined :\\');
        }
        var r = getRoom(room);
        if (typeof r === 'object') {
            return Object.keys(r);
        }
        else {
            return [];
        }
    }

    function sendError(number, msg, socket, room) {
        try {
            if (room != undefined) {
                socket = socket.to(room);
            }
            socket.emit('errorMsg', {num: number, msg: msg});
        }
        catch(ex) {
            err(ex);
        }
    }

    function startTimeOut(room, playerCounter, times) {
        if (playerCounter == undefined) {
            playerCounter = 0;
        }

        if (times == undefined) {
            times = 0;
        }

        console.debug("startTimeOut " + room + ", " + playerCounter + ", " + times);
        
        if (times > 3) {
            return;
        }
        else if (playerCounter >= 3) {
            startTimeOut(room, 0, ++times);
        }
        else {
            var players = socketsInRoom(room);
            var sid = players[playerCounter];
            console.debug("sid: "+ sid);
            //var sid = gameToPlayers.clients[playerCounter];
            var socket = io.sockets.connected[sid];
            //var socket = getSocket(sid);
            if (socket != undefined) {
                log('ticking... '+times+' '+ sid);
                socket.emit('timeOut', {times: times}, function (socketId) {
                    log('ticking back... '+times+' '+ socketId);
                    startTimeOut(room, ++playerCounter, times);
                });
            }
            else {
                err('socket not found :\\ '+sid);
            }
        }
    }

    io.on('connection', function(socket) {
        socket.on('error', function(data) {
            err('onError', data);
        });

        socket.on('host', function(data, ack) {
            var room = makeGameId();
            socket.join(room, function (err) {
                if (!err) {
                    hostToGame[socket.id] = room;
                    gameToPlayers[room] = { host : socket.id, clients : [] };
                    // clientPlayers[socket.id] = 0;
                    //clients[socket.id] = room;
                    //hosts[socket.id] = true;
                    ack(room);
                    console.debug(socket.id + " is hosting in room " + room);
                    log('host '+socket.id+' connected');
                }
                else {
                    err(err);
                    sendError(1, "host: can't join room", socket);
                }
            });
        });

        socket.on('join', function(data, ack) {
            var room = data;
            if (gameToPlayers.hasOwnProperty(room)) {
            //if (roomExists(room)) {
                /*var c = socketsInRoom(room).length;
                if (c < 1) {
                    sendError(4, "that room doesn't exists", socket);
                }
                else if (c >= maxPlayers) {*/
                if (gameToPlayers[room].clients.length >= maxPlayers) {
                    sendError(5, "the room is full!", socket);
                }
                else {
                    socket.join(room, function (err) {
                        if (!err) {
                            var players = gameToPlayers[room];
                            clientToGame[socket.id] = room;
                            players.clients.push(socket.id);
                            //clients[socket.id] = room;
                            //var players = socketsInRoom(room);
                            //clientPlayers[socket.id] = players.length - 2; // either 0 or 1
                            ack({ playersCount: players.clients.length});
                            console.debug(socket.id + " joined room " + room);
                            log('client ' + socket.id + ' connected to room ' + room + ' (' + players.length + '/'+maxPlayers+')');
                            io.to(room).emit('joined', { playersCount: players.clients.length });
                        }
                        else {
                            err(err);
                            sendError(3, "client: can't join room", socket);
                        }
                    });
                }
            }
            else {
                sendError(2, "that room doesn't exists", socket);
            }
        });

        socket.on('startCounting', function(socketId) {
            console.debug("start counting maybe");
            var room = hostToGame[socketId];
            var players = gameToPlayers[room].clients;
            if (players.length == maxPlayers) {
                setTimeout(function () {
                    startTimeOut(room);
                }, timeOutDelay);
            }
            else {
                sendError(7, "players are not reachable :\\", socket, room);
            }
        });

        socket.on('disconnect', function() {
            // if anyone disconnected, remove everyone

            var room = null;

            // if the host left
            if (hostToGame.hasOwnProperty(socket.id)) {
                room = hostToGame[socket.id];
                sendError(6, "Host left the game", socket, room);
            }
            // if a client left
            else if (clientToGame.hasOwnProperty(socket.id)) {
                room = clientToGame[socket.id];
                sendError(8, "A player left the game", socket, room);
            }
            
            // if the player that left was part of a room, remove everyone from that room and delete it
            // note: this is note working very well at the moment
            if (room != null) {
                // https://github.com/socketio/socket.io/issues/3042
                /*io.of('/').in(room).clients((error, socketIds) => {
                    if (error) throw error;
                    socketIds.forEach(socketId => io.of('/').adapter.remoteLeave(socketId, room));
                });*/
                socketsInRoom(room).forEach(function(socketId) {
                    var socket = io.sockets.sockets[socketId];
                    if (socket) {
                        socket.leave(room);
                    }
                });
                
                console.debug("Room " + room + " empty: " + roomExists(room));
                console.debug(socketsInRoom(room));
                var players = gameToPlayers[room];
                delete hostToGame[players.host];
                for (var client of players.clients) {
                    delete clientToGame[client];
                }
                delete gameToPlayers[room];

                if (games[room] != undefined) {
                    delete games[room];
                }
            }
            /*var p = clientPlayers[socket.id];
            clientPlayers[socket.id] = null;
            delete clientPlayers[socket.id];

            var room = clients[socket.id];
            clients[socket.id] = null;
            delete clients[socket.id];

            var players = socketsInRoom(room);

            if (room != null && players.length > 0) {
                io.to(room).emit('playerLeft', { playerLeft: p, playersCount: players.length });

                if (hosts[socket.id] && players.length > 1) {
                    hosts[socket.id] = false;
                    delete hosts[socket.id];

                    var newSocketId = players[Math.floor(Math.random()*players.length)];
                    hosts[newSocketId] = true;

                    //sendError(6, "host left the game", socket, room);
                    getSocket(newSocketId).emit('becomeHost');
                }
                else if (players.length == 1) {
                    sendError(8, "all the other players left the game!", socket, room);
                }
            }
            else {
                log('room ' + room + ' destroyed');
                if (games[room] != undefined) {
                    delete games[room];
                }
            }*/

        });

        socket.on('ping', function() {
            socket.emit('pong');
        });

        socket.on('gameUpdate', function(data) {
            var room = clientToGame[socket.id];
            var host = gameToPlayers[room].host;
            //var room = clients[data.socketId];
            delete data.socketId;
            io.to(host).emit('hostUpdate', data);
        });
        /*socket.on('gameScores', function(data) {
            var room = clients[data.socketId];
            delete data.socketId;
            io.to(room).emit('clientUpdateScores', data);
        });
        socket.on('gameBall', function(data) {
            var room = clients[data.socketId];
            delete data.socketId;
            io.to(room).emit('clientUpdateBall', data);
        });*/
    });
}

module.exports = server;