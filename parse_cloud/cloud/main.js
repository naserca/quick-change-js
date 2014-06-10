// Use Parse.Cloud.define to define as many cloud functions as you want.

var QuickChangeCloud = require('cloud/quick-change-cloud');
var Config           = require('cloud/config');

QuickChangeCloud.init(Config.ownerCode);