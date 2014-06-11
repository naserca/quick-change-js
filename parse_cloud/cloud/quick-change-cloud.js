module.exports = {
  version: '0.0.1',

  checkOwnerCode: function(req, res, ownerCode) {
    var user = req.object;
    
    if (user.get("ownerCode") != ownerCode) {
      res.error("We're sorry, you must be an owner to edit this site.");
    } else {
      // delete the ownerCode so it stays hidden from client
      user.unset("ownerCode");
      res.success();
    }
  },

  checkForFirstUser: function(req, res) {
    var user = req.object;

    var query = new Parse.Query(Parse.User);
    query.find().then(function(users) {
      if (users.length <= 1) {

        // create admin role
        var roleACL = new Parse.ACL();
        roleACL.setPublicReadAccess(true);
        var role = new Parse.Role('Admin', roleACL);

        // add user to role
        role.getUsers().add(user);

        // save role
        return role.save().then(res.success);
      } else {
        res.success();
      }
    });
  },
}