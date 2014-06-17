module.exports = {
  version: '0.0.1',

  // db object types

  Content: Parse.Object.extend('Content'),
  Edit:    Parse.Object.extend('Edit'),
  Locale:  Parse.Object.extend('Locale'),

  // db queries

  UserQuery: Parse.Query(Parse.User),
  RoleQuery: Parse.Query(Parse.Role),
  ContentQuery: Parse.Query('Content'),
  LocaleQuery: Parse.Query('Locale'),

  beforeSaveUser: function(req, res, ownerCode) {
    var user = req.object;
    
    if (user.get('ownerCode') != ownerCode) {
      res.error("We're sorry, you must be an owner to edit this site.");
    } else {

      // delete the ownerCode so it stays hidden from client
      user.unset('ownerCode');
      res.success();
    }
  },

  checkQcInit: function(req, res) {
    var query = new this.UserQuery();
    query.find().then(function(users) {
      return res.success(!!users.length);
    });
  },

  createRole: function(args) {
    var role = new Parse.Role(args.name, args.roleACL); // create admin role
    role.getUsers().add(args.user);                     // add user to role
    return role.save();                                 // save role
  },

  afterSaveUser: function(req) {
    Parse.Cloud.useMasterKey();
    var module = this;

    var user = req.object;

    // set up access for use with role
    var roleACL = new Parse.ACL();
    roleACL.setPublicReadAccess(true);

    var userQuery = new this.UserQuery();
    userQuery.find().then(function(users) {

      // if first user, auto assign them as admin
      if (users.length <= 1) {
        module.createRole({
          roleACL: roleACL,
          user: user,
          name: 'Admin'
        }).then(function() {
          module.createDefaultLocale(user);
        });

      // if not first user, auto assign them as editor
      } else {
        var editorRoleQuery = new this.RoleQuery();
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
      html: args.html,
      locale: args.locale
    });
  },

  findOrCreateContent: function(req, res) {
    var module    = this,
        contentId = req.params.contentId,
        html      = req.params.html,
        localeId  = req.params.localeId;

    // must instantiate new Locale() to query (#smdh)
    var locale = new this.Locale();
    locale.id = localeId;

    var query = new this.ContentQuery();
    query.equalTo('contentId', contentId)
         .equalTo('locale', locale)
         .include('edits');
    query.first().then(function(existingContent) {
      if (!!existingContent) {
        res.success(existingContent);
      } else {
        module.createContent({
          contentId: contentId,
          html: html,
          locale: locale
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
      user: null,
      isLive: true
    }).then(function(edit) {
      return args.content.save('edits', [edit]);
    });
  },

  getLocale: function(req, res) {
    var localeString = req.params.localeString;
    var localeQuery = new this.LocaleQuery();
    localeQuery.equalTo('name', localeString);
    localeQuery.first().then(function(locale) { res.success(locale) });
  },

  getLocales: function(req, res) {
    var localeQuery = new this.LocaleQuery();
    localeQuery.find().then(function(locales) { res.success(locales) });
  },

  createDefaultLocale: function(user) {
    console.log(user);
    var locale = new this.Locale();
    return locale.save({
      name: user.get('defaultLanguage'),
      isDefault: true
    });
  }
}