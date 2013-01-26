
//TODO: fine tune the start and end frame with left and right arrow keys
//TODO: jump to the next video
//TODO: show a list of all the videos
//TODO: mark the time on the timeline where there's a video switch
//TODO: find a way to have a handler for youtube player metadata onload to get the duration of the video
//TODO: when all the videos finish playing, the player will stop at the last frame of the last video whereas the data will point to the first video such that changes to the range of the video will be applied to the first video but the user will feel like they were changing the last video
//TODO: something's weird with the ranger slider when first started.

var player;

function Link(source_doc, target_doc) {
	this.source_doc = source_doc;
	this.target_doc = target_doc;
	this.type = "";
}

function VideoClip(param) {
	var default_option = {
		vid:"", start: 0.0, duration: 0.0, position: 0.0, video_length : 0.0
	};
	param = param || {};
	var option = $.extend({}, default_option, param);
	
	this.vid = option.vid;
	this.start = option.start;
	this.duration = option.duration;//Duration of the clip of the video
	this.position = option.position;
	this.video_length = option.video_length; //Duration of the youtube video 
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
	video_clip.position = this.duration;
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

	//Also update the position of the videos that come after the current video
	var i ;
	for(i= this.current + 1;i < this.videos.length; i++) {
		this.videos[i].position += del;
	}
}

CompositeVideo.prototype.Reposition = function(new_pos)
{
	if(new_pos <0 || new_pos > this.duration)
		return;
	var i;
	for(i = 1; i < this.videos.length; i++) {
		if(this.videos[i].position >new_pos) {
			break;
		}
	}
	this.current = i - 1;
	this.position = new_pos;
}

// This function is left emtpy here because the actual implementation will cause the function to be called not in a recursive way but in an event driven way so that\
// it will be called when not needed. So when you want to break out of the vicious cycle you just the function an empty body. It is declared here because the next function
// onYoutubePlayerReady() need to call this function and onYoutubePlayerReady needs to be globally accessable per google youtube api 
var playerStateChanged = function(state) {};

var playerReadyFuncs = [];

function onYouTubePlayerReady(playerId) {
	console.log(playerId);
	player = document.getElementById("video_player");
	//player.cueVideoById("s2XzoA94Zws");
	//player.playVideo();
	player.style.margin = "0 auto";
	player.addEventListener("onStateChange", "playerStateChanged");
	//var tmp = $(player).data("videosplicerObj");
	//console.log($(player).data("videosplicerObj"));
	for(var i = 0; i < playerReadyFuncs.length; i++)
		playerReadyFuncs[i]();
}



var video_timer = null;
(function($){
	var methods = {
	    init: function(opt) {
		var that = this;
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
					"<button id='pause_button'>Pause</button>" + 
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
		this.data("video_doc" , new CompositeVideo());

		var video_doc = this.data("video_doc");

		var add_video_button_click = function () {
			if(!player)
				return;
			var $this = $(this);
			// Send an xmlhttp request to test if the video id is valid
			xmlhttp=new XMLHttpRequest();
			var videoid = document.getElementById('vid').value;
			xmlhttp.onreadystatechange=function() {
				if (xmlhttp.readyState==4 && xmlhttp.status==200)
    				{
					var response = $.parseJSON(xmlhttp.responseText);
					//console.log(response);
					if(response.items && response.items.length > 0) {
    						//This means that the video is valide, now add the video to the UI
						var regex = /PT(\d+)M(\d+)S/i;
						var time = response.items[0].contentDetails.duration.match(regex);
						var dur = (time[1] * 60 + time[2]);
						//TODO 
						//1. position the timeline to the last position
						// 2. add the duration of the new video to the timeline's max value (since by default the whole video will be considered the clip)
						// 3. change the range selection bar
						// 4. change the video_doc to make the new video it's current video. Also change it's position value
					}
					else {
						//TODO: show some pop up containing a message saying that the video id is not a valid one
					}
				}
				else if (xmlhttp.readyState==4 && xmlhttp.status!=200)
    				{
    					//TODO: show some pop up containing a message saying that the video id is not a valid one
				} 
			};
			xmlhttp.open("GET","https://www.googleapis.com/youtube/v3/videos?id=" + videoid + "&part=contentDetails&key=AIzaSyCcjD3FvHlqkmNouICxMnpmkByCI79H-E8",true);
			xmlhttp.send();
		};

		var $range_selector = $("#splicer_range_selector");
		var $timeline_slider = $("#splicer_timeline_slider");

		/**
 		 * This function is called every 0.1 seconds when the video is playing. Used to update the ui's slider
 		 */
		var tick = function() {
			var video_doc = that.data("video_doc");
			video_doc.position = video_doc.videos[video_doc.current].position + player.getCurrentTime() - video_doc.videos[video_doc.current].start;
			//console.log(this.position + " = " + player.getCurrentTime() + " - " + this.videos[this.current].start);
			//** update the slider for playback position of the whole video doc
			$timeline_slider.slider("option","value",video_doc.position);
		};

		
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
			var video_doc = that.data("video_doc");
			if(player) {
				//switch video if necessary, calculate index of video based on position,
				var old_vid_ind = video_doc.current;
				video_doc.Reposition($(this).slider("option","value"));
				//console.log( "Old range: from " + $range_selector.slider("option","values")[0] + " to " + $range_selector.slider("option","values")[1]);
				if(old_vid_ind != video_doc.current) 
				{
					var start_at = video_doc.videos[video_doc.current].start + video_doc.position - video_doc.videos[video_doc.current].position;
					player.cueVideoById( {videoId:video_doc.videos[video_doc.current].vid,
							startSeconds:start_at,
							endSeconds:video_doc.videos[video_doc.current].start + video_doc.videos[video_doc.current].duration});				
					if(video_doc.videos[video_doc.current].video_length == 0) {
						video_doc.videos[video_doc.current].video_length = methods.getDurationOfVideoThroughXmlHttpRequest(video_doc.videos[video_doc.current].vid);
						//console.log("Getting video duration through ajax");
					}
					var duration = video_doc.videos[video_doc.current].video_length;
					
			    		var left = video_doc.videos[video_doc.current].start; 
			    		var right = video_doc.videos[video_doc.current].start + video_doc.videos[video_doc.current].duration;
			    		//console.log("New range: from " + left + " to " + right);
					$range_selector.slider("option",{max: duration, values: [left,right]});
					//$range_selector.slider("option","max",duration);
					//$range_selector.slider("option","values",[left, right]);
			    		
				}
					
			}
			player.seekTo(video_doc.videos[video_doc.current].start + video_doc.position - video_doc.videos[video_doc.current].position);
			if(video_doc.isPlaying) {
				video_timer = setInterval(tick, 100);
			}
			else
				player.pauseVideo();
		}; 
		var slider_onslide = function(event, ui) {
			//TODO: finish this function, show the frame of the video
			//console.log($(this).data("videosplicerObj"));
		};
		$range_selector.slider({range: true, slide: slider_onslide, step: 0.05});
		$range_selector.css({marginTop: "10px", width:"450px", marginLeft:"auto", marginRight:"auto"});
		$timeline_slider.slider({step:0.1, slide: timeline_slider_onslide, start: timeline_slider_slidestart, stop: timeline_slider_slidestop});
		$timeline_slider.css("margin-top", "50px");

		console.log($range_selector.find("a.ui-slider-handle"));
		$range_selector.find("a.ui-slider-handle").keydown(function(e) {
			if(e.keyCode == 37) { // Left arrow key
				if($(this).data().uiSliderHandleIndex == 0) {
					// Left handle
					var range = $range_selector.slider("option","values");
					range[0] -= 0.25;
					if(range[0] < 0) range[0] = 0;
					$range_selector.slider("option", "values",range);
				}
				else {
					// On the right handle
					var range = $range_selector.slider("option","values");
					range[1] -= 0.25;
					if(range[1] < range[0]) range[1] = range[0];
					$range_selector.slider("option", "values",range);
				}
			}
			else if(e.keyCode == 39) { // Right arrow key
				if($(this).data().uiSliderHandleIndex == 0) {
					// On the left handle
					var range = $range_selector.slider("option","values");
					range[0] += 0.25;
					if(range[0] >range[1]) range[0] = range[1];
					$range_selector.slider("option", "values",range);
				}
				else {
					// On the right handle
					var range = $range_selector.slider("option","values");
					range[1] += 0.25;
					if(range[1] > $range_selector.slider("option","max")) range[1] = $range_selector.slider("option","max");
					$range_selector.slider("option", "values",range);
				}
			}
			
			return false;
		});

		//$range_selector.slider("disable");
		var $add_video_button = $("#splicer_add_video_button");
		$add_video_button.data("videosplicerObj" , this);
		$range_selector.data("videosplicerObj" , this);
		$add_video_button.click(add_video_button_click);

		this.data("range_selector", $range_selector);
		this.data("timeline_slider",$timeline_slider);
		$("#play_button").data("videosplicerObj", this);
		var stop_button_onclick = function() {
			var video_doc = that.data("video_doc");
			video_doc.isPlaying = false;
			if(video_timer) 
			{
				clearInterval(video_timer);
				video_timer = null;
			}
			player.pauseVideo();
			video_doc.position = 0.0;
			video_doc.current = 0.0;
			//TODO: place timeline handle to the left most position, place the range selector handles to the first video's position
		};
		var pause_button_onclick = function() {
			var video_doc = that.data("video_doc");
			video_doc.isPlaying = false;
			if(video_timer) 
			{
				clearInterval(video_timer);
				video_timer = null;
			}
			player.pauseVideo();
		};
		$("#pause_button").click(pause_button_onclick);
		$("#stop_button").click(stop_button_onclick);	
			
		$(player).data("videosplicerObj", this);

		var select_range_button_click = function() {
			var video_doc = that.data("video_doc");
			video_doc.UpdateCurrentVideo($range_selector.slider("option","values")[0], $range_selector.slider("option","values")[1] - $range_selector.slider("option","values")[0]);
			//Update the max value of the timeline slider
			console.log("changing max of timeline slider from " + $timeline_slider.slider("option","max") + " to " + video_doc.duration)
			$timeline_slider.slider("option","max", video_doc.duration);
			console.log("Changing position of timeline slider from " + $timeline_slider.slider("option","value") + " to " + video_doc.position);
			$timeline_slider.slider("option","value", video_doc.position);
		};
		$("#splicer_select_range_button").click(select_range_button_click);
		var play_button_onclick = function() {
			var video_doc = that.data("video_doc");
			//TODO: 1. If we are in the player's mode, then either not show the range selector or disable it and the "select range" button
			//If it is in the editor's mode, then update the max value and reposition the two handles
			if(video_doc.isPlaying)
				return;			
			video_doc.isPlaying = true;
			video_timer = setInterval( tick ,100);
			
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
			    console.log("Player state changed. Total duration of video:" + duration);
			    if(!video_doc.isPlaying) {
				if(video_timer) {
					clearInterval(video_timer);
					video_timer = null;
				}
				playerStateChanged = function(state){};
				return;
			    }
			   
			    var left = video_doc.videos[video_doc.current].start; 
			    var right = video_doc.videos[video_doc.current].start + video_doc.videos[video_doc.current].duration;
			    //console.log(left + "<==>" + right);
			    $range_selector.slider("option","max",duration);
			    $range_selector.slider("option","values",[left, right]);
			    if(state == 1) {
			    	video_doc.isPlaying = true;
			    	if(video_timer == null) {
				    video_timer = setInterval( tick ,100);
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
		this.keypress(function(e) {
			if(e.keyCode == 32) {
				//TODO: space key pressed, pause or continue the video
			}
			console.log(e);
		});
		return this;
	    },
	    getDurationOfVideoThroughXmlHttpRequest: function(vid){
		if(!vid.length || vid == "")
			return null;
		xmlhttp=new XMLHttpRequest();
		var videoid = document.getElementById('vid').value;
		var duration;
		xmlhttp.onreadystatechange=function() {
			if (xmlhttp.readyState==4 && xmlhttp.status==200)
    			{
				var response = $.parseJSON(xmlhttp.responseText);
				if(response.items && response.items.length > 0) {
					var regex = /PT(\d+)M(\d+)S/i;
					var time = response.items[0].contentDetails.duration.match(regex);
					duration = (time[1] * 60 + time[2]);
					return;
				}
				else {
					duration = null;
					return
				}
			}
			else if (xmlhttp.readyState==4 && xmlhttp.status!=200)
    			{
    				duration = null;
				return;
			}
		}
		xmlhttp.open("GET","https://www.googleapis.com/youtube/v3/videos?id=" + videoid + "&part=contentDetails&key=AIzaSyCcjD3FvHlqkmNouICxMnpmkByCI79H-E8",true);
		xmlhttp.send();
		while(typeof duration == 'undefined')
			console.log("While loop in getDurationOfVideoThroughXmlHttpRequest");
		return duration;
	    },
	    loadVideos: function(videoDocObj) {
		if(! (videoDocObj instanceof CompositeVideo)) return this;
		this.data("video_doc", videoDocObj);
		this.data("timeline_slider").slider("option","max", videoDocObj.duration);
		if(videoDocObj.videos.length > 0) {
			this.data("range_selector").slider("option","max", videoDocObj.videos[0].video_length);
			this.data("range_selector").slider("option", "values",[videoDocObj.videos[0].start, videoDocObj.videos[0].start + videoDocObj.videos[0].duration]);
			player.loadVideoById({videoId:videoDocObj.videos[0].vid,
						startSeconds:videoDocObj.videos[0].start,
						endSeconds:videoDocObj.videos[0].start + videoDocObj.videos[0].duration});
			player.pauseVideo();
			this.data("range_selector").slider("option", "max", player.getDuration());
			//TODO: also validate that each video is valid and that the duration of the actual youtube video matches the data passed in
		}
	    },
	    onPlayerReady:function(callback) {
		playerReadyFuncs.push(callback);
	    }
	};		

	$.fn.videosplicer = function(method) {
	    if(methods[method]) {
		return methods[method].apply(this, Array.prototype.slice.call(arguments,1));
	    }
	    else if((typeof method) == 'object' || !method ) {
		return methods.init.apply(this, arguments);
	    }
	    else {
		$.error('Method ' + method + ' does not exist on jQuery.videosplicer');
	    }
	};

})(jQuery);
