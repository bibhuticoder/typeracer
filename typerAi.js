var util = require('./util');

function TyperAi(username, wpm, callback){    
    this.roomname = 'random';
    this.username = username;
    this.wpm = wpm;    
    this.timer;
    this.avatar = '/images/avatar'+util.generateRandom(1,6)  +'.png';
    
    callback(this);  
}

TyperAi.prototype.start = function (callback) {    
   setTimeout(function() {
        callback(this);      
   }, 3000);     
}

module.exports = TyperAi;

module.exports.progressUnit = (sentance, wpm) => {
    var totalTime = (60/wpm)*(sentance.split(' ').length);
    console.log("Total time : " + totalTime);
    progressUnit = Math.floor(100/totalTime);

    return progressUnit;
}