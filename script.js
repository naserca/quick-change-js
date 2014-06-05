function QuickChange(appId, jsKey, options) {
  return this.init(appId, jsKey, options);
}

(function (window, document) {

  QuickChange.prototype = {

    ////////// defaults

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

    ////////// init

    init: function(appId, jsKey, options) {
      Parse.initialize(appId, jsKey);
      this.insertStyleTag();
      this.activateElems();
      this.currentUser = Parse.User.current();
      if (!!this.currentUser)
        this.makeElemsEditable();
      else
        this.setupSignupOrLogin();
    },

    ////////// methods

    activateElems: function() {
      var qc = this;
      this.elems.$editable.each(function() {
        var content = new Content({
          qc: qc,
          currentUser: qc.currentUser,
          elem: $(this)
        });

        content.elem.blur(content.saveToDB.bind(content));

        content.findFromDB().then(function(dbObject) {
          content.syncFromDB(dbObject);
        });
      });
    },

    addModal: function() {
      this.findModalElems();
      this.elems.$body.append(this.elems.$modal);
      this.elems.$modal.fadeIn();
      this.setupBodyClickHandler();
    },

    clearUrlTrigger: function() {
      var url = document.URL;
      var trigger = url.match(this.urlTriggerRes.login) || url.match(this.urlTriggerRes.signup);
      var cleanUrl = url.replace(trigger[0], '');
      return window.location.replace(cleanUrl);
    },

    handleBodyClick: function(ev) {
      this.elems.$modal.fadeOut(this.clearUrlTrigger.bind(this));
    },

    findModalElems: function() {
      this.elems.$modal.$username  = this.elems.$modal.find('[name=username]');
      this.elems.$modal.$password  = this.elems.$modal.find('[name=password]');
      this.elems.$modal.$ownerCode = this.elems.$modal.find('[name=owner-code]');
      this.elems.$modal.$submit    = this.elems.$modal.find('.submit');
    },

    handleLoginError: function(user, error) {
      this.elems.$modal.$username.val(''); this.elems.$modal.$password.val('');
      alert(error.message);
    },

    handleLoginSubmit: function(ev) {
      ev.preventDefault();

      Parse.User.logIn(this.elems.$modal.$username.val(), this.elems.$modal.$password.val(), {
        success: this.handleLoginOrSignupSuccess.bind(this),
        error: this.handleLoginError.bind(this)
      });
    },

    handleLoginOrSignupSuccess: function(user) {
      this.currentUser = user;
      this.elems.$modal.fadeOut(this.elems.$modal.remove);
      this.makeElemsEditable();
      this.clearUrlTrigger();
    },

    handleSignupError: function(user, error) {
      this.elems.$modal.$username.val(''); this.elems.$modal.$password.val(''); this.elems.$modal.$ownerCode.val('');
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

    insertStyleTag: function() {
      this.elems.$head.append(this.$style());
    },

    loginOrSignupTriggered: function() {
      return (this.signupTriggered()) || (this.loginTriggered());
    },

    loginTriggered: function() {
      return this.urlTriggerRes.login.test(document.URL);
    },

    makeElemsEditable: function() {
      this.elems.$editable.attr('contentEditable', true);
    },

    setupBodyClickHandler: function() {
      this.elems.$body.click(this.handleBodyClick.bind(this));
      this.elems.$modal.click(function(ev) {
        ev.stopPropagation();
      });
    },

    setupLogin: function() {
      this.elems.$modal.$ownerCode.remove();
      this.elems.$modal.$submit.click(this.handleLoginSubmit.bind(this));
    },

    setupSignup: function() {
      this.elems.$modal.$submit.click(this.handleSignupSubmit.bind(this));
    },

    setupSignupOrLogin: function() {
      if (this.loginOrSignupTriggered()) {
        this.addModal();
        if (this.signupTriggered())
          this.setupSignup();
        else if (this.loginTriggered())
          this.setupLogin();
      }
    },

    signupTriggered: function() {
      return this.urlTriggerRes.signup.test(document.URL);
    },

    ////////// style tag

    $style: function() {
      var styleTag = "<style> " +
        "div#cms-menu {" +
          "position: fixed;" +
          "top: 0;" +
          "right: 0;" +
          "z-index: 9999;" +
          "margin: 1rem;" +
          "font-family: Helvetica, Arial;" +
        "}" +
        "a#cms-reveal {" +
          "position: relative;" +
          "padding: 1rem;" +
          "display: block;" +
          "color: #c4ffcc;" +
          "text-decoration: none;" +
          "font-weight: 700;" +
          "border-radius: 0.25em;" +
          "border: 0;" +
          "outline: 0;" +
          "background-color: #2d2d2d;" +
          "box-shadow: 0px 2px 0px 0px #2d2d2d;" +
        "}" +
        "a#cms-reveal:hover {" +
          "background-color: #6c6c6c;" +
        "}" +
        "a#cms-reveal:active {" +
          "background-color: #2d2d2d;" +
          "box-shadow: none;" +
          "top: 2px;" +
        "}" +
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
          "background-color: #2d2d2d;" +
          "padding: 1em;" +
          "box-sizing: border-box;" +
          "color: #2d2d2d;" +
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
          "color: #2d2d2d;" +
          "background-color: #c4ffcc;" +
        "}" +
      "</style>";

      return $(styleTag);
    }

  }

  // represent single editable elems

  function Content(args) {
    this.qc   = args.qc;
    this.elem = args.elem;
    this.initCss();
    this.setId();
    this.setQuery();
  }

  Content.prototype = {

    ////////// defaults

    DBContent: Parse.Object.extend("Content"),

    ////////// methods

    createDBobject: function() {
      var dbObject = new this.DBContent();
      dbObject.save({
        contentId: this.id,
        html: this.elem.html(),
        pendingHtml: ''
      });
      return dbObject;
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
      this.isPending = (!!this.qc.currentUser && this.pendingHtmlIsInDb());
      var html = (this.isPending) ? this.dbObject.get('pendingHtml') : this.dbObject.get('html');
      this.elem.html(html);
    },

    pendingHtmlIsInDb: function() {
      return (this.dbObject.get('pendingHtml') != '');
    },

    saveToDB: function() {
      if (!!this.qc.currentUser) {
        if (this.qc.currentUser.get('role') != 'admin') {
          this.dbObject.save({ pendingHtml: this.elem.html() });
        } else {
          this.dbObject.save({
            html: this.elem.html(),
            pendingHtml: ''
          });
        }
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
        this.dbObject = this.createDBobject();
      }
      this.elem.css('display', '');
    },

  }

}(window, document));