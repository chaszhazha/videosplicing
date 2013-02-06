$(document).ready(function(){
	var $splicer = $('#videosplicing_div').videosplicer();
	var spliced_videos = new CompositeVideo();

	// The order of the video clips passes in must be ordered as of this version
	var videos = [new VideoClip({vid:"mYIfiQlfaas", start: 85.0, duration: 15.0, video_length:217.0 }),
			new VideoClip({vid:"6tvUPFsaj5s", start: 25.0, duration: 15.0 , video_length:264.0}),
			new VideoClip({vid:"W9t3mbv2Hd8", start: 115.0, duration: 30.0 , video_length:173.0} )];
	videos[0].annotations.push(new VideoAnnotation({content:"This is test annotation 1 for video 1", position: 88, duration:7, top:10, bottom:160, left:10, right:170}));
	videos[1].annotations.push(new VideoAnnotation({content:"This is test annotation 2 for video 2", position: 27, duration:7, top:20, bottom:170, left:10, right:170}));
	videos[2].annotations.push(new VideoAnnotation({content:"This is test annotation 3 for video 3", position: 120, duration:7, top:30, bottom:180, left:10, right:170}));
	spliced_videos.AddVideo(videos);
	$splicer.videosplicer( "onPlayerReady", function() { $splicer.videosplicer("loadVideos",spliced_videos); } );
});
