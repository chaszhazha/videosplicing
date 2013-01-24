$(document).ready(function(){
	var $splicer = $('#videosplicing_div').videosplicer();
	var spliced_videos = new CompositeVideo();
	spliced_videos.AddVideo(new VideoClip({vid:"mYIfiQlfaas", start: 85.0, duration: 15.0}))
					.AddVideo(new VideoClip({vid:"6tvUPFsaj5s", start: 25.0, duration: 15.0}))
					.AddVideo(new VideoClip({vid:"W9t3mbv2Hd8", start: 115.0, duration: 30.0}));
	$splicer.videosplicer( "onPlayerReady", function() { $splicer.videosplicer("loadVideos",spliced_videos); } );
});
