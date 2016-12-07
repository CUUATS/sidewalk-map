require([
  'esri/renderers/ClassBreaksRenderer',
  'dojo/_base/Color',
  'dojo/Deferred',
  'esri/layers/FeatureLayer',
  'esri/widgets/Legend',
  'esri/Map',
  'esri/views/MapView',
  'esri/symbols/SimpleFillSymbol',
  'esri/symbols/SimpleLineSymbol',
  'esri/symbols/SimpleMarkerSymbol',
  'dojo/promise/all',
  'dojo/_base/array',
  'dojo/parser',
  'dojo/request',
  'dojo/domReady!'
],
function(
  ClassBreaksRenderer,
  Color,
  Deferred,
  FeatureLayer,
  Legend,
  Map,
  MapView,
  SimpleFillSymbol,
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
    FEATURE_LABELS = {
      Sidewalk: 'Sidewalks',
      CurbRamp: 'Curb Ramps',
      Crosswalk: 'Crosswalks',
      PedestrianSignal: 'Pedestrian Signals'
    },
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

      layer.minScale = 10001
      layer.maxScale = 0;

      layer.renderer = makeIndRenderer(markerType, markerSize);
      if (!visible) layer.visible = false;
      return layer;
    },
    makeIndRenderer = function(markerType, markerSize) {
      var renderer = new ClassBreaksRenderer({
        defaultSymbol: makeMarkerSymbol(markerType, markerSize, '#bbbbbb'),
        field: 'ScoreCompliance'
      });
      array.forEach(BREAKS, function(b, i) {
        renderer.addClassBreakInfo({
          label: b.label,
          minValue: (i > 0) ? BREAKS[i-1].maxValue + 0.000001 : 0,
          maxValue: b.maxValue,
          symbol: makeMarkerSymbol(markerType, markerSize, b.color)
        });
      });
      renderer.defaultLabel = 'No score';
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
    makeAggRenderer = function() {
      var renderer = new ClassBreaksRenderer({
        field: 'SidewalkScoreCompliance'
      });
      array.forEach(BREAKS, function(b, i) {
        renderer.addClassBreakInfo({
          label: b.label,
          minValue: (i > 0) ? BREAKS[i-1].maxValue + 0.000001 : 0,
          maxValue: b.maxValue,
          symbol: makeFillSymbol(b.color)
        });
      });
      return renderer;
    },
    makeFillSymbol = function(fillColor) {
      return new SimpleFillSymbol(
        SimpleFillSymbol.STYLE_SOLID,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color('#000000'),
          0.5
        ),
        new Color(fillColor)
      );
    },
    updateAggLayer = function(selectedField) {
      var renderer = aggLayer.renderer.clone();
      renderer.field = selectedField.aggField;
      aggLayer.renderer = renderer;
      // Force refresh the legend to update the attribute name.
      if (legend) legend.refresh();
    },
    updateIndLayers = function(selectedField) {
      array.forEach([swLayer, crLayer, cwLayer, psLayer], function(layer, i) {
        if (i == featureTypeSelect.selectedIndex) {
          var renderer = layer.renderer.clone();
          renderer.field = selectedField.indField;
          layer.renderer = renderer;
          if (layer.visible) {
            layer.refresh();
          } else {
            layer.visible = true;
          }
        } else {
          layer.visible = false;
        }
      });
    },
    makeTableRow = function(items, tag) {
      var html = '<tr>';
      array.forEach(items, function(cell) {
        html += '<' + tag + '>' + cell + '</' + tag + '>';
      });
      html += '</tr>';
      return html;
    },
    makeTable = function(data) {
      var html = '<table class="scores-table"><thead>';
      html += makeTableRow(data[0], 'th');
      html += '</thead><tbody>';
      array.forEach(data.slice(1), function(row) {
        html += makeTableRow(row, 'td');
      });
      html += '</tbody></table>';
      return html;
    },
    showVariableInfo = function(featureType, field) {
      var featureLabel = FEATURE_LABELS[featureType];
      titleFeature.innerHTML = featureLabel + ':';
      titleField.innerHTML = field.label;
      optionsPane.style.backgroundImage = 'url("' + field.imageUrl + '")';
      var html = '<div class="field-description">' + field.description +
        '</div>';
      html += '<h3 class="table-label">' + featureLabel + ' ' + field.label  +
        ' Scores</h3>';
      html += makeTable(tables[featureType][field.indField]);
      variableInfo.innerHTML = html;
    },
    initLegend = function() {
      legend = new Legend({
        map: map,
        layerInfos: [
          {
            layer: aggLayer,
            title: 'Average Scores'
          },
          {
            layer: crLayer,
            title: 'Curb Ramps'
          },
          {
            layer: cwLayer,
            title: 'Crosswalks'
          },
          {
            layer: psLayer,
            title: 'Pedestrian Signals'
          },
          {
            layer: swLayer,
            title: 'Sidewalks'
          }
        ],
        autoUpdate: true
      }, document.getElementById('legend'));
      legend.startup();
    },
    populateFieldList = function(fields, featureType) {
      // Clear the field name select.
      while (fieldNameSelect.firstChild)
        fieldNameSelect.removeChild(fieldNameSelect.firstChild);

      var optionIdx = 0;
      array.forEach(fields[featureType], function(group, i) {
        var optgroup = document.createElement('optgroup');
        optgroup.label = group.label;
        fieldNameSelect.appendChild(optgroup);
        array.forEach(group.fields, function(field, i) {
          var option = document.createElement('option');
          option.value = optionIdx;
          option.appendChild(document.createTextNode(field.label));
          optgroup.appendChild(option);
          if (field.isDefault) fieldNameSelect.selectedIndex = optionIdx;
          optionIdx += 1;
        });
      });
    },
    getSelectedField = function(fields) {
      var featureType =
          featureTypeSelect.options[featureTypeSelect.selectedIndex].value,
        idx = fieldNameSelect.selectedIndex,
        fieldIdx = 0;
      for (var g = 0; g < fields[featureType].length; g++) {
        for (var f = 0; f < fields[featureType][g].fields.length; f++) {
          if (fieldIdx == idx) return {
            featureType: featureType,
            field: fields[featureType][g].fields[f]
          };
          fieldIdx += 1;
        }
      }
    },
    initFieldSelection = function(fields) {
      // Set up the change handler for feature type.
      featureTypeSelect.onchange = function() {
        populateFieldList(fields, this.options[this.selectedIndex].value);
      };

      // Set the initial values of the feature type and field name selects.
      featureTypeSelect.selectedIndex = 0;
      featureTypeSelect.onchange();

      // Set up the click handler for the update map button.
      updateButton.onclick = function() {
        var selected = getSelectedField(fields);
        showVariableInfo(selected.featureType, selected.field);
        updateIndLayers(selected.field);
        updateAggLayer(selected.field);
      };
      updateButton.removeAttribute('disabled');
    },
    map = new Map({
      basemap: 'gray-vector'
    }),
    view = new MapView({
      container: 'map',
      map: map,
      center: [-88.25, 40.07],
      zoom: 11
    }),
    aggLayer = new FeatureLayer(AGG_URL + '/0', {
      mode: FeatureLayer.MODE_SNAPSHOT,
      outFields: ['*'],
      opacity: 0.5
    }),
    crLayer = makeIndLayer(0, SimpleMarkerSymbol.STYLE_CIRCLE, 10, false),
    cwLayer = makeIndLayer(1, SimpleMarkerSymbol.STYLE_SQUARE, 10, false),
    psLayer = makeIndLayer(2, SimpleMarkerSymbol.STYLE_DIAMOND, 10, false),
    swLayer = makeIndLayer(3, MARKER_TYPE_LINE, 3, true),
    fieldNameSelect = document.getElementById('fieldName'),
    featureTypeSelect = document.getElementById('featureType'),
    updateButton = document.getElementById('updateMap'),
    variableInfo = document.getElementById('variable-info'),
    titleFeature = document.getElementById('title-feature'),
    titleField = document.getElementById('title-field'),
    optionsPane = document.getElementById('options-pane'),
    featureFields = {},
    legend,
    tables;

    aggLayer.renderer = makeAggRenderer();
    aggLayer.minScale = 0;
    aggLayer.maxScale = 10000;

    map.on('layers-add-result', function(e) {
      initLegend();
    });
    map.addMany([aggLayer, crLayer, cwLayer, psLayer, swLayer]);

    all({
      fields: request('fields.json', {handleAs: 'json'}),
      tables: request('tables.json', {handleAs: 'json'})
    }).then(function(res) {
      tables = res.tables;
      initFieldSelection(res.fields);
      updateButton.click();
    });
});
