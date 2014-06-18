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
      $userActionModal: $("<div href='#' class='cms-signup cms-modal' style='display: none;'>" +
        "<form>" +
          "<input name='username' type='text' placeholder='username' />" +
          "<input name='password' type='password' placeholder='password' />" +
          "<input name='owner-code' type='password' placeholder='owner code' />" +
          "<a class='submit' href='#'>submit</a>" +
        "</form>" +
      "</div>"),
      $menu: $("<div id='cms-menu'>" +
        "<a id='cms-reveal' href=''>qc</a>" +
        "<a id='cms-approve-all' href=''>approve all</a>" +
        "<a id='cms-toggle-pending' href=''>" +
          "<span id='cms-show-live'>show live</span><span id='cms-show-pending'>show pending</span>" +
        "</a>" +
        "<a id='cms-logout' href=''>logout</a>" +
      "</div>"),
      $dataCms: $('[data-cms]')
    },

    locales: [],
    contents: [],
    users: [],

    ////////// init

    init: function(appId, jsKey, options) {
      this.initCss();
      Parse.initialize(appId, jsKey);
      Parse.Cloud.run('checkQcInit').then(this.go.bind(this));
    },

    go: function(isInit) {
      if (isInit) {
        this.currentUser = Parse.User.current();
        if (!!this.currentUser) {
          this.toggleEditable(true);
          this.setupLogout();
          this.getCurrentUserRole();
          this.displayPending = true;
        }
        this.findOrCreateLocale();
      } else {
        this.initCss();
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

    addMenu: function() {
      this.findMenuElems();
      this.elems.$menu.$showPending.hide();
      if (!this.currentUser.get('isAdmin')) {
        this.elems.$menu.$approveAll.remove();
      }
      this.elems.$menu.appendTo('body');
      this.setupMenuClickHandlers();
    },

    addModal: function() {
      this.findModalElems();
      this.elems.$body.append(this.elems.$userActionModal);
      this.elems.$userActionModal.fadeIn();
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
      this.elems.$userActionModal.fadeOut(this.clearUrlTrigger.bind(this));
    },

    initCss: function() {
      this.elems.$dataCms.hide();
    },

    findMenuElems: function() {
      this.elems.$menu.$reveal        = this.elems.$menu.find('#cms-reveal');
      this.elems.$menu.$approveAll    = this.elems.$menu.find('#cms-approve-all');
      this.elems.$menu.$togglePending = this.elems.$menu.find('#cms-toggle-pending');
      this.elems.$menu.$showLive      = this.elems.$menu.find('#cms-show-live');
      this.elems.$menu.$showPending   = this.elems.$menu.find('#cms-show-pending');
    },

    findModalElems: function() {
      this.elems.$userActionModal.$username  = this.elems.$userActionModal.find('[name=username]');
      this.elems.$userActionModal.$password  = this.elems.$userActionModal.find('[name=password]');
      this.elems.$userActionModal.$ownerCode = this.elems.$userActionModal.find('[name=owner-code]');
      this.elems.$userActionModal.$submit    = this.elems.$userActionModal.find('.submit');
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
      this.elems.$userActionModal.$username.val(''); this.elems.$userActionModal.$password.val('');
      alert(error.message);
    },

    handleLoginSubmit: function(ev) {
      ev.preventDefault();

      Parse.User.logIn(this.elems.$userActionModal.$username.val(), this.elems.$userActionModal.$password.val(), {
        success: this.handleLoginOrSignupSuccess.bind(this),
        error: this.handleLoginError.bind(this)
      });
    },

    handleLoginOrSignupSuccess: function(user) {
      this.currentUser = user;
      this.elems.$userActionModal.fadeOut(this.elems.$userActionModal.remove);
      this.toggleEditable(true);

      // will refresh page!
      this.clearUrlTrigger();
    },

    handleSignupError: function(user, error) {
      this.elems.$userActionModal.$username.val(''); this.elems.$userActionModal.$password.val(''); this.elems.$userActionModal.$ownerCode.val('');
      alert(error.message);
    },

    handleInitOrSignupSubmit: function(ev) {
      ev.preventDefault();

      var user = new Parse.User();
      user.set("username", this.elems.$userActionModal.$username.val());
      user.set("password", this.elems.$userActionModal.$password.val());
      user.set("ownerCode", this.elems.$userActionModal.$ownerCode.val());

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

    setupMenuClickHandlers: function() {
      this.elems.$menu.$togglePending.click(this.onTogglePendingClick.bind(this));
    },

    onTogglePendingClick: function(ev) {
      ev.preventDefault();
      this.togglePending();
    },

    togglePending: function() {
      this.displayPending = !this.displayPending;
      for (var i = this.contents.length - 1; i >= 0; i--) {
        this.contents[i].displayEdit();
      };
      this.togglePendingUI();
    },

    togglePendingUI: function() {
      this.elems.$menu.$showLive.toggle(0);
      this.elems.$menu.$showPending.toggle(0);
    },

    handleUserRole: function(role) {
      this.currentUser.set('isAdmin', (role.getName() == 'Admin'));
      this.addMenu();
    },

    setUsers: function(parseResults) {
      this.users.push(parseResults);
    },

    setupBodyClickHandler: function() {
      this.elems.$body.click(this.handleBodyClick.bind(this));
      this.elems.$userActionModal.click(function(ev) {
        ev.stopPropagation();
      });
    },

    setupLogin: function() {
      this.elems.$userActionModal.$ownerCode.remove();
      this.elems.$userActionModal.$submit.click(this.handleLoginSubmit.bind(this));
    },

    setupInit: function() {
      this.elems.$userActionModal.$submit.click(this.handleInitOrSignupSubmit.bind(this));
    },

    setupLogout: function() {
      if (this.logoutTriggered()) {
        Parse.User.logOut();
        this.toggleEditable(false);
        setTimeout(this.clearUrlTrigger.bind(this), 2000);
      }
    },

    setupSignup: function() {
      this.elems.$userActionModal.$submit.click(this.handleInitOrSignupSubmit.bind(this));
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

    saveEdit: function() {
      Parse.Cloud.run('saveEdit', {
        html: this.elem.html(),
        contentId: this.dbObject.id
      });
    },

    setId: function() {
      this.id = this.elem.data('cms');
    },

    setupSaveOnBlur: function() {
      this.elem.blur(this.saveEdit.bind(this));
    }

  };

}(window, document));