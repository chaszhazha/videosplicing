

function Link(source_doc, target_doc) {
	this.source_doc = source_doc;
	this.target_doc = target_doc;
	this.type = "";
}

function VideoClip(param) {
	var default_option = {
		vid:"", start: 0.0, end: 0.0, position: 0.0
	};
	param = param || {};
	var option = $.extend({}, default_option, param);
	
	this.vid = option.vid;
	this.start = option.start;
	this.end = option.end;
	this.position = option.position;
}


function CompositeVideo() { // Composite video class
	this.links = [];
	this.videos = [];
	this.duration = 0.0;
	this.position = 0.0;
}

CompositeVideo.prototype.AddVideo = function(video_clip)
{
	if(!video_clip || !(video_clip instanceof VideoClip))
	{
		console.error("Argument need to be an instance of VideoClip");
		return;
	}
}



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
	console.log(player);
}


(function($){
	$.fn.videosplicer = function(param) {
	    	this.html("<div id='video_workspace'>" + 
				"<div>" + 
					"<span>Type video id here:</span><input type='text' id='vid'></input><button id='add_video_button'>Add video</button>" + 
				"</div>" + 
                		"<div id='YTplayerHolder'>You need Flash player 8+ and JavaScript enabled to view this video.</div> " + 
                		"<div id='range_selector'></div>" +
                		"<div id='timeline'></div>" + 
			"</div>");
	    	var params = { allowScriptAccess: "always" };
    	    	var atts = { id: "video_player" };//The id for the inserted element by the API
    	    	swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=player1", "YTplayerHolder", "480", "295", "9", null, null, params, atts);
		var range_selector = $("#range_selector");
		range_selector.slider({range: true});
		var $add_video_button = $("#add_video_button");
		$add_video_button.click(add_video_button_click);
	
		this.video_doc = new CompositeVideo();
		return this;
	}
})(jQuery);
