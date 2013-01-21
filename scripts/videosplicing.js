
var player;

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
	this.current = 0; // the index of the currently played video
	this.duration = 0.0;
	this.position = 0.0;
	this.isPlaying = false;
}

CompositeVideo.prototype.AddVideo = function(video_clip)
{
	if(!video_clip || !(video_clip instanceof VideoClip))
	{
		console.error("Argument need to be an instance of VideoClip");
		return this;
	}
	this.videos.push(video_clip);
	this.links.push(new Link(this, video_clip));
	return this;
}

CompositeVideo.prototype.UpdateCurrentVideo = function(start, end) 
{
	if(end <= start)
		return;
	var duration = end - start;
	var old_duration = this.videos[this.current].end - this.videos[this.current].start;
	this.duration += (duration - old_duration);
	this.videos[this.current].end = end;
	this.videos[this.current].start = start;
	//TODO: either update the visual for the clips here or somewhere where this function gets called
}

/**
 * This function is called every 0.1 seconds when the video is playing. Used to update the ui and monitor when to switch video
 */	
CompositeVideo.prototype.tick = function() {
	this.position = player.getCurrentTime() - this.videos[this.current].start;
	//TODO: update the slider for playback position of the whole video doc
	if( (this.position + 0.1) > this.videos[this.current].position + this.videos[this.current].end - this.videos[this.current].start)
	{
		this.current++;
		if(this.current == this.videos.length) {
			this.current = 0;
			this.position = 0.0;
		}
		//TODO: switch to the next video, if current video is the last video, then stop the playback and change the current video to point to the first video
		$(this).trigger("video_switched");
	}
}

function onYouTubePlayerReady(playerId) {
	player = document.getElementById("video_player");
	//player.cueVideoById("s2XzoA94Zws");
	//player.playVideo();
	player.style.margin = "0 auto";
}

var video_timer;
(function($){
	var on_video_switched = function() {
		
	};
	var add_video_button_click = function () {
		if(!player)
			return;
		var $this = $(this);
		console.log($this.data("videosplicerObj"));

		// Send an xmlhttp request to test if the video id is valid
		xmlhttp=new XMLHttpRequest();
		var videoid = document.getElementById('vid').value;
		xmlhttp.onreadystatechange=function() {
			if (xmlhttp.readyState==4 && xmlhttp.status==200)
    			{
				var response = $.parseJSON(xmlhttp.responseText);
			
				if(response.items && response.items.length > 0) {
    					player.cueVideoById(videoid);
					player.playVideo();
					console.log(player.getDuration());
				}
				else {
					//TODO: show some pop up containing a message saying that the video id is not a valid one
				}
			}
			else if (xmlhttp.readyState==4 && xmlhttp.status!=200)
    			{
    				//TODO: show some pop up containing a message saying that the video id is not a valid one
			}
		}
		xmlhttp.open("GET","https://www.googleapis.com/youtube/v3/videos?id=" + videoid + "&part=id&key=AIzaSyCcjD3FvHlqkmNouICxMnpmkByCI79H-E8",true);
		xmlhttp.send();
	}

	var slider_onslide = function(event, ui) {
		console.log($(this).data("videosplicerObj"));
	};
	
	$.fn.videosplicer = function(opt) {
		var play_button_onclick = function() {
			video_timer = setInterval( $(this).data("videosplicerObj").tick ,100);
		};
		var stop_button_onclick = function() {
			clearInterval(video_timer);
		}
		opt = opt || {};
		var default_opt = {player_height: 295, player_width:480};
		var option = $.extend({},default_opt, opt);
	    	this.html(
				"<div id='vid_input'>" + 
					"<span>Type video id here:</span><input type='text' id='vid'></input><button id='splicer_add_video_button'>Add video</button>" + 
				"</div>" + 
                		"<div id='video_container'>" +
					"<div id='YTplayerHolder'>You need Flash player 8+ and JavaScript enabled to view this video.</div>" + 
					"<button id='play_button'>Play</button>" + 
					"<button id='stop_button'>Stop</button>" + 
				"</div> " + 
				"<div id='splicer_time_markers'><span id=''></span></div>" + 
                		"<div id='splicer_range_selector'></div>" +
				"<button id='splicer_select_range_button'>Selection range for video clip</button>" + 
                		"<div id='timeline'></div>");
		$("#vid").css({width:"200px"});
		$("head").append("<style>" + 
				"#video_container{margin:0 auto;  width:" + option.player_width + "px;}" + 
				"#vid_input{margin:0 auto; width: 500px;}" + 
				"#splicer_select_range_button{float: right; margin-top: 10px;}" + 
				"</style>");
	    	var params = { allowScriptAccess: "always" };
    	    	var atts = { id: "video_player" };//The id for the inserted element by the API
    	    	swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=player1", "YTplayerHolder", "480", "295", "9", null, null, params, atts);
		
		var $range_selector = $("#splicer_range_selector");
		//console.log($range_selector.parent().width());
		//$range_selector.css({width: ""});

		//Initilizing the range slider, set to disabled because there are no video clips included:
		$range_selector.slider({range: true, slide: slider_onslide});
		$range_selector.css("margin-top", "10px");
		//$range_selector.slider("disable");
		var $add_video_button = $("#splicer_add_video_button");
		$add_video_button.data("videosplicerObj" , this);
		$range_selector.data("videosplicerObj" , this);
		$add_video_button.click(add_video_button_click);
		this.data("video_doc" , new CompositeVideo());
		$(this.data("video_doc")).bind("video_switched", on_video_switched);
		this.data("range_selector", $range_selector);
		$("#play_button").data("videosplicerObj", this);
		$("#play_button").click(play_button_onclick);	
		$("#stop_button").click(stop_button_onclick);		


		//******************************Test section*********************************
		this.data("video_doc").AddVideo(new VideoClip({vid:"HxOA9BO2o6I", start: 5.0, end: 10.0, position:0.0}))
					.AddVideo(new VideoClip({vid:"vTzMQonwH0U", start: 5.0, end: 10.0, position:5.0}))
					.AddVideo(new VideoClip({vid:"84mXSz2-XPM", start: 5.0, end: 30.0, position:10.0}));
		//***************************************************************************

		return this;
	}
})(jQuery);
