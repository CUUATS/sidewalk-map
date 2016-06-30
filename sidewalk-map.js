require([
  'esri/renderers/ClassBreaksRenderer',
  'dojo/_base/Color',
  'esri/layers/FeatureLayer',
  'esri/layers/LayerDrawingOptions',
  'esri/dijit/Legend',
  'esri/map',
  'esri/symbols/SimpleLineSymbol',
  'esri/symbols/SimpleMarkerSymbol',
  'dojo/promise/all',
  'dojo/_base/array',
  'dojo/parser',
  'esri/request',
  'dojo/domReady!'
],
function(
  ClassBreaksRenderer,
  Color,
  FeatureLayer,
  LayerDrawingOptions,
  Legend,
  Map,
  SimpleLineSymbol,
  SimpleMarkerSymbol,
  all,
  array,
  parser,
  request) {
  parser.parse();
  var AGG_URL = 'http://utility.arcgis.com/usrsvcs/servers/06fb34d68e7a4673ba885015b671387b/rest/services/CCRPC/SidewalkInventoryScoreAggregated/MapServer',
    AGG_DEFAULT_FEATURE = 'Sidewalk',
    AGG_DEFAULT_FIELD = 'ScoreCompliance',
    IND_URL = 'http://utility.arcgis.com/usrsvcs/servers/88a6a9f6dc45461f820659d2d0f13fff/rest/services/CCRPC/SidewalkInventoryScore/MapServer',
    MARKER_TYPE_LINE = 'line',
    BREAKS = [
      {
        maxValue: 60,
        label: '0 to 60',
        color: '#e61c1f'
      },
      {
        maxValue: 70,
        label: '> 60 to 70',
        color: '#ffb061'
      },
      {
        maxValue: 80,
        label: '> 70 to 80',
        color: '#fcfc5d'
      },
      {
        maxValue: 90,
        label: '> 80 to 90',
        color: '#80cee8'
      },
      {
        maxValue: 100,
        label: '> 90 to 100',
        color: '#2e80bf'
      }
    ],
    makeIndLayer = function(idx, markerType, markerSize, visible) {
      var layer = new FeatureLayer(IND_URL + '/' + idx, {
        mode: FeatureLayer.MODE_ONDEMAND,
        outFields: ['*']
      });
      layer.setScaleRange(10001, 0);
      layer.setRenderer(makeIndRenderer(markerType, markerSize));
      if (!visible) layer.hide();
      return layer;
    },
    makeIndRenderer = function(markerType, markerSize) {
      var renderer = new ClassBreaksRenderer(
        makeMarkerSymbol(markerType, markerSize, '#bbbbbb'),
        'ScoreCompliance');
      array.forEach(BREAKS, function(b, i) {
        renderer.addBreak(
          (i > 0) ? BREAKS[i-1].maxValue + 0.000001 : 0,
          b.maxValue,
          makeMarkerSymbol(markerType, markerSize, b.color));
      });
      return renderer;
    },
    makeMarkerSymbol = function(markerType, markerSize, fillColor) {
      if (markerType == MARKER_TYPE_LINE) {
        return new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color(fillColor),
          markerSize
        );
      }
      return new SimpleMarkerSymbol(
        markerType,
        markerSize,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color('#000000'),
          1
        ),
        new Color(fillColor)
      );
    },
    updateAggLayer = function() {
      aggRenderer.attributeField =
        fieldName.options[fieldName.selectedIndex].value;
      aggLayer.setRenderer(aggRenderer);
      aggLayer.redraw();
    },
    updateIndLayers = function() {
      var field = fieldName.options[fieldName.selectedIndex].value;
      console.log(field);
      array.forEach([swLayer, crLayer, cwLayer, psLayer], function(layer, i) {
        if (i == featureType.selectedIndex) {
          layer.renderer.attributeField = field;
          if (layer.visible) {
            layer.refresh();
          } else {
            layer.show();
          }
        } else {
          layer.hide();
        }
      });
    },
    initLegend = function() {
      var legend = new Legend({
        map: map,
        layerInfos: [{
          layer: aggLayer,
          title: 'Legend'
        }],
        autoUpdate: false
      }, document.getElementById('legend'));
      legend.startup();
    },
    populateFieldChoices = function(fields) {
      array.forEach(
          featureType.children,
          function(ftOption) {
        featureFields[ftOption.value] = [];
        array.forEach(fields, function(field) {
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
    },
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
    },
    requestLayerInfo = function(url) {
      return request({
        url: url,
        content: {
          f: 'json'
        },
        callbackParamName: 'callback'
      });
    },
    initFieldSelection = function(aggInfo) {
      // Set the minimum value for the renderer to 0.
      aggInfo.drawingInfo.renderer.minValue = 0;
      aggRenderer = new ClassBreaksRenderer(aggInfo.drawingInfo.renderer);

      // Populate the field choices object.
      populateFieldChoices(aggInfo.fields);

      // Set up the change handler for feature type.
      featureType.onchange = function() {
        populateFieldList(this.options[this.selectedIndex].value);
      };

      // Set the initial values of the feature type and field name selects.
      featureType.selectedIndex = 0;
      featureType.onchange();

      // Set up the click handler for the update map button.
      updateButton.onclick = function() {
        updateAggLayer();
        updateIndLayers();
      };
      updateButton.removeAttribute('disabled');
    },
    map = new Map('map', {
      center: [-88.2, 40.1],
      zoom: 11,
      basemap: 'gray-vector'
    }),
    aggLayer = new FeatureLayer(AGG_URL + '/0', {
      mode: FeatureLayer.MODE_SNAPSHOT,
      outFields: ['*'],
      opacity: 0.5
    }),
    aggRenderer,
    crLayer = makeIndLayer(0, SimpleMarkerSymbol.STYLE_CIRCLE, 10, false),
    cwLayer = makeIndLayer(1, SimpleMarkerSymbol.STYLE_SQUARE, 10, false),
    psLayer = makeIndLayer(2, SimpleMarkerSymbol.STYLE_DIAMOND, 10, false),
    swLayer = makeIndLayer(3, MARKER_TYPE_LINE, 3, true),
    fieldName = document.getElementById('fieldName'),
    featureType = document.getElementById('featureType'),
    updateButton = document.getElementById('updateMap'),
    featureFields = {};

    aggLayer.on('load', function(e) {
      initLegend();
      aggLayer.setScaleRange(0, 10000);
    });
    map.addLayers([aggLayer, crLayer, cwLayer, psLayer, swLayer]);

    // Request layer information.
    all([
      requestLayerInfo(IND_URL + '/0'),
      requestLayerInfo(IND_URL + '/1'),
      requestLayerInfo(IND_URL + '/2'),
      requestLayerInfo(IND_URL + '/3'),
      requestLayerInfo(AGG_URL + '/0')
    ]).then(function(res) {
      initFieldSelection(res[4]);
    });
});
