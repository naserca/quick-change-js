
// Use Parse.Cloud.define to define as many cloud functions as you want.

Parse.Cloud.beforeSave(Parse.User, function(request, response) {
  if (request.object.get("ownerCode") != "password") {
    response.error("We're sorry, you must be an owner to edit this site.");
  } else {
    response.success();
  }
});