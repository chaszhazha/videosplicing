var $splicer;

$(document).ready(function(){
	$splicer = $('#videosplicing_div').videosplicer();
	var spliced_videos = new CompositeVideo();

	// The order of the video clips passes in must be ordered as of this version
	var videos = [new VideoClip({vid:"mYIfiQlfaas", start: 85.0, duration: 15.0, video_length:217.0 , source:"youtube" }),
			//new VideoClip({video_url: "http://globalshakespeares.mit.edu/media/hamlet-maestri-maria-federica-2011.mov", start:520.0, duration:20.0, video_length:3647.120, source:"qt", thumbnailurl:"http://globalshakespeares.mit.edu/media/hamlet-maestri-maria-federica-2011.jpg/228/174/"}),
			new VideoClip({vid:"6tvUPFsaj5s", start: 25.0, duration: 15.0 , video_length:264.0, source:"youtube" }),
			new VideoClip({vid:"W9t3mbv2Hd8", start: 115.0, duration: 30.0 , video_length:173.0, source:"youtube" } )];
	videos[0].AddAnnotation(new VideoAnnotation({content:"This is test annotation 1 for video 1", position: 88, duration:7, rect:{top:10, bottom:160, left:10, right:170}}));
	videos[1].AddAnnotation(new VideoAnnotation({content:"This is test annotation 2 for video 2", position: 27, duration:7, rect:{top:20, bottom:170, left:10, right:170}}));
	videos[2].AddAnnotation(new VideoAnnotation({content:"This is test annotation 3 for video 3", position: 120, duration:7, rect:{top:30, bottom:180, left:10, right:170}}));
	spliced_videos.AddVideo(videos);
	//console.log(spliced_videos);
	//$splicer.videosplicer( "onPlayerReady", function() {  } );
	$splicer.videosplicer("loadVideos",spliced_videos);
});

function AddVideo(param) {
	if(!$splicer)
		return;
	if(typeof param != "string")
		return;
	var video_id = null;
	if(param.length=="11") {
		//If param is a youtube video id
		video_id = param;
	}
	else {
		//if param is a youtube url, extract the id part
		var url_pattern = /[&?]v=(\w{11,11})/;
		var res = param.match(url_pattern);
		if (!res)
			return;
		video_id = res[1];
	}
	//Add video_id's corresponding video
	$splicer.videosplicer("addVideoById",video_id);
}

function getVideoLength() {
	if($splicer)
		return $splicer.data('video_doc').duration;
}

function setVideoPosition(position) {
	//Set the video's playing position 
	if($splicer)
		$splicer.videosplicer("Seek", position);
}

function getVideoPosition() {
	//return the video's playing position in seconds
	if($splicer)
		return $splicer.data("video_doc").position;
}

function Play() {
	if($splicer)
		$splicer.videosplicer("play");
}

function Pause() {
	if($splicer)
		$splicer.videosplicer("pause");
}

function Stop() {
	if($splicer)
		$splicer.videosplicer("stop");
}

function Next() {
	//Skip to the next video
	if($splicer)
		$splicer.videosplicer("next");
}

function getVideoSplicerState() {
	//Return a json string of the video_doc
	//console.log($splicer.data("video_doc"));
	if($splicer)
		return $splicer.data("video_doc").toJSON();
}

function setVideoSplicerState(state) {
	//Set the video_doc to state, reinitialize the splicer
	var args = $.parseJSON(state);
	console.log(args);
	var video_doc = new CompositeVideo();
	video_doc.duration = args.duration;
	video_doc.position = 0;
	video_doc.current = 0;
	args.videos.forEach(function(video, ind, videos) {
		var video_clip = new VideoClip({position:video.position, index: video.index, vid:video.vid, start: video.start, duration: video.duration, video_length:video.video_length , source:video.source, video_url: video.video_url, thumbnailurl:video.thumbnailurl });
		video.annotations.forEach(function(ann, ind, annotations) {
			video_clip.AddAnnotation(ann);
		});		
		video_doc.videos.push(video_clip);
	});
	$splicer.find("#timeline_scroll_content ul").html("");
	$splicer.data("timeline_slider").slider("option","value", 0);
	$splicer.find(".video_timeline_span").remove();
	$splicer.find("video_timeline_bar").remove();
	$splicer.find("annotation_group").remove();
	$splicer.videosplicer("loadVideos", video_doc);
}

function ShowControls() {
	if($splicer)
		$splicer.videosplicer("showControls");
}

function HideControls() {
	if($splicer)
		$splicer.videosplicer("hideControls");
}


