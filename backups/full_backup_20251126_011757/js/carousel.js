// AutoFlow Studio - Mobile-Optimized Carousel JavaScript
// Handles the work examples carousel with mobile video optimizations
// Load the IFrame Player API code asynchronously.
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// --- The rest of your carousel.js code starts below ---

// NEW: This global function is REQUIRED by the YouTube API...
// ...
// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎠 DOM loaded, checking for carousel...');
    
    // Find the main carousel container on the page
    const carouselContainer = document.querySelector('.carousel-container');

    // ONLY run the carousel code if the container exists on this page
    if (carouselContainer) {
        console.log('🎠 Carousel container found, initializing...');
        initializeCarousel();
    } else {
        console.log('🎠 No carousel found on this page, skipping initialization.');
    }
});

// NEW: This global function is REQUIRED by the YouTube API.
// It's called automatically when the API script is loaded and ready.
function onYouTubeIframeAPIReady() {
    console.log('🎬 YouTube API is ready.');
    // Trigger a custom event to let our carousel know it can create the players.
    document.dispatchEvent(new Event('youtubeApiReady'));
}
/**
 * Initialize the carousel functionality with mobile optimizations
 */
function initializeCarousel() {
    console.log('🎠 Initializing mobile-optimized carousel...');
    
    const track = document.getElementById('carouselTrack');
    
    // Only initialize if carousel exists (home page)
    if (!track) {
        console.log('❌ Carousel track not found');
        return;
    }
    
    const slides = Array.from(track.children);
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const indicatorsContainer = document.getElementById('indicators');
    const autoPlayBtn = document.getElementById('autoPlayBtn');
    const timerProgress = document.getElementById('timerProgress');
    const carouselContainer = document.querySelector('.carousel-container');
    
    // Mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    // Debug: Check if all elements are found
    console.log('🔍 Elements found:', {
        track: !!track,
        slides: slides.length,
        nextBtn: !!nextBtn,
        prevBtn: !!prevBtn,
        indicators: !!indicatorsContainer,
        autoPlayBtn: !!autoPlayBtn,
        timerProgress: !!timerProgress,
        container: !!carouselContainer,
        isMobile: isMobile
    });
    
    // Carousel state
    const slideCount = slides.length;
    let currentIndex = 0;
    let autoPlay = !isMobile; // Disable autoplay on mobile by default
    let autoPlayInterval;
    const autoPlayTime = isMobile ? 7000 : 5000; // Longer on mobile
    let isUserInteracting = false;
    
// NEW: An object to hold all our YouTube player instances
    let players = {};

    // NEW: Wait for the YouTube API to be ready before setting up players
    document.addEventListener('youtubeApiReady', setupYouTubePlayers);
    
    // Create indicators
    createIndicators();
    
    // Initialize carousel
    updateCarousel(true);
    
    // Event listeners
    setupEventListeners();
    
    // Initialize with first timer start
    if (autoPlay) {
        startTimer();
    }
    
    console.log('✅ Mobile-optimized carousel initialized successfully');
    
    /**
     * NEW: Creates a YouTube player for each placeholder div in the carousel.
     */
    function setupYouTubePlayers() {
        console.log('🎬 Setting up YouTube players...');
        const playerDivs = document.querySelectorAll('.youtube-player');
        
        playerDivs.forEach(playerDiv => {
            const playerId = playerDiv.id;
            const videoId = playerDiv.dataset.videoId;
            const wrapper = playerDiv.closest('.video-wrapper');
            if (wrapper) {
                wrapper.classList.add('paused'); // Set initial state for custom controls
            }

            const player = new YT.Player(playerId, {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    'playsinline': 1,
                    'controls': isMobile ? 1 : 0,
                    'rel': 0,
                    'showinfo': 0,
                    'modestbranding': 1,
                    'iv_load_policy': 3,
                    'mute': 1
                },
                events: {
                    'onReady': (event) => onPlayerReady(event, wrapper),
                    'onStateChange': (event) => onPlayerStateChange(event, wrapper)
                }
            });
            players[playerId] = player;
        });
        console.log(`✅ ${playerDivs.length} YouTube players set up.`);
    }

    /**
     * NEW: Wires up custom play/pause buttons once a player is ready.
     */
    function onPlayerReady(event, wrapper) {
        if (!wrapper || isMobile) return; // Only apply custom controls on desktop

        const playButton = wrapper.querySelector('.play-button');
        const pauseButton = wrapper.querySelector('.pause-button');
        const overlay = wrapper.querySelector('.video-overlay');
        const player = event.target;

        const playVideo = () => {
            player.unMute();
            player.playVideo();
        };

        const pauseVideo = () => {
            player.pauseVideo();
        };
        
        if (playButton) playButton.addEventListener('click', playVideo);
        if (overlay) overlay.addEventListener('click', playVideo);
        if (pauseButton) pauseButton.addEventListener('click', pauseVideo);
    }

    /**
     * NEW: Updates custom UI based on the video's state.
     */
    function onPlayerStateChange(event, wrapper) {
        if (!wrapper) return;
        if (event.data === YT.PlayerState.PLAYING) {
            wrapper.classList.remove('paused');
            wrapper.classList.add('playing');
            pauseCarouselForVideo();
        } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            wrapper.classList.remove('playing');
            wrapper.classList.add('paused');
            resumeCarouselAfterVideo();
            
            if (event.data === YT.PlayerState.ENDED) {
                event.target.seekTo(0);
                event.target.mute();
            }
        }
    }
    
    /**
     * Create indicator dots
     */
    function createIndicators() {
        if (!indicatorsContainer) {
            console.log('❌ Indicators container not found');
            return;
        }
        
        indicatorsContainer.innerHTML = '';
        for (let i = 0; i < slideCount; i++) {
            const indicator = document.createElement('div');
            indicator.className = 'indicator';
            indicator.setAttribute('data-slide', i);
            indicator.setAttribute('aria-label', `Go to slide ${i + 1}`);
            indicator.setAttribute('role', 'button');
            indicator.setAttribute('tabindex', '0');
            indicatorsContainer.appendChild(indicator);
        }
        console.log(`🔘 Created ${slideCount} indicators`);
    }
    
    /**
     * Update carousel position and UI - ENHANCED WITH VIDEO INTEGRATION
     */
    function updateCarousel(isInstant = false) {
        // STOP ALL VIDEOS WHEN SLIDE CHANGES
        if (window.stopAllVideos) {
            window.stopAllVideos();
        }
        
        // Handle CSS transitions
        if (isInstant) {
            track.style.transition = 'none';
        }
        
        // Move track
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        
        // Restore transition after instant movement
        if (isInstant) {
            setTimeout(() => {
                track.style.transition = isMobile ? 
                    'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : // Faster on mobile
                    'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 50);
        }
        
        // Update indicators
        updateIndicators();
        
        // Update timer if autoplay is on
        if (autoPlay && !isUserInteracting) {
            resetTimer();
        }
        
        // Update ARIA attributes
        updateAriaAttributes();
        
        console.log(`🎠 Updated to slide ${currentIndex + 1}/${slideCount}`);
    }
    
    /**
     * Update indicator states
     */
    function updateIndicators() {
        if (!indicatorsContainer) return;
        
        const indicators = indicatorsContainer.querySelectorAll('.indicator');
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === currentIndex);
            indicator.setAttribute('aria-selected', index === currentIndex);
        });
    }
    
    /**
     * Update ARIA attributes for accessibility
     */
    function updateAriaAttributes() {
        slides.forEach((slide, index) => {
            const isActive = index === currentIndex;
            slide.setAttribute('aria-hidden', !isActive);
            
            // Update focusable elements within slides
            const focusableElements = slide.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
            focusableElements.forEach(el => {
                el.setAttribute('tabindex', isActive ? '0' : '-1');
            });
        });
    }
    
    /**
     * Timer functions for autoplay
     */
    function startTimer() {
        if (!autoPlay || isUserInteracting || !timerProgress) return;
        
        clearTimeout(autoPlayInterval);
        
        // Reset progress bar
        timerProgress.style.transition = 'none';
        timerProgress.style.width = '0%';
        
        // Start progress animation
        setTimeout(() => {
            timerProgress.style.transition = `width ${autoPlayTime}ms linear`;
            timerProgress.style.width = '100%';
        }, 50);
        
        // Set timeout for next slide
        autoPlayInterval = setTimeout(() => {
            nextSlide();
        }, autoPlayTime);
    }
    
    function resetTimer() {
        startTimer();
    }
    
    function pauseTimer() {
        clearTimeout(autoPlayInterval);
        
        if (!timerProgress) return;
        
        // Pause progress bar animation
        const computedWidth = getComputedStyle(timerProgress).width;
        timerProgress.style.transition = 'none';
        timerProgress.style.width = computedWidth;
    }
    
    function stopTimer() {
        clearTimeout(autoPlayInterval);
        if (timerProgress) {
            timerProgress.style.transition = 'none';
            timerProgress.style.width = '0%';
        }
    }
    
    /**
     * Navigation functions
     */
    function nextSlide() {
        currentIndex = (currentIndex + 1) % slideCount;
        updateCarousel();
        announceSlideChange();
    }
    
    function prevSlide() {
        currentIndex = (currentIndex - 1 + slideCount) % slideCount;
        updateCarousel();
        announceSlideChange();
    }
    
    function goToSlide(index) {
        if (index >= 0 && index < slideCount && index !== currentIndex) {
            currentIndex = index;
            updateCarousel();
            announceSlideChange();
        }
    }
    
    /**
     * Toggle autoplay functionality
     */
    function toggleAutoPlay() {
        if (!autoPlayBtn) return;
        
        autoPlay = !autoPlay;
        autoPlayBtn.classList.toggle('active', autoPlay);
        autoPlayBtn.textContent = autoPlay ? 'Auto Play' : 'Manual';
        autoPlayBtn.setAttribute('aria-pressed', autoPlay);
        
        if (autoPlay) {
            startTimer();
        } else {
            stopTimer();
        }
        
        // Announce change to screen readers
        const announcement = autoPlay ? 'Autoplay enabled' : 'Autoplay disabled';
        announceToScreenReader(announcement);
        
        console.log(`🎮 Autoplay ${autoPlay ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Setup all event listeners with mobile optimizations
     */
    function setupEventListeners() {
        console.log('🎧 Setting up mobile-optimized event listeners...');
        
        // Navigation buttons
        if (nextBtn) {
            const nextHandler = () => {
                console.log('➡️ Next button clicked');
                setUserInteracting(true);
                nextSlide();
                setTimeout(() => setUserInteracting(false), isMobile ? 2000 : 1000);
            };
            
            nextBtn.addEventListener('click', nextHandler);
            
            // Better mobile touch handling
            if (isMobile) {
                nextBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    nextHandler();
                });
            }
        }
        
        if (prevBtn) {
            const prevHandler = () => {
                console.log('⬅️ Previous button clicked');
                setUserInteracting(true);
                prevSlide();
                setTimeout(() => setUserInteracting(false), isMobile ? 2000 : 1000);
            };
            
            prevBtn.addEventListener('click', prevHandler);
            
            // Better mobile touch handling
            if (isMobile) {
                prevBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    prevHandler();
                });
            }
        }
        
        // Autoplay toggle
        if (autoPlayBtn) {
            autoPlayBtn.addEventListener('click', toggleAutoPlay);
        }
        
        // Indicators with improved mobile touch
        if (indicatorsContainer) {
            const indicatorHandler = (e) => {
                if (e.target.classList.contains('indicator')) {
                    const slideIndex = parseInt(e.target.dataset.slide);
                    console.log(`🔘 Indicator ${slideIndex + 1} clicked`);
                    setUserInteracting(true);
                    goToSlide(slideIndex);
                    setTimeout(() => setUserInteracting(false), isMobile ? 2000 : 1000);
                }
            };
            
            indicatorsContainer.addEventListener('click', indicatorHandler);
            
            // Better mobile touch for indicators
            if (isMobile) {
                indicatorsContainer.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    indicatorHandler(e);
                });
            }
            
            // Keyboard navigation for indicators
            indicatorsContainer.addEventListener('keydown', (e) => {
                if (e.target.classList.contains('indicator') && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    const slideIndex = parseInt(e.target.dataset.slide);
                    setUserInteracting(true);
                    goToSlide(slideIndex);
                    setTimeout(() => setUserInteracting(false), isMobile ? 2000 : 1000);
                }
            });
        }
        
        // Mouse interaction with carousel (desktop only)
        if (carouselContainer && !isMobile) {
            carouselContainer.addEventListener('mouseenter', () => {
                if (autoPlay) {
                    pauseTimer();
                }
            });
            
            carouselContainer.addEventListener('mouseleave', () => {
                if (autoPlay && !isUserInteracting) {
                    resetTimer();
                }
            });
        }
        
        // Keyboard navigation (desktop only)
        if (!isMobile) {
            document.addEventListener('keydown', (e) => {
                if (!isOnHomePage() || !isCarouselVisible()) return;
                
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    setUserInteracting(true);
                    prevSlide();
                    setTimeout(() => setUserInteracting(false), 1000);
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    setUserInteracting(true);
                    nextSlide();
                    setTimeout(() => setUserInteracting(false), 1000);
                }
            });
        }
        
        // Enhanced touch/swipe support for mobile
        setupMobileTouchSupport();
        
        // Visibility change (pause when tab is not active)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                pauseTimer();
            } else if (autoPlay && !isUserInteracting) {
                resetTimer();
            }
        });
        
        // Orientation change handling for mobile
        if (isMobile) {
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    // Re-optimize videos after orientation change
                    optimizeVideosForMobile();
                    updateCarousel(true);
                }, 200);
            });
        }
        
        console.log('✅ Mobile-optimized event listeners set up');
    }
    
    /**
     * Enhanced mobile touch/swipe support
     */
    function setupMobileTouchSupport() {
        let startX = 0;
        let startY = 0;
        let moveX = 0;
        let moveY = 0;
        let isMoving = false;
        let touchStartTime = 0;
        
        const touchOptions = { passive: false };
        
        track.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            touchStartTime = Date.now();
            isMoving = true;
            setUserInteracting(true);
            
            // Pause autoplay during touch
            if (autoPlay) {
                pauseTimer();
            }
        }, { passive: true });
        
        track.addEventListener('touchmove', (e) => {
            if (!isMoving) return;
            
            moveX = e.touches[0].clientX;
            moveY = e.touches[0].clientY;
            
            // Calculate distances
            const deltaX = Math.abs(moveX - startX);
            const deltaY = Math.abs(moveY - startY);
            
            // If horizontal movement is greater than vertical, prevent scrolling
            if (deltaX > deltaY && deltaX > 15) { // Increased threshold for mobile
                e.preventDefault();
            }
        }, touchOptions);
        
        track.addEventListener('touchend', (e) => {
            if (!isMoving) return;
            
            const endX = e.changedTouches[0].clientX;
            const deltaX = startX - endX;
            const touchDuration = Date.now() - touchStartTime;
            const minSwipeDistance = isMobile ? 80 : 50; // Larger threshold on mobile
            const maxSwipeTime = 500; // Maximum time for a swipe
            
            // Only trigger swipe if it's fast enough and far enough
            if (Math.abs(deltaX) > minSwipeDistance && touchDuration < maxSwipeTime) {
                if (deltaX > 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
            }
            
            isMoving = false;
            
            // Resume autoplay after touch interaction
            setTimeout(() => {
                setUserInteracting(false);
                if (autoPlay) {
                    resetTimer();
                }
            }, isMobile ? 2000 : 1000);
        }, { passive: true });
        
        // Prevent context menu on long touch
        track.addEventListener('contextmenu', (e) => {
            if (isMobile) {
                e.preventDefault();
            }
        });
    }
    
    /**
     * Utility functions
     */
    function setUserInteracting(interacting) {
        isUserInteracting = interacting;
        console.log(`👤 User interacting: ${interacting}`);
    }
    
    function isOnHomePage() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        return currentPage === 'index.html' || currentPage === '';
    }
    
    function isCarouselVisible() {
        if (!carouselContainer) return false;
        const rect = carouselContainer.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
    }
    
    function announceSlideChange() {
        const titleElement = slides[currentIndex].querySelector('.work-content h2');
        if (titleElement) {
            const currentSlideTitle = titleElement.textContent;
            announceToScreenReader(`Now showing: ${currentSlideTitle}`);
        }
    }
    
    function announceToScreenReader(message) {
        // Create or update live region for screen reader announcements
        let liveRegion = document.getElementById('carousel-live-region');
        
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'carousel-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.position = 'absolute';
            liveRegion.style.left = '-10000px';
            liveRegion.style.width = '1px';
            liveRegion.style.height = '1px';
            liveRegion.style.overflow = 'hidden';
            document.body.appendChild(liveRegion);
        }
        
        liveRegion.textContent = message;
    }
    
    /**
     * Pause carousel for video playback - called from video controls
     */
    function pauseCarouselForVideo() {
        if (autoPlay && autoPlayInterval) {
            if (autoPlayBtn) {
                autoPlayBtn.dataset.pausedByVideo = 'true';
            }
            
            clearTimeout(autoPlayInterval);
            
            if (timerProgress) {
                const computedWidth = getComputedStyle(timerProgress).width;
                timerProgress.style.transition = 'none';
                timerProgress.style.width = computedWidth;
            }
            
            console.log('⏸️ Carousel paused for video');
        }
    }

    /**
     * Resume carousel after video stops - called from video controls
     */
    function resumeCarouselAfterVideo() {
        if (autoPlayBtn && 
            autoPlayBtn.dataset.pausedByVideo === 'true' && 
            autoPlay) {
            
            delete autoPlayBtn.dataset.pausedByVideo;
            resetTimer();
            
            console.log('▶️ Carousel resumed after video');
        }
    }

    // Make functions globally available for video integration
    window.pauseCarouselForVideo = pauseCarouselForVideo;
    window.resumeCarouselAfterVideo = resumeCarouselAfterVideo;
    
    // Export carousel controls for external use
    window.CarouselControls = {
        goToSlide: (index) => {
            console.log(`🎠 External call: goToSlide(${index})`);
            goToSlide(index);
        },
        next: () => {
            console.log('🎠 External call: next()');
            nextSlide();
        },
        prev: () => {
            console.log('🎠 External call: prev()');
            prevSlide();
        },
        toggleAutoPlay: () => {
            console.log('🎠 External call: toggleAutoPlay()');
            toggleAutoPlay();
        },
        isMobile: () => isMobile
    };
}

// Confirm mobile-optimized carousel is loaded
console.log('🎠📱 Mobile-optimized carousel JavaScript loaded with video integration support');
