function QuickChange(appId, jsKey, options) {
  return this.init(appId, jsKey, options);
}

(function (window, document) {

  var DBContent = Parse.Object.extend("Content");

  QuickChange.prototype = {

    init: function(appId, jsKey, options) {
      // if (this.userAuthed()) {
        Parse.initialize(appId, jsKey);
        this.insertStyleTag();
        this.activateElems();
      // }
    },

    activateElems: function() {
      $('[data-cms]').each(function() {
        var content = new Content({
          elem: $(this)
        });

        content.elem.blur(function() {
          content.saveToDB();
        });

        content.findFromDB().then(function(dbObject) {
          content.syncFromDB(dbObject);
        });
      });
    },

    insertStyleTag: function() {
      $('head').append(this.$style());
    },

    $style: function() {
      var styleTag = "<style> " +
        "[data-cms] { outline: 0 solid transparent } " +
        "[data-cms]:focus { outline: 6px solid #c4ffcc } " +
      "</style>";

      return $(styleTag);
    }

  }

  // represent single editable elems

  function Content(args) {
    this.elem = args.elem;
    this.initCss();
    this.setId();
    this.setQuery();
  }

  Content.prototype = {

    displayFromDB: function(dbObject) {
      this.dbObject = dbObject;
      this.elem.html(dbObject.get('html'));
      this.elem.css('display', '');
    },

    findFromDB: function() {
      return this.query.first();
    },

    initCss: function() {
      this.makeEditable();
      this.elem.css({
        display: 'none',
      });
    },

    makeEditable: function() {
      this.elem.attr('contentEditable', true);
    },

    saveToDB: function() {
      if (!!this.dbObject) {
        this.dbObject.save({
          html: this.elem.html()
        });
      }
    },

    setId: function() {
      this.id = this.elem.data('cms');
    },

    setQuery: function() {
      this.query = new Parse.Query(DBContent);
      this.query.equalTo('contentId', this.id);
    },

    syncFromDB: function(dbObject) {
      if (!!dbObject) {
        // load already-saved content into appropriate place
        this.displayFromDB(dbObject);
      } else {
        // first instance of the content. save it to the DB
        this.dbObject = new DBContent();
        this.dbObject.save({
          contentId: this.id,
          html: this.elem.html()
        });
        this.elem.css('display', '');
      }
    },

  }

}(window, document));

// $('a.cms-signup').click(function(ev) {
//   ev.preventDefault();
//   $('div.cms-signup').fadeIn();
// });

// $('div.cms-signup').click(function(ev) {
//   ev.preventDefault();
//   $('div.cms-signup .loading').show();
//   user = new Parse.User();
//   user.signUp({
//     username: $('div.cms-signup .username'),
//     password: $('div.cms-signup .password'),
//     ownerCode: $('div.cms-signup .owner-code')
//   }), {
//     success: function(user) {
//       debugger
//       $('div.cms-signup').fadeOut();
//       allowContentEditable();
//     },
//     error: function(user, error) {
//       debugger
//       // Show the error message somewhere and let the user try again.
//       alert("Error: " + error.code + " " + error.message);
//     }
//   });
// });



// $('a.cms-login').click(function(ev) {
//   ev.preventDefault();
//   $('div.cms-login').fadeIn();
// });

// $('div.cms-login').click(function(ev) {
//   ev.preventDefault();
//   user = new Parse.User()
//   user.signUp({
//     username: $('div.cms-signup .username'),
//     password: $('div.cms-signup .password'),
//     ownerCode: $('div.cms-signup .owner-code')
//   }), {
//     success: function(user) {
//       // Hooray! Let them use the app now.
//     },
//     error: function(user, error) {
//       // Show the error message somewhere and let the user try again.
//       alert("Error: " + error.code + " " + error.message);
//     }
//   });
// });