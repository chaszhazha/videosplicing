
//TODO: jump to the next video (maybe by clicking on a video's icon in the timeline pane view)
//TODO: mark the time on the timeline where there's a video switch
//TODO: red position vertical bar for timeline pane view

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
	var old_duration = this.videos[this.current].duration;
	var del = duration - old_duration;
	this.duration += del;

	this.position += this.videos[this.current].start - start;
	if(this.position < this.videos[this.current].position)	this.position = this.videos[this.current].position;
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
	var default_args = {content: "", duration: 10, position:0, top:0, bottom:0,left: 0, right:0, opacity: 0.6, background:"#555555", foreground: "#ffffff"};
	var args = $.extend({}, default_args, a);
	this.content = args.content;
	this.duration = args.duration;
	this.position = args.position; // This should be the position that the annotation will show up in the timeline of the whole video.
	this.rect = {top:args.top, bottom:args.bottom, left: args.left, right:args.right, width: args.right - args.left, height: args.bottom - args.top};
	this.rect.width = this.rect.width > 0 ? this.rect.width : 0;
	this.rect.height = this.rect.height > 0 ? this.rect.height : 0;
	this.opacity = args.opacity;
	this.background = args.background;
	this.foreground = args.foreground;
	this.duration = args.duration;
	this.end = this.position + this.duration;
}


// These two functions are needed by the youtube player and they need to be globally available, but they also need access to the plugin's data, so their definition come later inside of the plugin's difiniton
var onYouTubePlayerReady;
var onPlayerStateChange;

var video_timer = null;

(function($){
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
					"<button id='annotate_button' >Annotate</button><button id='select_annotation_region_button'>Select Region</button><button id='cancel_region_selection_button'>Cancel</button>" + 
				"</div> " + 
				"<div id='splicer_time_markers'><span id=''></span></div>" + 
                		"<div id='splicer_range_selector'></div>" +
				"<button id='splicer_select_range_button'>Select range for video clip</button>" + 
                		"<div id='timeline'><div id='splicer_timeline_slider'></div>" + 
					"<div id='timeline_pane'> <div id='timeline_scroll_content'><ul></ul></div> <div class='slider-wrapper'><div id='timeline_scrollbar'></div> </div></div>" + 
				"</div>");
		$("#vid").css({width:"200px"});
		$("head").append("<style>" + 
				"#video_container{margin:0 auto;  width:" + option.player_width + "px;}" + 
				"#vid_input{margin:0 auto; width: 600px;}" + 
				"#splicer_select_range_button{float: right; margin-top: 5px;}" + 
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
				"#timeline_scroll_content{width: 2440px; float: left; height: 100px}" + 
				"#timeline_scroll_content ul {list-style-type: none; margin-top:auto; margin-bottom:auto; padding:0;}" + 
				"#timeline_scroll_content ul li{display:inline; float: left;}" + 
				"div#timeline div#timeline_pane div#timeline_scrollcontent div{ float: left;}" + 
				"div.video-icon{display:inline; float: left; margin: 4px 6px;}" + 
				"div#player_overlay {position:absolute; top:0}" + 
				"div#player_wrapper {position: relative}" + 
				"button#annotate_button {float:right;} " + 
				"#select_annotation_region_button, #cancel_region_selection_button{display: none; float: right;}" + 
				".annotation { background: #444444; position:absolute;}" + 
				".annotation_region{position: absolute; border-style:dashed; border-width:2px;}" +
				".annotation_region_bg{background: steelblue; opacity:0.6; cursor:default;}" +  
				"#timeline li.timeline-sortable-highlight {border: 2px solid #fcefa1;width: 116px; height: 90px; margin: 4px 6px;background: #fbf9ee; padding:0;}" +
				"</style>");
	    	var params = { allowScriptAccess: "always" };
    	    	var atts = { id: "video_player" };//The id for the inserted element by the API
    	    	swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=player1", "YTplayerHolder", option.player_width, option.player_height, "9", null, null, params, atts);
		this.data("video_doc" , new CompositeVideo());

		var video_doc = this.data("video_doc");
		var $player_wrapper = $("div#player_wrapper");
		var $player_overlay = $("div#player_overlay");
		$player_overlay.css({width:option.player_width, height:option.player_height});
		

		var show_annotation = function(a) {
			// annotation should be an object that has properties like text, rect location and size, opacity, start_position, end_position  etc
			var default_annotation = {opacity:0.6, rect: {top:20, left:20, width:100, height:100}, content:""};
			var annotation = $.extend(true, {}, default_annotation, a);
			var $annotation = $("<div class = 'annotation'>" + annotation.content +"</div>");
			$player_overlay.append($annotation);
			//console.log("content added to div#player_wrapper with width " + annotation.rect.width + "px and height " + annotation.rect.height + "px");
			$annotation.data("annotation",annotation);
			$annotation.css({opacity:annotation.opacity, top:annotation.rect.top + "px", left: annotation.rect.left + "px",
				 width: annotation.rect.width + "px", height: annotation.rect.height + "px", background: annotation.background, color:annotation.foreground});
			return $annotation;
		};
		
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
						that.find("div#timeline_pane div#timeline_scroll_content ul")
							.append("<li><div class='video-icon'><img src='" + vid_thumbnail_url + "' alt='Video " + video_doc.videos.length +"'/></div></li>");
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
		
		var switch_to_next_video = function(video_doc){
			for(var i = 0; i < video_doc.annotations_shown.length; i++) {
				video_doc.annotations_shown[i].remove();
			}
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
					player.cueVideoById( {videoId:video_doc.videos[0].vid,
						startSeconds:video_doc.videos[0].start} );
				else
					player.seekTo(video_doc.videos[0].start);
				player.pauseVideo();
				$range_selector.slider("option","values",[video_doc.videos[0].start, video_doc.videos[0].start + video_doc.videos[0].duration]);
				$range_selector.slider("option","max",video_doc.videos[0].video_length);
				$timeline_slider.slider("option","value",0);
				$play_button.find("#play_svg").css("display","inline").end().find("#pause_svg").css("display","none");
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
		    		$range_selector.slider("option","max",video_doc.videos[video_doc.current].video_length);
		    		$range_selector.slider("option","values",[left, right]);
				var start_at = video_doc.videos[video_doc.current].start + video_doc.position - video_doc.videos[video_doc.current].position;
				video_doc.annotations = video_doc.videos[video_doc.current].annotations.slice(0);
				player.loadVideoById( {videoId:video_doc.videos[video_doc.current].vid,
						startSeconds:start_at});
			}
			for(var i = 0; i < video_doc.annotations.length; i++) {
				if(video_doc.annotations[i].position < video_doc.videos[video_doc.current].start && video_doc.annotations[i].end > video_doc.videos[video_doc.current].end)
				{
					console.log("Showing annotation on start of a video clip");
					var $annotation = show_annotation(video_doc.annotations[i]);
					video_doc.annotations_shown.push($annotation);
					video_doc.annotations[i].displayed = true;
				}
			}
		};

		/**
 		 * This function is called every 0.1 seconds when the video is playing. Used to update the ui's slider
 		 */
		var tick = function() {
			//console.log("tick");
			//check the annotations to see if there are annotations to be shown
			var video_doc = that.data("video_doc");
			var player_time = player.getCurrentTime();

			//First check if there are new annotations to show
			for(var i = 0; i < video_doc.annotations.length; i++)
			{
				if(typeof video_doc.annotations[i].displayed =='undefined')
					console.log();
				if(( typeof video_doc.annotations[i].displayed =='undefined') && video_doc.annotations[i].position < player_time && video_doc.annotations[i].end > player_time)
				{
					var $annotation = show_annotation(video_doc.annotations[i]);
					video_doc.annotations_shown.push($annotation);		
					video_doc.annotations[i].displayed = true;
				}
			}
			
			//Second check if displayed annotations need to disappear
			for(var i = 0; i < video_doc.annotations_shown.length; i++)
			{
				var annotation = video_doc.annotations_shown[i].data("annotation");
				if(annotation && annotation.end < player_time)
				{
					video_doc.annotations_shown[i].remove();
				}
			}

			video_doc.position = video_doc.videos[video_doc.current].position + player_time - video_doc.videos[video_doc.current].start;
			//console.log(this.position + " = " + player.getCurrentTime() + " - " + this.videos[this.current].start);
			//** update the slider for playback position of the whole video doc
			$timeline_slider.slider("option","value",video_doc.position);
			if(video_doc.position + 0.1 > video_doc.videos[video_doc.current].position + video_doc.videos[video_doc.current].duration)
			{
				// Switch point reached
				switch_to_next_video(video_doc);
			}
		};

		
		//console.log($range_selector.parent().width());
		//$range_selector.css({width: ""});

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
			//switch video if necessary, calculate index of video based on position,
			var old_vid_ind = video_doc.current;
			video_doc.Reposition($(this).slider("option","value"));
			//console.log( "Old range: from " + $range_selector.slider("option","values")[0] + " to " + $range_selector.slider("option","values")[1]);
			if(old_vid_ind != video_doc.current) 
			{
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
				video_timer = setInterval(tick, 100);
			}
			else
				player.pauseVideo();
			// annotations
			video_doc.annotations = video_doc.videos[video_doc.current].annotations.slice(0);
			for(var i = 0; i < video_doc.annotations_shown.length; i++)
				video_doc.annotations_shown[i].remove();
			video_doc.annotations_shown = [];
			for(var i = 0; i < video_doc.annotations.length; i++)
			{
				if(video_doc.annotations[i].end <= video_pos)
					video_doc.annotations[i].displayed = true;
				else if(video_doc.annotations[i].position < video_pos && video_doc.annotations[i].end > video_pos)
				{
					//console.log("Showing annotation on start of a video clip");
					var $annotation = show_annotation(video_doc.annotations[i]);
					video_doc.annotations_shown.push($annotation);
					video_doc.annotations[i].displayed = true;
				}
			}
		}; 
		var slider_onslide = function(event, ui) {
			//TODO: finish this function, show the frame of the video
			//console.log($(this).data("videosplicerObj"));
		};
		$range_selector.slider({range: true, slide: slider_onslide, step: 0.05});
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
		$add_video_button.click(add_video_button_click);

		this.data("range_selector", $range_selector);
		this.data("timeline_slider",$timeline_slider);
		var $play_button = $("#play_button").data("videosplicerObj", this);

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
			$range_selector.slider("option","values",[ video_doc.videos[0].start , video_doc.videos[0].start + video_doc.videos[0].duration]);
			$play_button.find("#play_svg").css("display","inline").end().find("#pause_svg").css("display","none");
		};
		$("#stop_button").click(stop_button_onclick);	
			
		$(player).data("videosplicerObj", this);

		var select_range_button_click = function() {
			if(!player) return;
			var video_doc = that.data("video_doc");
			if(video_doc.videos.length == 0) return;
			video_doc.UpdateCurrentVideo($range_selector.slider("option","values")[0], $range_selector.slider("option","values")[1] - $range_selector.slider("option","values")[0]);
			//Update the max value of the timeline slider
			console.log("changing max of timeline slider from " + $timeline_slider.slider("option","max") + " to " + video_doc.duration)
			$timeline_slider.slider("option","max", video_doc.duration);
			if(video_doc.position > video_doc.duration)
				video_doc.position = video_doc.duration;
			console.log("Changing position of timeline slider from " + $timeline_slider.slider("option","value") + " to " + video_doc.position);
			//Check if the position of the video is out of the new selected range, if so, seek to the start of the clip
			if(player.getCurrentTime() < video_doc.videos[video_doc.current].start || player.getCurrentTime() >= video_doc.videos[video_doc.current].start + video_doc.videos[video_doc.current].duration)
				player.seekTo(video_doc.videos[video_doc.current].start);
			$timeline_slider.slider("option","value", video_doc.position);
		};
		$("#splicer_select_range_button").click(select_range_button_click);
		var play_button_onclick = function() {
			var video_doc = that.data("video_doc");
			//TODO: 1. If we are in the player's mode, then either not show the range selector or disable it and the "select range" button
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
			video_timer = setInterval( tick ,100);
			
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
			console.log(e);
		});
		
	    	var timeline_sortable_onchange = function(event, ui) {
			//console.log("sortable change");
	    	}
		var timeline_sortable_onstop = function(event, ui) {
			//event.target is the ul element

	    		//rearrange the order of the video clips
			var video_doc = $(event.target).data("video_doc");
			if(video_doc.videos.length == 1) return;
			video_doc.videos[0] = $($(event.target).find("li")[0]).data("videoclip");
			video_doc.videos[0].position = 0;
			var position, position_counter = video_doc.videos[0].duration; // The playback position of the composite video
			if($($(event.target).find("li")[0]).data("videoclip").isCurrent) {
				position = player.getCurrentTime() - $($(event.target).find("li")[0]).data("videoclip").start;
				video_doc.current = 0;
			}
			
			for(var i = 1; i < video_doc.videos.length; i++)
			{
				video_doc.videos[i] = $($(event.target).find("li")[i]).data("videoclip");
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
		var $region_border;
		var $region_bg;
		var first_region_click = {x:0, y:0};
		var last_region_click = {x:0, y:0};
		var region_mousemove = function(event) {};
		var region_mousewait = function(event) {
			
		};
		var region_mousedown = function(event) {
			first_region_click.x = event.offsetX;
			first_region_click.y = event.offsetY;
			$region_bg.mousemove(region_mousewait);
		};		
		
		var player_overlay_mousemove = function(event) {
			if(! $region_border) return;
			//console.log($player_overlay.offset());
			var top = Math.min(first_click.y, event.pageY - $player_overlay.offset().top);
			var left = Math.min(first_click.x, event.pageX - $player_overlay.offset().left);
			var bottom = Math.max(first_click.y, event.pageY - $player_overlay.offset().top);
			var right = Math.max(first_click.x, event.pageX - $player_overlay.offset().left);
			var width = right - left;
			var height = bottom - top;
			$region_bg.css({top: top, left:left, width:width + "px", height: height + "px"});
			$region_border.css({top: top, left:left, width:width + "px", height: height + "px"});
		};
		var player_overlay_mousewait = function(event) {
			var pos = {x:event.pageX - $player_overlay.offset().left, y: event.pageY - $player_overlay.offset().top};
			if( (first_click.x - pos.x) * (first_click.x - pos.x) + (first_click.y - pos.y) * (first_click.y - pos.y) > 25)
			{
				$player_overlay.unbind("mousemove", player_overlay_mousemove);
				$player_overlay.unbind("mousemove", player_overlay_mousewait);
				$player_overlay.mousemove(player_overlay_mousemove);
				$region_border = $("<div class='annotation_region'><div class='annotation_region_bg'></div></div>");
				$region_bg = $region_border.find(".annotation_region_bg");
				$region_bg.mousedown(region_mousedown);
				$player_overlay.append($region_border);
				$region_border.css({width:0, height:0, top:first_click.y, left:first_click.x});
				$select_annotation_region_button.removeAttr("disabled");
			}
		};
		var player_overlay_mousedown = function(event) {
			if($region_border)	$region_border.remove();
			$select_annotation_region_button.attr("disabled", "disabled");
			$player_overlay.mousemove(player_overlay_mousewait);
			//console.log(event);
			first_click.x = event.pageX - $player_overlay.offset().left;
			first_click.y = event.pageY - $player_overlay.offset().top;
			

		};
		var player_overlay_mouseup = function(event) {
			$player_overlay.unbind("mousemove", player_overlay_mousemove);
			$player_overlay.unbind("mousemove", player_overlay_mousewait);
			//$select_annotation_region_button.removeAttr("disabled");
		};
		var player_overlay_mouseleave = function(event) {
			
		};

		var $annotate_button = $("button#annotate_button", this);
		var $select_annotation_region_button = $("#select_annotation_region_button", this);
		var $cancel_region_selection_button = $("#cancel_region_selection_button", this)
		var annotate_button_onclick = function() {
			$player_overlay.mousedown(player_overlay_mousedown);
			$player_overlay.mouseup(player_overlay_mouseup);
			$player_overlay.mouseleave(player_overlay_mouseleave);
			$player_overlay.css("cursor", "crosshair");
			$annotate_button.css("display","none");
			$select_annotation_region_button.css("display","inline");
			$select_annotation_region_button.attr("disabled", "disabled");
			$cancel_region_selection_button.css("display", "inline");
			
			
			//TODO: 1. pause the video play back
			// 2. let user choose annotation area
			// 3. show up text input
			// 4. associate
		};
		$annotate_button.click(annotate_button_onclick);

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
		this.data("timeline_slider").slider("option","max", videoDocObj.duration);
		video_doc.annotations = video_doc.videos[0].annotations.slice(0);
		if(videoDocObj.videos.length > 0) {
			this.data("range_selector").slider("option","max", videoDocObj.videos[0].video_length);
			this.data("range_selector").slider("option", "values",[videoDocObj.videos[0].start, videoDocObj.videos[0].start + videoDocObj.videos[0].duration]);
			this.data("player").loadVideoById({videoId:videoDocObj.videos[0].vid,
						startSeconds:videoDocObj.videos[0].start});
			this.data("player").pauseVideo();
			var $timeline_scroll_content = this.find("div#timeline_pane div#timeline_scroll_content ul");
			for(var i = 0; i < videoDocObj.videos.length; i++) {
				$timeline_scroll_content.append("<li><div class='video-icon'><img src='' alt='Video " + (i + 1) +"'/></div></li>");
			}
			var vid_icon = this.find("div#timeline_pane div#timeline_scroll_content ul li");
			var vid_icon_img = vid_icon.find("div.video-icon img");
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
							$(vid_icon[index]).data("videoclip",videoDocObj.videos[index]);
						}
						else {
							//TODO: response returned an empty array, video is not available, show error message 
						}
					}
					else if (xmlhttp.readyState == 4){
						//TODO: request failed, show message
					}
				};
				xmlhttp.open("GET","https://www.googleapis.com/youtube/v3/videos?id=" + value.vid + "&part=contentDetails,snippet&key=AIzaSyCcjD3FvHlqkmNouICxMnpmkByCI79H-E8",true);
				xmlhttp.send();
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

