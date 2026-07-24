// ========================================
// HORIZONTAL SCROLL FUNCTIONALITY
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    const desktopScroll = document.querySelector('.horizontal-scroll-mobile');

    if (!desktopScroll) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    // Mouse drag to scroll
    desktopScroll.addEventListener('mousedown', (e) => {
        isDown = true;
        desktopScroll.style.cursor = 'grabbing';
        startX = e.pageX - desktopScroll.offsetLeft;
        scrollLeft = desktopScroll.scrollLeft;
    });

    desktopScroll.addEventListener('mouseleave', () => {
        isDown = false;
        desktopScroll.style.cursor = 'grab';
    });

    desktopScroll.addEventListener('mouseup', () => {
        isDown = false;
        desktopScroll.style.cursor = 'grab';
    });

    desktopScroll.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - desktopScroll.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed multiplier
        desktopScroll.scrollLeft = scrollLeft - walk;
    });

    // GSAP Horizontal Scroll Animation for Desktop
    if (window.innerWidth >= 768) {
        gsap.registerPlugin(ScrollTrigger);

        const scrollContainer = document.querySelector('.horizontal-scroll-section');
        const scrollContent = document.querySelector('.horizontal-scroll-desktop');

        if (scrollContainer && scrollContent) {
            const scrollWidth = scrollContent.scrollWidth - window.innerWidth + 192; // 192px = padding

            gsap.to(scrollContent, {
                x: -scrollWidth,
                ease: "none",
                scrollTrigger: {
                    trigger: scrollContainer,
                    start: "top top",
                    end: () => `+=${scrollWidth}`,
                    scrub: 1,
                    pin: true,
                    anticipatePin: 1,
                    invalidateOnRefresh: true
                }
            });
        }
    }

    // Initialize YouTube players for all video wrappers
    initializeYouTubePlayers();
});

// YouTube Player Initialization
function initializeYouTubePlayers() {
    // Load YouTube IFrame API
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = function () {
        const players = {};

        // Find all YouTube player elements
        document.querySelectorAll('.youtube-player').forEach(playerElement => {
            const videoId = playerElement.dataset.videoId;
            const playerId = playerElement.id;

            if (!videoId || !playerId) return;

            // Create player
            players[playerId] = new YT.Player(playerId, {
                videoId: videoId,
                playerVars: {
                    'playsinline': 1,
                    'rel': 0,
                    'modestbranding': 1
                },
                events: {
                    'onReady': (event) => onPlayerReady(event, playerId),
                    'onStateChange': (event) => onPlayerStateChange(event, playerId)
                }
            });
        });
    };
}

function onPlayerReady(event, playerId) {
    const wrapper = document.getElementById(playerId).closest('.video-wrapper');
    const overlay = wrapper.querySelector('.video-overlay');
    const playButton = overlay.querySelector('.play-button');
    const pauseButton = wrapper.querySelector('.pause-button');

    // Play button click
    playButton.addEventListener('click', () => {
        event.target.playVideo();
        overlay.style.display = 'none';
    });

    // Pause button click
    if (pauseButton) {
        pauseButton.addEventListener('click', () => {
            event.target.pauseVideo();
        });
    }
}

function onPlayerStateChange(event, playerId) {
    const wrapper = document.getElementById(playerId).closest('.video-wrapper');
    const overlay = wrapper.querySelector('.video-overlay');
    const controls = wrapper.querySelector('.video-controls');

    if (event.data === YT.PlayerState.PLAYING) {
        overlay.style.display = 'none';
        if (controls) controls.style.display = 'flex';
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        if (controls) controls.style.display = 'none';
        overlay.style.display = 'flex';
    }
}

// Recalculate on window resize
window.addEventListener('resize', () => {
    if (window.ScrollTrigger) {
        ScrollTrigger.refresh();
    }
});
