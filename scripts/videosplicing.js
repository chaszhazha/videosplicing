
//TODO: mark the time on the timeline where there's a video switch
//TODO: red position vertical bar for timeline pane view
//TODO: edit annotation color and background color and opacity
//TODO: edit duration of an annotation

//TODO: when dragging the timeline slider, the video will stop switching when it should and the annotation will stop annotation update cuz we are stopping the timer,
//	instead of stopping the timer, we could simply add a boolean flag so that if the slider handler is pressed we simply stop positioning the handler from code.

//TODO: give the icon of the current video a border
//TODO: indicate where the annotates are on the slider timeline and use keyboard navigation to jump to that positon

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
	this.end = this.start + this.duration;
	this.position = option.position;
	this.video_length = option.video_length; //Duration of the youtube video 
	this.isCurrent = false;
	this.annotations = [];
}


function CompositeVideo() { // Composite video class
	this.videolinks = [];
	this.annotations = []; // This is just a mutable copy of the annotations of the current video that are not displayed
	this.annotations_shown = []; // This is an array for the jQuery selection of the annotation divs
	this.videos = [];
	this.current = 0; // the index of the currently played video
	this.duration = 0.0;
	this.position = 0.0; 
	this.isPlaying = false;
}

CompositeVideo.prototype.AddVideo = function(arg)
{
	if(!arg) {
		console.error("Cannot accept empty arguments");
		return this;
	}
	if(arg instanceof VideoClip)
	{
		arg.position = this.duration;
		this.videos.push(arg);
		this.videolinks.push(new Link(this, arg));
		this.duration += arg.duration;
	}
	else if(arg instanceof Array)
	{
		for(var i = 0; i < arg.length; i++)
		{
			 this.AddVideo(arg[i]);
		}
		return this;
	}
	else
	{
		console.error("Unacceptable argument: " + arg);
		return this;
	}
}

CompositeVideo.prototype.UpdateCurrentVideo = function(start, duration) 
{
	//console.log( start + " <==> " + duration);
	var old_duration = this.videos[this.current].duration;
	var del = duration - old_duration;
	this.duration += del;
	

	this.position += this.videos[this.current].start - start;
	if(this.position < this.videos[this.current].position)	this.position = this.videos[this.current].position;
	this.videos[this.current].duration = duration;
	this.videos[this.current].start = start;
	this.videos[this.current].end = start + duration;
	//Also update the position of the videos that come after the current video
	var i ;
	for(i= this.current + 1;i < this.videos.length; i++) {
		this.videos[i].position += del;
	}
}

// repositioning of the video doc model, change the current video index if necessary, return whether video is switched
CompositeVideo.prototype.Reposition = function(new_pos)
{
	if(new_pos <0 || new_pos > this.duration)
		return;
	var i;
	var ret = false;
	for(i = 1; i < this.videos.length; i++) {
		if(this.videos[i].position >new_pos) {
			break;
		}
	}
	if(this.current != (i-1))
	{
		ret = true;
		this.current = i - 1;
		this.annotations = this.videos[this.current].annotations.slice(0);
	}
	this.position = new_pos;
	return ret;
}

CompositeVideo.prototype.copy = function(video_doc) {
	this.videos = [];
	this.videolinks = [];
	for(var i = 0; i < video_doc.videos.length; i++) {
		this.videos[i] = video_doc.videos[i];
	}
	this.duration = video_doc.duration;
}

/**
 * This function generates and returns an array containing all the video links, used for exporting links
 */
CompositeVideo.prototype.getLinks = function() {
	//TODO
}

function VideoAnnotation(a) {
	var default_args = {content: "", duration: 10, position:0, top:0, bottom:0,left: 0, right:0, background:{r:120,g:120,b:120, a:0.6}, foreground: "#ffffff"};
	var args = $.extend(true, {}, default_args, a);
	this.content = args.content;
	this.duration = args.duration;
	this.position = args.position; // This should be the position that the annotation will show up in the timeline of the whole video.
	this.rect = {top:args.top, bottom:args.bottom, left: args.left, right:args.right, width: args.right - args.left, height: args.bottom - args.top};
	this.rect.width = this.rect.width > 0 ? this.rect.width : 0;
	this.rect.height = this.rect.height > 0 ? this.rect.height : 0;
	this.background = {};
	this.background.r = args.background.r;
	this.background.g = args.background.g;
	this.background.b = args.background.b;
	this.background.a = args.background.a;
	this.foreground = args.foreground;
	this.duration = args.duration;
	this.end = this.position + this.duration;
}


// These two functions are needed by the youtube player and they need to be globally available, but they also need access to the plugin's data, so their definition come later inside of the plugin's difiniton
var onYouTubePlayerReady;
var onPlayerStateChange;

(function($){
	var video_timer = null;
	var private_methods = {
	    video_icon_clicked: function(event) {
		var $li = $(event.delegateTarget);
		var video_doc = $li.data("video_doc");
		
		var videoclip = $li.data("videoclip");
		if(video_doc.Reposition(videoclip.position))
		{
			//swith video
			$li.data("player").cueVideoById( {videoId:video_doc.videos[video_doc.current].vid, startSeconds:video_doc.videos[video_doc.current].start});
			$li.data("player").pauseVideo();
		}
		$li.data("player").seekTo(video_doc.videos[video_doc.current].start);
		if(video_doc.isPlaying)
			$li.data("player").playVideo();
		else
		{
			$li.data("player").pauseVideo();
		}
		private_methods.tick.call(this);

		this.data("range_selector").slider("option", {values:[video_doc.videos[video_doc.current].start + 0, video_doc.videos[video_doc.current].end], 
								max: video_doc.videos[video_doc.current].video_length});
	    },
		switch_to_next_video: function(video_doc) {
			for(var i = 0; i < video_doc.annotations_shown.length; i++) {
				video_doc.annotations_shown[i].remove();
			}
			var player = this.data("player");
			var $video_icons = this.find(".video-icon");
			$($video_icons[video_doc.current]).removeClass("current-video");
			video_doc.annotations_shown = [];
			if(video_doc.current == video_doc.videos.length -1)
			{
				// The last video finished playing, stop the timer and reset the current video to the first, also the handlers
				video_doc.videos[video_doc.current].isCurrent = false;
				video_doc.current = 0;
				video_doc.videos[0].isCurrent = true;
			    	video_doc.position = 0.0;
			    	video_doc.isPlaying = false;
			    	clearInterval(video_timer);
			    	video_timer = null;

				// load the first video if there are more than 1 videos, also reset the handles
				if(video_doc.videos.length != 1)
					player.loadVideoById( {videoId:video_doc.videos[0].vid,
						startSeconds:video_doc.videos[0].start} );
				else
					player.seekTo(video_doc.videos[0].start);
				player.pauseVideo();
				this.data("range_selector").slider("option","values",[video_doc.videos[0].start, video_doc.videos[0].start + video_doc.videos[0].duration]);
				this.data("range_selector").slider("option","max",video_doc.videos[0].video_length);
				this.data("timeline_slider").slider("option","value",0);
				this.data("play_button").find("#play_svg").css("display","inline").end().find("#pause_svg").css("display","none");
				video_doc.annotations = video_doc.videos[0].annotations.slice(0);
			}
			else {
				console.log("Switch to the next video");
				//Swith to the next video, and change to range slider handles
				video_doc.videos[video_doc.current].isCurrent = false;
				video_doc.current++;
				video_doc.videos[video_doc.current].isCurrent = true;
				var left = video_doc.videos[video_doc.current].start; 
		    		var right = video_doc.videos[video_doc.current].start + video_doc.videos[video_doc.current].duration;
		    		//console.log(left + "<==>" + right);
		    		this.data("range_selector").slider("option","max",video_doc.videos[video_doc.current].video_length);
		    		this.data("range_selector").slider("option","values",[left, right]);
				var start_at = video_doc.videos[video_doc.current].start + video_doc.position - video_doc.videos[video_doc.current].position;
				video_doc.annotations = video_doc.videos[video_doc.current].annotations.slice(0);
				player.loadVideoById( {videoId:video_doc.videos[video_doc.current].vid,
						startSeconds:start_at});
			}
			$($video_icons[video_doc.current]).addClass("current-video");
			for(var i = 0; i < video_doc.annotations.length; i++) {
				if(video_doc.annotations[i].position < video_doc.videos[video_doc.current].start && video_doc.annotations[i].end > video_doc.videos[video_doc.current].end)
				{
					console.log("Showing annotation on start of a video clip");
					var $annotation = private_methods.show_annotation.call(that, video_doc.annotations[i]);
					video_doc.annotations_shown.push($annotation);
					video_doc.annotations[i].displayed = true;
				}
			}
		},
		tick: function() {
			var video_doc = this.data("video_doc");
			var player = this.data("player");
			var player_time = player.getCurrentTime();
			//console.log(player_time);
			//First check if there are new annotations to show
			for(var i = 0; i < video_doc.annotations.length; i++)
			{
				if(( ! video_doc.annotations[i].displayed) && video_doc.annotations[i].position < player_time && video_doc.annotations[i].end > player_time)
				{
					var $annotation = private_methods.show_annotation.call(this, video_doc.annotations[i]);
					video_doc.annotations_shown.push($annotation);		
					video_doc.annotations[i].displayed = true;
				}
			}
			
			//Second check if displayed annotations need to disappear
			for(var i = 0; i < video_doc.annotations_shown.length; i++)
			{
				var annotation = video_doc.annotations_shown[i].data("annotation");
				if(annotation && (annotation.end < player_time || annotation.position > player_time))
				{
					video_doc.annotations_shown[i].remove();
				}
			}

			video_doc.position = video_doc.videos[video_doc.current].position + player_time - video_doc.videos[video_doc.current].start;
			//console.log(this.position + " = " + player.getCurrentTime() + " - " + this.videos[this.current].start);
			//** update the slider for playback position of the whole video doc
			if(!this.data("seeking"))
				this.data("timeline_slider").slider("option","value",video_doc.position);
			if(video_doc.position + 0.1 > video_doc.videos[video_doc.current].position + video_doc.videos[video_doc.current].duration)
			{
				// Switch point reached
				private_methods.switch_to_next_video.call(this, video_doc);
			}
		},
		show_annotation: function(a) {
			// annotation should be an object that has properties like text, rect location and size, opacity, start_position, end_position  etc
			var default_annotation = {opacity:0.6, rect: {top:20, left:20, width:100, height:100}, content:""};
			var annotation = $.extend(true, {}, default_annotation, a);
			var $annotation = $("<div class = 'annotation'>" + annotation.content +"</div>");
			var $player_overlay = this.data("player_overlay"); 
			$player_overlay.append($annotation);
			//console.log("content added to div#player_wrapper with width " + annotation.rect.width + "px and height " + annotation.rect.height + "px");
			$annotation.data("annotation",annotation);
			$annotation.css({opacity:annotation.opacity, top:annotation.rect.top + "px", left: annotation.rect.left + "px",
				 width: annotation.rect.width + "px", height: annotation.rect.height + "px", color:annotation.foreground,
				 backgroundColor: "rgba(" + annotation.background.r + "," + annotation.background.g + "," + annotation.background.b + "," + annotation.background.a + ")"});
			return $annotation;
		}
	};
	var methods = {
	    init: function(opt) {
		var player;
		var that = this;
		this.playerReadyFuncs = [];
		
		onPlayerStateChange = function(state) {
			var video_doc = that.data("video_doc");
			//console.log(state);
			if(state == 1 && !video_doc.isPlaying)
			{
				// This case is when the user clicks on the red play button that comes with the player
				$play_button.trigger('click');
				$play_button.find("#play_svg").css("display","none"),end().find("#pause_svg").css("display","inline");
			}
			if(state == 0 && video_doc.isPlaying)
			{
				/** Some video clip's end position might be the actual end of the whole video, and that end position most likely is a floating point number.
				But the duration of the video that the youtube api returns is actually an integer. And the way that I am doing the monitoring of the boundary
				of the video clips is to constantly updating a position value and synching it according to the actual play position of the video. So for example
				if the second video starts at time 15 second from its 30th second, then every 0.1 second there will be a timer checking the position 
				of the player to calculate the virtual position of the whole video document, and then add 0.1 to that value. And if the result exceeds the end position
				then we either swith to the next video or if it is the last video then we stop the playback. Now if a video clip's end position is also the end
				position of the original video and let's say  it's 187.16, the youtube api will actually return a duration of 188 of that video, and so 187.16 + 0.1 = 187.26 < 188,
				so the timer will be running but it will not switch to the next video. But the player will fire a state changed event indicating that the playback
				has ended, we can use that here
				*/
				switch_to_next_video(video_doc);
				console.log("Ahahahahaha");
				$play_button.find("#play_svg").css("display","inline"),end().find("#pause_svg").css("display","none");
				
			}
		};
		onYouTubePlayerReady = function(playerId) {
			player = document.getElementById("video_player");
			that.data("player",player);
			player.style.margin = "0 auto";
			player.addEventListener("onStateChange", "onPlayerStateChange");
			//var tmp = $(player).data("videosplicerObj");
			//console.log($(player).data("videosplicerObj"));
			for(var i = 0; i < that.playerReadyFuncs.length; i++)
				that.playerReadyFuncs[i]();
		};

		opt = opt || {};
		var default_opt = {player_height: 295, player_width:480};
		var option = $.extend({}, default_opt, opt);
	    	this.html(
				"<div id='vid_input'>" + 
					"<span>Type video id here:</span><input type='text' id='vid'></input><button id='splicer_add_video_button'>Add video</button>" + 
				"</div>" + 
                		"<div id='video_container'>" +
					"<div id='player_wrapper'><div id='YTplayerHolder'>You need Flash player 8+ and JavaScript enabled to view this video.</div><div id='player_overlay'> </div></div>" + 
					"<button id='play_button' class='playback-button'>" + 
						"<svg xmlns='http://www.w3.org/2000/svg' version='1.1' id='play_svg'><polygon points='2,2 18,10 2,18'/></svg>" + 
						"<svg xmlns='http://www.w3.org/2000/svg' version='1.1' id='pause_svg' style='display:none;'>" + 
							"<polygon points='3,2 8,2 8,18 3,18'/>" + 
							"<polygon points='12,2 17,2 17,18 12,18'/>" + 
						"</svg>" +
					"</button>" + 
					"<button id='stop_button' class='playback-button'><svg xmlns='http://www.w3.org/2000/svg' version='1.1'>" + 
						"<polygon points='2,2 18,2 18,18 2,18'/>" + 
					"</svg></button>" + 
					"<button id='annotate_button' >Annotate</button><button id='annotation_done_button'>Done</button><button id='cancel_region_selection_button'>Cancel</button>" + 
				"</div> " + 
				"<div id='splicer_time_markers'><span id=''></span></div>" + 
                		"<div id='splicer_range_selector'></div>" +
                		"<div id='timeline'><div id='splicer_timeline_slider'></div>" + 
					"<div id='timeline_pane'> <div id='timeline_scroll_content'><ul></ul></div> <div class='slider-wrapper'><div id='timeline_scrollbar'></div> </div></div>" + 
				"</div>");
		$("#vid").css({width:"200px"});
		$("head").append("<style>" + 
				"#video_container{margin:0 auto;  width:" + option.player_width + "px;}" + 
				"#vid_input{margin:0 auto; width: 600px;}" + 
				"div#timeline div#timeline_pane{ " + 
					"-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius:5px;" + 
					"border: 2px solid gray;" + 
					"height:120px;" +
					"margin-top: 20px" + 
				"}" + 
				".slider-wrapper{clear: left; padding: 0 4px 0 2px; margin: 0 -1px -1px -1px;}" + 
				"#timeline_pane{overflow: hidden; width: 99%; float:left;}" +
				".playback-button{padding:2px 2px}" +
				".playback-button svg{width:20px; height:20px;}" + 
				".playback-button svg polygon{fill:black;}" + 
				"#timeline_scroll_content{width: 2440px; float: left; height: 110px}" + 
				"#timeline_scroll_content ul {list-style-type: none; margin-top:auto; margin-bottom:auto; padding:0;}" + 
				"#timeline_scroll_content ul li{display:inline; float: left;}" + 
				"#timeline_pane ul li .video-icon{cursor: pointer;}" + 
				"div#timeline div#timeline_pane div#timeline_scrollcontent div{ float: left;}" + 
				"div.video-icon{display:inline; float: left; margin: 4px 6px; border-width:5px; border-radius: 8px; border-style:solid;}" + 
				"div.current-video{border-color: steelblue;}" +
				"div#player_overlay {position:absolute; top:0}" + 
				"div#player_wrapper {position: relative}" + 
				"button#annotate_button {float:right;} " + 
				"#annotation_done_button, #cancel_region_selection_button{display: none; float: right;}" + 
				".annotation { background: #444444; position:absolute;}" + 
				".annotation_region textarea{resize:none;}" +
				".annotation_bar { width: 2px; background-color: black; height: 100%; position: absolute; z-index: 4;}" + 
				".annotation_region{position: absolute; border-style:dashed; border-width:2px;background-color: rgba(80,250,250,0.4); cursor:move;}" +  
				"p.annotation-editable{margin:0; width:100%;letter-spacing:1px;}" + 
				"#timeline li.timeline-sortable-highlight {border: 2px solid #fcefa1;width: 116px; height: 90px; margin: 4px 6px;background: #fbf9ee; padding:0;}" +
				"</style>");
	    	var params = { allowScriptAccess: "always" };
    	    	var atts = { id: "video_player" };//The id for the inserted element by the API
    	    	swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=player1", "YTplayerHolder", option.player_width, option.player_height, "9", null, null, params, atts);
		this.data("video_doc" , new CompositeVideo());

		var video_doc = this.data("video_doc");
		var $player_wrapper = $("div#player_wrapper");
		var $player_overlay = $("div#player_overlay");
		//$player_overlay.keydown(function(event) {return false;}); // Prevent the plugin getting the keydown event
		$player_overlay.css({width:option.player_width, height:option.player_height});
		this.data("player_overlay", $player_overlay);
		
		/* After removing an element, its associated data will also be removed
		var $annotation = show_annotation();
		$annotation.remove();
		console.log($annotation.data("annotation")); // This should be undefined at this point, but $annotation still has the html content
		//*/

		var add_video_button_click = function () {
			if(!player)
				return;
			// Send an xmlhttp request to test if the video id is valid
			var xmlhttp=new XMLHttpRequest();
			var videoid = document.getElementById('vid').value;
			xmlhttp.onreadystatechange=function() {
				var video_doc = that.data("video_doc");
				if (xmlhttp.readyState==4 && xmlhttp.status==200)
    				{
					var response = $.parseJSON(xmlhttp.responseText);
					//console.log(response);
					if(response.items && response.items.length > 0) {
    						//This means that the video is valide, now add the video to the UI
						if($range_selector.slider("option","disabled"))
						{
							$range_selector.slider("enable");
							$timeline_slider.slider("enable");
						}
						var regex = /PT(\d+)M(\d+)S/i;
						var time = response.items[0].contentDetails.duration.match(regex);
						var dur = (parseInt(time[1]) * 60 + parseInt(time[2]));
						video_doc.AddVideo(new VideoClip({vid:videoid, start:0.0, duration:dur, video_length:dur}));
						var vid_thumbnail_url = response.items[0].snippet.thumbnails.default.url;
						var new_li = that.find("div#timeline_pane div#timeline_scroll_content ul")
							.append("<li><div class='video-icon'><img src='" + vid_thumbnail_url + "' alt='Video " + video_doc.videos.length +"'/></div></li>");
						var new_img = new_li.find("img");
						new_img.data("videoclip", video_doc.videos[video_doc.length - 1]);
						new_img.click((function(){return function(event) {private_methods.video_icon_clicked.call(this,event)} })());
						new_img.data("video_doc",video_doc);
						new_img.data("player",player);
						that.data("timeline_slider").slider("option","max", video_doc.duration);
						if(video_doc.videos.length == 1)
						{
							video_doc.videos[0].isCurrent = true;
							player.loadVideoById({videoId:videoid, startSeconds:0});
							player.pauseVideo();
							$range_selector.slider("option",{max:dur, values:[0, dur]});
						}

					}
					else {
						//TODO: show some pop up containing a message saying that the video id is not a valid one
					}
				}
				else if (xmlhttp.readyState==4 && xmlhttp.status!=200)
    				{
    					//TODO: show some pop up containing a message saying that the video id is notvideo_doc.current a valid one
				} 
			};
			xmlhttp.open("GET","https://www.googleapis.com/youtube/v3/videos?id=" + videoid + "&part=contentDetails,snippet&key=AIzaSyCcjD3FvHlqkmNouICxMnpmkByCI79H-E8",true);
			xmlhttp.send();
		};

		var $range_selector = $("#splicer_range_selector");
		var $timeline_slider = $("#splicer_timeline_slider");

		//Initilizing the range slider, set to disabled because there are no video clips included:
		var timeline_slider_onslide = function(event,ui) {
			
		};
		var timeline_slider_slidestart = function(event, ui) {
			if(video_timer) {
				clearInterval(video_timer);
				video_timer = null;
			}
		};
		var timeline_slider_slidestop = function(event, ui) {
			var video_doc = that.data("video_doc");
			var old_curr = video_doc.current;
			if(video_doc.Reposition($(this).slider("option","value"))) 
			{
				var $video_icons = that.find(".video-icon");
				$($video_icons[video_doc.current]).addClass("current-video");
				$($video_icons[old_curr]).removeClass("current-video");
				var start_at = video_doc.videos[video_doc.current].start + video_doc.position - video_doc.videos[video_doc.current].position;
				player.cueVideoById( {videoId:video_doc.videos[video_doc.current].vid,
						startSeconds:start_at});				
				var duration = video_doc.videos[video_doc.current].video_length;
			    	var left = video_doc.videos[video_doc.current].start; 
			    	var right = video_doc.videos[video_doc.current].start + video_doc.videos[video_doc.current].duration;
			    	//console.log("New range: from " + left + " to " + right);
				$range_selector.slider("option",{max: duration, values: [left,right]});
			}
			var video_pos = video_doc.videos[video_doc.current].start + video_doc.position - video_doc.videos[video_doc.current].position;
			player.seekTo(video_pos);
			if(video_doc.isPlaying) {
				video_timer = setInterval( (function(videosplicer){ return function() {private_methods.tick.call(videosplicer)};}) (that) , 100);
			}
			else
				player.pauseVideo();

			// annotations, the Reposition function should take care of the annotations array of the video_doc
			for(var i = 0; i < video_doc.annotations_shown.length; i++)
				video_doc.annotations_shown[i].remove();
			//console.log(video_doc.annotations);
			video_doc.annotations_shown = [];
			
			for(var i = 0; i < video_doc.annotations.length; i++)
			{
				video_doc.annotations[i].displayed = false;
			}
			if(!video_doc.isPlaying)
				private_methods.tick.call(that);
		}; 
		var slider_onslide = function(event, ui) {
			player.seekTo(ui.value);
			that.data("video_doc").UpdateCurrentVideo(ui.values[0], ui.values[1] - ui.values[0]);
			var video_doc = that.data("video_doc");
			//console.log(ui.values[0]);
			$timeline_slider.slider("option","max", video_doc.duration);
			if(ui.value == ui.values[0])
				that.data("video_doc").position = video_doc.videos[video_doc.current].position;
			else
				that.data("video_doc").position = video_doc.videos[video_doc.current].position + video_doc.videos[video_doc.current].duration;
			$timeline_slider.slider("option","value", video_doc.position);
			//console.log("Timeline slider position changed to " + video_doc.position);
			//console.log("Timeline slider max changed to " + video_doc.duration);
			$timeline_slider.slider("option","max", video_doc.duration);
		};
		var range_selector_slidestart = function(event, ui) {
			var video_doc = that.data("video_doc");
			if(video_doc.isPlaying)
			{
				player.pauseVideo();
				clearInterval(video_timer);
				video_timer = null;
				video_doc.isPlaying = false;
				that.data("play_button").find("#play_svg").css("display","inline").end().find("#pause_svg").css("display","none");
			}
			console.log(video_doc.videos[video_doc.current]);
		};
		var range_selector_slidestop = function(event, ui) {
			var video_doc = that.data("video_doc");
			console.log(video_doc.videos[video_doc.current]);
		};
		$range_selector.slider({range: true, slide: slider_onslide, step: 0.05, start: range_selector_slidestart, stop: range_selector_slidestop});
		$range_selector.slider("disable");
		$range_selector.css({marginTop: "5px", width:"450px", marginLeft:"auto", marginRight:"auto"});
		$timeline_slider.slider({step:0.1, slide: timeline_slider_onslide, start: timeline_slider_slidestart, stop: timeline_slider_slidestop});
		$timeline_slider.css("margin-top", "40px");
		$timeline_slider.slider("disable");
		
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
		this.data("range_selector", $range_selector);
		$add_video_button.click(add_video_button_click);

		this.data("range_selector", $range_selector);
		this.data("timeline_slider",$timeline_slider);
		var $play_button = $("#play_button").data("videosplicerObj", this);
		this.data("play_button", $play_button);

		var stop_button_onclick = function() {
			var video_doc = that.data("video_doc");
			if(video_doc.videos.length == 0)
				return;
			video_doc.isPlaying = false;
			if(video_timer) 
			{
				clearInterval(video_timer);
				video_timer = null;
			}
			video_doc.position = 0.0;
			//place timeline handle to the left most position, place the range selector handles to the first video's position
			if(video_doc.current != 0)
				player.loadVideoById({videoId:video_doc.videos[0].vid, startSeconds:video_doc.videos[0].start});
			else	player.seekTo(video_doc.videos[0].start);
			player.pauseVideo();
			video_doc.current = 0.0;
			$timeline_slider.slider("option","value",0);
			$range_selector.slider("option","max",video_doc.videos[0].video_length);
			$range_selector.slider("option","values",[ video_doc.videos[0].start + 0 , video_doc.videos[0].start + video_doc.videos[0].duration]);
			$play_button.find("#play_svg").css("display","inline").end().find("#pause_svg").css("display","none");
			private_methods.tick.call(that);
			video_doc.annotations = video_doc.videos[0].annotations.slice(0);
			for(var i = 0; i < video_doc.annotations.length; i++)
			{
				if(video_doc.annotations[i].displayed)
					video_doc.annotations[i].displayed = false;
			}
			//console.log(video_doc.annotations);
			video_doc.annotations_shown = [];
		};
		$("#stop_button").click(stop_button_onclick);	
			
		$(player).data("videosplicerObj", this);

		var play_button_onclick = function() {
			var video_doc = that.data("video_doc");
			//TODO: 1. If we are in the player's mode, then either not show the range selector or disable it
			//If it is in the editor's mode, then update the max value and reposition the two handles
			if(video_doc.videos.length == 0)
				return;	
			if(video_doc.isPlaying)
			{//Pause
				video_doc.isPlaying = false;
				if(video_timer) 
				{
					clearInterval(video_timer);
					video_timer = null;
				}
				player.pauseVideo();
				$(this).find("#play_svg").css("display","inline").end().find("#pause_svg").css("display","none");
				return;
			}		
			video_doc.isPlaying = true;
			video_timer = setInterval((function(videosplicer){ return function() {private_methods.tick.call(videosplicer)};}) (that) ,100);
			
			var cur_video =  video_doc.videos[video_doc.current];
			var start;
			if(video_doc.position >= cur_video.position && video_doc.position < cur_video.position + cur_video.duration)
				start = cur_video.start + video_doc.position - cur_video.position;
			else	start = cur_video.start;
			//player.seekTo(start);
			player.playVideo();
			$(this).find("#play_svg").css("display","none").end().find("#pause_svg").css("display","inline");
		};
		$play_button.click(play_button_onclick);

		this.keypress(function(e) {
			if(e.keyCode == 32) {
				//TODO: space key pressed, pause or continue the video
			}
			console.log("Key down on video splicer");
		});
		
	    	var timeline_sortable_onchange = function(event, ui) {
			//console.log("sortable change");
	    	}
		var timeline_sortable_onstop = function(event, ui) {
			//event.target is the ul element
			//console.log(event.target);
	    		//rearrange the order of the video clips
			var video_doc = $(event.target).data("video_doc");
			if(video_doc.videos.length == 1) return;
			video_doc.videos[0] = $($(event.target).find("img")[0]).data("videoclip");
			video_doc.videos[0].position = 0;
			var position, position_counter = video_doc.videos[0].duration; // The playback position of the composite video
			if($($(event.target).find("img")[0]).data("videoclip").isCurrent) {
				position = player.getCurrentTime() - $($(event.target).find("img")[0]).data("videoclip").start;
				video_doc.current = 0;
			}
			
			for(var i = 1; i < video_doc.videos.length; i++)
			{
				video_doc.videos[i] = $($(event.target).find("img")[i]).data("videoclip");
				video_doc.videos[i].position = video_doc.videos[i - 1].position + video_doc.videos[i - 1].duration;
				if(video_doc.videos[i].isCurrent) {
					video_doc.current = i;
					position = position_counter + player.getCurrentTime() - video_doc.videos[i].start;
				}
				position_counter += video_doc.videos[i].duration;
			}
			// reposition the timeline slider handle
			//console.log(position);
			//console.log(video_doc.current);
			$timeline_slider.slider("option","value", position);
	    	};
		
		var first_click = {x:0, y:0};
		var $region_bg;
		var first_region_click = {x:0, y:0};
		var last_region_click = {x:0, y:0};
		var region_mousemove = function(event) {
			var dx = event.pageX - last_region_click.x;
			var dy = event.pageY - last_region_click.y;
			var r = /(\d+)px/;
			var top = parseInt($region_bg.css("top").match(r)[1]);
			var tmp = $region_bg.css("left");
			var left = parseInt(tmp.match(r)[1]);
			//console.log($region_bg.css("left"));
			var width = parseInt($region_bg.css("width").match(r)[1]);
			var height = parseInt($region_bg.css("height").match(r)[1]);
			top += dy;
			left += dx;
			top = top >= 0 ? top : 0;
			top = top < option.player_height - height ? top : option.player_height - height;
			left = left >= 0 ? left:0;
			left = left < option.player_width - width ? left : option.player_width - width;
			$region_bg.css({top: top + "px", left: left + "px"});
			last_region_click.x = event.pageX;
			last_region_click.y = event.pageY;
			return false;
		};
		var region_mousewait = function(event) {
			if( (event.pageX - first_region_click.x) * (event.pageX - first_region_click.x) + (event.pageY - first_region_click.y) * (event.pageY - first_region_click.y) >= 25)
			{
				last_region_click.x = event.pageX;
				last_region_click.y = event.pageY;
				//console.log("Ahah");
				$region_bg.unbind("mousemove", region_mousewait);
				$region_bg.unbind("mousemove", region_mousemove);
				that.unbind("mousemove". region_mousemove);
				that.mousemove(region_mousemove);
				$region_bg.mousemove(region_mousemove);
			}
		};

		var region_doubleclick = function(event) {
			$region_bg.unbind("mousemove");
			var $p_annotation = $region_bg.find(".annotation-editable");
			var text = $p_annotation.text();
			$p_annotation.remove();
			var $textarea = $('<textarea></textarea>');
			$textarea.mousedown(function() {$textarea.focus(); return false;});
			//$textarea.mousemove(function() {return false;});
			$region_bg.append($textarea);;
			$textarea.val(function(i, val) {return text;});
			$textarea.css({maxWidth:"99%", maxHeight:"99%", minWidth:"99%", minHeight:"99%", padding:"0", margin:"0px"});
			$textarea.focus();
			$textarea.blur(function() {
				// remove the textarea and add the text to the containing div
				var text = $textarea.val();
				$textarea.remove();
				var $content = $("<p class='annotation-editable'></p>");
				$content.text(function(i, value) {return text});
				$region_bg.append($content);
			});
		};
		var region_mousedown = function(event) {
			if($(event.target).hasClass("ui-resizable-handle")) return; // This would be the resizing event that gets handled by jQuery UI, so we don't need to worry about this
			//Since we only care about how much the mouse has moved, we can just use the whole page as the coordination reference
			first_region_click.x = event.pageX;
			first_region_click.y = event.pageY;
			$region_bg.mousemove(region_mousewait);
			
			$region_bg.mousedown(region_doubleclick);
			setTimeout(function(){$region_bg.unbind("mousedown", region_doubleclick)}, 600);
			return false;
		};	
		
		var region_mouseup = function(event) {
			$region_bg.unbind("mousemove", region_mousemove);
			$region_bg.unbind("mousemove", region_mousewait);
			that.unbind("mousemove", region_mousemove);
		};	
		$player_overlay.mouseup(function() {
			if($region_bg)
			{
				$region_bg.unbind("mousemove");
				that.unbind("mousemove", region_mousemove);
			}
		});
		var player_overlay_mousemove = function(event) {
			if(! $region_bg) return;
			//console.log($player_overlay.offset());
			var top = Math.min(first_click.y, event.pageY - $player_overlay.offset().top);
			var left = Math.min(first_click.x, event.pageX - $player_overlay.offset().left);
			var bottom = Math.max(first_click.y, event.pageY - $player_overlay.offset().top);
			var right = Math.max(first_click.x, event.pageX - $player_overlay.offset().left);
			var width = right - left;
			var height = bottom - top;
			$region_bg.css({top: top, left:left, width:width + "px", height: height + "px"});
		};
		var player_overlay_mousewait = function(event) {
			var pos = {x:event.pageX - $player_overlay.offset().left, y: event.pageY - $player_overlay.offset().top};
			if( (first_click.x - pos.x) * (first_click.x - pos.x) + (first_click.y - pos.y) * (first_click.y - pos.y) > 25)
			{
				$player_overlay.unbind("mousemove", player_overlay_mousemove);
				$player_overlay.unbind("mousemove", player_overlay_mousewait);
				$player_overlay.mousemove(player_overlay_mousemove);

				$region_bg = $("<div class='annotation_region'></div>");
				$region_bg.mousedown(region_mousedown);
				$region_bg.mouseup(region_mouseup);
				
				$player_overlay.append($region_bg);
				$region_bg.css({width:0, height:0, top:first_click.y, left:first_click.x});
				$annotation_done_button.removeAttr("disabled");
			}
		};
		var player_overlay_mousedown = function(event) {
			$player_overlay.mousemove(player_overlay_mousewait);
			//console.log(event);
			first_click.x = event.pageX - $player_overlay.offset().left;
			first_click.y = event.pageY - $player_overlay.offset().top;
			

		};
		var player_overlay_mouseup = function(event) {
			$player_overlay.unbind("mousemove", player_overlay_mousemove);
			$player_overlay.unbind("mousemove", player_overlay_mousewait);
			//$annotation_done_button.removeAttr("disabled");
			
			if($region_bg) {
				$region_bg.resizable({});
				$player_overlay.css("cursor","default");
				$player_overlay.unbind("mousedown", player_overlay_mousedown);
			}
		};
		var player_overlay_mouseleave = function(event) {
			
		};

		var $annotate_button = this.find("button#annotate_button");
		var $annotation_done_button = this.find("#annotation_done_button");
		var $cancel_region_selection_button = this.find("#cancel_region_selection_button")
		var annotate_button_onclick = function() {
			if(!player)	return;
			$player_overlay.mousedown(player_overlay_mousedown);
			$player_overlay.mouseup(player_overlay_mouseup);
			$player_overlay.mouseleave(player_overlay_mouseleave);
			$player_overlay.css("cursor", "crosshair");
			$annotate_button.css("display","none");
			$annotation_done_button.css("display","inline");
			$annotation_done_button.attr("disabled", "disabled");
			$cancel_region_selection_button.css("display", "inline");
			player.pauseVideo();
		};
		$annotate_button.click(annotate_button_onclick);
		$cancel_region_selection_button.click(function() {
			if($region_bg)
			{
				$region_bg.unbind("mousemove");
				$region_bg.remove();
				$region_bg = null;
			}
			$cancel_region_selection_button.css("display","none");
			$annotation_done_button.css("display","none");
			$annotate_button.css("display","inline");
			$player_overlay.css("cursor", "default");
			$player_overlay.unbind("mousemove",player_overlay_mousewait);
			$player_overlay.unbind("mousedown",player_overlay_mousedown);
			$player_overlay.unbind("mouseup",player_overlay_mouseup);
			$player_overlay.unbind("mouseleave",player_overlay_mouseleave);
		});
		


		var annotation_done_button_onclick = function() {
			//annotation format: {content: "", duration: 10, position:0, top:0, bottom:0,left: 0, right:0, background:{r:120,g:120,b:120, a:0.6}, foreground: "#ffffff"};
			var video_doc = that.data("video_doc");
			var textarea_annotation = $region_bg.find("textarea");
			var content = "";
			if(textarea_annotation.length != 0)
			{//The annotation content is in the editable textarea
				content = textarea_annotation.val();
			}
			else
			{//The annotation content is in a p tag of the region_bg
				content = $region_bg.text();
			}
			console.log(content);
			var rg = /(\d+)px/;
			var color_regex = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(.+)\s*\)/;
			var color_match = $region_bg.css("background-color").match(color_regex);
			var r = parseInt(color_match[1]), g = parseInt(color_match[2]), b = parseInt(color_match[3]), a = parseFloat(color_match[4])

			var top = parseInt($region_bg.css("top").match(rg)[1]), left = parseInt($region_bg.css("left").match(rg)[1]),
				width = parseInt($region_bg.css("width").match(rg)[1]), height = parseInt($region_bg.css("height").match(rg)[1]),
				bottom = top + height, right = left + width;
			var bg = $region_bg.css("background-color");
			var foreground = $region_bg.css("color");	


			// save the annotation
			var annotation = new VideoAnnotation({content:content, duration: 10, position: player.getCurrentTime(), top: top, bottom: bottom, left:left, right: right,background:{r:r, g:g, b:b, a:a}, foreground:foreground});
			video_doc.videos[video_doc.current].annotations.push(annotation);
			var $annotation = private_methods.show_annotation.call(that, annotation);
			video_doc.annotations_shown.push($annotation);
			video_doc.annotations.push(new VideoAnnotation(annotation)); // If we just pass annotation here, it will be passes by reference and two arrays will have the same copy of the object which was not how the video_doc.annotations array was constructed
			video_doc.annotations[video_doc.annotations.length - 1].displayed = true;
			console.log(video_doc.annotations[video_doc.annotations.length - 1]);
			$region_bg.remove();
			$annotation_done_button.css("display","none");
			$cancel_region_selection_button.css("display","none");
			$annotate_button.css("display","inline");

		};
		$annotation_done_button.click(annotation_done_button_onclick);



		var $timeline_scroll_pane = $("#timeline_pane"), $timeline_scroll_content = $("#timeline_scroll_content");
		
		$timeline_scroll_content.find("ul").sortable({helper:"clone", distance:5, containment: $timeline_scroll_pane, change:methods.timeline_sortable_onchange, stop: timeline_sortable_onstop, placeholder:"timeline-sortable-highlight"})
				.data("video_doc", video_doc);

		var $timeline_scrollbar = $("#timeline_scrollbar").slider({slide: function( event, ui ) {
        		if ( $timeline_scroll_content.width() > $timeline_scroll_pane.width() ) {
          			$timeline_scroll_content.css( "margin-left", Math.round(ui.value / 100 * ( $timeline_scroll_pane.width() - $timeline_scroll_content.width() )) + "px" );
        		} else {
          			$timeline_scroll_content.css( "margin-left", 0 );
        		}
      		}});

		//size scrollbar and handle proportionally to scroll distance
		var sizeScrollBar = function() {
			var remainder = $timeline_scroll_content.width() - $timeline_scroll_pane.width();
			var proportion = remainder / $timeline_scroll_content.width();
			var handleSize = $timeline_scroll_pane.width() - ( proportion * $timeline_scroll_pane.width() );
			$timeline_scrollbar.find( ".ui-slider-handle" ).css({
       			 	width: handleSize,
        			"margin-left": -handleSize / 2,
     		 	});
		};

		return this;
	    },//End of init,
	    getDurationOfVideoThroughXmlHttpRequest: function(vid, duration_property){
		if(!vid.length || vid == "")
			return null;
		var xmlhttp=new XMLHttpRequest();
		var videoid = document.getElementById('vid').value;

		xmlhttp.onreadystatechange=function() {
			if (xmlhttp.readyState==4 && xmlhttp.status==200)
    			{
				var response = $.parseJSON(xmlhttp.responseText);
				if(response.items && response.items.length > 0) {
					var regex = /PT(\d+)M(\d+)S/i;
					var time = response.items[0].contentDetails.duration.match(regex);
					duration_property = (parseInt(time[1]) * 60 + parseInt(time[2]));
					return;
				}
				else {
					//TODO: show error
					duration_property = null;
					return
				}
			}
			else if (xmlhttp.readyState==4 && xmlhttp.status!=200)
    			{
				//TODO: show error
    				duration_property = null;
				return;
			}
		}
		xmlhttp.open("GET","https://www.googleapis.com/youtube/v3/videos?id=" + videoid + "&part=contentDetails&key=AIzaSyCcjD3FvHlqkmNouICxMnpmkByCI79H-E8",true);
		xmlhttp.send();

	    },
	    loadVideos: function(videoDocObj) {
		if(! (videoDocObj instanceof CompositeVideo)) return this;
		var that = this;
		var video_doc = this.data("video_doc");
		video_doc.copy(videoDocObj);
		video_doc.videos[0].isCurrent = true;
		var $timeline_slider = this.data("timeline_slider");
		$timeline_slider.slider("option","max", videoDocObj.duration);
		video_doc.annotations = video_doc.videos[0].annotations.slice(0);
		console.log(video_doc);
		if(videoDocObj.videos.length > 0) {
			this.data("range_selector").slider("option","max", videoDocObj.videos[0].video_length);
			this.data("range_selector").slider("option", "values",[videoDocObj.videos[0].start + 0, videoDocObj.videos[0].start + videoDocObj.videos[0].duration]);
			this.data("player").loadVideoById({videoId:videoDocObj.videos[0].vid,
						startSeconds:videoDocObj.videos[0].start});
			this.data("player").pauseVideo();
			var $timeline_scroll_content = this.find("div#timeline_pane div#timeline_scroll_content ul");
			for(var i = 0; i < videoDocObj.videos.length; i++) {
				$timeline_scroll_content.append("<li><div class='video-icon'><img src='' alt='Video " + (i + 1) +"'/></div></li>");
			}
			var vid_icon = this.find("div#timeline_pane div#timeline_scroll_content ul li");
			$(vid_icon.find(".video-icon")[0]).addClass("current-video");
			var vid_icon_img = vid_icon.find("div.video-icon img");
			var that = this;
			$.each(videoDocObj.videos, function(index, value) {
				var xmlhttp=new XMLHttpRequest();
				xmlhttp.onreadystatechange=function() {
					if(xmlhttp.readyState == 4 && xmlhttp.status == 200)
					{
						var response = $.parseJSON(xmlhttp.responseText);
						//console.log(response);
						if(response.items && response.items.length > 0) // Most likely the length will be one since we are only requesting with one specific video id
						{
							if(that.data("timeline_slider").slider("option","disabled")) {
								that.data("timeline_slider").slider("enable");
								that.data("range_selector").slider("enable");
							}
							var regex = /PT(\d+)M(\d+)S/i;
							var time = response.items[0].contentDetails.duration.match(regex);
							var duration = (parseInt(time[1]) * 60 + parseInt(time[2]));
							videoDocObj.videos[index].video_length = duration;
							if(index == 0) {
								that.data("range_selector").slider("option", "max", duration);
							}
							var vid_thumbnail_url = response.items[0].snippet.thumbnails.default.url;
							vid_icon_img[index].src = vid_thumbnail_url;
							$(vid_icon_img[index]).data("videoclip",videoDocObj.videos[index]);
							$(vid_icon_img[index]).data("video_doc",video_doc);
							$(vid_icon_img[index]).data("player",that.data("player"));
							$(vid_icon_img[index]).click((function(){return function(event) {private_methods.video_icon_clicked.call(that,event)} })());
						}
						else {
							//TODO: response returned an empty array, video is not available, show error message 
						}
					}
					else if (xmlhttp.readyState == 4){
						//TODO: request failed, show message
					}annotation_done_button
				};
				xmlhttp.open("GET","https://www.googleapis.com/youtube/v3/videos?id=" + value.vid + "&part=contentDetails,snippet&key=AIzaSyCcjD3FvHlqkmNouICxMnpmkByCI79H-E8",true);
				xmlhttp.send();
				//TODO: add annotation bars to the time line slider
				for(var i = 0; i < value.annotations.length; i++)
				{
					var t = value.position + value.annotations[i].position - value.start;
					var $bar = $("<span class='annotation_bar'></span>");
					$timeline_slider.append($bar);
					var left = (t/video_doc.duration * 100.0).toFixed(2) + "%";
					$bar.css("left", left);
				}
			} );
		}
	    },
	    onPlayerReady:function(callback) {
		this.playerReadyFuncs.push(callback);
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

