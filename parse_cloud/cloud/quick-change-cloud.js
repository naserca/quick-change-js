module.exports = {
  version: '0.0.1',

  // db object types

  Content: Parse.Object.extend('Content'),
  Edit:    Parse.Object.extend('Edit'),
  Locale:  Parse.Object.extend('Locale'),

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
    var query = new Parse.Query(Parse.User);
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

    var userQuery = new Parse.Query(Parse.User);
    userQuery.find().then(function(users) {

      // if first user, auto assign them as admin
      if (users.length <= 1) {
        module.createRole({
          roleACL: roleACL,
          user: user,
          name: 'Admin'
        });

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
      html: args.html,
      locale: args.locale
    });
  },

  instatiateLocale: function(localeId) {
    var locale = new this.Locale();
    locale.id  = localeId;
    return locale;
  },

  saveEdit: function(req, res) {
    var module    = this,
        user      = req.user,
        contentId = req.params.contentId,
        html      = req.params.html,
        edit      = new module.Edit(),
        query     = new Parse.Query('Content');

    edit.save({
      html: html,
      isLive: false,
      user: user
    }).then(function() {
      return query.include('edits').get(contentId);
    }).then(function(content) {
      content.addUnique('edits', edit);
      return content.save();
    }).then(function(content) {
      return res.success(edit);
    });
  },

  findOrCreateContent: function(req, res) {
    var module    = this,
        contentId = req.params.contentId,
        html      = req.params.html,
        localeId  = req.params.localeId,
        locale    = module.instatiateLocale(localeId);

    var query = new Parse.Query('Content');
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

  createLocale: function(args) {
    var locale = new this.Locale();
    return locale.save({
      name: args.name,
      isDefault: args.isDefault
    });
  },

  findOrCreateLocale: function(req, res) {
    var name = req.params.name;
    var module = this;
    var localeQuery = new Parse.Query('Locale');
    localeQuery.find().then(function(locales) {

      // if no locales present, create it
      if (!locales.length) {
        module.createLocale({
          isDefault: true,
          name: name
        }).then(function(newLocale) {
          res.success(newLocale);
        });
      } else {
        if (!name) {

          // return the default locale
          locale = locales.filter(function(locale) { return locale.get('isDefault'); })[0];
          res.success(locale);
        } else {

          if ((locales.length == 1) && (!locales[0].get('name'))) {

            // create and override blank locale
            module.createLocale({
              isDefault: true,
              name: name
            }).then(function(newLocale) {
              locales[0].set('isDefault', false);
              locales[0].save();

              res.success(newLocale);
            });
          } else {

            // return the default locale
            locale = locales.filter(function(locale) { return (locale.get('name') == name); })[0];
            
            if (!!locale) {
              res.success(locale);
            } else {

              // create new locale
              module.createLocale({
                isDefault: false,
                name: name
              }).then(function(newLocale) {
                res.success(newLocale);
              });
            }
          }
        }
      }
    });
  }
}