function QuickChange(appId, jsKey, options) {
  return this.init(appId, jsKey, options);
}

(function (window, document) {

  var DBContent = Parse.Object.extend("Content");
  var DBLocale  = Parse.Object.extend("Locale");

  QuickChange.prototype = {

    ////////// defaults

    urlTriggerRes: {
      signup: /#qcsignup/,
      login:  /#qclogin/,
      logout: /#qclogout/
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
      $dataCms: $('[data-cms]'),
      $locales: $('[data-cms-locale]')
    },

    locales: [],
    contents: [],
    users: [],

    ////////// init

    init: function(appId, jsKey, options) {
      Parse.initialize(appId, jsKey);
      this.insertStyleTag();
      this.activateElems();
      this.currentUser = Parse.User.current();
      this.findAllUsers();
      if (!!this.currentUser) {
        this.toggleEditable(true);
        this.setupLogout();
        this.getCurrentUserRole();
      } else {
        this.setupSignupOrLogin();
      }
      this.getLocales();
    },

    ////////// methods

    activateElems: function() {
      var qc = this;
      this.elems.$dataCms.each(function() {
        var content = new Content({
          qc: qc,
          currentUser: qc.currentUser,
          elem: $(this)
        });
        qc.contents.push(content);
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
      var trigger = url.match(this.urlTriggerRes.login) || url.match(this.urlTriggerRes.signup) || url.match(this.urlTriggerRes.logout);
      var cleanUrl = url.replace(trigger[0], '');
      return window.location.replace(cleanUrl);
    },

    createLocales: function(localeArray) {
      for (var i = localeArray.length - 1; i >= 0; i--) {
        var locale = new Locale({
          dbObject: localeArray[i]
        });
        this.locales.push(locale);
      };
    },

    handleLocales: function(localeArray) {
      this.createLocales(localeArray);
      this.setCurrentLocale();
    },

    handleBodyClick: function(ev) {
      this.elems.$modal.fadeOut(this.clearUrlTrigger.bind(this));
    },

    findAllUsers: function(ev) {
      var query = new Parse.Query(Parse.User);
      query.find().then(this.setUsers.bind(this));
    },

    findModalElems: function() {
      this.elems.$modal.$username  = this.elems.$modal.find('[name=username]');
      this.elems.$modal.$password  = this.elems.$modal.find('[name=password]');
      this.elems.$modal.$ownerCode = this.elems.$modal.find('[name=owner-code]');
      this.elems.$modal.$submit    = this.elems.$modal.find('.submit');
    },

    getCurrentUserRole: function() {
      var query = new Parse.Query(Parse.Role);
      query.equalTo('users', this.currentUser).first().then(this.setIsAdmin.bind(this));
    },

    getLocales: function() {
      Parse.Cloud.run('getLocales').then(this.handleLocales.bind(this));
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
      this.toggleEditable(true);

      // will refresh page!
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

    logoutTriggered: function() {
      return this.urlTriggerRes.logout.test(document.URL);
    },

    toggleEditable: function(isEditable) {
      this.elems.$dataCms.attr('contentEditable', isEditable);
    },

    setCurrentLocale: function(locale) {
      if (!!locale) {
        return this.currentLocale = locale;
      } else {
        for (var i = this.locales.length - 1; i >= 0; i--) {
          if (this.locales[i].dbObject.get('isDefault')) {
            return this.currentLocale = this.locales[i];
          }
        }
      }
    },

    setIsAdmin: function(role) {
      var isAdmin = (role.getName() == 'Admin');
      this.currentUser.set('isAdmin', isAdmin);
    },

    setUsers: function(parseResults) {
      this.users.push(parseResults);
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

    setupLogout: function() {
      if (this.logoutTriggered()) {
        Parse.User.logOut();
        this.toggleEditable(false);
        setTimeout(this.clearUrlTrigger.bind(this), 2000);
      }
    },

    setupSignup: function() {
      this.elems.$modal.$submit.click(this.handleSignupSubmit.bind(this));
    },

    setupSignupOrLogin: function() {
      if (this.loginOrSignupTriggered()) {
        this.addModal();
        if (this.signupTriggered()) {
          this.setupSignup();
        } else if (this.loginTriggered()) {
          this.setupLogin();
        }
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
          "font-size: .75rem;" +
          "text-align: center;" +
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

  };

  // represent single editable elems

  function Content(args) {
    this.qc   = args.qc;
    this.elem = args.elem;
    this.initCss();
    this.setId();
    this.findFromDb();
    this.setupSaveOnBlur();
  }

  Content.prototype = {

    ////////// methods

    changeToLiveStyle: function() {
      return this.elem.css('background-color', '');
    },

    changeToPendingStyle: function() {
      return this.elem.css('background-color', '#ffcbaa');
    },

    createDbObject: function() {
      var dbObject = new DBContent();
      dbObject.save({
        contentId: this.id,
        html: this.elem.html(),
        pendingHtml: ''
      });
      return dbObject;
    },

    findFromDb: function() {
      var query = new Parse.Query(DBContent);
      query.equalTo('contentId', this.id);
      query.first().then(this.syncFromDb.bind(this));
    },

    initCss: function() {
      this.elem.css({
        display: 'none',
      });
    },

    loadFromDb: function(dbObject) {
      this.dbObject = dbObject;
      this.isPending = (!!this.qc.currentUser && this.pendingHtmlIsInDb());
      var html;
      if (this.isPending) {
        html = this.dbObject.get('pendingHtml');
        this.changeToPendingStyle();
      } else {
        html = this.dbObject.get('html');
        this.changeToLiveStyle();
      }
      this.elem.html(html);
    },

    pendingHtmlIsInDb: function() {
      return (this.dbObject.get('pendingHtml') != '');
    },

    saveToDb: function() {
      if (!!this.qc.currentUser) {
        if (this.qc.currentUser.get('role') != 'admin') {
          this.dbObject.save({ pendingHtml: this.elem.html() });
        } else {
          this.dbObject.save({
            html: this.elem.html(),
            pendingHtml: ''
          });
          this.changeToLiveStyle();
        }
      }
    },

    setId: function() {
      this.id = this.elem.data('cms');
    },

    setPending: function() {
      this.isPending = true;
      this.changeToPendingStyle();
    },

    setupSaveOnBlur: function() {
      this.elem.blur(this.saveToDb.bind(this));
    },

    syncFromDb: function(dbObject) {
      if (!!dbObject) {
        // load already-saved content into appropriate place
        this.loadFromDb(dbObject);
      } else {
        // first instance of the content. save it to the DB
        this.dbObject = this.createDbObject();
      }
      this.elem.css('display', '');
    },

  };

  ////////// locale //////////

  function Locale(args) {
    this.dbObject = args.dbObject;
  }

  Locale.prototype = {

  };

}(window, document));