module.exports = {
  version: '0.0.1',

  init: function(ownerCode) {
    this.setupOwnerCodeValidation(ownerCode);
  },

  setupOwnerCodeValidation: function(ownerCode) {
    Parse.Cloud.beforeSave(Parse.User, function(request, response) {
      var user = request.object;
      
      if (user.get("ownerCode") != ownerCode) {
        response.error("We're sorry, you must be an owner to edit this site.");
      } else {
        // delete the ownerCode so it stays hidden from client
        user.unset("ownerCode");
        response.success();
      }
    });
  }
}