var socket = io();
var users = {};
var sentence;
var progress = 0;
var me;
var avatar;
var position;
var myRoom;
var myType;
var wpm;
var raceStarted = false;
var timeElapsed = 0;
var timeout;
var startTime = 3; // in seconds
var timer;
var messageBoardText;
var profilePic;

$("#input").keyup(function (e) {

    if (raceStarted) {

        var myText = $("#input").val();
        var mark = -1;
        var correct = 0;
        var colorSentence = "";

        //mark the wrong position
        for (var i = 0; i < myText.length; i++) {
            if (myText[i] !== sentence[i]) {
                mark = i;
                break;
            } else correct = i;
        }

        colorSentence = highlightCurrentWord(correct, sentence);

        //if mistake found
        if (mark !== -1) $("#input").css("background-color", "salmon");

        else $("#input").css("background-color", "white");

        $("#text").html(colorSentence);

        console.log(correct + " :: " + sentence.length);

        progress = ((correct+1) / sentence.length) * 100; // +1 : zero-based index
        if (progress > 99) progress = 100;

        wpm = getWpm(correct); // words per minute

        //users[me].progress = progress;
        //updateProgress(me, progress, wpm, position);

        socket.emit('progress', {
            username: me,
            progress: progress,
            wpm: wpm,
            position: 'calculating..'
        });

        if (myText === sentence) {
            raceStarted = false;
            endRace("Race Finished !", "You took " + timeElapsed + " secs to complete the race.");
            $("#input").attr("disabled", "disabled");
            socket.emit('finished');
            console.log('I finished');
        }

    }
});

socket.on('progress', function (data) {
     console.log(data);
    users[data.username].progress = data.progress;
    updateProgress(data.username, data.progress, data.wpm, data.position);
   
});

socket.on('hello from AI', function () {    
    console.log("Hello from ai");
});

function init() {
    me = $("#username").text();
    myRoom = $("#roomname").text();
    myType = $("#userType").text();
    sentence = $("#sentence").text();
    avatar = $("#avatar").text();
    timeout = sentence.split(' ').length * 2; //2 seconds per word

    $("#message").fadeOut(1);
    $("#input").attr("disabled", "disabled");

    setText();
    setLayout();

    if ($("#userType").text() === 'admin') $("#btnStart").show();
    else $("#btnStart").hide();

    socket.emit('ready', {
        username: $("#username").text(),
        roomname: $("#roomname").text(),
        avatar: avatar
    });

}

init();

socket.on('readyConfirm', function (data) {
    users = data.users;
    addUsers();
    console.log(users);
});

socket.on('newcomer', function (data) {
    users[data.username] = data;
    console.log(users);
    console.log(data.username + ' arrived');
    if (!raceStarted) addUsers();
});

socket.on('raceFinished', function (data) {
    endRace("Race Finished !", "You took " + timeElapsed + " secs to complete the race.");
});

function beginRace(sentence) {
    //begin the race
    $("#message").html('Race starting in <br> <span class="wpm"> ' + startTime + ' Seconds </span>');
    $("#message").fadeIn(500);
    $("#text").text(sentence);
    $("#input").val("");
    showCountdown();
};

function endRace(title, msg) {
    $("#message").html("<span class='wpm'>" + title + "</span><br>" + msg);
    $("#message").fadeIn(500);
    $("#input").attr("disabled", "disabled");
    if (myType === 'admin') $("#btnStart").show();
};

function updateProgress(username, progress, wpm, position) {
    $("div[data-name=" + username + "] div.object-info").css("left", progress + "%");
    var score = '<span class="wpm">' + wpm + " wpm" + "</span><br>" + position + " (" + Math.round(progress) + " %)";
    $("div[data-name=" + username + "] div.object-score").html(score);
}

function addUsers() {
    var html = "";
    for (var name in users) {
        var user = users[name];
        var n, picClass;
        if (name === me) {
            n = "<span class='wpm' style='margin-left: 7px'>You</span>";
            picClass = 'object-pic object-pic-mine';
        } else {
            n = user.username;
            picClass = 'object-pic';
        }

        html += '<div class="court"><div class="court-line" data-name="' + name + '"> <div class="object-info"> <div class="object-name">' + n + '</div> <img src="' + user.avatar + '" class="' + picClass + '"/> </div><div class="object-score"><span class="wpm">' + user.wpm + ' wpm</span><br>' + user.position + '</div></div></div>';
    }
    $("#courts").html(html);
}

function setText() {
    $("#text").html(sentence);
}

function highlightCurrentWord(index, str) {

    var pre = 0,
        post = 0,
        newString = "";

    if (str[index] === ' ') {

        //pre
        pre = index + 1;

        //post
        for (var i = index + 1; i < str.length; i++) {
            if (str[i] == ' ' || i == str.length - 1) {
                post = i;
                break;
            }
        }
    } else {
        //pre
        for (var i = index; i >= 0; i--) {
            if (str[i] == ' ') {
                pre = i + 1;
                break;
            }
        }

        //post
        for (var i = index; i < str.length; i++) {
            if (str[i] === ' ' || i === str.length - 1) {
                post = i;
                break;
            }
        }
    }

    //add initial
    for (var i = 0; i < pre; i++) {
        newString += str[i];
    }

    //current word
    newString += "<span class='current-word'>";
    for (var i = pre; i < post; i++) {
        newString += str[i];
    }
    newString += "</span>";

    // remaining
    for (var i = post; i < str.length; i++) {
        newString += str[i];
    }

    if(index === str.length-1) return str;
    return newString;
}

$(window).resize(function (e) {
    setLayout();
});

function setLayout() {
    var left = window.innerWidth - parseInt($("#side-bar").css("width"));
    $("#side-bar").css("left", left);
}

function startTimer() {
    timer = setInterval(function () {
        timeElapsed++;

        $("#race-timer").text(timeout - timeElapsed + " seconds");

        if (timeElapsed === timeout) {
            if (raceStarted) endRace('Timeout !', 'You coundn\'t fininsh in time ');    
            raceStarted = false;
            if(myType === 'admin') $("#btnStart").show();
            clearInterval(timer);
            $("#race-timer").text("Time up");  
        }
    }, 1000);
}

function getWpm(c) {
    return Math.round(((c / 5) / 1 * (timeElapsed / 60)));
}

$("#btnStart").click(function () {
    socket.emit('beginRace');
    $("#btnStart").hide();
    $("#input").val("");    
});

function showCountdown() {
    var count = 0;
    var t = setInterval(function () {
        count++;
        if (count === startTime) {
            clearInterval(t);
            $("#message").fadeOut(500);
            $("#input").removeAttr("disabled");
            raceStarted = true;
            startTimer();
            count = 0;
        }
        messageBoardText = 'Race starting in <br> <span class="wpm"> ' + (startTime - count) + ' Seconds </span>';
        $("#message").html(messageBoardText);
        console.log(count);
    }, 1000);
}

socket.on('beginRace', function (data) {
    sentence = data.sentence;    
    beginRace(sentence);
    addUsers();

    timeElapsed = 0;
    timeout = sentence.split(' ').length * 2; //2 seconds per word
    console.log("Begin");
})

// $('#input').bind("cut copy paste",function(e) {
//      e.preventDefault();
// });