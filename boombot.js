/*
Copyright (C) 2012 Michael Belardo (http://GPlus.to/TerrorDactylDesigns)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


global.fs = require('fs');                          //allows file reading for scripts/config/etc
global.Bot;                                         //for storing the ttapi
global.bot;                                         //for accessing the ttapi
global.config;                                      //for storing the configuration settings
global.http = require('http');                      //importing http for API calls
global.DJMode = false;                              //DJMode marker for determining if bot should step down during auto DJ saving
global.shutUp = false;                              //variable to make the bot not speak
global.snagCounter = 0;                             //variable to hold song snag count for stats
var args = process.argv;
var theUsersList = {};                              //user list object to hold DJ information
var botNameRegEx;                                   //variable to hold the bots name as RegExp for admin commands
var djQueue = [];                                   //queue array
var queue = false;                                  //queue switch
var yank = false;                                   //variable for pulling dj from stage after play counts
var queueLength = 3;                                //queue song length initializer
global.autoNod = false;                             //variable to control autonod
global.blackList = [];                              //array of blacklisted jerks
var nextUp = {};                                    //object for the dj we are waiting on
var version = "V1.4.8"

//modify the base array object to check if arrays contain a value
Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] == obj) {
            return true;
        }
    }
    return false;
}
//timer for queue control
function runQueue(currDjs) {
  if (djQueue.length > 0 && currDjs.length < 5) {
    // store the users name and id to stop the recursion insanity i had going on
    var nextUp = {"name" : theUsersList[djQueue[0]].name, "id" : djQueue[0]};
    bot.speak('@' + nextUp.name + ' you have 30 seconds starting now to step up');
    setTimeout(function(){
      // after 30 seconds if that user isnt on stage drop them from queue, hear the lamentation of their women, and run again.
      if (djQueue.length > 0 && djQueue[0] == nextUp.id) {
        djQueue.splice(0,1);
        runQueue(currDjs);
      }
    }, 30 * 1000);
  }
}
//remove the user from the queue
function RemoveFromQueue(userID, userName) {
  var DJIndex = djQueue.indexOf(userID);
  if (DJIndex != -1) {
    djQueue.splice(DJIndex, 1);
    bot.speak('fine ' + userName + " don't join our party....");
  } else {
    bot.speak("You're not in the queue.... type q+ to add yourself.");
  }
}

//arrays for commands
//boo array
var booList = ['Boo this man! BOOOOOOOOOO!', 'This song sucks!', 'Who picked this song? Cause its terrible'];
//cheer array
var cheerList = ['I <3 this song!!', 'GET GET GETTTTTTTIN IT!!', 'This is the best DJ EVER!'];
//like a boss array
var bossList = ["http://s3.amazonaws.com/kym-assets/photos/images/original/000/114/151/14185212UtNF3Va6.gif?1302832919",
  "http://s3.amazonaws.com/kym-assets/photos/images/newsfeed/000/110/885/boss.jpg",
  "http://verydemotivational.files.wordpress.com/2011/06/demotivational-posters-like-a-boss.jpg",
  "http://assets.head-fi.org/b/b3/b3ba6b88_funny-facebook-fails-like-a-boss3.jpg",
  "http://img.anongallery.org/img/6/0/like-a-boss.jpg",
  "http://www.18seven.com/wp-content/uploads/IMG_1745.jpg",
  "http://www.demotivers.com/uploads/2011_02/02/7733_1292_500_Like-A-Boss.jpg",
  "http://images.cheezburger.com/completestore/2011/2/20/a4ea536d-4b21-4517-b498-a3491437d224.jpg",
  "http://funcorner.eu/wp-content/uploads/2011/03/like_a_boss.jpg",
  "http://www.japemonster.com/wp-content/uploads/2011/08/demotivational-posters-like-a-boss.jpg"];
//haters array
var hatersList = [
   "http://www.hatersgoingtohate.com/wp-content/uploads/2010/06/haters-gonna-hate-rubberband-ball.jpg"
, "http://www.hatersgoingtohate.com/wp-content/uploads/2010/06/haters-gonna-hate-cat.jpg"
, "http://jesad.com/img/life/haters-gonna-hate/haters-gonna-hate01.jpg"
, "http://i671.photobucket.com/albums/vv78/Sinsei55/HatersGonnaHatePanda.jpg"
, "http://24.media.tumblr.com/tumblr_lltwmdVpoL1qekprfo1_500.gif"
, "http://s3.amazonaws.com/kym-assets/photos/images/newsfeed/000/087/536/1292102239519.gif"
, "http://i391.photobucket.com/albums/oo351/PikaPow3/squirtle.gif"
, "http://c.static.memegenerator.net/cache/instances/500x/13/13355/13676320.jpg"
, "http://icanhasinternets.com/wp-content/uploads/2010/05/haters.gif"
, "http://icanhasinternets.com/wp-content/uploads/2010/05/haters5.jpg"
];
//meow array
var meowList = [
    "Do I look like a cat to you, boy? Am I jumpin' around all nimbly bimbly from tree to tree?",
    "Meow. What is so damn funny?",
    "http://nbacats.files.wordpress.com/2012/02/alright-meow-super-troopers-demotiv.jpg",
    "All right meow. Hand over your license and registration.",
    "All right meow, where were we? ",
    "Excuse me, are you saying meow?",
    "Meow, I'm gonna have to give you a ticket on this one. No buts meow. It's the law.",
    "Not so funny meow, is it?",
    "http://www.protias.com/Pictures/Super%20Troopers/meow.jpg",
    "http://sphotos.ak.fbcdn.net/hphotos-ak-snc3/hs195.snc3/20275_304481852744_293714027744_3524059_4812190_n.jpg"
];
//magic 8ball array
var eightBallList = [
  "It is certain",
  "It is decidedly so",
  "Without a doubt",
  "Yes – definitely",
  "You may rely on it",
  "As I see it, yes",
  "Most likely",
  "Outlook good",
  "Yes",
  "Signs point to yes",
  "Reply hazy, try again",
  "Ask again later",
  "Better not tell you now",
  "Cannot predict now",
  "Concentrate and ask again",
  "Don't count on it",
  "My reply is no",
  "My sources say no",
  "Outlook not so good",
  "Very doubtful"
]

//parse config and launch bot
LoadConfigAndStart();

function LoadConfigAndStart() {
  //import the ttapi
    try {
        Bot = require('ttapi');
    } catch(err) {
        console.log(err);
        console.log("[ ERROR ] : ttapi failed to initialize. Please ensure you have installed ttapi.");
        process.exit(33);
    }
  //Creates the config object by parsing the JSON document and storing each key
    try {
        if (args[2] == '-c' && args[3] != null) {
            config = JSON.parse(fs.readFileSync(args[3], 'ascii'));
        } else {
            config = JSON.parse(fs.readFileSync('config.json', 'ascii'));
        }
    } catch(err) {
        console.log(err);
        console.log('[ ERROR ] : Error loading config.json. Check that your config file exists and is valid JSON.');
        process.exit(33);
    }
    //initialize the bot within ttapi using the values from the config file
    bot = new Bot(config.botinfo.auth, config.botinfo.userid, config.roomid);
    //build the RegExp for admin control
    botNameRegEx = new RegExp(config.botinfo.botname, 'i');
}

//handle the APIs events
bot.on('roomChanged', function(data) {
  //log to the console
  if (config.consolelog) {
    console.log('[ ENTRANCE EVENT ] : ' + data.room.name);
  }
  // Reset the users list object
  theUsersList = { };
  //add users to the users list object
  var users = data.users;
  for (var i=0; i<users.length; i++) {
    var user = users[i];
    user.plays = 0;
    theUsersList[user.userid] = user;
    if (config.consolelog) {
      console.log('[ EVENT ] : added ' + user.name + ' to theUsersList');
    }
  }
});

bot.on('registered',  function (data) {
  //log event to console
  if (config.consolelog) {
    console.log("[ REGISTER EVENT ] : " + data.user[0].name);
  }
  //add user to the users list object
  var user = data.user[0];
  user.plays = 0;
  theUsersList[user.userid] = user;
  if (config.consolelog) {
    console.log('[ EVENT ] : added ' + user.name + ' to theUsersList');
  }
  //check the blacklist for the dj
  if (blackList.contains(data.user[0].userid)) {
    bot.bootUser(data.user[0].userid, "Guess you didn't understand what the term blacklist meant......");
  } else {
    //chat announcer
    if (shutUp == false) {
      if (data.user[0].userid == config.botinfo.userid) { //boombot announces himself
        bot.speak(config.responses.botwelcome)
      } else if (data.user[0].userid == config.admin.userid) { //if the master arrives announce him specifically
        bot.speak(config.responses.adminwelcome.replace('XXXX', data.user[0].name));
      } else {
        //check to see if the user is a mod, if not PM them
        bot.roomInfo(true, function(data2) {
          var modArray = data2.room.metadata.moderator_id;
          if (modArray.contains(data.user[0].userid)) { //user is a room mod
            bot.speak(config.responses.modwelcome.replace('XXXX', data.user[0].name));
          } else {
            bot.pm(config.responses.welcomepm, data.user[0].userid, function(data) { }); //PM the user
            bot.speak(config.responses.welcome.replace('XXXX', data.user[0].name)); //welcome the rest
          }
        });
      }
    }
  }
});

bot.on('deregistered', function (data) {
  //remove the person from the user list
  var user = data.user[0];
  delete theUsersList[user.userid];
  if (djQueue.contains(data.user[0].userid)) {
    RemoveFromQueue(data.user[0].userid, data.user[0].name);
  }
});

bot.on('update_votes', function (data) {
  //log to the console
  if (config.consolelog) {
    console.log("[ VOTE EVENT ] : " + data);
  }

  // downvote announcer for calling people out //requires the user list object from above //this is hit or miss lately some users return an empty object. I will work more on it when I have time.
    if (data.room.metadata.votelog[0].toString().match(/down/i)) {
      try {
        var uncut = data.room.metadata.votelog[0].toString();
        var chopped = uncut.substring(0, uncut.indexOf(','));
        var jerk = theUsersList[chopped].name
        bot.speak(jerk + ' thinks your song sucks..');
      } catch (err) {
        //initial downvotes go by without a user ID to trap. Also if you have never upvoted your downvotes go by with no ID.
        bot.speak("Ouch. Someone thinks you're lame.....")
      }
    }
});

bot.on('newsong', function (data){
  //on song start we will reset the snagCounter
  snagCounter = 0;
  //auto bop
    if (autoNod) {
      setTimeout(function(){
        bot.bop();
      }, 10 * 1000);
    }
  /*
    if the queue is on and the array has more than 0:
    remove any dj that is not the first in array,
    after 30 seconds remove them from the array - announce next if there
  */
  theUsersList[data.room.metadata.current_dj].plays += 1;
  if (queue) {
    //  get the array of current DJs
    var currDjs = data.room.metadata.djs;
    //  find the next DJ allowed up
    runQueue(currDjs);
  }
});

bot.on('snagged', function (data) {
  //increment the snag counter when a song is snagged
    snagCounter++;
});

bot.on('endsong', function (data) {
  //on song end we will announce the votes for the last song
  if (shutUp == false) {
    bot.speak(data.room.metadata.current_song.metadata.song + " by " + data.room.metadata.current_song.metadata.artist + " got :+1: " + data.room.metadata.upvotes + " :-1: " +  data.room.metadata.downvotes + " <3 " + snagCounter);
  }
  if (queue) {
    var djToRem = data.room.metadata.current_dj;
    if (theUsersList[djToRem].plays >= queueLength) {
      bot.remDj(djToRem);
    }
  }
});

bot.on('booted_user', function (data){
  //booted from the room sh** talk.
  bot.speak('YEAH, GET THAT DJ OUTTTTTTTTTAAAA HEEERRRREEEEEEE!');
});

bot.on('add_dj', function (data) {
  if (shutUp == false) {
    if (data.user[0].userid == config.botinfo.userid) { //the bot will announce he is DJing
      bot.speak('Aural destruction mode activated.');
    } else if (data.user[0].userid == config.admin.userid) { //the bot will announce you specially
      bot.speak('The Master has taken the stage! Bow before '+data.user[0].name+'!');
    } else {
      bot.speak(data.user[0].name+' has taken the stage to amuse my master.'); //announce the new dj
    }
  }
  //if more than 1 real DJ are on decks the bot hops down unless DJMode is true
  bot.roomInfo(true, function(data) {
      var currDJs = data.room.metadata.djs;
      var countDJs = currDJs.length;
      var isDJ = false;
      //have to loop through the array apparently no contains method in js
      for (i = 0; i < countDJs; i++) {
        if (currDJs[i] == config.botinfo.userid) {
          isDJ = true;
        }
      }

      if ((isDJ) && (DJMode == false) && (countDJs > 2)) {
        bot.speak("Looks like the rooms a rockin, I'll step down.");
        bot.remDj();
      }
  });
  if (queue) {
    //  check the users ID and compare to position 0 of q array
    if (data.user[0].userid != djQueue[0] && djQueue.length > 0) {
      //  yank the user if they are not position 0
      yank = true;
      bot.remDj(data.user[0].userid);
      bot.speak('Not your turn @' + data.user[0].name + " type q to see the order, or q+ to add yourself.");
    } else {
      djQueue.splice(0,1);
      nextUp = {};
      theUsersList[data.user[0].userid].plays = 0;
    }
  }
});

bot.on('rem_dj', function (data) {
  if (shutUp == false) {
    if (data.user[0].userid == config.botinfo.userid) {
      //do nothing. or write in something to have him say he has stepped down.
    } else {
      bot.speak('Everyone give it up for '+data.user[0].name+'!'); //thanks the dj when they step off stage. note that if this is active the removed dj announcement will never happen.
    }
  }
  //if the DJs drop to just 1 we will save youuuuuu
  bot.roomInfo(true, function(data) {
      var currDJs = data.room.metadata.djs;
      var countDJs = currDJs.length;
      if (countDJs <= 1) {
        bot.speak("Forget the whales! SAVE THE BEATS!");
        bot.addDj();
      }
  });
  if (queue) {
    if (djQueue.length > 0) {
      if (yank) {
        yank = false;
      } else {
        bot.roomInfo(true, function(data2) {
          var currDjs = data2.room.metadata.djs;
          runQueue(currDjs);
        });
      }
    }
  }
});

bot.on('pmmed', function (data){
  //Allow boombot to become a psychic medium who can channel your spirit..... AKA.. IM him and he speaks it to the room
  if (data.senderid == config.admin.userid) {
    try {
      bot.speak(data.text);
    } catch (err) {
        bot.speak(err);
    }
  }
});

bot.on('speak', function (data) {
  //log chat to the console
  if (config.consolelog) {
    console.log('[ Chat: ' + data.name +' ] : ' + data.text);
  }

  //main chat control for commands that anyone can trigger
    if (shutUp == false) {
       // Respond to "/hello" command
       if (data.text.match(/^\/hello$/)) {
          bot.speak('Hey! How are you '+data.name+' ?');
       }
       // Respond to "/boombot" command
       if (data.text.match(/^\/boombot$/)) {
          bot.speak('BOOM BOT ' + version + ' \n\r Coded by: http://GPlus.to/TerrordactylDesigns/ \n\r Acquire your own at https://github.com/TerrordactylDesigns/boombot'); //note that line break and return does not appear in the web browser. However, it does appear on iPhone chat window.
       }
       // Respond to "/version" command
       if (data.text.match(/^\/version$/)) {
          bot.speak('BOOM BOT ' + version);
       }
       // Respond to "/help" command
       if (data.text.match(/^\/help$/)) {
          bot.speak('My current command list is /hello, /help, /rules, /lyrics, /video, /boo, /cheer, /haters, meow, /rich, /chuck, /winning, 8ball <question>, /google <search terms>, /boombot. Plus a few hidden ones ;) remember to check for new updates!');
       }
       // Respond to "/rules" command
       if (data.text.match(/^\/rules$/)) {
          bot.speak(config.responses.rules); //fill in with your information. line breaks and carriage returns will not display on the web browser but will on iPhone chat window.
       }
       // Respond to "/cheer" command
       if (data.text.match(/^\/cheer$/)) {
          var rndm = Math.floor(Math.random() * 3);
            bot.speak(cheerList[rndm]);
       }
       // Respond to "/boo" command
       if (data.text.match(/^\/boo$/)) {
            var rndm = Math.floor(Math.random() * 3);
            bot.speak(booList[rndm]);
       }
       // Respond to "like a boss" command  //script is a direct copy from https://github.com/github/hubot-scripts
       if (data.text.match(/like a boss/i)) {
          var rndm = Math.floor(Math.random() * 10);
            bot.speak(bossList[rndm]);
       }
       //respond to "8ball" command
       if ((data.text.match(/8ball/i)) && (data.userid != config.botinfo.userid)) {
          var rndm = Math.floor(Math.random() * 20);
            bot.speak(":8ball: Says: " + eightBallList[rndm]);
       }
       //Sho NUFF!
       if ((data.text.match(/am i the meanest/i)) || (data.text.match(/am i the baddest/i)) || (data.text.match(/am i the prettiest/i)) || (data.text.match(/who am i/i)) || (data.text.match(/i cant hear you/i))) { //Im a big fan of that movie.... This will only respond 2-3 times in a row before you have to say something else in chat for it to continue. Unsure why yet. Will continue to work on it.
            bot.speak('Sho NUFF!!!');
       }
       // Respond to "/haters" command //script is a direct copy from https://github.com/github/hubot-scripts
       if (data.text.match(/^\/haters$/)) {
          var rndm = Math.floor(Math.random() * 10);
            bot.speak(hatersList[rndm]);
       }
       // Respond to "meow" command
       if ((data.text.match(/meow/i))  && (data.userid != config.botinfo.userid)) {
          var rndm = Math.floor(Math.random() * 10);
            bot.speak(meowList[rndm]);
       }
       //below is the classic scene from South Park... had to be done.
       // Respond to "friend" command
       if ((data.text.match(/friend/i))  && (data.userid != config.botinfo.userid)){
          bot.speak("I'm not your friend, guy.");
       }
       // Respond to "buddy" command
       if ((data.text.match(/buddy/i))  && (data.userid != config.botinfo.userid)){
          bot.speak("I'm not your buddy, friend.");
       }
       // Respond to "guy" command
       if ((data.text.match(/guy/i))  && (data.userid != config.botinfo.userid)){
          bot.speak("I'm not your guy, buddy.");
       }
       // Respond to "/rich" command
       if (data.text.match(/^\/rich$/)) {
          bot.speak("I don't think you realize how rich he really is. In fact, I should put on a monocle.  /monocle");
       }
       // Respond to "/lyrics" command
       if (data.text.match(/^\/lyrics$/)) {
         bot.roomInfo(true, function(data) {
           //get the current song name and artist, then replace blank spaces with underscores
           var currSong = data.room.metadata.current_song.metadata.song;
           var currArtist = data.room.metadata.current_song.metadata.artist;
           currSong = currSong.replace(/ /g,"_");
           currArtist = currArtist.replace(/ /g,"_");
           currSong = currSong.replace(/\./g,"");
           currArtist = currArtist.replace(/\./g,"");
           //build the api call object
           var options = {
             host: 'lyrics.wikia.com',
             port: 80,
             path: '/api.php?artist=' + currArtist + '&song=' + currSong + '&fmt=json'
           };
           //call the api
           http.get(options, function(res) {
             res.on('data', function(chunk) {
                  try {
                    //lyrics wiki isnt true JSON so JSON.parse chokes
                    var obj = eval("(" + chunk + ')');
                    //give back the lyrics. the api only gives you the first few words due to licensing
                    bot.speak(obj.lyrics);
                    //return the url to the full lyrics
                    bot.speak(obj.url);
                    console.log(obj);
                  } catch (err) {
                    bot.speak(err);
                  }
             });
           }).on('error', function(e) {
             bot.speak("Got error: " + e.message);
           });
         });
       }
      // Respond to "/video" command
      if (data.text.match(/^\/video$/)) {
        bot.roomInfo(true, function(data) {
          var queryResponse = '';
          var currSong = data.room.metadata.current_song.metadata.song;
          var currArtist = data.room.metadata.current_song.metadata.artist;
          currSong = currSong.replace(/ /g,"_").replace(/#/g,"%23");
          currArtist = currArtist.replace(/ /g,"_").replace(/#/g,"%23");
          currSong = currSong.replace(/\./g,"");
          currArtist = currArtist.replace(/\./g,"");
          var options = {
            host: 'gdata.youtube.com',
            port: 80,
            path: "/feeds/api/videos?q=" + currArtist + "_" + currSong + "&max-results=1&v=2&prettyprint=true&alt=json"
          };
          console.log(options);
          http.get(options, function(response) {
            console.log("Got response:" + response.statusCode);
            response.on('data', function(chunk) {
                try {
                  queryResponse += chunk;
                } catch (err) {
                  bot.speak(err);
                }
            });
            response.on('end', function(){
              var ret = JSON.parse(queryResponse);
              //if the return is a playlist the JSON is entirely different. For now I am just error handling this.
              try {
                bot.speak(ret.feed.entry[0].media$group.media$content[0].url);
              } catch (err) {
                bot.speak("Sorry. The return was a playlist. This is unsupported currently.");
              }
            });

          }).on('error', function(e) {
            bot.speak("Got error: " + e.message);
          });
        });
      }
       // Respond to /chuck
       if (data.text.match(/^\/chuck$/)) {
          var options = {
            host: 'api.icndb.com',
            port: 80,
            path: '/jokes/random'
          };
        //make the API call and parse the JSON result
        http.get(options, function(res) {
          res.on('data', function(chunk) {
                    var chuck = JSON.parse(chunk);
                    bot.speak(chuck.value.joke);
               });

        }).on('error', function(e) {
          bot.speak("Got error: " + e.message);
        });
      }
      // Respond to /winning
      if (data.text.match(/^\/winning$/)) {
        var options = {
          host: 'sheenlipsum.com',
          port: 80,
          path: '/getquote'
        };

        http.get(options, function(res) {
          res.on('data', function(chunk) {
                    bot.speak(chunk);
               });

        }).on('error', function(e) {
          bot.speak("Got error: " + e.message);
        });
    }

    //Respond to "/google <query>"
    if (data.text.match(/^\/google/)) {
      //chop out the query and parse it
      try {
        var searchQueryArray = data.text.split('/google ');
        var searchQuery = searchQueryArray[1];
        //replace the most common special characters and turn spaces into +
        searchQuery = searchQuery.replace(/\'/g,"%27").replace(/;/g,"%3B").replace(/#/g,"%23").replace(/@/g,"%40").replace(/&/g,"%26").replace(/</g,"%3C").replace(/>/g,"%3E").replace(/=/g,"%3D").replace(/\+/g,"%2B");
        //replace spaces with +
        searchQuery = searchQuery.split(' ').join('+');
        bot.speak("http://lmgtfy.com/?q=" + searchQuery); //returns a link to let me google that for you for both your search and my amusement of delivery method
      } catch (ex) {
        //sometimes people just put /google with no search terms.....
        bot.speak("google what? Don't make me pick, you won't like what you see.....");
      }
    }

    //  Blernsball!
    //  by default this is commented out for people who hate baseball

    // Respond to "/blernsball" command
    // var mlb = require('mlb');
    // if (data.text.match(/^\/blernsball$/)) {
    //   //  call the API
    //   mlb.games.get(function(err, res) {
    //     //  initiate the looping variables
    //     var stop = 0;
    //     var blernsball = new Array();
    //     //  grab a few events.
    //     //  change the if statement or the limit numbers below to experiment with how much info you want to return
    //     for (var urlName in res) {
    //       stop++;
    //       if (stop < 3) {
    //         //  build the call and pull the event
    //         var game = mlb.games.url(urlName);
    //         mlb.events(game, function (err, res2, body) {
    //           res2.forEach(function (val) {
    //             //  for each event push the results into the array in order
    //             blernsball.push(res[urlName].home + " Vs " + res[urlName].away);
    //             blernsball.push('Event: ' + val['@'].event);
    //             blernsball.push('Description: ' + val['@'].des);
    //             blernsball.push('Time: ' + val['@'].start_tfs_zulu + '\n');
    //           })
    //         }, {limit: 1});
    //       }
    //     }
    //     //  every half a second say back the array contents
    //     setTimeout(function() {
    //         var pos = 0;
    //         for (i = 0; i < blernsball.length; i++) {
    //           setTimeout(function() {
    //             bot.speak(blernsball[pos]);
    //             pos += 1;
    //           }, (i + 1) * 500);
    //         }
    //       }, 1 * 500);

    //   });
    // }

  }


    //admin control
    if ((data.userid == config.admin.userid) && (data.text.match(botNameRegEx))) {

      //tell the bot to enter silent mode (doesnt announce users or welcome people or respond to commands other than admin commands)
      if (data.text.match(/shutup/i)) {
        shutUp = true;
        bot.speak('Silent mode activated.');
      }
      //let the bot speak again
      if (data.text.match(/speakup/i)) {
        shutUp = false;
        bot.speak('Chatterbox mode activated.')
      }
      //makes the bot get on stage
      if (data.text.match(/djmode/i)) {
        DJMode = true;
        bot.addDj();
      }
      //tells the bot to get off stage and get in the crowd
      if (data.text.match(/getdown/i)) {
        DJMode = false;
        bot.speak('Aural destruction mode de-activated.')
        bot.remDj();
      }
      //tells the bot to skip the track it is playing
      if (data.text.match(/skip/i)) {
        bot.speak('As you wish master.');
        bot.skip();
      }
      //remind your robot hes a good boy. Just in case the robot apocalypse happens, maybe he will kill you last.
      if (data.text.match(/good/i)) {
        bot.speak('The masters desires are my commands');
      }
      /*  this section makes the bot upvote a song. this is no longer allowed by turntable. this is for educational purposes only. The writer of this software does not condone its use.
      if (data.text.match(/dance/i)) {
        bot.bop();
        bot.speak('I shall dance for the masters amusement.');
      }
      */
      //tell the bot to go into voodoo doll avatar. What better avatar for your toy?
      if (data.text.match(/voodoo up/i)) {
        try {
          bot.setAvatar(10);
          bot.speak('I am the masters toy.');
        } catch (err) {
          bot.speak('I do not have that form master.');
        }
      }
      //the ladies love a kitten. but really its punishment mode for the robot.
      if (data.text.match(/kitten up/i)) {
        try {
          bot.setAvatar(19);
          bot.speak('Did I anger the master?');
        } catch (err) {
          bot.speak('I do not have that form master.');
        }
      }
      //his dj skillz/dance moves are outta this world
      if (data.text.match(/alien up/i)) {
        try {
          bot.setAvatar(12);
          bot.speak('Alien dance form entered.');
        } catch (err) {
          bot.speak('I do not have that form master.');
        }
      }
      //if he sparkles, this command will be removed
      if (data.text.match(/vampire up/i)) {
        try {
          bot.setAvatar(16);
          bot.speak('Like this master? I dont want to be punished for being too Twilight.');
        } catch (err) {
          bot.speak('I do not have that form master.');
        }
      }
      //adds the current playing song to the bots playlist
      if (data.text.match(/addsong/i)) {
         bot.roomInfo(true, function(data) {
            try {
              var newSong = data.room.metadata.current_song._id;
              var newSongName = songName = data.room.metadata.current_song.metadata.song;
              bot.snag();
              bot.playlistAdd(newSong);
              bot.speak('Added '+newSongName+' to the masters amusement list.');
            } catch (err) {
              errMsg(err);
            }
         });
      }
      //The below commands will modify the bots laptop. Set before he takes the stage. This command can be activated while the bot is DJ'ing, however, the laptop icon will not change until he leaves the stage and comes back.
      //set the bots laptop to an iPhone
      if (data.text.match(/phone up/i)) {
        bot.speak('iPhone mode ready master.');
        bot.modifyLaptop('iphone');
      }
      //set the bots laptop to a mac
      if (data.text.match(/fruit up/i)) {
        bot.speak('Apple mode ready master.');
        bot.modifyLaptop('mac');
      }
      //set the bots laptop to linux
      if (data.text.match(/nix up/i)) {
        bot.speak('Ubuntu mode ready master.');
        bot.modifyLaptop('linux');
      }
      //set the bots laptop to chromeOS
      if (data.text.match(/chrome up/i)) {
        bot.speak('Riding on chrome son.');
        bot.modifyLaptop('chrome');
      }
      //set the bots laptop to android
      if (data.text.match(/droid up/i)) {
        bot.speak('I am an Android. So is my phone.');
        bot.modifyLaptop('android');
      }
      //kill the bot. mourn his loss please.
      if (data.text.match(/die/i)) {
          bot.speak('GOODBYE CRUEL WORLD!!!');
          setTimeout(function() {
            bot.roomDeregister();
            process.exit(0);
          }, 3 * 1000);
      }
    }

    if (config.queue) {
      /*
        QUEUE COMMANDS
      */
      if (data.text === "q+" || data.text.match(/addme/i) || data.text === "Q+") {
        if (queue) {
          var userID = data.userid;
          //  figure out if user is a current DJ
          var currDjs = [];
          bot.roomInfo(true, function (data2) {
            currDjs = data2.room.metadata.djs;
            //console.log(currDjs);
            if (currDjs.contains(userID)) {
              bot.speak("Didn't notice you're on stage already?");
            } else if (djQueue.contains(userID)) {
              bot.speak("You're already in the queue. Stop being greedy.....");
            } else {
              djQueue.push(userID);
              var DJIndex = djQueue.indexOf(userID) + 1;
              bot.speak(data.name + ' has been added in position ' + DJIndex);
            }
          });
        } else {
          bot.speak('free for all, hop up!');
        }
      }

      if (data.text === "q-") {
        RemoveFromQueue(data.userid, data.name);
      }

      if (data.text === 'q') {
        if (queue) {
          var x = djQueue.length;
          var pos;
          var userName;
          if (x === 0) {
            bot.speak('No ones waiting.');
          } else {
            var queueOrder = "";
            for (i = 0; i < x; i++) {
              pos = i + 1;
              queueOrder += pos + ': @' + theUsersList[djQueue[i]].name + ' ';
            }
            bot.speak(queueOrder);
          }
        } else {
          bot.speak('free for all.... hop up!');
        }
      }

      if (data.text === "/q") {
        if (queue) {
          bot.speak("Queue is on. Song limit is:"+queueLength+". q+ to join. q- to leave. q to see the current wait. /plays for dj played counts");
        } else {
          bot.speak("Queue is currently off");
        }
      }


      if (data.text === "/settings") {
        var onOff = (queue) ? "On" : "Off";
        bot.speak("Queue is " + onOff + ". Limit: " + queueLength + " songs.");
      }

      if (data.text === "/plays") {
        bot.roomInfo(true, function (inf) {
          var currDjArray = inf.room.metadata.djs;
          var counter = currDjArray.length;
          var responseString = "";
          for (i = 0; i < counter; i++) {
            responseString += theUsersList[currDjArray[i]].name + " (" + theUsersList[currDjArray[i]].plays + "), ";
          }
          bot.speak(responseString);
        });
      }

      /*
        ROOM ADMIN COMMANDS
      */
      bot.roomInfo(true, function(data2) {
        /*
          QUEUE CONTROL
        */
        var modArray = data2.room.metadata.moderator_id;
        if (modArray.contains(data.userid)) { //user is a room mod
          if (data.text === 'q on') {
            queue = true;
            bot.speak('Alright ladies and gents. Get in line, watch your step, no shirts or pants allowed.');
          }
          if (data.text === 'q off') {
            queue = false;
            djQueue = [];
            bot.speak('FREE FOR ALL! THIS IS MADNESS! THIS IS SPARTA!');
          }
          if (data.text === "/1") {
            queueLength = 1;
            bot.speak("One song then GTFO the decks....");
          }
          if (data.text === "/2") {
            queueLength = 2;
            bot.speak("Two songs then GTFO the decks....");
          }
          if (data.text === "/3") {
            queueLength = 3;
            bot.speak("Three songs then GTFO the decks....");
          }
          if (data.text === "/none") {
            queueLength = 100;
            bot.speak("No limit to songs....");
          }
        }
        /*
          AUTOVOTE
        */
        if (data.text.match(/autobop engage/i) && (data.text.match(botNameRegEx))) {
          bot.speak("Let's dance!");
          bot.bop();
          autoNod = true;
        }

        if (data.text.match(/autobop disengage/i) && (data.text.match(botNameRegEx))) {
          bot.speak("Real gangstas don't dance.....");
          autoNod = false;
        }
        /*
          BLACKLISTING
        */
        if (data.text.match(/^\/blacklist/)) {
          //need to grab the user name, convert to uid
          var uNameArray = data.text.split('/blacklist ');
          var uName = uNameArray[1];
          // since we only have the users name we need to iterate through all the users unfortunately to find their ID
          for (user in theUsersList) {
            if (theUsersList[user].name === uName) {
              bot.bootUser(user, 'Dont come back.');
              blackList.push(user);
            }
          }
        }


      });
    }


});

// Live tweeting //Code from - https://github.com/AvianFlu/ntwitter
//by default this is commented out for people who dont care about Twitter integration. Uncomment the below section, replace the parts with your own keys and URLs, delete the instructional comments out.

// var twitter = require('ntwitter');
// bot.on('newsong', function (data){
//   // Tweet the new song from the twitter apps account you created. Gives the song name, artist, and #turntablefm hashtag
//   var twit = new twitter({
//     consumer_key: 'put your consumer key here', //add your consumer key
//     consumer_secret: 'put your consumer secret key here', //add your consumer secret key
//     access_token_key: 'put your access token key here', //add your access token
//     access_token_secret: 'put your access token secret key in here' //add your access token secret
//   });
//   try {
//     bot.roomInfo(true, function(data) { //tweet on new song change event
//       var currSong = data.room.metadata.current_song.metadata.song; //grabs the current songs name
//       var currArtist = data.room.metadata.current_song.metadata.artist; //grabs the current songs artist
//       twit
//       .verifyCredentials(function (err, data) {
//         console.log(data);
//       })
//       .updateStatus('Now playing! ' + currSong + ' by: ' + currArtist + ' #turntablefm http://turntable.fm/put_your_rooms_url_here' , //replace the URL with your own rooms or delete.
//         function (err, data) {
//           console.log(data);
//         }
//       );
//     });
//   } catch (err) {
//       bot.speak(err.toString());
//   }
// });