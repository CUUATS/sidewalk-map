require([
  // 'esri/tasks/ClassBreaksDefinition',
  'esri/renderers/ClassBreaksRenderer',
  'esri/layers/FeatureLayer',
  'esri/layers/LayerDrawingOptions',
  'esri/dijit/Legend',
  'esri/map',
  'dojo/_base/array',
  'dojo/parser',
  'esri/request',
  'dojo/domReady!'
],
function(
  // ClassBreaksDefinition,
  ClassBreaksRenderer,
  FeatureLayer,
  LayerDrawingOptions,
  Legend,
  Map,
  array,
  parser,
  request) {
  parser.parse();
  var AGG_URL = 'http://utility.arcgis.com/usrsvcs/servers/06fb34d68e7a4673ba885015b671387b/rest/services/CCRPC/SidewalkInventoryScoreAggregated/MapServer',
    AGG_DEFAULT_FEATURE = 'Sidewalk',
    AGG_DEFAULT_FIELD = 'ScoreCompliance',
    map = new Map('map', {
      center: [-88.2, 40.1],
      zoom: 12,
      basemap: 'gray'
    }),
    aggLayer = new FeatureLayer(AGG_URL + '/0', {
      mode: FeatureLayer.MODE_SNAPSHOT,
      outFields: ['*'],
      opacity: 0.5
    }),
    fieldName = document.getElementById('fieldName'),
    featureType = document.getElementById('featureType'),
    updateButton = document.getElementById('updateMap'),
    featureFields = {},
    populateFieldList = function(featureType) {
      while (fieldName.firstChild) fieldName.removeChild(fieldName.firstChild);
      array.forEach(featureFields[featureType], function(field, i) {
        var option = document.createElement('option');
        option.value = field.value;
        option.appendChild(document.createTextNode(
          field.label.substr(0, field.label.length - 6)));
        fieldName.appendChild(option);
        if (field.label == 'Compliance Score') fieldName.selectedIndex = i;
      });
    };

    aggLayer.on('load', function(e) {
      var legend = new Legend({
        map: map,
        layerInfos: [{
          layer: aggLayer,
          title: 'Legend'
        }],
        autoUpdate: false
      }, document.getElementById('legend'));
      legend.startup();
    });
    map.addLayer(aggLayer);
    // map.addLayer(crLayer);

    request({
      url: AGG_URL + '/0',
      content: {
        f: 'json'
      },
      callbackParamName: 'callback'
    }).then(function(res) {
      // Set the minimum value for the renderer to 0.
      res.drawingInfo.renderer.minValue = 0;
      var renderer = new ClassBreaksRenderer(res.drawingInfo.renderer);

      // Populate the field choices object.
      array.forEach(
          featureType.children,
          function(ftOption) {
        featureFields[ftOption.value] = [];
        array.forEach(res.fields, function(field) {
          if (
              field.name.substr(0, ftOption.value.length) == ftOption.value &&
              field.alias.substr(field.alias.length - 5) == 'Score') {
            featureFields[ftOption.value].push({
              value: field.name,
              label: field.alias.substr(ftOption.text.length)
            });
          }
        });
      });

      // Set up the change handler for feature type.
      featureType.onchange = function() {
        populateFieldList(this.options[this.selectedIndex].value);
      };

      // Set the initial values of the feature type and field name selects.
      featureType.selectedIndex = 0;
      featureType.onchange();

      // Set up the click handler for the update map button.
      updateButton.onclick = function() {
        renderer.attributeField =
          fieldName.options[fieldName.selectedIndex].value;
        aggLayer.setRenderer(renderer);
        aggLayer.redraw();
      };
      updateButton.removeAttribute('disabled');
    });

});
