var Character = require('../models/character');
var request = require('request');
var md5 = require('md5');

module.exports = {
  index: index,
  create: create,
  show: show,
  search: characterSearch
};

function index(req, res, next) {
  Character.find({}, function(error, characters) {
    res.render('characters/index', { characters: characters, user: req.user });
  });
}

function create(req, res, next) {
  var newCharacter = new Character(req.body);
  newCharacter.save(function(error, savedCharacter) {
    if (error) next(error);
    res.json(savedCharacter);
  });
}

function show(req, res, next) {
  //use id to search for character's comics in marvel's database
  var id = req.params.id;
  var character;

  console.log('id: ' + id);
  Character.find({ id: id }, function(error, returnedCharacter) {
    if(error) next(error);

    character = returnedCharacter[0];
    var ts = Date().toString();
    var hash = md5(ts + process.env.MARVEL_PRIVATE_KEY + process.env.MARVEL_PUBLIC_KEY);

    //GRAB COMICS
    request({
      method: 'GET',
      uri: 'http://gateway.marvel.com/v1/public/characters/' + id + '/comics?limit=50&ts=' + ts + '&apikey='+process.env.MARVEL_PUBLIC_KEY+'&hash=' + hash
    }, function (error, response, body) {
      if (error) console.log(error);

      if (!error && response.statusCode == 200) {
        var comics = JSON.parse(response.body).data.results;

        var parsedComics = [];
        comics.forEach(function(comic) {
          var _comic = {};
          _comic.id = comic.id;
          _comic.title = comic.title;
          _comic.description = comic.description;
          _comic.thumbnail = comic.thumbnail.path + '.' + comic.thumbnail.extension;
          parsedComics.push(_comic);
        });

        //add object of comics to view
        res.render('characters/show', { character: character, comics: parsedComics, user: req.user });
      }
    });
  });
}

function characterSearch(req, res, next) {
  var characterName = decodeURI(req.params.name);
  Character.find({ name: { $regex: new RegExp("^" + characterName, "i") } }, function(error, characters) {
    if(error) next(error);
    else {
      res.json(characters);
    }
  });
}

