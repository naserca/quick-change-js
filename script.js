function QuickChange(appId, jsKey, options) {
  return this.init(appId, jsKey, options);
}

(function (window, document) {

  var DBContent = Parse.Object.extend("Content");

  QuickChange.prototype = {

    elems: {
      $signupA: $('a.cms-signup'),
      $signupDiv: $("<div href='#' class='cms-signup' style='display: none;'>" +
        "<form>" +
          "<input name='username' type='text' placeholder='username' />" +
          "<input name='password' type='password' placeholder='password' />" +
          "<input name='owner-code' type='password' placeholder='owner-code' />" +
          "<a href='#'>submit</a>" +
        "</form>" +
      "</div>")
    },

    init: function(appId, jsKey, options) {
      Parse.initialize(appId, jsKey);
      this.initCss();
      this.insertStyleTag();
      this.activateElems();
      if (Parse.User.current()) {
        this.makeElemsEditable();
      } else {
        this.setupSignup();
      }
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

    initCss: function() {
      this.elems.$signupA.hide();
    },

    makeElemsEditable: function() {
      $('[data-cms]').attr('contentEditable', true);
    },

    setupSignup: function() {
      that = this;
      this.elems.$signupA.show();
      $('body').append(this.elems.$signupDiv);
      this.elems.$signupA.click(function(ev) {
        ev.preventDefault();
        that.elems.$signupDiv.fadeIn();
      });
      $('div.cms-signup a').click(function(ev) {
        ev.preventDefault();
        that.handleSignupSubmit();
      });
    },

    handleSignupSubmit: function() {
      var $username = $('div.cms-signup [name=username]'),
          $password = $('div.cms-signup [name=password]'),
          $ownerCode = $('div.cms-signup [name=owner-code]');

      var user = new Parse.User();
      user.set("username", $username.val());
      user.set("password", $password.val());
      user.set("ownerCode", $ownerCode.val());

      user.signUp(null, {
        success: function(user) {
          that.elems.$signupDiv.fadeOut();
          that.elems.$signupDiv.remove();
          that.elems.$signupA.hide();
          that.makeElemsEditable();
        },
        error: function(user, error) {
          $username.val(''); $password.val(''); $ownerCode.val('');
          alert(error.message);
        }
      });
    },

    insertStyleTag: function() {
      $('head').append(this.$style());
    },

    $style: function() {
      var styleTag = "<style> " +
        "[data-cms] { outline: 0 solid transparent } " +
        "[data-cms]:focus { outline: 6px solid #c4ffcc } " +
        "div.cms-login, div.cms-signup {" +
          "position: fixed;" +
          "left: 50%;" +
          "top: 50%;" +
          "height: 200px;" +
          "width: 300px;" +
          "margin-top: -100px;" +
          "margin-left: -150px;" +
          "background-color: rgb(45,45,45);" +
          "padding: 1em;" +
          "box-sizing: border-box;" +
          "color: rgb(45,45,45);" +
          "font-family: Helvetica, Arial;" +
        "}" +
        "div.cms-login, div.cms-signup input {" +
          "width: 100%;" +
          "display: block;" +
          "padding: .75em;" +
          "margin-bottom: 1em;" +
          "box-sizing: border-box;" +
          "outline: 0;" +
          "border: 0;" +
        "}" +
        "div.cms-login, div.cms-signup input:focus {" +
          "outline: 0;" +
          "background-color: #c4ffcc;" +
        "}" +
        "div.cms-login, div.cms-signup a {" +
          "display: inline-block;" +
          "text-decoration: none;" +
          "color: #c4ffcc;" +
          "padding: .5em;" +
          "border: solid 2px #c4ffcc;" +
          "border-radius: 6px;" +
        "}" +
        "div.cms-login, div.cms-signup a:hover {" +
          "color: rgb(45,45,45);" +
          "background-color: #c4ffcc;" +
        "}" +
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
      this.elem.css({
        display: 'none',
      });
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