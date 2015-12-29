var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  initialize: function(){
    this.on('creating', this.hashPassword, this);
  },
  hashPassword: function(model, attrs, options){
    // console.log(model.attributes.password);
    return new Promise(function(resolve, reject) {
      bcrypt.hash(model.attributes.password, null, null, function(err, hash) {
        if (err) {
          console.log(err);
          reject(err);
        }
        console.log(hash);
        model.set('password', hash);
        console.log('THIS IS IN MODEL', model.get('password'));
        resolve(hash);
      });
    });
  }
});


module.exports = User;
