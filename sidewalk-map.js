require([
  'esri/layers/ArcGISDynamicMapServiceLayer',
  // 'esri/tasks/ClassBreaksDefinition',
  // 'esri/renderers/ClassBreaksRenderer',
  'esri/layers/LayerDrawingOptions',
  'esri/map',
  'dojo/_base/array',
  'dojo/parser',
  'esri/request',
  'dojo/domReady!'
],
function(
  ArcGISDynamicMapServiceLayer,
  // ClassBreaksDefinition,
  // ClassBreaksRenderer,
  LayerDrawingOptions,
  Map,
  array,
  parser,
  request) {
  parser.parse();
  var AGG_URL = 'http://utility.arcgis.com/usrsvcs/servers/97ce6d6cf87e4e3a80d7e3d25f0f0bae/rest/services/CCRPC/SidewalkInventoryAggregatedScores/MapServer',
    AGG_FIELD_BASE = 'PCD.PCDQC.UrbanizedAreaAnalysisHexagon_SidewalkInventory.',
    AGG_DEFAULT_FEATURE = 'Sidewalk',
    AGG_DEFAULT_FIELD = 'ScoreCompliance',
    map = new Map('map', {
      center: [-88.2, 40.1],
      zoom: 12,
      basemap: 'gray'
    }),
    aggLayer = new ArcGISDynamicMapServiceLayer(AGG_URL, {
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

    map.addLayer(aggLayer);

    request({
      url: AGG_URL + '/0',
      content: {
        f: 'json'
      },
      callbackParamName: 'callback'
    }).then(function(res) {
      // Set the minimum value for the renderer to 0.
      res.drawingInfo.renderer.minValue = 0;

      // Populate the field choices object.
      array.forEach(
          featureType.children,
          function(ftOption) {
        featureFields[ftOption.value] = [];
        array.forEach(res.fields, function(field) {
          var fieldName = field.name.substr(AGG_FIELD_BASE.length);
          if (
              fieldName.substr(0, ftOption.value.length) == ftOption.value &&
              field.alias.substr(field.alias.length - 5) == 'Score') {
            featureFields[ftOption.value].push({
              value: fieldName,
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
        res.drawingInfo.renderer.field =
          AGG_FIELD_BASE + fieldName.options[fieldName.selectedIndex].value;
        aggLayer.setLayerDrawingOptions(
          [new LayerDrawingOptions(res.drawingInfo)]);
      };
      updateButton.removeAttribute('disabled');
    });

});
