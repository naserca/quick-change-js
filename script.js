function QuickChange(appId, jsKey, options) {
  return this.init(appId, jsKey, options);
}

(function (window, document) {

  QuickChange.prototype = {

    urlTriggerRes: {
      signup: /#qcsignup/,
      login: /#qclogin/
    },

    elems: {
      $head: $('head'),
      $body: $('body'),
      $modal: $("<div href='#' class='cms-signup cms-modal' style='display: none;'>" +
        "<form>" +
          "<input name='username' type='text' placeholder='username' />" +
          "<input name='password' type='password' placeholder='password' />" +
          "<input name='owner-code' type='password' placeholder='owner-code' />" +
          "<a class='submit' href='#'>submit</a>" +
        "</form>" +
      "</div>"),
      $editable: $('[data-cms]'),
    },

    init: function(appId, jsKey, options) {
      Parse.initialize(appId, jsKey);
      this.insertStyleTag();
      this.activateElems();
      if (Parse.User.current()) {
        this.makeElemsEditable();
      } else {
        this.setupSignupAndLogin();
      }
    },

    activateElems: function() {
      this.elems.$editable.each(function() {
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

    addModal: function() {
      this.findModalElems();
      this.elems.$body.append(this.elems.$modal);
      this.elems.$modal.fadeIn();
    },

    signupTriggered: function() {
      return this.urlTriggerRes.signup.test(document.URL);
    },

    loginTriggered: function() {
      return this.urlTriggerRes.login.test(document.URL);
    },

    setupSignupAndLogin: function() {
      if (this.loginOrSignupTriggered()) {
        this.addModal();
        if (this.signupTriggered())
          this.setupSignup();
        else if (this.loginTriggered())
          this.setupLogin();
      }
    },

    handleLoginSubmit: function(ev) {
      ev.preventDefault();

      Parse.User.logIn(this.elems.$modal.$username.val(), this.elems.$modal.$password.val(), {
        success: this.handleLoginOrSignupSuccess.bind(this),
        error: this.handleLoginError.bind(this)
      });
    },

    handleLoginError: function(user, error) {
      $username.val(''); $password.val('');
      alert(error.message);
    },

    handleLoginOrSignupSuccess: function(user) {
      this.elems.$modal.fadeOut(this.elems.$modal.remove);
      this.makeElemsEditable();
      this.clearUrlTrigger();
    },

    handleSignupError: function(user, error) {
      $username.val(''); $password.val(''); $ownerCode.val('');
      alert(error.message);
    },

    handleSignupSubmit: function(ev) {
      ev.preventDefault();

      var user = new Parse.User();
      user.set("username", this.elems.$modal.$username.val());
      user.set("password", this.elems.$modal.$password.val());
      user.set("ownerCode", this.elems.$modal.$ownerCode.val());

      user.signUp(null, {
        success: this.handleLoginOrSignupSuccess.bind(this),
        error: this.handleSignupError.bind(this)
      });
    },

    findModalElems: function() {
      this.elems.$modal.$username  = this.elems.$modal.find('[name=username]');
      this.elems.$modal.$password  = this.elems.$modal.find('[name=password]');
      this.elems.$modal.$ownerCode = this.elems.$modal.find('[name=owner-code]');
      this.elems.$modal.$submit    = this.elems.$modal.find('.submit');
    },

    insertStyleTag: function() {
      this.elems.$head.append(this.$style());
    },

    makeElemsEditable: function() {
      this.elems.$editable.attr('contentEditable', true);
    },

    setupLogin: function() {
      this.elems.$modal.$ownerCode.remove();
      this.elems.$modal.$submit.click(this.handleLoginSubmit.bind(this));
    },

    setupSignup: function() {
      this.elems.$modal.$submit.click(this.handleSignupSubmit.bind(this));
    },

    loginOrSignupTriggered: function() {
      return (this.signupTriggered()) || (this.loginTriggered());
    },

    clearUrlTrigger: function() {
      var url = document.URL;
      var trigger = url.match(this.urlTriggerRes.login) || url.match(this.urlTriggerRes.signup);
      var cleanUrl = url.replace(trigger[0], '');
      return window.location.replace(cleanUrl);
    },

    // style tag here to avoid separate sheet

    $style: function() {
      var styleTag = "<style> " +
        "[data-cms] { outline: 0 solid transparent } " +
        "[data-cms]:focus { outline: 6px solid #c4ffcc } " +
        "div.cms-modal {" +
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
        "div.cms-modal input {" +
          "width: 100%;" +
          "display: block;" +
          "padding: .75em;" +
          "margin-bottom: 1em;" +
          "box-sizing: border-box;" +
          "outline: 0;" +
          "border: 0;" +
        "}" +
        "div.cms-modal input:focus {" +
          "outline: 0;" +
          "background-color: #c4ffcc;" +
        "}" +
        "div.cms-modal a {" +
          "display: inline-block;" +
          "text-decoration: none;" +
          "color: #c4ffcc;" +
          "padding: .5em;" +
          "border: solid 2px #c4ffcc;" +
          "border-radius: 6px;" +
        "}" +
        "div.cms-modal a:hover {" +
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

    DBContent: Parse.Object.extend("Content"),

    createDBobject: function() {
      this.dbObject = new this.DBContent();
      this.dbObject.save({
        contentId: this.id,
        html: this.elem.html()
      });
    },

    findFromDB: function() {
      return this.query.first();
    },

    initCss: function() {
      this.elem.css({
        display: 'none',
      });
    },

    loadFromDB: function(dbObject) {
      this.dbObject = dbObject;
      this.elem.html(dbObject.get('html'));
    },

    saveToDB: function() {
      if (!!this.dbObject && Parse.User.current()) {
        this.dbObject.save({
          html: this.elem.html()
        });
      }
    },

    setId: function() {
      this.id = this.elem.data('cms');
    },

    setQuery: function() {
      this.query = new Parse.Query(this.DBContent);
      this.query.equalTo('contentId', this.id);
    },

    syncFromDB: function(dbObject) {
      if (!!dbObject) {
        // load already-saved content into appropriate place
        this.loadFromDB(dbObject);
      } else {
        // first instance of the content. save it to the DB
        this.createDBobject();
      }
      this.elem.css('display', '');
    },

  }

}(window, document));