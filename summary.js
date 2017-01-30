require([
  'dojo/promise/all',
  'dojo/request',
  'dojo/domReady!'
],
function(
  all,
  request) {
    var tables,
      fields,
      makeCharts = function() {
        console.log(tables);
        console.log(fields);
      };

    all({
      fields: request('fields.json', {handleAs: 'json'}),
      tables: request('tables.json', {handleAs: 'json'})
    }).then(function(res) {
      tables = res.tables;
      fields = res.fields;
      makeCharts();
    });

});
