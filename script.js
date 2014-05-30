function CMSProto(appId, jsKey, options) {
  return this.init(appId, jsKey, options);
}

(function (window, document) {

  var DBContent = Parse.Object.extend("Content");

  CMSProto.prototype = {

    init: function(appId, jsKey, options) {
      Parse.initialize(appId, jsKey);
      this.activateElems();
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
      this.elem.css('display', 'none');
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
    }

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
        })
      }
    },

  }

}(window, document));

