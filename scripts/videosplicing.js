
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

CompositeVideo.prototype.UpdateCurrentVideo = function(start, duration) 
{
	var old_duration = this.videos[this.current].duration;
	this.duration += (duration - old_duration);
	this.videos[this.current].duration = duration;
	this.videos[this.current].start = start;
	//TODO: either update the visual for the clips here or somewhere where this function gets called
}

/**
 * This function is called every 0.1 seconds when the video is playing. Used to update the ui and monitor when to switch video
 */	
CompositeVideo.prototype.tick = function() {
	this.position = player.getCurrentTime() - this.videos[this.current].start;
	//console.log(this.position + " = " + player.getCurrentTime() + " - " + this.videos[this.current].start);
	//TODO: update the slider for playback position of the whole video doc
}

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

var video_timer;
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
		//TODO: finish this function
		//console.log($(this).data("videosplicerObj"));
	};
	
	$.fn.videosplicer = function(opt) {
		var stop_button_onclick = function() {
			clearInterval(video_timer);
			player.stopVideo();
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
		
		var $range_selector = $("#splicer_range_selector");
		var $timeline_slider = $("#splicer_timeline_slider");
		//console.log($range_selector.parent().width());
		//$range_selector.css({width: ""});

		//Initilizing the range slider, set to disabled because there are no video clips included:
		$range_selector.slider({range: true, slide: slider_onslide});
		$range_selector.css({marginTop: "10px", width:"450px", marginLeft:"auto", marginRight:"auto"});
		$timeline_slider.slider();
		$timeline_slider.css("margin-top", "50px");
		//$range_selector.slider("disable");
		var $add_video_button = $("#splicer_add_video_button");
		$add_video_button.data("videosplicerObj" , this);
		$range_selector.data("videosplicerObj" , this);
		$add_video_button.click(add_video_button_click);
		this.data("video_doc" , new CompositeVideo());
		var video_doc = this.data("video_doc");
		$(this.data("video_doc")).bind("video_switched", this,  on_video_switched);
		this.data("range_selector", $range_selector);
		$("#play_button").data("videosplicerObj", this);
			
		$("#stop_button").click(stop_button_onclick);		
		$(player).data("videosplicerObj", this);
		var play_button_onclick = function() {
			var splicer_video = $(this).data("videosplicerObj").data("video_doc");
			video_timer = setInterval( function() { splicer_video.tick();} ,100);
			
			var cur_video =  splicer_video.videos[splicer_video.current];
			player.loadVideoById( {videoId:cur_video.vid,
						startSeconds:cur_video.start + splicer_video.position - cur_video.position,
						endSeconds:cur_video.start + cur_video.duration});
			playerStateChanged = function(state) {
			    if((state == 2 || state == 0)) {
			        console.log(video_doc.current);
				video_doc.current++;
				if(video_doc.current == video_doc.videos.length) {
				    video_doc.current = 0;
				    video_doc.position = 0.0;
				    //TODO: this will cause this function to be caled again which will result in videos being played in a loop. have a bool state outside this funtion to break the loop
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
		this.data("video_doc").AddVideo(new VideoClip({vid:"HxOA9BO2o6I", start: 5.0, duration: 15.0, position:0.0}))
					.AddVideo(new VideoClip({vid:"2euenOOulHE", start: 25.0, duration: 15.0, position:15.0}))
					.AddVideo(new VideoClip({vid:"XnxSLwLFfNY", start: 315.0, duration: 30.0, position:30.0}));
		//***************************************************************************

		return this;
	}
})(jQuery);
