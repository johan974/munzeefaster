
var deferredPrompt;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(function() {
      console.log('Service worker registered!');
    });
}

window.addEventListener('beforeinstallprompt', function(event) {
  console.log('beforeinstallprompt fired');
  event.preventDefault();
  deferredPrompt = event;
  return false;
});

function loginToMunzee() {
  var clientid = "33a0869ef82d827b98c87235247c6f1e";
  var redirect_uri = "https://munzeefaster.herokuapp.com/handle_oauth";
  var munzeeRQ = "https://api.munzee.com/oauth?response_type=code&client_id=" +
        clientid + "&redirect_uri=" + redirect_uri + "&scope=read";
  console.log( "MunzeeURL: " + munzeeRQ);
  fetch( munzeeRQ)
  .then( function( response) {
    console.log( response);
    return response.json();
  }).then( function( response2) {
    console.log( response2);
    console.log( 'Answer: ' + response2.origin);
  }).catch( function( err) {
    console.log( 'Error: ' + err);
  });
}
