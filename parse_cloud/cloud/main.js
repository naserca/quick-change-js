// Use Parse.Cloud.define to define as many cloud functions as you want.

var Config           = require('cloud/config');
var QuickChangeCloud = require('cloud/quick-change-cloud');

////////// user //////////

Parse.Cloud.beforeSave(Parse.User, function(req, res) {
  QuickChangeCloud.beforeSaveUser(req, res, Config.ownerCode);
});

Parse.Cloud.afterSave(Parse.User, function(req, res) {
  QuickChangeCloud.afterSaveUser(req, res);
});

Parse.Cloud.define('checkQcInit', function(req, res) {
  QuickChangeCloud.checkQcInit(req, res);
});

Parse.Cloud.define('findOrCreateLocale', function(req, res) {
  QuickChangeCloud.findOrCreateLocale(req, res);
});

Parse.Cloud.define('saveEdit', function(req, res) {
  QuickChangeCloud.saveEdit(req, res);
});

Parse.Cloud.define('getLocales', function(req, res) {
  QuickChangeCloud.getLocales(req, res);
});

Parse.Cloud.define('findOrCreateContent', function(req, res) {
  QuickChangeCloud.findOrCreateContent(req, res);
});