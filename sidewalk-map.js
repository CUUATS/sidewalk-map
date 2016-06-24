require([
  'esri/layers/ArcGISDynamicMapServiceLayer',
  'esri/map',
  'dojo/domReady!'
],
function(
  ArcGISDynamicMapServiceLayer,
  Map) {
  var AGG_URL = 'http://utility.arcgis.com/usrsvcs/servers/97ce6d6cf87e4e3a80d7e3d25f0f0bae/rest/services/CCRPC/SidewalkInventoryAggregatedScores/MapServer',
    map = new Map('map', {
      center: [-88.2, 40.1],
      zoom: 10,
      basemap: 'gray'
    }),
    aggLayer = new ArcGISDynamicMapServiceLayer(AGG_URL, {
      'opacity' : 1.0
    });

    map.addLayer(aggLayer);
});
