
var player;

function onYouTubePlayerReady(playerId) {
	player = document.getElementById("video_player");
	player.cueVideoById("s2XzoA94Zws");
	player.playVideo();
}


function add_video_button_click() {
	if(!player)
		return;
	player.cueVideoById(document.getElementById('vid').value);
	player.playVideo();
}


$(document).ready(function() {
    	var range_selector = $("#range_selector");
    	range_selector.jqxSlider({ showButtons: true, height: 30, min: 500, max: 4000, step: 350, ticksFrequency: 350, mode: 'fixed', values: [500, 4000], rangeSlider: true, width: 180 });

	//The allowScriptAccess parameter in the code is needed to allow the player SWF to call functions on the containing HTML page, since the player is hosted on a different domain from the HTML page.
	var params = { allowScriptAccess: "always" };
    	var atts = { id: "video_player" };//The id for the inserted element by the API
    	swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=player1", "YTplayerHolder", "480", "295", "9", null, null, params, atts);
	var $add_video_button = $("#add_video_button");
	$add_video_button.click = add_video_button_click;
} );
