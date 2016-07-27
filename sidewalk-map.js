require([
  'esri/renderers/ClassBreaksRenderer',
  'dojo/_base/Color',
  'esri/layers/FeatureLayer',
  'esri/layers/LayerDrawingOptions',
  'esri/dijit/Legend',
  'esri/map',
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
  FeatureLayer,
  LayerDrawingOptions,
  Legend,
  Map,
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
              indField: 'ScoreMaxCrossSlope',
              infoUrl: 'variables/sw_max_cross_slope.html'
            },
            {
              label: 'Largest Vertical Fault',
              aggField: 'SidewalkScoreLargestVerticalFau',
              indField: 'ScoreLargestVerticalFault',
              infoUrl: 'variables/sw_vertical_fault_size.html'
            },
            {
              label: 'Obstruction Types',
              aggField: 'SidewalkScoreObstructionTypes',
              indField: 'ScoreObstructionTypes',
              infoUrl: 'variables/sw_obstruction.html'
            },
            {
              label: 'Width',
              aggField: 'SidewalkScoreWidth',
              indField: 'ScoreWidth',
              infoUrl: 'variables/sw_width.html'
            },
            {
              label: 'Overall Compliance',
              aggField: 'SidewalkScoreCompliance',
              indField: 'ScoreCompliance',
              isDefault: true,
              infoUrl: 'variables/sw_compliance.html'
            }
          ]
        },
        {
          label: 'Condition',
          fields: [
            {
              label: 'Surface Condition',
              aggField: 'SidewalkScoreSurfaceCondition',
              indField: 'ScoreSurfaceCondition',
              infoUrl: 'variables/sw_surface_condition.html'
            },
            {
              label: 'Vertical Fault Count',
              aggField: 'SidewalkScoreVerticalFaultCount',
              indField: 'ScoreVerticalFaultCount',
              infoUrl: 'variables/sw_vertical_fault_count.html'
            },
            {
              label: 'Cracked Panels',
              aggField: 'SidewalkScoreCrackedPanelCount',
              indField: 'ScoreCrackedPanelCount',
              infoUrl: 'variables/sw_cracked_panel_count.html'
            },
            {
              label: 'Overall Condition',
              aggField: 'SidewalkScoreCondition',
              indField: 'ScoreCondition',
              infoUrl: 'variables/sw_condition.html'
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
               indField: 'ScoreRampWidth',
               infoUrl: 'variables/cr_ramp_width.html'
            },
            {
               label: 'Ramp Cross Slope',
               aggField: 'CurbRampScoreRampCrossSlope',
               indField: 'ScoreRampCrossSlope',
               infoUrl: 'variables/cr_ramp_cross_slope.html'
            },
            {
               label: 'Ramp Running Slope',
               aggField: 'CurbRampScoreRampRunningSlope',
               indField: 'ScoreRampRunningSlope',
               infoUrl: 'variables/cr_ramp_running_slope.html'
            },
            {
               label: 'Detectable Warning Type',
               aggField: 'CurbRampScoreDetectableWarningT',
               indField: 'ScoreDetectableWarningType',
               infoUrl: 'variables/cr_dws_type.html'
            },
            {
               label: 'Detectable Warning Width',
               aggField: 'CurbRampScoreDetectableWarningW',
               indField: 'ScoreDetectableWarningWidth',
               infoUrl: 'variables/cr_dws_width.html'
            },
            {
               label: 'Gutter Cross Slope',
               aggField: 'CurbRampScoreGutterCrossSlope',
               indField: 'ScoreGutterCrossSlope',
               infoUrl: 'variables/cr_gutter_cross_slope.html'
            },
            {
               label: 'Gutter Counter Slope',
               aggField: 'CurbRampScoreGutterRunningSlope',
               indField: 'ScoreGutterRunningSlope',
               infoUrl: 'variables/cr_gutter_running_slope.html'
            },
            {
               label: 'Landing Dimensions',
               aggField: 'CurbRampScoreLandingDimensions',
               indField: 'ScoreLandingDimensions',
               infoUrl: 'variables/cr_landing_dimensions.html'
            },
            {
               label: 'Landing Slope',
               aggField: 'CurbRampScoreLandingSlope',
               indField: 'ScoreLandingSlope',
               infoUrl: 'variables/cr_landing_slope.html'
            },
            {
               label: 'Approach Cross Slope',
               aggField: 'CurbRampScoreApproachCrossSlope',
               indField: 'ScoreApproachCrossSlope',
               infoUrl: 'variables/cr_approach_cross_slope.html'
            },
            {
               label: 'Flare Slope',
               aggField: 'CurbRampScoreFlareSlope',
               indField: 'ScoreFlareSlope',
               infoUrl: 'variables/cr_flare_slope.html'
            },
            {
               label: 'Largest Vertical Fault',
               aggField: 'CurbRampScoreLargestPavementFau',
               indField: 'ScoreLargestPavementFault',
               infoUrl: 'variables/cr_vertical_fault_size.html'
            },
            {
               label: 'Obstruction',
               aggField: 'CurbRampScoreObstruction',
               indField: 'ScoreObstruction',
               infoUrl: 'variables/cr_obstruction.html'
            },
            {
               label: 'Overall Compliance',
               aggField: 'CurbRampScoreCompliance',
               indField: 'ScoreCompliance',
               infoUrl: 'variables/cr_compliance.html',
               isDefault: true
            }
          ]
        },
        {
          label: 'Condition',
          fields: [
            {
               label: 'Surface Condition',
               aggField: 'CurbRampScoreSurfaceCondition',
               indField: 'ScoreSurfaceCondition',
               infoUrl: 'variables/cr_surface_condition.html'
            },
            {
               label: 'Vertical Fault Count',
               aggField: 'CurbRampScorePavementFaultCount',
               indField: 'ScorePavementFaultCount',
               infoUrl: 'variables/cr_vertical_fault_count.html',
            },
            {
               label: 'Cracked Panel Count',
               aggField: 'CurbRampScoreCrackedPanelCount',
               indField: 'ScoreCrackedPanelCount',
               infoUrl: 'variables/cr_cracked_panel_count.html',
            },
            {
               label: 'Overall Condition',
               aggField: 'CurbRampScoreCondition',
               indField: 'ScoreCondition',
               infoUrl: 'variables/cr_condition.html',
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
               indField: 'ScoreWidth',
               infoUrl: 'variables/cw_width.html'
            },
            {
               label: 'Cross Slope',
               aggField: 'CrosswalkScoreCrossSlope',
               indField: 'ScoreCrossSlope',
               infoUrl: 'variables/cw_cross_slope.html'
            },
            {
               label: 'Overall Compliance',
               aggField: 'CrosswalkScoreCompliance',
               indField: 'ScoreCompliance',
               infoUrl: 'variables/cw_compliance.html',
               isDefault: true
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
               indField: 'ScoreButtonSize',
               infoUrl: 'variables/ps_button_size.html'
            },
            {
               label: 'Button Height',
               aggField: 'PedestrianSignalScoreButtonHeig',
               indField: 'ScoreButtonHeight',
               infoUrl: 'variables/ps_button_height.html'
            },
            {
               label: 'Button Position and Appearance',
               aggField: 'PedestrianSignalScoreButtonPosi',
               indField: 'ScoreButtonPositionAppearance',
               infoUrl: 'variables/ps_button_position_appearance.html'
            },
            {
               label: 'Tactile Features',
               aggField: 'PedestrianSignalScoreTactileFea',
               indField: 'ScoreTactileFeatures',
               infoUrl: 'variables/ps_tactile_features.html'
            },
            {
               label: 'Overall Compliance',
               aggField: 'PedestrianSignalScoreCompliance',
               indField: 'ScoreCompliance',
               infoUrl: 'variables/ps_compliance.html',
               isDefault: true
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
        renderer.addBreak({
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
      var renderer = new ClassBreaksRenderer(null, 'SidewalkScoreCompliance');
      array.forEach(BREAKS, function(b, i) {
        renderer.addBreak({
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
      aggLayer.renderer.attributeField = selectedField.aggField;
      aggLayer.redraw();
      // Force refresh the legend to update the attribute name.
      legend.refresh();
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
    showVariableInfo = function(selectedField) {
      if (selectedField.infoUrl) {
        request(selectedField.infoUrl).then(function(html) {
          variableInfo.innerHTML = html;
        });
      }
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
    initFieldSelection = function() {
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
        showVariableInfo(selectedField);
        updateIndLayers(selectedField);
        updateAggLayer(selectedField);
      };
      updateButton.removeAttribute('disabled');
    },
    map = new Map('map', {
      center: [-88.25, 40.07],
      zoom: 11,
      basemap: 'gray-vector'
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
    featureFields = {},
    legend;

    aggLayer.setRenderer(makeAggRenderer());
    aggLayer.setScaleRange(0, 10000);

    map.on('layers-add-result', function(e) {
      initLegend();
      initFieldSelection();
      updateButton.click();
    });
    map.addLayers([aggLayer, crLayer, cwLayer, psLayer, swLayer]);
});
