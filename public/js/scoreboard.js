var ScoreBoard = function(parentId) {
    this.board = document.getElementById(parentId);

    this.frames = ['positions', 'scoreboard'];

    this.currentFrame = 0;
    this.currentSide = null;
    this.currentTime = 0;

    this.setupDom();
    this.setupEvents();
    this.checkSelectedPlayers();

    this.poller     = this.polling();
    this.matchTimer = this.timer();
};

ScoreBoard.prototype.setupDom = function() {
    this.dom = {};
    this.dom.frames = {};
    this.dom.frames.positions  = this.board.querySelector('.positions');
    this.dom.frames.scoreboard = this.board.querySelector('.scoreboard');
    this.dom.playerList        = this.board.querySelector('.player-list');
    this.dom.playerAdd         = this.board.querySelectorAll('.player-add');
    this.dom.playerListItems   = this.dom.playerList.querySelectorAll('li');
    this.dom.sideList          = {};
    this.dom.sideList.home     = this.board.querySelector('.side-player-list-home');
    this.dom.sideList.visitors = this.board.querySelector('.side-player-list-visitors');
    this.dom.toScoreboard      = this.board.querySelector('.to-scoreboard');
    this.dom.pausePlay         = this.board.querySelector('.pause-play');
    this.dom.timer             = this.board.querySelector('.timer');

    this.dom.frames.positions.style.display = 'block';
};

ScoreBoard.prototype.setupEvents = function() {
    Array.prototype.forEach.call(this.dom.playerAdd, function(btn, index, array) {
        btn.addEventListener('click', function(e) {
            this.selectPlayerList(e.currentTarget.dataset.side);
        }.bind(this));
    }.bind(this));

    this.dom.toScoreboard.addEventListener('click', function() {
        this.nextFrame();
    }.bind(this));

    this.dom.pausePlay.addEventListener('click', this.pausePlayTimer.bind(this));

    Util.delegate('click', this.dom.playerList, 'li', this.selectPlayer.bind(this));
    Util.delegate('click', this.dom.sideList.home, 'span', this.removePlayer.bind(this));
    Util.delegate('click', this.dom.sideList.visitors, 'span', this.removePlayer.bind(this));
};

ScoreBoard.prototype.selectPlayerList = function(side) {
    Util.addClass(this.dom.playerList, 'selecting');
    this.currentSide = side;
};

ScoreBoard.prototype.selectPlayer = function(ele) {
    if (this.currentSide == null) {
        return;
    }

    Util.removeClass(this.dom.playerList, 'selecting');
    Util.addClass(ele, 'used');

    var row = document.createElement('li');
    var txt = document.createTextNode(ele.dataset.name);
    var remove = document.createElement('span');

    remove.innerHTML = 'X';
    row.dataset.id = ele.dataset.id;
    row.appendChild(txt)
    row.appendChild(remove);
    this.dom.sideList[this.currentSide].appendChild(row);

    this.currentSide = null;

    this.checkSelectedPlayers();
};

ScoreBoard.prototype.removePlayer = function(ele) {
    Util.removeClass(this.dom.playerList.querySelector('li[data-id="'+ ele.parentNode.dataset.id +'"]'), 'used');
    var li = ele.parentNode;
    li.parentNode.removeChild(li);
    this.checkSelectedPlayers();
};

ScoreBoard.prototype.showFrameplayers = function() {

}

ScoreBoard.prototype.showFramepositions = function() {

    document.querySelectorAll('.player-selector-'+ this.playerType).forEach(function(ele, index, array) {
        ele.style.display = 'block';
    });
}

ScoreBoard.prototype.showFramescoreboard = function() {

}

ScoreBoard.prototype.pausePlayTimer = function() {
    if (this.matchId == null) {
        var data = {
            tableName: 'main',
            home: [],
            visitors: []
        };

        var players = this.checkSelectedPlayers();

        Array.prototype.forEach.call(players.home, function(player) {
            data.home.push(player.dataset.id);
        });

        Array.prototype.forEach.call(players.visitors, function(player) {
            data.visitors.push(player.dataset.id);
        });

        superagent
          .post('/start')
          .send(data)
          .set('Accept', 'application/json')
          .end(function(err, res) {
              this.matchId = res.body.id;
          }.bind(this));
    }

    if (this.matchTimer.running) {
        this.matchTimer.pause();
    } else {
        this.matchTimer.resume();
    }
}

ScoreBoard.prototype.checkSelectedPlayers = function() {
    var h = this.dom.sideList.home.querySelectorAll('li');
    var v = this.dom.sideList.visitors.querySelectorAll('li');

    if (h.length > 0 && v.length > 0) {
        this.dom.toScoreboard.style.display = 'block';
    } else {
        this.dom.toScoreboard.style.display = 'none';
    }

    return {home: h, visitors: v};
};

ScoreBoard.prototype.showFrame = function(frame) {
    if (this['showFrame'+ frame] !== undefined) {
        this['showFrame'+ frame]();
    }
};

ScoreBoard.prototype.nextFrame = function() {
    this.dom.frames[this.frames[this.currentFrame]].style.display = 'none';
    this.currentFrame++;
    this.showFrame(this.frames[this.currentFrame]);
    this.dom.frames[this.frames[this.currentFrame]].style.display = 'block';
}

ScoreBoard.prototype.prevFrame = function() {
    this.dom.frames[this.frames[this.currentFrame]].style.display = 'none';
    this.currentFrame--;
    this.showFrame(this.frames[this.currentFrame]);
    this.dom.frames[this.frames[this.currentFrame]].style.display = 'block';
}

ScoreBoard.prototype.polling = function() {
    var polling;

    var obj = {};

    obj.resume = function() {
        polling = setInterval(obj.step, 1000);
    };

    obj.pause = function() {
        clearInterval(polling);
    };

    obj.step = function() {
        superagent
          .get('/check/'+ this.matchId)
          .end(function(err, res) {
              console.log(res);
          });
    }.bind(this);

    return obj;
};

ScoreBoard.prototype.timer = function() {
    var theTime = 0;
    var timer;
    var ms = 1000;
    var display = this.dom.timer;
    var poller = this.poller;

    var obj = {};

    obj.running = false;

    obj.resume = function() {
        timer = setInterval(obj.step, 100);
        obj.running = true;
        poller.resume();
    };

    obj.pause = function() {
        clearInterval(timer);
        obj.running = false;
        poller.pause();
    };

    obj.step = function() {
        var now = Math.max(0, theTime += 250);
        var m   = Math.floor(now / 60000);
            m   = (m < 10 ? "0" : "") + m;
        var s   = Math.floor(now / 1000) % 60;
            s   = (s < 10 ? "0" : "") + s;

        display.innerHTML = m +":"+ s;

        return now;
    };

    return obj;
}