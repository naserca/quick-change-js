function QuickChange(appId, jsKey, options) {
  return this.init(appId, jsKey, options);
}

(function (window, document) {

  var DBContent = Parse.Object.extend("Content");
  var DBLocale  = Parse.Object.extend("Locale");
  var DBEdit    = Parse.Object.extend("Edit");

  QuickChange.prototype = {

    ////////// defaults

    urlTriggerRes: {
      init:   /#qcinit/,
      signup: /#qcsignup/,
      login:  /#qclogin/,
      logout: /#qclogout/
    },

    localeName: $('html').attr('lang'),

    elems: {
      $head: $('head'),
      $body: $('body'),
      $modal: $("<div href='#' class='cms-signup cms-modal' style='display: none;'>" +
        "<form>" +
          "<input name='username' type='text' placeholder='username' />" +
          "<input name='password' type='password' placeholder='password' />" +
          "<input name='owner-code' type='password' placeholder='owner code' />" +
          "<a class='submit' href='#'>submit</a>" +
        "</form>" +
      "</div>"),
      $dataCms: $('[data-cms]')
    },

    locales: [],
    contents: [],
    users: [],

    ////////// init

    init: function(appId, jsKey, options) {
      Parse.initialize(appId, jsKey);
      Parse.Cloud.run('checkQcInit').then(this.go.bind(this));
    },

    go: function(isInit) {
      if (isInit) {
        this.initCss();
        this.currentUser = Parse.User.current();
        if (!!this.currentUser) {
          this.toggleEditable(true);
          this.setupLogout();
          this.getCurrentUserRole();
          this.displayPending = true;
        }
        this.findOrCreateLocale();
      }
      this.insertStyleTag();
      this.setupUserActions();
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
      var trigger = url.match(this.urlTriggerRes.init) || url.match(this.urlTriggerRes.login) || url.match(this.urlTriggerRes.signup) || url.match(this.urlTriggerRes.logout);
      var cleanUrl = url.replace(trigger[0], '');
      return window.location.replace(cleanUrl);
    },

    handleLocale: function(locale) {
      this.setCurrentLocale(locale);
      this.activateElems();
    },

    handleBodyClick: function(ev) {
      this.elems.$modal.fadeOut(this.clearUrlTrigger.bind(this));
    },

    initCss: function() {
      this.elems.$dataCms.hide();
    },

    findModalElems: function() {
      this.elems.$modal.$username        = this.elems.$modal.find('[name=username]');
      this.elems.$modal.$password        = this.elems.$modal.find('[name=password]');
      this.elems.$modal.$ownerCode       = this.elems.$modal.find('[name=owner-code]');
      this.elems.$modal.$submit          = this.elems.$modal.find('.submit');
    },

    getCurrentUserRole: function() {
      var query = new Parse.Query(Parse.Role);
      query.equalTo('users', this.currentUser).first().then(this.handleUserRole.bind(this));
    },

    findOrCreateLocale: function() {
      Parse.Cloud.run('findOrCreateLocale', {
        name: this.localeName
      }).then(this.handleLocale.bind(this));
    },

    getLocales: function() {
      Parse.Cloud.run('getLocales').then(this.handleLocale.bind(this));
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

    handleInitOrSignupSubmit: function(ev) {
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

    userActionTriggered: function() {
      return (this.initTriggered() || this.signupTriggered()) || (this.loginTriggered());
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
      this.currentLocale = locale;
    },

    handleUserRole: function(role) {
      this.currentUser.set('isAdmin', (role.getName() == 'Admin'));
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

    setupInit: function() {
      this.elems.$modal.$submit.click(this.handleInitOrSignupSubmit.bind(this));
    },

    setupLogout: function() {
      if (this.logoutTriggered()) {
        Parse.User.logOut();
        this.toggleEditable(false);
        setTimeout(this.clearUrlTrigger.bind(this), 2000);
      }
    },

    setupSignup: function() {
      this.elems.$modal.$submit.click(this.handleInitOrSignupSubmit.bind(this));
    },

    setupUserActions: function() {
      if (this.userActionTriggered()) {
        this.addModal();
        if (this.initTriggered()) {
          this.setupInit();
        } else if (this.signupTriggered()) {
          this.setupSignup();
        } else if (this.loginTriggered()) {
          this.setupLogin();
        }
      }
    },

    signupTriggered: function() {
      return this.urlTriggerRes.signup.test(document.URL);
    },

    initTriggered: function() {
      return this.urlTriggerRes.init.test(document.URL);
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
          "height: 230px;" +
          "width: 300px;" +
          "margin-top: -115px;" +
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
    this.qc    = args.qc;
    this.elem  = args.elem;
    this.edits = [];
    this.setId();
    this.findOrCreateContent();
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

    setEdits: function() {
      var edits      = this.dbObject.get('edits')
      var Collection = Parse.Collection.extend({
        model: DBEdit,
        comparator: function(model) {
          return -model.createdAt.getTime();
        },
      });
      this.edits = new Collection(edits);
      return this.edits;
    },

    setLiveEdit: function() {
      this.liveEdit = this.edits.find(function(edit) { return edit.get('isLive') });
      return this.liveEdit;
    },

    setLastEdit: function() {
      this.lastEdit = this.edits.models[0];
      return this.lastEdit;
    },

    displayEdit: function() {
      var edit = (this.qc.displayPending) ? (this.lastEdit) : (this.liveEdit);
      this.elem.html(edit.get('html'));
      this.elem.css({ display: '' });
    },

    handleContentFromDb: function(dbObject) {
      this.dbObject = dbObject;
      this.setEdits();
      this.setLiveEdit();
      this.setLastEdit();
      this.displayEdit();
    },

    findOrCreateContent: function() {
      Parse.Cloud.run('findOrCreateContent', {
        contentId: this.id,
        html: this.elem.html(),
        localeId: this.qc.currentLocale.id
      }).then(this.handleContentFromDb.bind(this));
    },

    saveToDb: function() {
      Parse.Cloud.run('saveEdit', {
        html: this.elem.html(),
        contentId: this.dbObject.id
      });
    },

    setId: function() {
      this.id = this.elem.data('cms');
    },

    setupSaveOnBlur: function() {
      this.elem.blur(this.saveToDb.bind(this));
    }

  };

}(window, document));