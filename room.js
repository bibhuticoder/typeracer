function Room(name) {
    this.name = name;
    this.users = {};
    this.usersLength = 0;
    this.sentence = "";
    rooms[name] = this;
}

Room.prototype.addUser = function (user, avatar) {
    this.users[user] = {
        username: user,
        progress: 0,
        wpm: 0,
        position: 0,
        avatar: avatar
    };
    this.usersLength++;
}

var rooms = {};

function checkRoom(roomname) {
    return (rooms[roomname] !== undefined);
}

function getRoom(roomname) {
    if (checkRoom(roomname))
        return rooms[roomname];
    else console.log('Room not found');
}

function getUsers(roomname) {
    if (checkRoom(roomname))
        return rooms[roomname].users;
}

Room.prototype.removeUser = function (username) {
    delete this.users[username];
    this.usersLength--;

    if (this.usersLength <= 0) delete rooms[this.name];
}

Room.prototype.setSentence = function (sentence) {
    this.sentence = sentence;
}

Room.prototype.getSentence = function (sentence) {
    return this.sentence;
}

Room.prototype.givePosition = function givePosition(username) {
    var temp;
    var array = [];
    var positions = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

    //change object to array
    for (var u in this.users) {
        array.push(this.users[u]);
    }

    //single player
    if (array.length === 1) return '1st';

    //sort array
    for (var i = 0; i < array.length; i++) {
        for (var j = i; j < array.length; j++) {
            if (array[i].progress <= array[j].progress) {
                temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
        }
    }

    //console.log(array);

    //return its position
    for (var i = 0; i < array.length - 1; i++) {
        if (array[i].username === username) {
            console.log(positions[i]);
            return positions[i];
        }
    }

    return 'error';

}

Room.prototype.setProgress = function (username, progress, wpm, position) {
    var user = this.users[username];
    user.progress = progress;
    user.wpm = wpm;
    user.position = position;
}

Room.prototype.resetUsers = function () {
    for (var u in this.users) {
        var user = this.users[u];
        user.progress = 0;
        user.position = 0;
        user.wpm = 0;
    }
}

Room.prototype.checkFinished = function () {
    var finished = true;
    console.log(this.users);
    for (var u in this.users) {
        var user = this.users[u];
        console.log(user.progress);
        if (user.progress !== 100) {
            finished = false;
            break;
        }
    }
    return finished;
}

module.exports.checkRoom = checkRoom;
module.exports.getRoom = getRoom;
module.exports.getUsers = getUsers;
module.exports.Room = Room;
module.exports.rooms = rooms;