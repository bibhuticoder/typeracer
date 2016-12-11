var app = require('express')();
var http = require('http').Server(app);
var bodyParser = require('body-parser'); // for reading POSTed form data into `req.body`
var io = require('socket.io')(http);
var path = require('path');
var room = require('./room');
var sentence = require('./sentence');
var util = require('./util');
var ai = require('./typerAi');

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(require('express').static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.post('/auth', function (req, res) {

  var roomname = req.body.roomname;
  var username = req.body.username;

  var response = {
    type: 'success',
    msg: ''
  };

  if (roomname.length <= 2 || username.length <= 2)
    response = {
      type: 'error',
      msg: 'Input fields empty.'
    }

  // if (roomname === 'random')
  // response = {
  //   type: 'error',
  //   msg: 'Reserved room name.'
  // }

  //username length
  if (username.length > 8)
    response = {
      type: 'error',
      msg: 'Username must be less than 8 characters long.'
    }

  //room name existance
  if (room.checkRoom(roomname)) {
    if (room.getRoom(roomname).users[username])
      response = {
        type: 'error',
        msg: 'Username already exists.'
      }

    if (room.getRoom(roomname).usersLength >= 10)
      response = {
        type: 'error',
        msg: 'Room packed. Already 10 members there.'
      }
  }

  res.send(response);

});

app.get('/', function (req, res) {
  res.render('login');
});

app.post('/play', function (req, res) {

  var roomname = req.body.roomname;
  var username = req.body.username;
  var avatar = req.body.avatar;

  var type;
  var sent = sentence.giveRandomSentence();

  if (room.checkRoom(roomname)) {
    //proceed
    room.getRoom(roomname).addUser(username, avatar);
    type = "player";
  } else {
    //create room and proceed
    var r = new room.Room(roomname);
    r.setSentence(sent);
    r.addUser(username, avatar);
    type = "admin";
  }

  res.render('index', {
    username: username,
    roomname: roomname,
    sentence: sent,
    type: type,
    avatar: avatar
  });
});

app.post('/random', function (req, res) {
  //
  var username = req.body.username;
  var avatar = req.body.avatar;
  var sent = sentence.giveRandomSentence();
  var r = new room.Room('random');
  r.setSentence(sent);
  r.addUser(username, avatar);
  type = "admin";

  res.render('index', {
    username: username,
    roomname: 'random',
    sentence: sent,
    type: type,
    avatar: avatar
  });

});

io.on('connection', function (socket) {

  var racerAis = [];

  console.log(socket.id);
  socket.on('ready', function (data) {

    //set username and roomname
    socket.username = data.username;
    socket.roomname = data.roomname;
    socket.join(data.roomname);

    //for AI
    if (socket.roomname === 'random') {
      console.log('random rooom');
      var names = ['Ram', 'Harry', 'Albert', 'singh', 'bucky', 'roberts', 'Peter', 'jason', 'historic'];
      var num = 5;
      for (var i = 0; i < num; i++) {
        var randIndex = i; //random
        var name = names[randIndex];
        var wpm = util.generateRandom(50, 100); //random

        racerAis.push(new ai(name, wpm, function (self) {
          room.getRoom('random').addUser(self.username, self.avatar);
          //notify other members of the room about new user
          io.sockets.to(socket.id).emit('newcomer', {
            username: self.username,
            progress: 0,
            wpm: 0,
            position: 0,
            avatar: self.avatar
          });
          io.sockets.to(socket.id).emit('hello from AI');
        }));
      };
    }

    console.log(socket.username + " at " + socket.roomname);

    //send users list to newcomer
    socket.emit('readyConfirm', {
      users: room.getUsers(socket.roomname),
    });

    //notify other members of the room about new user
    socket.broadcast.to(socket.roomname).emit('newcomer', {
      username: socket.username,
      progress: 0,
      wpm: 0,
      position: 0,
      avatar: data.avatar
    });

  });

  socket.on('progress', function (data) {
    data['position'] = room.getRoom(socket.roomname).givePosition(socket.username);
    room.getRoom(socket.roomname).setProgress(socket.username, data.progress, data.wpm, data.position);
    io.sockets.in(socket.roomname).emit('progress', data);
  });

  socket.on('beginRace', function () {
    //set progress of all users to 0
    room.getRoom(socket.roomname).resetUsers();

    io.sockets.in(socket.roomname).emit('beginRace', {
      sentence: sentence.giveRandomSentence()
    });


    //for AI
    if (socket.roomname === 'random') {
      room.getRoom('random').resetUsers();
      for (var i = 0; i < racerAis.length; i++) {
        (function () {
          //
          var racerAi = racerAis[i];

          racerAi.start(function (self) {
            console.log('started for racer ' + i);
            var progress = 0;
            var unit = ai.progressUnit(room.getRoom('random').getSentence(), racerAi.wpm);
            this.timer = setInterval(function () {
              if (progress <= 100) {
                progress += unit;

                if (progress >= 100) {
                  progress = 100;
                  clearInterval(this.timer);
                  if (room.getRoom('random').checkFinished()) {
                    io.sockets.to(socket.id).emit('raceFinished');
                    room.getRoom('random').resetUsers();
                    progress =  0;
                  }
                }

                io.sockets.to(socket.id).emit('progress', {
                  username: racerAi.username,
                  progress: progress,
                  wpm: racerAi.wpm,
                  position: 0
                });

              }

              console.log('---- ' + progress);
              room.getRoom('random').setProgress(racerAi.username, progress, racerAi.wpm, 0);
            }, 1000);
          });
        })();
      }
    }

  });

  socket.on('finished', function (data) {
    var finishedUser = socket.username;
    var roomname = socket.roomname;

    console.log(finishedUser + " finished");

    if (room.getRoom(roomname).checkFinished()) {
      io.sockets.in(socket.roomname).emit('raceFinished');
      console.log("All finifshed");
    }
  });

  socket.on('disconnect', function () {
    console.log(socket.username + " left " + socket.roomname);
    //room.getRoom(socket.roomname).removeUser(socket.username);
  });

});

io.on('disconnect', function (socket) {
  console.log(socket.username + ' disconnected');
});

var port = process.env.PORT || 3000;
http.listen(port, function () {
  console.log('App listening on port 3000!')
});