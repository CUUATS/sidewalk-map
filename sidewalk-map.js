require([
  'esri/renderers/ClassBreaksRenderer',
  'dojo/_base/Color',
  'esri/layers/FeatureLayer',
  'esri/InfoTemplate',
  'esri/layers/LayerDrawingOptions',
  'esri/dijit/Legend',
  'esri/map',
  'esri/renderers/SimpleRenderer',
  'esri/symbols/SimpleFillSymbol',
  'esri/symbols/SimpleLineSymbol',
  'esri/symbols/SimpleMarkerSymbol',
  'dijit/Dialog',
  'dojo/promise/all',
  'dojo/_base/array',
  'dojo/request',
  'dojo/domReady!'
],
function(
  ClassBreaksRenderer,
  Color,
  FeatureLayer,
  InfoTemplate,
  LayerDrawingOptions,
  Legend,
  Map,
  SimpleRenderer,
  SimpleFillSymbol,
  SimpleLineSymbol,
  SimpleMarkerSymbol,
  Dialog,
  all,
  array,
  request) {
  var AGG_URL = 'http://utility.arcgis.com/usrsvcs/servers/06fb34d68e7a4673ba885015b671387b/rest/services/CCRPC/SidewalkInventoryScoreAggregated/MapServer',
    AGG_DEFAULT_FEATURE = 'Sidewalk',
    AGG_DEFAULT_FIELD = 'ScoreCompliance',
    IND_URL = 'http://utility.arcgis.com/usrsvcs/servers/88a6a9f6dc45461f820659d2d0f13fff/rest/services/CCRPC/SidewalkInventoryScore/MapServer',
    MUNIC_URL = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/28',
    MUNIC_DEF = "STATE = 17 AND BASENAME IN ('Champaign', 'Urbana', 'Savoy', 'Bondville', 'Tolono')",
    MARKER_TYPE_LINE = 'line',
    FEATURE_LABELS = {
      Sidewalk: 'Sidewalks',
      CurbRamp: 'Curb Ramps',
      Crosswalk: 'Crosswalks',
      PedestrianSignal: 'Pedestrian Signals'
    },
    YEAR_BASELINE = '2014-2015',
    YEAR_CURRENT = '2016',
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
    testWebGL = function() {
      if (!window.WebGLRenderingContext) return false;
      return document.createElement('canvas').getContext('webgl') != null;
    },
    makeMunicLayer = function() {
      var layer = new FeatureLayer(MUNIC_URL, {
        definitionExpression: MUNIC_DEF,
        mode: FeatureLayer.MODE_SNAPSHOT
      });
      layer.setRenderer(new SimpleRenderer(new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_DASH,
        new Color('#444444'),
        1
      )));
      return layer;
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
      if (legend) legend.refresh();
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
    getChartInfo = function(baseline, current) {
      var data = {
          labels: [],
          series: [
            [],
            []
          ]
        },
        colors = [];
      for (var i = 1; i < baseline.length; i++) {
        var bRow = baseline[i],
          cRow = current[i];
        if (bRow[bRow.length - 1].indexOf('%') > -1) {
          data.labels.push(bRow[0]);
          data.series[0].push(
            parseFloat(bRow[bRow.length - 2].replace(',', '')));
          data.series[1].push(
            parseFloat(cRow[cRow.length - 2].replace(',', '')));
          colors.push(getScoreColor(bRow[bRow.length - 3]));
        }
      }
      return {
        data: data,
        colors: colors,
        axisLabels: {
          x: baseline[0][0],
          y: baseline[0][baseline[0].length - 2]
        }
      };
    },
    getScoreColor = function(text) {
      var scoreInt = parseInt(text);
      for (var i = 0; i < BREAKS.length; i++) {
        var breakDef = BREAKS[i];
        if (text == breakDef.label ||
            (!isNaN(scoreInt) && scoreInt <= breakDef.maxValue))
          return breakDef.color;
      }
    },
    addAxisLabel = function(container, className, text) {
      var el = document.createElement('div');
      el.className = className;
      el.appendChild(document.createTextNode(text));
      container.parentNode.appendChild(el);
    },
    makeChart = function(containerId, baseline, current) {
      var chartInfo = getChartInfo(baseline, current),
        container = document.getElementById(containerId);

      addAxisLabel(container, 'chart-xaxis-label', chartInfo.axisLabels.x);
      addAxisLabel(container, 'chart-yaxis-label', chartInfo.axisLabels.y);
      new Chartist.Bar('#' + containerId, chartInfo.data, {})
        .on('draw', function(item) {
          if (item.type === 'bar' && item.seriesIndex === 1)
            item.element.attr({
              style: 'stroke: ' + chartInfo.colors[item.index]
            });
        });
    },
    makeChartDiv = function(id) {
      return '<div class="chart-wrapper"><div class="chart" id="' + id +
        '" aria-hidden="true"></div></div>';
    },
    makeLegend = function() {
      return '<div class="chart-legend"><span class="legend-item">' +
        '<span class="legend-symbol symbol-baseline"></span> Baseline (' +
        YEAR_BASELINE + ')</span>' +
        '<span class="legend-symbol symbol-current"></span> Current (' +
        YEAR_CURRENT + ')</span></div>';
    },
    makeExpander = function(className, title, body) {
      return '<div class="' + className + ' expander expander-closed">' +
        '<h2 class="expander-heading">' +
        '<a href="#" class="expander-toggle">' +
        '<span class="expander-toggle-inner">' + title + '</span></a></h2>' +
        '<div class="expander-body">' + body + '</div></div>';
    },
    initExpanders = function() {
      var links = document.getElementsByTagName('a');
      for (var i = 0; i < links.length; i++) {
        if (links[i].className == 'expander-toggle') {
          links[i].addEventListener('click', function(e) {
            e.preventDefault();
            var container = this.parentNode.parentNode,
              cls = container.className;
            container.className = (cls.indexOf('-closed') > -1) ?
              cls.replace('-closed', '-open') : cls.replace('-open', '-closed');
          });
        }
      }
    },
    showVariableInfo = function(featureType, field) {
      var featureLabel = FEATURE_LABELS[featureType].slice(0, -1);
      titleFeature.innerHTML = featureLabel + ':';
      titleField.innerHTML = field.label;
      optionsPane.style.backgroundImage = 'url("' + field.imageUrl + '")';
      var html = '<div class="field-description">' + field.description +
        '</div>';
      if (field.trends) html +=
        makeExpander('trends', 'What&apos;s going on here?', field.trends);
      html += '<h2 class="chart-title">' + featureLabel + ' ' + field.label  +
        ' Scores</h2>';
      html += makeLegend();
      html += makeChartDiv('chart');
      html += '<h2 class="table-title">Current (' + YEAR_CURRENT +
        ') Scores</h2>';
      html += makeTable(tablesCurrent[featureType][field.indField]);
      html += '<h2 class="table-title">Baseline (' + YEAR_BASELINE +
        ') Scores</h2>';
      html += makeTable(tablesBaseline[featureType][field.indField]);
      variableInfo.innerHTML = html;
      initExpanders();
      makeChart(
        'chart',
        tablesBaseline[featureType][field.indField],
        tablesCurrent[featureType][field.indField]);
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

      array.forEach(fields[featureType], function(group, i) {
        var optgroup = document.createElement('optgroup');
        optgroup.label = group.label;
        fieldNameSelect.appendChild(optgroup);
        array.forEach(group.fields, function(field, i) {
          var option = document.createElement('option');
          option.value = field.indField;
          option.appendChild(document.createTextNode(field.label));
          optgroup.appendChild(option);
          if (field.isDefault) fieldNameSelect.value = field.indField;
        });
      });
    },
    getSelectedField = function() {
      var featureType = featureTypeSelect.value,
        indField = fieldNameSelect.value;
      for (var g = 0; g < fields[featureType].length; g++) {
        for (var f = 0; f < fields[featureType][g].fields.length; f++) {
          var field = fields[featureType][g].fields[f];
          if (field.indField == indField) return {
            featureType: featureType,
            field: field
          };
        }
      }
    },
    updateInfoPane = function(selected) {
      showVariableInfo(selected.featureType, selected.field);
      noImage.style.display = 'none';
      imageLink.style.display = 'none';
    },
    updateMap = function(selected) {
      updateIndLayers(selected.field);
      updateAggLayer(selected.field);
    },
    updateState = function() {
      if (map.infoWindow.getSelectedFeature()) {
        // Clearing the selection will cause the onclick method to be called
        // again, updating the map.
        map.infoWindow.clearFeatures();
      } else {
        var selected = getSelectedField();
        updateInfoPane(selected);
        if (isDirty()) updateMap(selected);
        currentFeatureType = featureTypeSelect.value;
        currentFieldName = fieldNameSelect.value;
        setDirty();
      }
    },
    initFieldSelection = function() {
      // Set up the change handler for feature type.
      featureTypeSelect.onchange = function() {
        populateFieldList(this.value);
        setDirty();
      };

      // Set the initial values of the feature type and field name selects.
      featureTypeSelect.selectedIndex = 0;
      featureTypeSelect.onchange();

      // Set the change handler for field name.
      fieldNameSelect.addEventListener('change', setDirty);

      // Set up the click handler for the update map button.
      updateButton.onclick = updateState;
      updateButton.removeAttribute('disabled');
    },
    initInfoWindows = function() {
      crLayer.setInfoTemplate(makeInfoTemplate('Curb Ramp', fields.CurbRamp));
      swLayer.setInfoTemplate(makeInfoTemplate('Sidewalk', fields.Sidewalk));
      cwLayer.setInfoTemplate(makeInfoTemplate('Crosswalk', fields.Crosswalk));
      psLayer.setInfoTemplate(
        makeInfoTemplate('Pedestrian Signal', fields.PedestrianSignal));
      map.infoWindow.set('popupWindow', false);
      map.infoWindow.on('selection-change', function(e){
        var feature = map.infoWindow.getSelectedFeature();
        if (feature) {
          showFeatureDetails(feature);
        } else {
          updateState();
        }
      });
    },
    showFeatureDetails = function(feature) {
      optionsPane.style.backgroundImage = 'none';
      variableInfo.innerHTML = feature.getContent();
      titleField.innerHTML = 'Feature Details';
      initVariableLinks(feature.getLayer().name);
      showAttachmentImage(feature);
    },
    showAttachmentImage = function(feature) {
      var oid = feature.attributes.OBJECTID,
        layer = feature.getLayer();
      if (layer.hasAttachments) {
        feature.getLayer().queryAttachmentInfos(oid, function(res) {
          if (res) {
            var imageURL = location.protocol + res[0].url.slice(5);
            optionsPane.style.backgroundImage = 'url("' + imageURL + '")';
            imageLink.href = imageURL;
            imageDialog.set('content',
              '<img src="' + imageURL + '" style="max-height:' +
              Math.round(window.innerHeight * 0.8) + 'px;max-width:' +
              Math.round(window.innerWidth * 0.8) + 'px;" />');
            imageLink.style.display = 'inline';
          }
          noImage.style.display = (res) ? 'none' : 'block';
          imageLink.style.display = (res) ? 'inline' : 'none';
        }, function(err) {
          noImage.style.display = 'block';
          imageLink.style.display = 'none';
        });
      } else {
        noImage.style.display = 'block';
        imageLink.style.display = 'none';
      }
    },
    initVariableLinks = function(featureType) {
      var links = document.getElementsByTagName('a');
      for (var i = 0; i < links.length; i++) {
        if (links[i].className == 'variable-link') {
          links[i].addEventListener('click', function(e) {
            e.preventDefault();
            featureTypeSelect.value = featureType.replace(' ', '');
            featureTypeSelect.onchange();
            fieldNameSelect.value = e.target.hash.substring(1);
            updateState();
          });
        }
      }
    },
    makeInfoTemplate = function(label, groups) {
      var info = new InfoTemplate();
      info.setTitle(label);

      var html = '';
      array.forEach(groups, function(group, i) {
        html += '<h2 class="variable-group-title">' + group.label + '</h2>';
        html += '<table class="field-values scores-table"><thead><tr><th>Variable</th><th>Value</th><th>Chart</th></tr></thead><tbody>';
        array.forEach(group.fields, function(field, i) {
          html += '<tr class="field field-' + field.indField +
            '"><td class="field-label"><a class="variable-link" href="#' +
            field.indField + '">' + field.label + '</a></td>' +
            '<td class="field-value">${' + field.indField +
            ':renderRounded}</td>' + '${' + field.indField +
            ':renderScale}</tr>';
        });
        html += '</tbody></table>';
      });
      info.setContent(html);
      return info;
    },
    roundValue = function(value, field, data) {
      return Math.round(value);
    },
    scaleBar = function(value, field, data) {
      if (value > 90) {
        var cls = 'scale-over-90';
      } else if (value > 80) {
        var cls = 'scale-over-80';
      } else if (value > 70) {
        var cls = 'scale-over-70';
      } else if (value > 60) {
        var cls = 'scale-over-60';
      } else if (value >= 0) {
        var cls = 'scale-60-under';
      } else {
        var cls = 'scale-none';
      }
      return '<td class="field-scale"><div class="scale-outer">' +
        '<div class="scale-bar ' + cls + '" style="width:' +
        Math.round(value) + '%;"></div></div></td>';
    },
    initDialogLinks = function() {
      imageLink.addEventListener('click', function(e) {
        e.preventDefault();
        imageDialog.show();
      });

      aboutLink.addEventListener('click', function(e) {
        e.preventDefault();
        aboutDialog.show();
      });
    },
    initAboutDialog = function() {
      var links = document.getElementsByTagName('a');
      for (var i = 0; i < links.length; i++) {
        if (links[i].className === 'explore')
          links[i].addEventListener('click', function(e) {
            e.preventDefault();
            aboutDialog.hide();
          });
      }
      if (!(document.cookie && document.cookie.search('se_about=1') > -1)) {
        document.cookie = 'se_about=1;Max-Age=' + (60 * 60 * 24 * 365);
        aboutDialog.show();
      }
    },
    isDirty = function() {
      return (currentFeatureType != featureTypeSelect.value ||
        currentFieldName != fieldNameSelect.value);
    },
    setDirty = function() {
      updateButton.className = (isDirty()) ? 'button-dirty' : 'button-clean';
    },
    hasWebGL = testWebGL(),
    map = new Map('map', {
      center: [-88.25, 40.07],
      zoom: (hasWebGL) ? 11 : 12,
      basemap: (hasWebGL) ? 'gray-vector' : 'gray'
    }),
    municLayer = makeMunicLayer(),
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
    noImage = document.getElementById('no-image'),
    imageLink = document.getElementById('image-link'),
    aboutLink = document.getElementById('about-link'),
    aboutText = document.getElementById('about-text'),
    aboutDialog = new Dialog({
      title: 'About Sidewalk Explorer',
      content: aboutText.innerHTML,
      style: 'max-width: 600px;'
    }),
    imageDialog = new Dialog({
      title: 'Feature Image'
    }),
    featureFields = {},
    legend,
    tablesBaseline,
    tablesCurrent,
    fields,
    currentFeatureType,
    currentFieldName;

    // The scale renderer function needs to be a global variable so that
    // the info window logic can access it.
    renderScale = scaleBar;
    renderRounded = roundValue;

    initAboutDialog();

    aggLayer.setRenderer(makeAggRenderer());
    aggLayer.setScaleRange(0, 10000);
    aggLayer.on('click', function(e) {
      map.centerAndZoom(e.graphic.geometry.getCentroid(), (hasWebGL) ? 15 : 16);
    });

    map.on('load', function(e) {
      map.on('layers-add-result', function(e) {
        initLegend();
      });
      map.addLayers([municLayer, aggLayer, crLayer, cwLayer, psLayer, swLayer]);
    });

    all({
      fields: request('fields.json', {handleAs: 'json'}),
      tablesBaseline: request('tables-baseline.json', {handleAs: 'json'}),
      tablesCurrent: request('tables-current.json', {handleAs: 'json'})
    }).then(function(res) {
      fields = res.fields;
      tablesBaseline = res.tablesBaseline;
      tablesCurrent = res.tablesCurrent;
      initFieldSelection();
      initInfoWindows();
      updateState();
    });

    initDialogLinks();
});
