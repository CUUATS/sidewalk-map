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
    FIELDS = {
      Sidewalk: [
        {
          label: 'ADA Compliance',
          fields: [
            {
              label: 'Maximum Cross Slope',
              aggField: 'SidewalkScoreMaxCrossSlope',
              indField: 'ScoreMaxCrossSlope'
            },
            {
              label: 'Largest Vertical Fault',
              aggField: 'SidewalkScoreLargestVerticalFau',
              indField: 'ScoreLargestVerticalFault'
            },
            {
              label: 'Obstruction Types',
              aggField: 'SidewalkScoreObstructionTypes',
              indField: 'ScoreObstructionTypes'
            },
            {
              label: 'Width',
              aggField: 'SidewalkScoreCompliance',
              indField: 'ScoreWidth'
            },
            {
              label: 'Overall Compliance',
              aggField: 'SidewalkScoreWidth',
              indField: 'ScoreCompliance',
              isDefault: true
            }
          ]
        },
        {
          label: 'Condition',
          fields: [
            {
              label: 'Surface Condition',
              aggField: 'SidewalkScoreSurfaceCondition',
              indField: 'ScoreSurfaceCondition'
            },
            {
              label: 'Vertical Fault Count',
              aggField: 'SidewalkScoreVerticalFaultCount',
              indField: 'ScoreVerticalFaultCount'
            },
            {
              label: 'Cracked Panels',
              aggField: 'SidewalkScoreCrackedPanelCount',
              indField: 'ScoreCrackedPanelCount'
            },
            {
              label: 'Overall Condition',
              aggField: 'SidewalkScoreCondition',
              indField: 'ScoreCondition'
            }
          ]
        }
      ],
      CurbRamp: [
        {
          label: 'ADA Compliance',
          fields: [
            {
               label: 'Ramp Width',
               aggField: 'CurbRampScoreRampWidth',
               indField: 'ScoreRampWidth'
            },
            {
               label: 'Ramp Cross Slope',
               aggField: 'CurbRampScoreRampCrossSlope',
               indField: 'ScoreRampCrossSlope'
            },
            {
               label: 'Ramp Running Slope',
               aggField: 'CurbRampScoreRampRunningSlope',
               indField: 'ScoreRampRunningSlope'
            },
            {
               label: 'Detectable Warning Type',
               aggField: 'CurbRampScoreDetectableWarningT',
               indField: 'ScoreDetectableWarningType'
            },
            {
               label: 'Detectable Warning Width',
               aggField: 'CurbRampScoreDetectableWarningW',
               indField: 'ScoreDetectableWarningWidth'
            },
            {
               label: 'Gutter Cross Slope',
               aggField: 'CurbRampScoreGutterCrossSlope',
               indField: 'ScoreGutterCrossSlope'
            },
            {
               label: 'Gutter Running Slope',
               aggField: 'CurbRampScoreGutterRunningSlope',
               indField: 'ScoreGutterRunningSlope'
            },
            {
               label: 'Landing Dimensions',
               aggField: 'CurbRampScoreLandingDimensions',
               indField: 'ScoreLandingDimensions'
            },
            {
               label: 'Landing Slope',
               aggField: 'CurbRampScoreLandingSlope',
               indField: 'ScoreLandingSlope'
            },
            {
               label: 'Approach Cross Slope',
               aggField: 'CurbRampScoreApproachCrossSlope',
               indField: 'ScoreApproachCrossSlope'
            },
            {
               label: 'Flare Slope',
               aggField: 'CurbRampScoreFlareSlope',
               indField: 'ScoreFlareSlope'
            },
            {
               label: 'Largest Vertical Fault',
               aggField: 'CurbRampScoreLargestPavementFau',
               indField: 'ScoreLargestPavementFault'
            },
            {
               label: 'Obstruction',
               aggField: 'CurbRampScoreObstruction',
               indField: 'ScoreObstruction'
            },
            {
               label: 'Overall Compliance',
               aggField: 'CurbRampScoreCompliance',
               indField: 'ScoreCompliance'
            }
          ]
        },
        {
          label: 'Condition',
          fields: [
            {
               label: 'Surface Condition',
               aggField: 'CurbRampScoreSurfaceCondition',
               indField: 'ScoreSurfaceCondition'
            },
            {
               label: 'Vertical Fault Count',
               aggField: 'CurbRampScorePavementFaultCount',
               indField: 'ScorePavementFaultCount'
            },
            {
               label: 'Cracked Panel Count',
               aggField: 'CurbRampScoreCrackedPanelCount',
               indField: 'ScoreCrackedPanelCount'
            },
            {
               label: 'Overall Condition',
               aggField: 'CurbRampScoreCondition',
               indField: 'ScoreCondition'
            },
          ]
        }
      ],
      Crosswalk: [
        {
          label: 'ADA Compliance',
          fields: [
            {
               label: 'Width',
               aggField: 'CrosswalkScoreWidth',
               indField: 'ScoreWidth'
            },
            {
               label: 'Cross Slope',
               aggField: 'CrosswalkScoreCrossSlope',
               indField: 'ScoreCrossSlope'
            },
            {
               label: 'Overall Compliance',
               aggField: 'CrosswalkScoreCompliance',
               indField: 'ScoreCompliance'
            }
          ]
        }
      ],
      PedestrianSignal: [
        {
          label: 'ADA Compliance',
          fields: [
            {
               label: 'Button Size',
               aggField: 'PedestrianSignalScoreButtonSize',
               indField: 'ScoreButtonSize'
            },
            {
               label: 'Button Height',
               aggField: 'PedestrianSignalScoreButtonHeig',
               indField: 'ScoreButtonHeight'
            },
            {
               label: 'Button Position and Appearance',
               aggField: 'PedestrianSignalScoreButtonPosi',
               indField: 'ScoreButtonPositionAppearance'
            },
            {
               label: 'Tactile Features',
               aggField: 'PedestrianSignalScoreTactileFea',
               indField: 'ScoreTactileFeatures'
            },
            {
               label: 'Overall Compliance',
               aggField: 'PedestrianSignalScoreCompliance',
               indField: 'ScoreCompliance'
            }
          ]
        }
      ]
    },
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
    updateAggLayer = function(selectedField) {
      aggRenderer.attributeField = selectedField.aggField;
      aggLayer.setRenderer(aggRenderer);
      aggLayer.redraw();
    },
    updateIndLayers = function(selectedField) {
      array.forEach([swLayer, crLayer, cwLayer, psLayer], function(layer, i) {
        if (i == featureTypeSelect.selectedIndex) {
          layer.renderer.attributeField = selectedField.indField;
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
    populateFieldList = function(featureType) {
      // Clear the field name select.
      while (fieldNameSelect.firstChild)
        fieldNameSelect.removeChild(fieldNameSelect.firstChild);

      var optionIdx = 0;
      array.forEach(FIELDS[featureType], function(group, i) {
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
    getSelectedField = function() {
      var featureType =
          featureTypeSelect.options[featureTypeSelect.selectedIndex].value,
        idx = fieldNameSelect.selectedIndex,
        fieldIdx = 0;
      for (var g = 0; g < FIELDS[featureType].length; g++) {
        for (var f = 0; f < FIELDS[featureType][g].fields.length; f++) {
          if (fieldIdx == idx) return FIELDS[featureType][g].fields[f];
          fieldIdx += 1;
        }
      }
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

      // Set up the change handler for feature type.
      featureTypeSelect.onchange = function() {
        populateFieldList(this.options[this.selectedIndex].value);
      };

      // Set the initial values of the feature type and field name selects.
      featureTypeSelect.selectedIndex = 0;
      featureTypeSelect.onchange();

      // Set up the click handler for the update map button.
      updateButton.onclick = function() {
        var selectedField = getSelectedField();
        updateAggLayer(selectedField);
        updateIndLayers(selectedField);
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
    fieldNameSelect = document.getElementById('fieldName'),
    featureTypeSelect = document.getElementById('featureType'),
    updateButton = document.getElementById('updateMap'),
    featureFields = {};

    aggLayer.on('load', function(e) {
      initLegend();
      aggLayer.setScaleRange(0, 10000);
    });
    map.addLayers([aggLayer, crLayer, cwLayer, psLayer, swLayer]);

    // Request layer information.
    requestLayerInfo(AGG_URL + '/0').then(function(res) {
      initFieldSelection(res);
    });
});
