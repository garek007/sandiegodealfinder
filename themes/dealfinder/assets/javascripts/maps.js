(function($){



//var directionsDisplay = new google.maps.DirectionsRenderer();;
//var directionsService = new google.maps.DirectionsService();
var map;
var item = new Object();
if (navigator.geolocation) {
  //we'll use this to call a function and get position if geolocation works
  navigator.geolocation.getCurrentPosition(function(position){
    var lat = position.coords.latitude;
    var lng = position.coords.longitude;
    //We use open street map.org here because Google's JSON is a mess. We'll switch back to Google when they wisen up
    var googleLookup = "http://maps.googleapis.com/maps/api/geocode/json?latlng="+lat+","+lng+"&sensor=true";
    var openStreetMapLookup = "http://nominatim.openstreetmap.org/reverse?format=json&lat="+lat+"&lon="+lng;

    $.getJSON( openStreetMapLookup , function( data ) {
      //find zipcode in JSON response
      var userZipcode = data.address.postcode;
      //var nearbyVenuesURL = "/venues";
      var d = new Date();
      var today = d.getDay();
      $.ajax({
        method: "POST",
        url: "/venues",
        data: {
          userZipcode: userZipcode,
          userLat: lat,
          userLng: lng,
          radius: 1.5,
          day: today
        }
      }).done(function(data) {
        initialize(lat,lng,$.parseJSON(data));
        console.log(data);
      });


    });
  }, error);


} else {
  error('not supported');
}

//item.lat = 32.711480;
//item.long = -117.160198;

//item.name = "PB Shore Club";
//item.street = "343 Ocean Blvd";

function initialize(lat, lng, venue) {
  //directionsDisplay = new google.maps.DirectionsRenderer();
  var latlng = new google.maps.LatLng(lat, lng);

  //var curPos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
  //this gets it from geo locator
  //but need to add my own from the previous page
  //new google.maps.LatLng(33.2735476, -116.8521836)

  var mapCanvas = document.getElementById('map-canvas');
  var mapOptions = {
    zoom: 15,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    center: latlng
  }
  map = new google.maps.Map(mapCanvas, mapOptions);
  //directionsDisplay.setMap(map);

  //panel for directions
  //directionsDisplay.setPanel(document.getElementById('directions-panel'));

  //var petco = {lat: 32.708330, lng: -117.158316};
  //for the marker thingy
  var venues = [];
  var largeInfowindow = new google.maps.InfoWindow();
  var bounds = new google.maps.LatLngBounds();

  var greenMarker = 'https://mts.googleapis.com/vt/icon/name=icons/spotlight/spotlight-waypoint-a.png&text=A&psize=16&font=fonts/Roboto-Regular.ttf&color=ff333333&ax=44&ay=48&scale=1';
  var marker = new google.maps.Marker({
    position: latlng,
    map: map,
    title: "You are Here.",
    icon:greenMarker,
    street:"",
    deal:""
  });
  for(i=-1;i<venue.length;i++){
    //on the first pass skip adding a new marker so we can add the user's marker
    if(i>=0){
      var marker = new google.maps.Marker({
        map:map,
        position:{lat: venue[i].lat, lng:venue[i].lng},
        title: venue[i].name,
        animation: google.maps.Animation.DROP,
        id: i,
        street: venue[i].street,
        deal: venue[i].dealsum
      })
    }
    venues.push(marker);
    bounds.extend(marker.position);
    marker.addListener('click', function(){
      populateInfoWindow(this,largeInfowindow);
    });
    console.log(venue);
  }
  map.fitBounds(bounds);

  //var infowindow = new google.maps.InfoWindow({
 //   content: "<strong>" + item.name + "</strong> <br>" + item.street
 // });
//  infowindow.open(map, marker);




}
function populateInfoWindow(marker, infowindow){
  if(infowindow.marker != marker){
    infowindow.marker = marker;
    infowindow.setContent('<div><strong>'+ marker.title + '</strong><br>'+ marker.street +'<br><br>'+marker.deal+'</div>');
    infowindow.open(map,marker);
    infowindow.addListener('closeclick',function(){
      infowindow.setMarker(null);
    })
  }

}
function calcRoute(item, dirServ, dirDis) {
  //var start = document.getElementById('start').value;
  //var end = document.getElementById('end').value;

  var start = new google.maps.LatLng(document.getElementById('curLat').value, document.getElementById('curLong').value);
  var end = new google.maps.LatLng(item.lat, item.long);
  var request = {
    origin: start,
    destination: end,
    travelMode: google.maps.TravelMode.DRIVING
  };
  directionsService.route(request, function(response, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      directionsDisplay.setDirections(response);
    }
  });
}

function setPageDate(d){
  //var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  //$("#today").text(d.toDateString());
  $("#day_of_week").val(d.getDay());
  updateSlider();
}
$("#radius").slider({
  min:0,
  max:3,
  step:.1,
  value:1,
  change:updateSlider
});
function updateSlider(){
  $("#radius_value").text( $("#radius").slider("value")+" miles" );
}
var d = new Date();
setPageDate(d);
$("#day_of_week").change(updateMap);
function updateMap(){
  //really this needs to refire the primary ajax call to run new queries for tomorrow
  //we don't actually have to pull all the venues again, but we might to make it easier
  //date actually doesn't need to be calculated here, it can be returned from the Controller
  var d = new Date();
  console.log(this.value);
  console.log(d);
  d.setDate(d.getDate()+Number(this.value));
  console.log(d);
  setPageDate(d);
}

function error(msg) {
  var s = document.querySelector('#status');
  console.log("failed to get location");
  s.innerHTML = typeof msg == 'string' ? msg : "failed";
  s.className = 'fail';

  // console.log(arguments);
}
//google.maps.event.addDomListener(window, 'load', function() {    initialize(item);  });

})(jQuery);
