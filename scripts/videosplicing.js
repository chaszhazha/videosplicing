
//TODO: fine tune the start and end frame with left and right arrow keys
//TODO: show a list of all the videos
//TODO: mark the time on the timeline where there's a video switch
//TODO: dragging the timeline slider handle needs to play the corresponding video

var player;

function Link(source_doc, target_doc) {
	this.source_doc = source_doc;
	this.target_doc = target_doc;
	this.type = "";
}

function VideoClip(param) {
	var default_option = {
		vid:"", start: 0.0, duration: 0.0, position: 0.0
	};
	param = param || {};
	var option = $.extend({}, default_option, param);
	
	this.vid = option.vid;
	this.start = option.start;
	this.duration = option.duration;
	this.position = option.position;
}


function CompositeVideo(videosplicerObj) { // Composite video class
	this.links = [];
	this.videos = [];
	this.current = 0; // the index of the currently played video
	this.duration = 0.0;
	this.position = 0.0;
	this.isPlaying = false;
	this.$videosplicerObj = videosplicerObj;
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
	this.duration += video_clip.duration;
	return this;
}

CompositeVideo.prototype.UpdateCurrentVideo = function(start, duration) 
{
	var old_duration = this.videos[this.current].duration;
	var del = duration - old_duration;
	this.duration += del;
	this.videos[this.current].duration = duration;
	this.videos[this.current].start = start;

	//Update the max value of the timeline slider
	this.data("timeline_slider").slider("option","max", this.duration);
	this.data("timeline_slider").slider("option","value", this.position);

	//Also update the position of the videos that come after the current video
	var i ;
	for(i= this.current + 1;i < this.videos.length; i++) {
		this.videos[i].position += del;
	}
}

/**
 * This function is called every 0.1 seconds when the video is playing. Used to update the ui and monitor when to switch video
 */	
CompositeVideo.prototype.tick = function() {
	this.position = this.videos[this.current].position + player.getCurrentTime() - this.videos[this.current].start;
	//console.log(this.position + " = " + player.getCurrentTime() + " - " + this.videos[this.current].start);
	//TODO: update the slider for playback position of the whole video doc
	this.$videosplicerObj.data("timeline_slider").slider("option","value",this.position);
	//this.data()
}


// This function is left emtpy because the actual implementation will cause the function to be called not in a recursive way but in an event driven way so that\
// it will be called when not needed. So when you want to break out of the vicious cycle you just the function an empty body. It is declared here because the next function
// onYoutubePlayerReady() need to call this function and onYoutubePlayerReady needs to be globally accessable per google youtube api 
var playerStateChanged = function(state) {};

function onYouTubePlayerReady(playerId) {
	player = document.getElementById("video_player");
	//player.cueVideoById("s2XzoA94Zws");
	//player.playVideo();
	player.style.margin = "0 auto";
	player.addEventListener("onStateChange", "playerStateChanged");
	//var tmp = $(player).data("videosplicerObj");
	//console.log($(player).data("videosplicerObj"));
}

var video_timer = null;
(function($){
	var on_video_switched = function(event) {
		//console.log(event.data.data("video_doc"));
		var splicer_video = event.data.data("video_doc");
		var cur_video =  splicer_video.videos[splicer_video.current];
		/*player.loadVideoById( {videoId:cur_video.vid,
					startSeconds:cur_video.start + splicer_video.position - cur_video.position,
					endSeconds:cur_video.start + cur_video.duration});*/
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
		//TODO: finish this function, show the frame of the video
		//console.log($(this).data("videosplicerObj"));
	};
	
	$.fn.videosplicer = function(opt) {
		opt = opt || {};
		var default_opt = {player_height: 295, player_width:480};
		var option = $.extend({}, default_opt, opt);
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
				"<button id='splicer_select_range_button'>Select range for video clip</button>" + 
                		"<div id='timeline'><div id='splicer_timeline_slider'></div></div>");
		$("#vid").css({width:"200px"});
		$("head").append("<style>" + 
				"#video_container{margin:0 auto;  width:" + option.player_width + "px;}" + 
				"#vid_input{margin:0 auto; width: 600px;}" + 
				"#splicer_select_range_button{float: right; margin-top: 10px;}" + 
				"</style>");
	    	var params = { allowScriptAccess: "always" };
    	    	var atts = { id: "video_player" };//The id for the inserted element by the API
    	    	swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=player1", "YTplayerHolder", "480", "295", "9", null, null, params, atts);
		this.data("video_doc" , new CompositeVideo(this));
		var video_doc = this.data("video_doc");
		$(video_doc).bind("video_switched", this,  on_video_switched);
		
		var $range_selector = $("#splicer_range_selector");
		var $timeline_slider = $("#splicer_timeline_slider");
		//console.log($range_selector.parent().width());
		//$range_selector.css({width: ""});

		//Initilizing the range slider, set to disabled because there are no video clips included:
		var timeline_slider_onslide = function(event,ui) {
			
		};
		var timeline_slider_slidestart = function(event, ui) {
			if(video_timer) {
				clearInterval(video_timer);
			}
		};
		var timeline_slider_slidestop = function(event, ui) {
			if(player) {
				//TODO: switch video is necessary, calculate index of video based on position,
				//player.seekTo();
			}
			if(video_doc.isPlaying) {
				video_timer = setInterval(function(){video_doc.tick();}, 100);
			}
		}; 
		$range_selector.slider({range: true, slide: slider_onslide, step: 0.05});
		$range_selector.css({marginTop: "10px", width:"450px", marginLeft:"auto", marginRight:"auto"});
		$timeline_slider.slider({step:0.1, slide: timeline_slider_onslide, start: timeline_slider_slidestart, stop: timeline_slider_slidestop});
		$timeline_slider.css("margin-top", "50px");
		//$range_selector.slider("disable");
		var $add_video_button = $("#splicer_add_video_button");
		$add_video_button.data("videosplicerObj" , this);
		$range_selector.data("videosplicerObj" , this);
		$add_video_button.click(add_video_button_click);

		this.data("range_selector", $range_selector);
		this.data("timeline_slider",$timeline_slider);
		$("#play_button").data("videosplicerObj", this);
		var stop_button_onclick = function() {
			video_doc.isPlaying = false;
			if(video_timer) 
			{
				clearInterval(video_timer);
				video_timer = null;
			}
			player.stopVideo();
		};
		$("#stop_button").click(stop_button_onclick);	
			
		$(player).data("videosplicerObj", this);
		var select_range_button_click = function() {
			video_doc.UpdateCurrentVideo($range_selector.slider("option","values")[0], $range_selector.slider("option","values")[1] - $range_selector.slider("option","values")[0]);
		};
		$("#splicer_select_range_button").click(select_range_button_click);
		var play_button_onclick = function() {
			//TODO: after the first round of videos finish playing, the second time you click play button, it is the last video that will be played, from where last time it stoppe playing, change this
			//TODO: Do something about the range selection slider
			//TODO: 1. If it is in the player's mode, then either not show it or disable it and the "select range" button
			//If it is in the editor's mode, then update the max value and reposition the two handles
			video_doc.isPlaying = true;
			video_timer = setInterval( function() { video_doc.tick();} ,100);
			
			var cur_video =  video_doc.videos[video_doc.current];
			var start;
			if(video_doc.position >= cur_video.position && video_doc.position < cur_video.position + cur_video.duration)
				start = cur_video.start + video_doc.position - cur_video.position;
			else	start = cur_video.start;
			var end = cur_video.start + cur_video.duration;
			console.log("Playing video from " + start + " to " + end);
			player.loadVideoById( {videoId:cur_video.vid,
						startSeconds:start,
						endSeconds:end});
			playerStateChanged = function(state) {
			    var duration = player.getDuration();
			    console.log("Total duration of video:" + duration);
			    $range_selector.slider("option","max",duration);
			    var left = video_doc.videos[video_doc.current].start; 
			    var right = video_doc.videos[video_doc.current].start + video_doc.videos[video_doc.current].duration;
			    console.log(left + "<==>" + right);
			    $range_selector.slider("option","values",[left, right]);
			    if(state == 1) {
			    	video_doc.isPlaying = true;
			    	if(video_timer == null) {
				    video_timer = setInterval( function() { video_doc.tick();} ,100);
				}
			    }
			    else if((state == 2 || state == 0)) {
			        console.log("Switched from video " + video_doc.current + " to video " + (video_doc.current + 1));
				video_doc.current++;
				if(video_doc.current == video_doc.videos.length) {
				    video_doc.current = 0;
				    video_doc.position = 0.0;
				    video_doc.isPlaying = false;
				    clearInterval(video_timer);
				    video_timer = null;
				    playerStateChanged = function(state){};
				    return;
				}

				var start_at = video_doc.videos[video_doc.current].start + video_doc.position - video_doc.videos[video_doc.current].position;
				player.loadVideoById( {videoId:video_doc.videos[video_doc.current].vid,
							startSeconds:start_at,
							endSeconds:video_doc.videos[video_doc.current].start + video_doc.videos[video_doc.current].duration});
			    }
			}
		};
		$("#play_button").click(play_button_onclick);
		//******************************Test section*********************************
		this.data("video_doc").AddVideo(new VideoClip({vid:"mYIfiQlfaas", start: 85.0, duration: 15.0, position:0.0}))
					.AddVideo(new VideoClip({vid:"6tvUPFsaj5s", start: 25.0, duration: 15.0, position:15.0}))
					.AddVideo(new VideoClip({vid:"W9t3mbv2Hd8", start: 115.0, duration: 30.0, position:30.0}));
		$timeline_slider.slider("option","max", video_doc.duration);
		//***************************************************************************

		return this;
	}
})(jQuery);
