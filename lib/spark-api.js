/*
 ******************************************************************************
 * @file lib/spark-api.js
 * @company Spark ( https://www.spark.io/ )
 * @source https://github.com/spark/sparkjs
 *
 * @Contributors
 *    David Middlecamp (david@spark.io)
 *    Edgar Silva (https://github.com/edgarsilva)
 *    Javier Cervantes (https://github.com/solojavier)
 *
 * @brief Basic API wrapper module
 ******************************************************************************
  Copyright (c) 2014 Spark Labs, Inc.  All rights reserved.

  This program is free software; you can redistribute it and/or
  modify it under the terms of the GNU Lesser General Public
  License as published by the Free Software Foundation, either
  version 3 of the License, or (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
  Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public
  License along with this program; if not, see <http://www.gnu.org/licenses/>.
  ******************************************************************************
 */

var when = require('when'),
    pipeline = require('when/pipeline'),
    utilities = require('./utilities.js');

var request = require('request'),
    http = require('http'),
    fs = require('fs'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

var SparkApi = function() {
  this.clientId = "CLIENT_ID";
  this.clientSecret = "CLIENT_SECRET";
  this.baseUrl = 'https://api.spark.io';
};

util.inherits(SparkApi, EventEmitter);

  //GET /oauth/token
SparkApi.prototype.login = function (user, pass, callback) {
  var dfd = when.defer();

  request({
    uri: this.baseUrl + '/oauth/token',
    method: 'POST',
    json: true,
    form: {
      username: user,
      password: pass,
      grant_type: 'password',
      client_id: this.clientId,
      client_secret: this.clientSecret
    }
  }, this.callbackHandler('login', dfd, callback).bind(this));

  return dfd.promise;
};


SparkApi.prototype.callbackHandler = function(eventName, dfd, cb) {
  var handler = function(err, response, body) {
    if (err) {
      dfd.reject('Login Failed');
    } else {
      dfd.resolve(body);
    }

    console.log('this ===>', this);
    console.log('body', body);
    this.emit(eventName, err, body);

    if ('function' === typeof(cb)) {
      cb(err, body);
    }
  }.bind(this);

  return handler;
};

/*
SparkApi.prototype = {
  ready: function() {
    var hasToken = !!this._access_token;

    if (!hasToken) {
      console.log("You're not logged in.  Please login using \"spark cloud login\" before using this command ");
    }

    return hasToken;
  },

  clearToken: function() {
    this._access_token = null;
  },

  getToken: function () {
    return this._access_token;
  },

  createUser: function (user, pass) {
    var dfd = when.defer();

    //todo; if !user, make random?
    //todo; if !pass, make random?

    if (!user || (user === '') || (!utilities.contains(user, "@")) || (!utilities.contains(user, "."))) {
      return when.reject("Username must be an email address.");
    }

    console.log('creating user: ', user);

    var that = this;

    request({
      uri: this.baseUrl + "/v1/users",
      method: "POST",
      form: {
          username: user,
          password: pass
      },
      json: true
    }, function (error, response, body) {
      if (body && body.ok) {
          console.log('user creation succeeded!');
          that._user = user;
          that._pass = pass;
      }
      else if (body && !body.ok && body.errors) {
          console.log("User creation ran into an issue: ", body.errors);
      }
      else {
          console.log("createUser got ", body + "");
      }

      dfd.resolve(body);
    });

    return dfd.promise;
  },

  removeAccessToken: function (username, password, access_token) {
    console.log("removing access_token " + access_token);

    var dfd = when.defer();
    request({
      uri: this.baseUrl + "/v1/access_tokens/" + access_token,
      method: "DELETE",
      auth: {
        username: username,
        password: password
      },
      form: {
        access_token: this._access_token
      },
      json: true
    }, function (error, response, body) {
      if (error) {
        console.error("error removing token: " + error);
      }

      if (body && body.ok) {
        dfd.resolve(body);
      }
      else if (body && body.error) {
        dfd.reject(body.error);
      }
      else {
        //huh?
        dfd.reject(body);
      }
    });

    return dfd.promise;
  },

  //GET /v1/devices
  listDevices: function () {
    console.error("Retrieving cores... (this might take a few seconds)");

    var dfd = when.defer();
    var that = this;

    //console.log('calling ' + this.baseUrl + "/v1/devices?access_token=" + this._access_token);
    request({
      uri: this.baseUrl + "/v1/devices?access_token=" + this._access_token,
      method: "GET",
      json: true
    }, function (error, response, body) {
      if (error) {
        console.error("listDevices got error: ", error);
      }

      that._devices = body;
      console.log(body);
      dfd.resolve(body);
    });

    return dfd.promise;
  },

  claimCore: function (coreID) {
    var dfd = when.defer();
    request({
      uri: this.baseUrl + "/v1/devices",
      method: "POST",
      form: {
        id: coreID,
        access_token: this._access_token
      },
      json: true
    }, function (error, response, body) {

      if (body && body.ok) {
        console.log("Successfully claimed core " + coreID);
        dfd.resolve(body);
      }
      else if (body && body.errors) {
        console.log("Failed to claim core, server said ", body.errors);
        dfd.reject(body);
      }
    });

    return dfd.promise;
  },

  removeCore: function (coreID) {
    console.log("releasing core " + coreID);

    var dfd = when.defer();
    var that = this;

    request({
      uri: this.baseUrl + "/v1/devices/" + coreID,
      method: "DELETE",
      form: {
        id: coreID,
        access_token: this._access_token
      },
      json: true
    }, function (error, response, body) {

      console.log("server said ", body);

      if (body && body.ok) {
        //console.log("Successfully removed core " + coreID);
        dfd.resolve(body);
      }
      else if (body && body.error) {
        //console.log("Failed to remove core, server said " + body.error);
        dfd.reject(body.error);
      }
    });

    return dfd.promise;
  },

  renameCore: function (coreID, name) {
    var dfd = when.defer();

    request({
      uri: this.baseUrl + "/v1/devices/" + coreID,
      method: "PUT",
      form: {
        name: name,
        access_token: this._access_token
      },
      json: true
    }, function (error, response, body) {
      if (body && (body.name == name)) {
        console.log("Successfully renamed core " + coreID + " to: " + name);
        dfd.resolve(body);
      }
      else {
        console.log("Failed to rename core, server said ", body.errors || body);
        dfd.reject(body);
      }
    });

    return dfd.promise;
  },

  //GET /v1/devices/{DEVICE_ID}
  getAttributes: function (coreID) {
    var dfd = when.defer();
    request({
      uri: this.baseUrl + "/v1/devices/" + coreID + "?access_token=" + this._access_token,
      method: "GET",
      json: true
    },
    function (error, response, body) {
      if (error) {
        console.log("getAttributes got error: ", error);
      }
      dfd.resolve(body);
    }
           );

           return dfd.promise;
  },

  //GET /v1/devices/{DEVICE_ID}/{VARIABLE}
  getVariable: function (coreID, name) {
    var dfd = when.defer();
    request({
      uri: this.baseUrl + "/v1/devices/" + coreID + "/" + name + "?access_token=" + this._access_token,
      method: "GET",
      json: true
    },
    function (error, response, body) {
      if (error) {
        dfd.reject(error);
      }
      dfd.resolve(body);
    });

    return dfd.promise;
  },

  //PUT /v1/devices/{DEVICE_ID}
  signalCore: function (coreID, beSignalling) {
    var dfd = when.defer();
    request({
      uri: this.baseUrl + "/v1/devices/" + coreID,
      method: "PUT",
      form: {
        signal: (beSignalling) ? 1 : 0,
        access_token: this._access_token
      },
      json: true
    }, function (error, response, body) {
      if (error) {
        //console.log("signalCore got error: ", error);
        dfd.reject(error);
      }
      else {
        //console.log("Successfully updated core signalling mode");
        dfd.resolve(body);
      }

    });

    return dfd.promise;
  },

  //PUT /v1/devices/{DEVICE_ID}
  flashCore: function (coreID, files) {
    console.log('attempting to flash firmware to your core ' + coreID);

    var dfd = when.defer();
    var r = request.put(this.baseUrl + "/v1/devices/" + coreID + "?access_token=" + this._access_token, {
      json: true
    }, function (error, response, body) {
      //console.log(error, response, body);
      if (error) {
        console.log("flash core got error: ", JSON.stringify(error));
      }
      else {
        console.log("flash core said ", JSON.stringify(body || error));
      }

      dfd.resolve(response);
    });

    var form = r.form();
    for (var name in files) {
      form.append(name, fs.createReadStream(files[name]), {
        filename: files[name]
      });
    }

    return dfd.promise;
  }
};

SparkApi.prototype.compileCode: function(files, callback) {
  console.log('attempting to compile firmware ');

  var r = request.({
    uri: this.baseUrl + "/v1/binaries?access_token=" + this.accessToken,
    json: true
  }, this.callbackHandler('compileCode', callback));

  var form = r.form();
  for (var name in files) {
    console.log("pushing file: " + files[name]);
    form.append(name, fs.createReadStream(files[name]), {
      filename: files[name]
    });
  }
};

SparkApi.prototype.downloadBinary: function (url, filename, callback) {
  var outFs = fs.createWriteStream(filename);

  console.log("grabbing binary from: " + this.baseUrl + url);
  request({
    uri: this.baseUrl + url + "?access_token=" + this.accessToken,
    method: "GET"
  }, this.callbackHandler('downloadBinary', callback)).pipe(outFs);
};

SparkApi.prototype.sendPublicKey: function (coreID, buffer, callback) {
  console.log('attempting to add a new public key for core ' + coreID);

  request({
    uri: this.baseUrl + "/v1/provisioning/" + coreID,
    method: "POST",
    form: {
      deviceID: coreID,
      publicKey: buffer.toString(),
      order: "manual_" + ((new Date()).getTime()),
      filename: "cli",
      access_token: this.accessToken
    },
    json: true
  }, this.callbackHandler('sendPublicKey', callback));
};
*/

SparkApi.prototype.callFunction =  function (coreID, functionName, funcParam, callback) {
  request({
    uri: this.baseUrl + "/v1/devices/" + coreID + "/" + functionName,
    method: "POST",
    form: {
      arg: funcParam,
      access_token: this.accessToken
    },
    json: true
  }, this.callbackHandler('callFunction', callback));
};

//TODO
SparkApi.prototype.getAllAttributes = function () {
  if (this._attributeCache) {
    return when.resolve(this._attributeCache);
  }

  console.log("polling server to see what cores are online, and what functions are available");

  var that = this;
  var lookupAttributes = function (cores) {
    var tmp = when.defer();

    if (!cores || (cores.length === 0)) {
      console.log("No cores found.");
      that._attributeCache = null;
      tmp.reject("No cores found");
    }
    else {
      var promises = [];
      for (var i = 0; i < cores.length; i++) {
        var coreid = cores[i].id;
        if (cores[i].connected) {
          promises.push(that.getAttributes(coreid));
        }
        else {
          promises.push(when.resolve(cores[i]));
        }
      }

      when.all(promises).then(function (cores) {
        //sort alphabetically
        cores = cores.sort(function (a, b) {
          return (a.name || "").localeCompare(b.name);
        });

        that._attributeCache = cores;
        tmp.resolve(cores);
      });
    }
    return tmp.promise;
  };

  return pipeline([
    that.listDevices.bind(that),
    lookupAttributes
  ]);
};

SparkApi.prototype.getEventStream = function (eventName, coreId, onDataHandler) {
  var url;
  if (!coreId) {
    url = "/v1/events";
  }
  else if (coreId == "mine") {
    url = "/v1/devices/events";
  }
  else {
    url = "/v1/devices/" + coreId + "/events";
  }

  if (eventName) {
    url += "/" + eventName;
  }

  console.log("Listening to: " + url);
  var requestObj = request({
    uri: this.baseUrl + url + "?access_token=" + this.accessToken,
    method: "GET"
  });

  if (onDataHandler) {
    requestObj.on('data', onDataHandler);
  }

  return requestObj;
};

SparkApi.prototype.publishEvent = function (eventName, data, callback) {
  request({
    uri: this.baseUrl + "/v1/devices/events",
    method: "POST",
    form: {
      name: eventName,
      data: data,
      access_token: this.accessToken
    },
    json: true
  }, this.callbackHandler('publishEvent', callback));
};

SparkApi.prototype.createWebhook = function (event, url, coreID, callback) {
  request({
    uri: this.baseUrl + "/v1/webhooks",
    method: "POST",
    form: {
      event: event,
      url: url,
      deviceid: coreID,
      access_token: this.accessToken
    },
    json: true
  }, this.callbackHandler('createWebhook', callback));
};

SparkApi.prototype.deleteWebhook = function (hookID, callback) {
  request({
    uri: this.baseUrl + "/v1/webhooks/" + hookID + "?access_token=" + this.accessToken,
    method: "DELETE",
    json: true
  }, this.callbackHandler('deleteWebhook', callback));
};

SparkApi.prototype.listWebhooks = function (callback) {
  request({
    uri: this.baseUrl + "/v1/webhooks/" + "?access_token=" + this.accessToken,
    method: "GET",
    json: true
  }, this.callbackHandler('listWebhooks', callback));
};

module.exports = new SparkApi();