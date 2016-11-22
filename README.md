# SolrJSClient
JS/JQuery based client for Solr

How to use it:
```html
<!DOCTYPE html>
<html>
  <head>
    <title>Sample Search page</title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <script type="text/javascript" src="/plugins/solrClient/solrClient.js"></script>
    <script type="text/javascript">
      $(document).ready(function() {
        var context = {};
        var searchResultsHTMLTagTarget = '#solr-results';
        var searchFormHTMLTagTarget = 'form.solr-search';
        var options = {
          url: 'http://solr.my_domain.com:8088/index_name/select', // URL to Solr server
          searchAction: 'this_page.html', // Proxi search handler for added security and other checks
          defaultSearchBox: searchFormHTMLTagTarget, 
          rendererHandler: populateTable, 
          paginationHandler: paginationHandler_InfiniteScroll, 
          paginationModeAppend: true, 
          searchBoostBiasQuery: getQueryBoostBias(context)};
        //$(searchResultsHTMLTagTarget).SolrClient(options).defaultSearchBox(searchFormHTMLTagTarget);
        $(searchResultsHTMLTagTarget).SolrClient(options);
      });
    </script>
  </head>
  <body>
    <div>TODO write content</div>
  </body>
</html>

```
