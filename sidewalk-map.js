google.charts.load('current', {packages:['corechart']});
require([
  'esri/renderers/ClassBreaksRenderer',
  'dojo/_base/Color',
  'dojo/Deferred',
  'esri/layers/FeatureLayer',
  'esri/InfoTemplate',
  'esri/layers/LayerDrawingOptions',
  'esri/dijit/Legend',
  'esri/map',
  'esri/symbols/SimpleFillSymbol',
  'esri/symbols/SimpleLineSymbol',
  'esri/symbols/SimpleMarkerSymbol',
  'dijit/Dialog',
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
  InfoTemplate,
  LayerDrawingOptions,
  Legend,
  Map,
  SimpleFillSymbol,
  SimpleLineSymbol,
  SimpleMarkerSymbol,
  Dialog,
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
    YEAR_CURRENT = 2016,
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
    makeChartData = function(table) {
      var data = [table[0].slice(0, 2)];
      for (var i = 1; i < table.length; i++) {
        var row = table[i];
        if (row[row.length - 1].indexOf('%') > -1)
          data.push([
            row[0],
            parseFloat(row[row.length - 2].replace(',', ''))
          ]);
      }
      return data;
    },
    makeChartSlices = function(table) {
      var slices = {};
      for (var i = 1; i < table.length; i++) {
        var row = table[i];
        if (row[row.length - 1].indexOf('%') > -1)
          slices[i - 1] = {
            color: getScoreColor(row[row.length - 3])
          };
      }
      return slices;
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
    makeChart = function(containerId, table) {
      // If the library hasn't loaded yet, defer drawing the chart unitl it has.
      if (typeof google.visualization.PieChart === 'undefined')
        return google.charts.setOnLoadCallback(function() {
          makeChart(containerId, table);
        });

      makeChartSlices(table);
      var container = document.getElementById(containerId),
        chart = new google.visualization.PieChart(container);
      chart.draw(google.visualization.arrayToDataTable(makeChartData(table)), {
        fontName: 'Lato',
        legend: 'none',
        pieHole: 0.4,
        pieSliceTextStyle: {
          color: '#000000'
        },
        slices: makeChartSlices(table)
      });
    },
    makeChartDiv = function(id, label) {
      return '<div class="chart-wrapper" aria-hidden="true">' +
        '<span class="chart-label">' + label +
        '</span><div class="chart" id="' + id + '">' +
        '</div></div>'
    },
    showVariableInfo = function(featureType, field) {
      var featureLabel = FEATURE_LABELS[featureType];
      titleFeature.innerHTML = featureLabel + ':';
      titleField.innerHTML = field.label;
      optionsPane.style.backgroundImage = 'url("' + field.imageUrl + '")';
      var html = '<div class="field-description">' + field.description +
        '</div>';
      html += '<h2 class="table-label">' + featureLabel + ' ' + field.label  +
        ' Scores</h2>';
      html += makeChartDiv('current-chart', YEAR_CURRENT);
      html += makeTable(tables[featureType][field.indField]);
      variableInfo.innerHTML = html;
      makeChart('current-chart', tables[featureType][field.indField]);
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
    tables,
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
      map.centerAndZoom(e.graphic.geometry.getCentroid(), 15);
    });

    map.on('load', function(e) {
      map.on('layers-add-result', function(e) {
        initLegend();
      });
      map.addLayers([aggLayer, crLayer, cwLayer, psLayer, swLayer]);
    });

    all({
      fields: request('fields.json', {handleAs: 'json'}),
      tables: request('tables.json', {handleAs: 'json'})
    }).then(function(res) {
      tables = res.tables;
      fields = res.fields;
      initFieldSelection();
      initInfoWindows();
      updateState();
    });

    initDialogLinks();
});
