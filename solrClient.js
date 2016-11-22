/** clients attach itself to a container that will render the results
 * the search box must be built separately
 * Usage
 */
var SolrClient = function(e, options) {
  // default options
  var defaults = {
    async: true,
    url: '',
    defaultSearchBox:'',
    searchAction: '',
    checkAuth: false,
    successMessage: null,
    errorMessage: "<strong>No results found for: <em>%1%</em></strong>",
    successHandler: null,
    dataType: 'json',
    start: 'start',
    rows: 10,
    idField: "id",
    totalRecordsFound: 0,
    currentRecordsNumber: 0,
    rendererHandler: function() {},
    paginationHandler: function() {},
    errorHandler: errorDefaultHandler,
    queryServerHandler:query,
    paginationModeAppend: false,
    paginationModeAppending:false,
    highlighterHandler: defaultHighlighterHandler,
    initial_query_params: '',
    // http://wiki.apache.org/solr/DisMaxQParserPlugin#Examples
    // sample: ?q=video&defType=dismax&qf=features^20.0+text^0.3&bq=cat:electronics^5.0
    searchBoostBiasQuery: {},
    //provides a selector for the search text box
    defaultTextBoxSelector: 'input[type="text"][name="q"]',
    defaultSolrParams: {'wt': "json", 'json.wrf': 'jsonpCallback', 'fl': '*,score'},
    target: {resultsContainer: null, resultsContent: null, resultsPagination: null}
  };
  var $opts = $.extend(true, {}, defaults, options);

  if ($opts.url.length==0 || $opts.searchAction.length==0) {
    //log need URL to initialize plugin
    return false;
  }
  
  
  $opts.initial_query_params = getURLParameter('q');
  
  if ($(e).length > 0) {
    $opts.target.resultsContainer = $(e);
    // check for required content element, if not present add it
    if ($('.content', $(e)).lenght > 0) {
      $opts.target.resultsContent = $('.content', $(e));
    }
    if ($('.pagination', $(e)).lenght > 0) {
      $opts.target.resultsPagination = $('.pagination', $(e));
    }
  }
  else {
    initContainer();
  }
  $opts.target.resultsContainer.addClass('hide');
  //if we have query parameters passed run a a query with them
  if ($opts.initial_query_params !== null && $opts.initial_query_params !== undefined && $opts.initial_query_params.length > 0) {
    var options = {start: $opts.start, rows: $opts.rows};
    query($opts.initial_query_params, options);
  }
  
  $opts.paginationHandler($opts);
  
  function defaultHighlighterHandler(row, data) {
    for (var highlightedField in data.highlighting[row[$opts.idField]]) {
      row[highlightedField] = data.highlighting[row[$opts.idField]][highlightedField];
    }
    return row;
  }


  /**
   * The container where the results are going to be attached
   * @param {type} target
   * @returns {undefined}
   */
  function initContainer() {
    //not sure about not passing a container for the results
    var someContainer = '<div id="default-results-container"><div class="caption">Search Results</div></div><div class="row solr-results">'
            + '<div class="title"></div>'
            + '<div class="content"></div>'
            + '<div class="pagination"><ul><li><a href="#" class="prev">Prev</a></li><li><a href="#" class="next">Next</a></li></ul></div></div>';
    $("body").append(someContainer);
    $opts.target.resultsContainer = $("#default-results-container");
    $opts.target.resultsContent = $("#default-results-container .content");
    $opts.target.resultsPagination = $("#default-results-container .pagination");

  }

//Helper funtion to get the URL parameters
//TODO: This may be better in a more generic container/package
  function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null;
  }

  function submitWithKeyboard(e) {
    if (e.keyCode === 13) {
      e.preventDefault();
      processSearchFormRequest(e);
      return false;
    }
  }
  ;

  /**
   * This will happend on page load
   * @param {type} e
   * @param {type} options
   * @returns {undefined}
   */
  function processSearchFormRequest(e, options) {
    var form = $(e.data.context);
    var queryText = $('input.solr-search-query', form).val();
    //send search query only when we have a significant amount of characters

    if (queryText.length > 1) {
      query(queryText, options);
    }
  }

  /**
   * Convert an Object or associative array into a QF solr string
   * Client code must make sure the object/array is in the proper format:
   * {
   *  SOlrfieldName:'valid QF value'
   * }
   * @param {type} obj
   * @returns {String}
   */
  function _solrQFyObject(obj) {
    var QF = "";
    $.each(obj, function(k, v) {
      if (v == "1") {
        QF += k + " ";
      }
      else {
        QF += k + "^" + v + " ";
      }
    });
    return QF;
  }

  /**
   * Default rendererHandler: appends the error to the client results container
   * @param {type} data
   * @returns {String}
   */
  function errorDefaultHandler(text) {
    $('.content', $opts.target.resultsContainer).html();
    $opts.target.resultsContainer.removeClass('hide');
  }
  /**
   * Performs the SOlr request using default parameters, plus q built from text and the pagination parameters start and rows provided by the client code
   * @param {type} text
   * @param {type} options
   * @returns {undefined}
   */
  function query(text, options) {
    
    var start;
    var rows;
    if (options !== null && options !== undefined) {
      start = (!isNaN(parseFloat(options.start)) && isFinite(options.start)) ? options.start : 0;
      rows = (!isNaN(parseFloat(options.start)) && isFinite(options.start)) ? options.rows : 10;
    }

    var requestQueryParams = $.extend({}, $opts.defaultSolrParams, {'q': text, 'start': start, 'rows': rows});
    var QF = $.trim(_solrQFyObject($opts.searchBoostBiasQuery.QF));
    var BQ = $opts.searchBoostBiasQuery.BQ;
    requestQueryParams = $.extend({}, requestQueryParams, {'defType': 'dismax', qf: QF, bq: BQ});
    $.ajax({
      type: 'GET',
      url: $opts.url,
      async: true,
      contentType: "application/json",
      dataType: "jsonp",
      'jsonp': 'json.wrf',
      data: requestQueryParams,
      success: function(data) {
        if (data.response.numFound > 0) {
          $opts.totalRecordsFound = data.response.numFound;
          $opts.currentRecordsNumber = data.response.docs.length;
          $opts.rendererHandler(data, $opts);
          //update the pagination links
          //$opts.paginationHandler($opts);
        }
        else {
          errorDefaultHandler($opts.errorMessage.replace('%1%', escape(data.responseHeader.params.q)));
        }
      }
    });
  }
  return {
    /**
     * Wrapper to expose the utility to convert Objects/associative arrays into solr QF strings
     */
    solrQFyObject: function(obj) {
      return _solrQFyObject(obj);
    },
    field: 'value',
    querySolr: function(text, options) {
      if (!responseData) {
        //query(text, options);
      }
      return this;
    },
    typeAhead: function(whereToPlaceTheSearchBoxSelector) {
      return this;
    },
    //provides a default search box, for the lazy ones
    defaultSearchBox: function(whereToPlaceTheSearchBoxSelector) {
      var $target = $(whereToPlaceTheSearchBoxSelector);
      $target.attr('action', $opts.searchAction);
      $target.attr('method', 'GET');
      $target.empty();
      var inputText = '<div class="form-group"><input type="text" name="q" class="form-control input-sm solr-search-query" placeholder="Search" autocomplete="off"></div>';
      var inputTextStart = '<input type="hidden" name="start" value="' + $opts.start + '">';
      var inputTextRows = '<input type="hidden" name="rows"  value="' + $opts.rows + '">';
      var submit = '<button type="button" class="btn btn-default btn-xs solr-search-submit" data-loading-text="Loading...">Search</button>';
      $target.html(inputText + inputTextStart + inputTextRows + submit);
      // $('input.solr-search-query', $target).on('keydown', $target, submitWithKeyboard);
      // $('button.solr-search-submit', $target).on('click', $target, processSearchFormRequest);
      $target.removeClass('hide');
      return this;
    }

  };
}
;
$.fn.SolrClient = function(options) {
  return $.fn.encapsulatedPlugin('solrClient', SolrClient, this, options);
};