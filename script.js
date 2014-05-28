Parse.initialize("bVFoQYUP5OzQ9QVkcLVjnvwcF9UWpo4NZENeaMwr", "nXrj16E8iYOgrHfZYTJ46VuBZs3mh56nS4B1ANxl");

var Content = Parse.Object.extend("Content");

var $contentElems = $('[data-cms]');

$contentElems.each(function(i) {
  $elem = $(this);

  var contentId = $elem.data('cms');

  var query   = new Parse.Query(Content);
  query.equalTo("contentId", contentId);

  query.first({
    success: function(savedContent) {
      if (!!savedContent) {
        // load already-saved content into appropriate place
        $elem.html(savedContent.html);
      } else {
        // first instance of the content. save it to the DB
        var content = new Content();
        content.save({
          contentId: contentId,
          html: $elem.html()
        }, {
          success: function(savedContent) {
            console.log(savedContent);
          },
          error: function(model, err) {
            console.log(err);
          }
        });
      }
    },
    error: function(err) {
      console.log(err);
    }
  });
});

$contentElems.