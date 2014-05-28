Parse.initialize("bVFoQYUP5OzQ9QVkcLVjnvwcF9UWpo4NZENeaMwr", "nXrj16E8iYOgrHfZYTJ46VuBZs3mh56nS4B1ANxl");

var Content = Parse.Object.extend("Content");

var $contentElems = $('[data-cms]');

$contentElems.each(function(i) {
  var $elem = $(this);
  $elem.attr('contentEditable', true);
  $elem.css('display', 'none');

  var contentId = $elem.data('cms');

  var query = new Parse.Query(Content);
  query.equalTo("contentId", contentId);

  query.first().then(function(savedContent) {
    if (!!savedContent) {
      // load already-saved content into appropriate place
      $elem.html(savedContent.get('html'));
      $elem.css('display', '');
    } else {
      // first instance of the content. save it to the DB
      var content = new Content();
      content.save({
        contentId: contentId,
        html: $elem.html()
      });
    }
  });

  $elem.blur(function(ev) {
    query.first().then(function(savedContent) {
      savedContent.save({
        html: $elem.html()
      });
    });
  });
});