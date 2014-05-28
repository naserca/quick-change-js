Parse.initialize("bVFoQYUP5OzQ9QVkcLVjnvwcF9UWpo4NZENeaMwr", "nXrj16E8iYOgrHfZYTJ46VuBZs3mh56nS4B1ANxl");
var DBContent = Parse.Object.extend("Content");

function Content(args) {
  this.elem = args.elem;
  this.initCss();
  this.setId();
  this.setQuery();
}

Content.prototype.initCss = function() {
  this.makeEditable();
  this.elem.css('display', 'none');
}

Content.prototype.makeEditable = function() {
  this.elem.attr('contentEditable', true);
}

Content.prototype.setId = function() {
  this.id = this.elem.data('cms');
}

Content.prototype.setQuery = function() {
  this.query = new Parse.Query(DBContent);
  this.query.equalTo('contentId', this.id);
}

Content.prototype.findFromDB = function() {
  return this.query.first();
};

Content.prototype.syncFromDB = function(dbObject) {
  this.dbObject = dbObject;
  this.elem.html(dbObject.get('html'));
  this.elem.css('display', '');
};

Content.prototype.saveToDB = function() {
  if (!!this.dbObject) {
    this.dbObject.save({
      html: this.elem.html()
    });
  }
};

$('[data-cms]').each(function() {
  var content = new Content({
    elem: $(this)
  });

  content.elem.blur(function() {
    content.saveToDB();
  });

  content.findFromDB().then(function(dbObject) {
    if (!!dbObject) {
      // load already-saved content into appropriate place
      content.syncFromDB(dbObject);
    } else {
      // first instance of the content. save it to the DB
      content.dbObject = new ParseContent();
      content.dbObject.save({
        contentId: content.id,
        html: content.elem.html()
      })
    }
  });
});