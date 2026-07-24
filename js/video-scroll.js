document.addEventListener("DOMContentLoaded", function () {
    console.log("Initializing Video Scroll...");

    const video = document.getElementById("bg-video");
    if (!video) {
        console.warn("Background video element not found!");
        return;
    }

    // Ensure video is loaded to get duration
    video.addEventListener("loadedmetadata", function () {
        console.log("Video metadata loaded. Duration:", video.duration);
        initVideoScroll(video);
    });

    if (video.readyState >= 1) {
        initVideoScroll(video);
    }
});

function initVideoScroll(video) {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
        console.error("GSAP or ScrollTrigger not loaded!");
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Create a proxy object to tween the video time
    let videoTime = { t: 0 };

    gsap.to(videoTime, {
        t: video.duration,
        ease: "none",
        scrollTrigger: {
            trigger: "body",
            start: "top top",
            end: "bottom bottom",
            scrub: 1, // Smooth scrubbing
            // markers: true, // debug
        },
        onUpdate: function () {
            if (video.duration) {
                video.currentTime = videoTime.t;
            }
        }
    });

    console.log("Video Scroll initialized.");
}
