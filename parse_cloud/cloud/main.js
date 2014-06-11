// Use Parse.Cloud.define to define as many cloud functions as you want.

var QuickChangeCloud = require('cloud/quick-change-cloud');
var Config           = require('cloud/config');

Parse.Cloud.beforeSave(Parse.User, function(req, res) {
  QuickChangeCloud.checkOwnerCode(req, res, Config.ownerCode);
});

Parse.Cloud.afterSave(Parse.User, function(req, res) {
  QuickChangeCloud.checkForFirstUser(req, res);
});