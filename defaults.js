/**
 * JQuery Solr client default options and utitlity functions
 * @param {type} $
 * @returns {undefined}
 * @requires renderersUtil.js
 * the semi-colon before function invocation is a safety net against concatenated
 scripts and/or other plugins which may not be closed properly.
 * Requires jQueryRenderersAPI
 */
;
//Use for wrapping all user access related behavior and settings
var CoreConstants = CoreConstants || {};
CoreConstants.messagesHandler = {};
var AccessControl = AccessControl || {'settings': {}, 'behaviors': {}, 'locale': {}};

var RendererApi = RendererApi || {'settings': {}, 'behaviors': {}, 'locale': {}};
var ValidationAPI = ValidationAPI || {'settings': {}, 'behaviors': {}, 'locale': {}};
/// Extending defaults
RendererApi.settings.newResultsAction = Object.freeze({"refresh":1,"append":2});
RendererApi.settings.entityLinkAction = Object.freeze({"view":1,"create":2, "edit":3});
// DELETE RendererApi.settings.searchType = Object.freeze({"entity":1,"agent":2});
RendererApi.settings.dataSource = {};


/**
 * Validation API
 */
ValidationAPI.validation.prototype = $.extend({}, ValidationAPI.validation.prototype, {
  //default access to 
  canAccess: function(url, item) {
    return true;
  },
});

/**
 * Allows the client to pass user data used by the search connector(PROXI) to add extra filtering options to the SOlr query
 */
RendererApi.behaviors.userAccessControl = function() {
  var user = SomeUtilsAPI.getAuth();
  if (SomeUtilsAPI.hasValue(user)) {
    //Build a new user object for the search connector build access filters to the query
    user = {'userData1':user.propertyOne};
    return {'user': JSON.stringify(user)};
  } else {
    return {};
  }
};

/**
 * Utility function to build URLS replacing patterns with dynamic values
 */
RendererApi.behaviors.replaceUrlPlaceholders = function(url, map) {
  $.each(map, function(placeholder, value) {
    url = url.replace(placeholder, value);
  });
  return url;
};

/**
 * Provided a machine text, returns human readable text.
 */
RendererApi.behaviors.getLabelOf = function(text) {
  switch (text.toLowerCase()) {
    case 'some weird machine name':
      return "Human Machine Name";
    default:
      return text;
  }
};

/**
 * Renders the returned values with the proper highlighting
 */
RendererApi.behaviors.highLightItem = function(resultItem, hightlighting) {
  $.each(hightlighting, function (fieldName, markup){
   resultItem[fieldName] = markup;
  });
}
/**
 * Returns a rendered (jQuery) object link
 * @param {type} item
 * @param {type} options
 * @returns {Array}
 */
RendererApi.behaviors.getItemActions = function(item, options) {
  options = options || {};
  var actions = [];
  var itemOptions = item["#options"] || {};
  var actionTypes = itemOptions["actionTypes"] || [RendererApi.settings.entityLinkAction.view, RendererApi.settings.entityLinkAction.create];
  var renderedAction = [];
  if (actions.length > 0) {
    for (var pos in actions) {
      var appUrl = options.appUrl || "/";
      var attributes = $.extend({},actions[pos]["attributes"], {"data-path":actions[pos]["path"]});
      var link = RendererApi.render("link", actions[pos]["text"], "#", {"attributes": attributes});
      var accessOptions = {callBacks:actions[pos]['accessValidation'], 'path':actions[pos]["path"],item:item};
      link.on("click",accessOptions, ValidationAPI.validation);
      renderedAction.push(link);
    }
  }
  return renderedAction;
};

/**
 * RendererApi. Default rendering functions
 * format
 * function_name: function(args) {
     //function body
 }
 */ 
RendererApi.render.prototype = $.extend({}, RendererApi.render.prototype, {
  field_name: function(args, options) {
    var link = [];
    var item = $.extend({}, args, {"#options": {actionTypes: [RendererApi.settings.entityLinkAction.view]}});
    var actionLink = RendererApi.behaviors.getItemActions(item, options);
    var url = ""
    if (actionLink.length > 0) {
      url = actionLink[0].data("path");
    }
    link = RendererApi.render("link", item.name, "#", {attributes: {}});
    //attach validationn to the link
    var accessValidation = [];
    // ...
    if (accessValidation && accessValidation.length) {
      var accessOptions = {callBacks: accessValidation, 'path': url,item: item};
      link.on("click", accessOptions, ValidationAPI.validation);
    }
    return link;
  },
  noResultsSearch: function (data, options){
    var resultsContainer = $(options.target.resultsContainer);
    var resultsContent = $(options.target.resultsContent, resultsContainer);
    resultsContent.empty();
    options.renderEmptyResults("No results found for the current parameters set.");
    return false;
  },
  /**
   * Renders the results as a list with an expandable option, that shows extra details
   * @param {type} data
   * @param {type} options
   * @returns {Boolean}
   */
  expandableList: function(data, options) {
    RendererApi.settings.dataSource= $.extend({},{name :"solr", "options": options});
    var intitialStart = parseInt(options.start);
    var resultsContainer = $(options.target.resultsContainer);
    var list = data.response.docs || [];
    var resultsContent = $(options.target.resultsContent, resultsContainer);
    if (data.response.numFound === 0) {
      resultsContent.empty();
//      options.renderEmptyResults("No results found for the current parameters set.");
      console.warn("No results found for the current parameters set.");
      return false;
    }
    if (options.redering.onNewResultsMode === RendererApi.settings.newResultsAction.refresh) {
      resultsContent.empty();
    }
    var columns = options.resultsHandler.options.columns;
    //event Handler that expands the result item row
    var expandRow = function(e) {
      e.preventDefault();
      var resultItem = e.data.itemData || {};
      if (!resultItem) {
        return false;
      }
      var row = e.data.row;
      //call details rest service for this item
      options.target.restulsDetailsHandler(options, resultItem, row);
      var selectr = '.item-details'; 
      var toggleButton = $('a.toggle', row);
      setTimeout(function() {
        if ($(selectr, row).is(":hidden")) {
          $(selectr, row).slideDown(function() {
            toggleButton.removeClass('expand').addClass('collapse');
            $(row).removeClass('collapsed').addClass('expanded');
          });
        } else {
          $(selectr, row).slideUp(function() {
            toggleButton.removeClass('collapse').addClass('expand');
            $(row).removeClass('expanded').addClass('collapsed');
          });
        }
      }, 500);
    };
    if (options.redering.onNewResultsMode === RendererApi.settings.newResultsAction.refresh || (options.redering.onNewResultsMode === RendererApi.settings.newResultsAction.append && !resultsContent.hasClass("results"))) {
      var renderedHeader = $('<li />', {'class': 'header'});
      $.each(columns, function(index, value) {
        var width = (typeof value.width === 'number') ? ("span" + value.width) : "column " + value.width;
        value.attributes["class"] += " " + width;
        $('<div />', value.attributes).appendTo(renderedHeader);
      });
      renderedHeader.appendTo(resultsContent);
    }
    var renderedContent = [];
    var ord = resultsContent.find("li.result-item").length;
    var zebra = "";
    $.each(list, function(index, resultItem) {
      RendererApi.behaviors.highLightItem(resultItem, data.highlighting[resultItem.id]);
      ord++;
      zebra = (ord % 2) ? "odd" : "even";
      var visibleWrapper = $('<div />', {'class': "item-visible-header"});
      var etype = resultItem.etype;
      $.each(columns, function(index, value) {
        if (typeof value.elements !== "undefined" && (value.elements)) {

          var width = (typeof value.width === 'number') ? ("span" + value.width + "-no-gutter") : "column " + value.width;

          var cell = $('<div />', {'class': index + " " + width});
          $.each(value.elements, function(i, fieldName) {
            if (typeof fieldName === "function") {
              cell.append(fieldName(resultItem, options));
            } else {
              cell.append(RendererApi.render(fieldName, resultItem, options));
            }
          });
          cell.appendTo(visibleWrapper);
        }
      });

      //hidden stuff
      var hiddenWrapper = $('<div />', {'class': "item-details"}).hide();
      var detailField = ["description"];//TODO: defined by entity type?
      $.each(detailField, function(index, fieldName) {
        $('<div />', {'class': 'item-details-wrapper', 'html': resultItem[fieldName]}).appendTo(hiddenWrapper);
      });
      var pubFlg = "un-published";
      if (SomeUtilsAPI.hasValue(resultItem.publish_flag) && resultItem.publish_flag[0] == "Y") {
        pubFlg =  "published";
      }
      var classes = ['result-item', etype, zebra, pubFlg, ("pos-" + ord), "collapsed"];

      // results toggler handlers. Named function to avoid confusing the debouncer function
      var itemDetailToggler = {
        show: function _showDetails(event, context) {
          $('.toggle', context).slideDown();
        },
        hide: function _hideDetails(event, context) {
          $('.toggle', context).fadeOut();
        }
      };
      //all together
      var itemLi = $('<li />', {'class': classes.join(" ")});
      renderedContent.push(
        itemLi.append(visibleWrapper)
          .append(hiddenWrapper)
          .append($('<a />', {"href": "#", 'class': 'toggle expand', 'html': "&nbsp;"}).on("click", {"row": itemLi, "itemData": resultItem}, expandRow))
      );
    });
    resultsContent.append(renderedContent);
    resultsContent.addClass("results");

    $("li.hide", resultsContent).removeClass("hide");

    var resultsExpandCollapseToggle = {};

    var totalPages = 1 + parseInt(options.totalRecordsFound / options.defaultSolrParams.rows);
    $(options.target.resultsTitle, resultsContainer).html("Your search for '" + options.context.query_params.q + "' returned " + options.totalRecordsFound + " results.").append(resultsExpandCollapseToggle);
    resultsContainer.removeClass('hide');
    //if we have a textbox, update its value from URL parameters
    $(options.defaultTextBoxSelector).val(function(index, value) {
      return options.context.query_params;
    });
  }

});
RendererApi.settings.defaultColumns = {
  'id': {
    "width": "fixed",
    "attributes": {'html': "Id", 'class': 'id'},
    "elements": ["field_db_id_value"]
  },
  'type': {
    "attributes": {'text': "Type", 'class': 'type'},
    "width": "fixed",
    "elements": ["field_etype"]
  },
  "name": {
    "attributes": {'text': "Name", 'class': 'name'},
    "width": "fluid",
    "elements": ["field_name"]
  },
  'actions': {
    "attributes": {'text': "Actions", 'class': 'actions'},
    "width": "fixed",
    "elements": [RendererApi.behaviors.getItemActions]
  }
};

(function($) {
  /**
   * Default values for SOlr JS Client, Ready only for now. 
   * Client code must get a copy of the values through getDefaultOptions(), modify them and 
   * pass the updated version to the client as option to modify behaviour
   */
  $.fn.SolrClientUtils = function() {
    /**
     * Provate methods and properties
     */
    var context = {};
    var updatedOptions = {};
    context.query_params = SomeUtilsAPI.getURLParameterArray();
    //validates and makes it integer type
    if (SomeUtilsAPI.isPositiveInteger(context.query_params.start)) {
      context.query_params.start = parseInt(context.query_params.start);
    }

    /**
     * Regular pagination handler. Uses link to pages to show the next page. NO !AJAX
     * @param {type} options
     * @returns {undefined}
     */
    var paginationHandlerLinks = function(options) {
      // add pagination events
      var showPages = SomeUtilsAPI.getURLParameter('pages');
      var pagination = SomeUtilsAPI.hasValue(showPages);

      if ($('.pager', options.target.resultsContainer).length > 0) {
        // preserve other URL query parameters
        var URLQueryParams = SomeUtilsAPI.getURLParameterArray();

        var intitialStart = parseInt(options.start);

        var totalPages = 1 + parseInt(options.totalRecordsFound / options.defaultSolrParams.rows);
        var pagesWindowLeast = 0;
        var pagesWindowMost = 10;
        var pagesWindowCurrent = parseInt(intitialStart / options.defaultSolrParams.rows);
        if ((pagesWindowCurrent - 6) > 0) {
          pagesWindowLeast = pagesWindowCurrent - 6;
          pagesWindowMost = pagesWindowCurrent + 4;
        }
        var links = new Array();
        if (pagination && totalPages > 1) {
          for (var i = pagesWindowLeast; i < pagesWindowMost; i++) {
            var queryParams = $.extend({}, URLQueryParams, {q: options.context.query_params, start: (options.defaultSolrParams.rows * i)});
            var link = $('<a/>', {
              'href': options.form.searchAction + "?" + $.param(queryParams),
              'text': (i + 1)
            });
            if (intitialStart == (options.defaultSolrParams.rows * i)) {
              link = $('<em/>', {'html': (i + 1)});
            }
            var page = $("<li/>", {
              'class': 'page ' + (i + 1)
            }).append(link);
            links.push(page);
          }
        }

        var rows = parseInt(options.defaultSolrParams.rows);
        var next = '';
        var prev = '';
        start = intitialStart + rows;
        if ((options.totalRecordsFound - intitialStart) > options.defaultSolrParams.rows) {
          URLQueryParams = $.extend({}, URLQueryParams, {q: options.context.query_params, start: start});
          next = $("<li/>", {
            'class': 'next-page'
          }).append(
                  $('<a/>', {
            'href': options.form.searchAction + "?" + $.param(URLQueryParams),
            'title': 'Next results page',
            'text': "Next"
          }));
          links.push(next);
        }

        start = 0;
        if ((intitialStart - rows) >= 0) {
          start = intitialStart - rows;
          URLQueryParams = $.extend({}, URLQueryParams, {q: options.context.query_params, start: start});
          prev = $("<li/>", {
            'class': 'next-page'
          }).append(
                  $('<a/>', {
            'href': options.form.searchAction + "?" + $.param(URLQueryParams),
            'title': 'Previous results page',
            'text': "Previous"
          }));
          links.unshift(prev);
        }

        $('ul.pager', options.target.resultsContainer).append(links);
      }
    };

    /**
     * Request to a restful server about details of the entity
     * @param {type} options: options
     * @param {type} resultItemData: result item
     * @param {type} context: jQuery context
     */
    function defaultRestulsDetailsHandler(options, resultItemData, domContext) {
      var populatedClass = "details-populated";
      var detailsSelector = '.item-details .item-details-wrapper';
      var appUrl = options.solrHome;
      var $e = $(domContext);
      $(detailsSelector+":not(.populated)", $e).each(function(idx){
        if (!$e.hasClass(populatedClass) && SomeUtilsAPI.isPositiveInteger(resultItemData.db_id_value[0])) {
            //var id = "80360250";
            var id = resultItemData.db_id_value;
//          console.log(resultItemData);
            var restfulUrl = appUrl + "/document-description";
            var data = {'id':id, 'etype':resultItemData.etype,'wt': "json", 'json.wrf': 'jsonpCallback'};
            $.ajax({
              type: 'GET',
              url: restfulUrl,
              async: true,
              contentType: "application/json",
              dataType: "jsonp",
              'jsonp': 'json.wrf',
              data: data,
              success: function(data) {
                if (data.response.docs && data.response.docs[0] && !('error' in data.response.docs[0])){
                  var description = jQuery.parseJSON(data.response.docs[0].description || "{description:''}");
                  if (jQuery.isEmptyObject(description)) {
                    description= {"Message":"no description found for this item ("+id+")."};
                  }
                  var emptyDescription = true;
                  $.each(description, function(index, value) {
                    if (SomeUtilsAPI.hasValue(value)){
                      emptyDescription = false;
                      var descriptionItem = $('<div />', {'class': index, 'html': value}).prepend($('<strong />', {'class': 'property ', 'html': RendererApi.behaviors.getLabelOf(index)+":"}));
                      $(detailsSelector, $e).append(descriptionItem).addClass("populated");
                    }
                  });
                  if (emptyDescription) {
                    $(detailsSelector, $e).append($("<div class='populated'>All details fields are null or empty</div>"));
                  }
                  $e.addClass(populatedClass);
                }
                else {
                  var descriptionItem = $('<div />', {'class': 'description', 'html': 'Details not available','title':'Check console for error details'});
                  var errorMessage = data.response.docs[0].error || "Unknown error occur while retrieving item detials";
                  $(detailsSelector, $e).append(descriptionItem).addClass("populated").addClass("with-error");
                  console.error("Error while retrieving the item description: \n",errorMessage);
                }
              },
              error: function(jqXHR, textStatus, errorThrown) {
              }
            });
          }
      });
      return false;
    }

    function infiniteScroller(event, options) {
      var itemsPerPageMaxAmount = 3000;
      var rows = parseInt(options.defaultSolrParams.rows);
      var start = parseInt(options.start);
      var windowsSizeRatio = $(this).scrollTop();
      if (windowsSizeRatio > 100) {
        $('#back-to-top').fadeIn();
      }
      else {
        $('#back-to-top').fadeOut();
      }
      if ($(window).scrollTop() >= $(document).height() - $(window).height()-5) {
        options.context.query_params.start += rows;
        options.redering.onNewResultsMode=RendererApi.settings.newResultsAction.append;
        
        if (options.context.query_params.start <= itemsPerPageMaxAmount) {
          options.queryServerHandler(options.context.query_params, options);
        }
      }
      return false;

    }

    var InfiniteScroll = function(options) {
      $(document).ready(function() {
        //check whether there is enough content to be able to trgger a scroll event
//        if ((document.documentElement.scrollHeight / document.documentElement.clientHeight) < .40) {
//          $('#more-results').click(function(e) {
//            options.context.query_params.start = options.context.query_params.start + options.defaultSolrParams.rows;
//            options.queryServerHandler(options.context.query_params.q, options);
//            $('#more-results').hide();
//          }).fadeIn();
//          //show more button
//        }

        $('#back-to-top').click(function() {
          $("html, body").animate({
            scrollTop: 0
          }, 500, "linear", function() {
            $('#back-to-top').fadeOut();
          });
          return false;
        });

        $(window).scroll(function(e) {
          SomeUtilsAPI.eventBouncer(infiniteScroller, 200, e, options);
        });
      });
    };
    
    //"Public" methods and properties
    return {
      /**
       * Returns a human friendly string for the entity type.
       * @param {type} etype entity type
       * @returns {String}
       */
      eTypeLabelMap: function(etype) {
        return RendererApi.behaviors.getLabelOf(etype);
      },
      //https://wiki.apache.org/solr/ExtendedDisMax
      //https://wiki.apache.org/solr/LocalParams
      getSearchDefaultOperator: function(context) {
        return "OR";
      },
      /**
       * 
       * @param {object} context: An object built out of the currently logged user profile data
       * @returns {Array} qf: An associative array of fields and weights (or object) to match a valid solr query field string
       * @see http://lucene.472066.n3.nabble.com/solr-render-biased-search-result-td2461155.html
       * @see http://people.apache.org/~hossman/ac2012eu/#slide18
       * @see http://blog.tolleiv.de/2013/06/genetic-algorithms-boosting-solr/
       */
      getQueryBoostBias: function(context) {
        // for now get the user type from the URL
        // 1 deal users
        // 2 pf users
        // so on
        var BootBias = {};
        var user = SomeUtilsAPI.getAuth();
        var userType = user.profile;
        var comonQFValues = {
          db_id_value: 50,
          etype: 1,
          name: 1,
          name_other: "0.9999",//Just to show that float numbers are valid
          description: "0.1",
          publish_flag: 1
        };
        BootBias["BQ"] = 'biztype:'+userType+'^200 ';
        switch (userType.toUpperCase()) {
          //Updates bias based on user properties
          default:
            break;
        }
        return BootBias;
      },
      paginationHandler: {
        InfiniteScroll: InfiniteScroll,
        'paginationHandlerLinks': paginationHandlerLinks
      },
      searchFormEvents: function(options) {
        var q = SomeUtilsAPI.getURLParameter('q');
        if (q) {
          $(options.form.defaultSearchBox).val(q);
        }

        $(options.form.defaultSearchButton).click(function(e) {
          var val = $(options.form.defaultSearchBox).val();
          if (val.length>1) {
            var queryParams = $.extend({}, options.context.query_params, {q:val , start: 0});
            e.preventDefault();
            //TODO: Remove user from query_params and keep it in the context. Add it to the query data only at the very last moment
            delete queryParams.user;
            SomeUtilsAPI.redirect(options.appUrl + options.form.searchAction+'?' + $.param(queryParams));
          }else{
            CoreConstants.messagesHandler.apply(this,['warning', "Please enter at least two characters."]);
            return false;
          }
        });
        //http://stackoverflow.com/questions/3429520/how-do-i-get-placeholder-text-in-firefox-and-other-browsers-that-dont-support-t
        $(options.form.defaultSearchBox).click(function(e) {
          //http://stackoverflow.com/questions/1165222/capture-a-shift-and-click-event-with-jquery
//          if (!e.shiftKey) {
//            $(this).val('');
//          }
        }).keypress(function(e) {
          var keycode = (e.keyCode ? e.keyCode : e.which);
          var val = $(this).val();
          if (keycode === 13) {
            if ( val.length > 1) {
              e.preventDefault();
              var queryParams = $.extend({}, options.context.query_params, {q: $(this).val(), start: 0});
              //TODO: Remove user from query_params and keep it in the context. Add it to the query data only at the very last moment
              // We just need q and start ?
              var q = queryParams.q;
              var start = queryParams.start;
  //            delete queryParams.user;
              queryParams = {};
              queryParams["q"] = q;
              queryParams["start"] = start;
              SomeUtilsAPI.redirect(options.appUrl + options.form.searchAction+'?' + $.param(queryParams));
              //As per requirement 'RQ117940' o..O
            }
          }
        })/*.blur(function(e) {
          $this = $(this);
          if ($this.val().length == 0) {
            $this.val(options.form.placeHolderText);
          }
        }).val(options.form.placeHolderText)*/;
      },
      setUpdatedOptions: function(__updatedOptions) {
        updatedOptions = __updatedOptions;
      },
      getUpdatedOptions: function() {
        return updatedOptions;
      },
      /**
       * Provides read only default options.
       * @returns {SolrClientOptions.Anonym$0.defaultOptions.Anonym$33}
       */
      getDefaultOptions: function() {
        return {
          'url': '/select',
          'context': context,
          'appUrl': '/WebSamples',
          'accessControl': RendererApi.behaviors.userAccessControl,
          'messagesHandler':SomeUtilsAPI.messages.displayMessage,
          'form': {
            'attachSearchFormEvents': this.searchFormEvents,
            'searchAction': '/search.jsp',
            'defaultSearchBox': '#solr-searchbox',
            'defaultSearchButton': '.search-box-area #searchAction',
            'placeHolderText': ""
          },
          'target': {
            'resultsContainer': '#solr-results',
            'resultsContent': '.content>ul',
            'resultsPagination': '.pagination',
            'resultsTitle': '.title',
            'restulsDetailsHandler': defaultRestulsDetailsHandler
          },
          'redering': {
            'onNewResultsMode':RendererApi.settings.newResultsAction.refresh
          },
          'resultsHandler': {
            'engine': RendererApi.render,
            'renderer': 'expandableList',
            options:{columns:RendererApi.settings.defaultColumns }
          },
          'noResultsHandler': {
            'engine': RendererApi.render,
            'renderer': 'noResultsSearch', 
            options:{ }
          },
          'paginationHandler': this.paginationHandler.InfiniteScroll,
          'paginationModeAppend': true,
          'searchBoostBiasQuery': this.getQueryBoostBias(context),
          'searchOperator': this.getSearchDefaultOperator(context),
          'itemsOptions': {}
        };
      }
    };
  };
})(jQuery);
