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

  checkForFirstUser: function(req) {
    Parse.Cloud.useMasterKey();

    var user = req.object;

    // set up access for use with role
    var roleACL = new Parse.ACL();
    roleACL.setPublicReadAccess(true);

    var userQuery = new Parse.Query(Parse.User);
    userQuery.find().then(function(users) {

      // if first user, auto assign them as admin
      if (users.length <= 1) {
        var adminRole = new Parse.Role('Admin', roleACL); // create admin role
        adminRole.getUsers().add(user);                   // add user to role
        return adminRole.save();                          // save role

      // if not first user, auto assign them as editor
      } else {
        var editorRoleQuery = new Parse.Query(Parse.Role);
        editorRoleQuery.equalTo('name', 'Editor');
        editorRoleQuery.first().then(function(editorRole) {

          // if editor role doesn't exist, create it
          if (!editorRole) {
            editorRole = new Parse.Role('Editor', roleACL);
          }

          editorRole.getUsers().add(user);
          return editorRole.save();
        });
      }
    });
  },
}