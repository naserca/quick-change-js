module.exports = {
  version: '0.0.1',

  // db object types

  Content: Parse.Object.extend('Content'),
  Edit:    Parse.Object.extend('Edit'),

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

  createContent: function(args) {
    var content = new this.Content();
    return content.save({
      contentId: args.contentId,
      html: args.html
    });
  },

  findOrCreateContent: function(req, res) {
    var module    = this,
        contentId = req.params.contentId,
        html      = req.params.html;

    var query = new Parse.Query('Content');
    query.equalTo('contentId', contentId).include('edits');
    query.first().then(function(existingContent) {
      if (!!existingContent) {
        res.success(existingContent);
      } else {
        module.createContent({
          contentId: contentId,
          html: html
        }).then(function(newContent) {
          return module.createFirstEdit({
            content: newContent
          })
        }).then(function(newContentWithFirstEdit) {
          return res.success(newContentWithFirstEdit);
        });
      }
    })
  },

  createFirstEdit: function(args) {
    var edit = new this.Edit();
    return edit.save({
      html: args.content.get('html'),
      user: null
    }).then(function(edit) {
      return args.content.save('edits', [edit]);
    });
  },

  getLocales: function(req, res) {
    var localeStrings = req.params.localeStrings;
    var localeQuery = new Parse.Query('Locale');
    localeQuery.find().then(function(locales) { res.success(locales) });
  },

}