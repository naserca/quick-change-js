// Use Parse.Cloud.define to define as many cloud functions as you want.

var Config           = require('cloud/config');
var QuickChangeCloud = require('cloud/quick-change-cloud');

////////// user //////////

Parse.Cloud.beforeSave(Parse.User, function(req, res) {
  QuickChangeCloud.checkOwnerCode(req, res, Config.ownerCode);
});

Parse.Cloud.afterSave(Parse.User, function(req, res) {
  QuickChangeCloud.checkForFirstUser(req, res);
});

Parse.Cloud.define('getLocales', function(req, res) {
  QuickChangeCloud.getLocales(req, res);
});

Parse.Cloud.define('findOrCreateContent', function(req, res) {
  QuickChangeCloud.findOrCreateContent(req, res);
});
