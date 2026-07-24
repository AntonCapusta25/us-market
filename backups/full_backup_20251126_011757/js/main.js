// AutoFlow Studio - Optimized Main JavaScript
// Performance-focused rewrite

// Performance measurement
window.perfStart = performance.now();

// DOM ready handler with all initializations
document.addEventListener('DOMContentLoaded', () => {
    // Run critical functions first
    initLoading();

    // Queue non-critical initializations
    setTimeout(() => {
        initializeNavigation();
        initializeSmoothScroll();
        initializeScrollEffects();
        initializeScrollDownArrow();

        // Lowest priority initializations
        requestIdleCallback(() => {
            initializeFormHandling();
            initializeAnimations();
            initializeCTAButtons();
            initializeNewsletter();
            initializeGSAPInteractions();

            console.log('✓ All initializations complete in: ' +
                (performance.now() - window.perfStart).toFixed(0) + 'ms');
        });
    }, 10);
});

// Optimized Loading Animation
function initLoading() {
    const loadingScreen = document.querySelector('.loading-screen');
    if (!loadingScreen) return;

    // Start progress animation immediately
    const tl = gsap.timeline({
        onComplete: () => {
            loadingScreen.style.display = 'none';
            document.body.classList.add('loaded');
            console.log('✓ Page loaded in: ' + (performance.now() - window.perfStart).toFixed(0) + 'ms');
        }
    });

    // Simplified loading sequence
    tl.to('.loading-progress', {
        width: '100%',
        duration: 1.5, // Reduced time
        ease: 'power3.out'
    })
        .to('.loading-screen', {
            opacity: 0,
            duration: 0.5,
            ease: 'power3.in'
        }, '-=0.2');

    // Only do fancy letter animations if we have time
    if (window.innerWidth > 768) { // Skip on mobile
        const logoElement = document.getElementById('loadingLogo');
        if (logoElement && typeof splitTextToLetters === 'function') {
            splitTextToLetters();
            animateLetters();
        }
    }

    // Failsafe - force load after 3 seconds
    setTimeout(() => {
        if (!document.body.classList.contains('loaded')) {
            console.warn('⚠️ Loading failsafe activated');
            loadingScreen.style.display = 'none';
            document.body.classList.add('loaded');
        }
    }, 3000);
}

// Letter animation functions (optimized)
function splitTextToLetters() {
    const logoElement = document.getElementById('loadingLogo');
    if (!logoElement) return;

    const text = logoElement.textContent;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === ' ') {
            const spaceSpan = document.createElement('span');
            spaceSpan.className = 'space';
            fragment.appendChild(spaceSpan);
        } else {
            const letterSpan = document.createElement('span');
            letterSpan.className = 'letter';
            letterSpan.textContent = char;
            fragment.appendChild(letterSpan);
        }
    }

    logoElement.innerHTML = '';
    logoElement.appendChild(fragment);
}

function animateLetters() {
    const letters = document.querySelectorAll('.letter');
    if (letters.length === 0) return;

    // Simpler letter animation
    gsap.fromTo(letters,
        { y: 15, opacity: 0 },
        {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.05,
            ease: 'power2.out'
        }
    );
}

// Optimized scroll arrow initialization
function initializeScrollDownArrow() {
    const scrollDownArrow = document.getElementById('scrollDownArrow');
    if (!scrollDownArrow) return;

    scrollDownArrow.addEventListener('click', () => {
        const nextSection = document.getElementById('what-we-build');
        if (!nextSection) return;

        gsap.to(window, {
            duration: 1,
            scrollTo: { y: nextSection, offsetY: 80 },
            ease: "power3.inOut"
        });
    });

    // Simplified scroll handler with throttling
    const handleScroll = throttle(() => {
        const opacity = window.scrollY > 50 ? 0 : 1;
        scrollDownArrow.style.opacity = opacity;
        scrollDownArrow.style.pointerEvents = opacity ? 'auto' : 'none';
    }, 100);

    window.addEventListener('scroll', handleScroll, { passive: true });
}

/**
 * Initialize smooth scrolling functionality - optimized
 */
function initializeSmoothScroll() {
    // Only attach event handler to document once
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a[href^="#"]');
        if (!target) return;

        e.preventDefault();
        const targetId = target.getAttribute('href');

        // Handle special case
        if (targetId === '#' || targetId === '#top') {
            gsap.to(window, { duration: 1, scrollTo: 0, ease: "power2.inOut" });
            return;
        }

        const targetElement = document.querySelector(targetId);
        if (!targetElement) return;

        const navbarHeight = document.querySelector('.navbar')?.offsetHeight || 0;
        gsap.to(window, {
            duration: 1,
            scrollTo: { y: targetElement, offsetY: navbarHeight + 20 },
            ease: "power2.inOut"
        });
    });

    // Simple programmatic scroll function
    window.smoothScrollTo = (target, offset = 0) => {
        if (!target) return;

        gsap.to(window, {
            duration: 1,
            scrollTo: { y: typeof target === 'string' ? document.querySelector(target) : target, offsetY: offset },
            ease: "power2.inOut"
        });
    };
}

/**
 * Navigation - optimized
 */
function initializeNavigation() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            const isActive = navLinks.classList.contains('mobile-active');

            // Toggle menu with simplified animation
            if (!isActive) {
                navLinks.classList.add('mobile-active');
                gsap.fromTo(navLinks,
                    { opacity: 0, y: -10 },
                    { opacity: 1, y: 0, duration: 0.3, ease: "power1.out" }
                );
                mobileMenuBtn.textContent = '✖';
            } else {
                gsap.to(navLinks, {
                    opacity: 0,
                    duration: 0.2,
                    ease: "power1.in",
                    onComplete: () => {
                        navLinks.classList.remove('mobile-active');
                    }
                });
                mobileMenuBtn.textContent = '☰';
            }
        });

        // Close menu on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('mobile-active');
                mobileMenuBtn.textContent = '☰';
            });
        });
    }

    // Set active link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        link.classList.toggle('active',
            href === currentPage ||
            (currentPage === '' && href === 'index.html') ||
            (currentPage === 'index.html' && href === 'index.html')
        );
    });
}

/**
 * Language Switch
 */
function initializeLanguageSwitch() {
    const langButtons = document.querySelectorAll('.lang-btn');

    if (langButtons.length === 0) return;

    langButtons.forEach(button => {
        button.addEventListener('click', function () {
            const selectedLang = this.getAttribute('data-lang');

            // Remove active class from all buttons
            langButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Save language preference
            localStorage.setItem('preferredLanguage', selectedLang);

            // Get current path
            const currentPath = window.location.pathname;

            // Switch language
            if (selectedLang === 'nl') {
                // Redirect to Dutch version
                if (!currentPath.startsWith('/nl/')) {
                    // Add /nl/ prefix
                    window.location.href = `/nl${currentPath}`;
                }
            } else {
                // Redirect to English version (remove /nl/ if present)
                if (currentPath.startsWith('/nl/')) {
                    // Remove /nl/ prefix
                    window.location.href = currentPath.replace('/nl/', '/');
                }
            }
        });
    });

    // Load saved language preference on page load
    const savedLang = localStorage.getItem('preferredLanguage') || 'en';
    const activeBtn = document.querySelector(`.lang-btn[data-lang="${savedLang}"]`);
    if (activeBtn) {
        langButtons.forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    // Localize all internal links based on current language
    localizeInternalLinks();
}

/**
 * Localize all internal links to match current language
 */
function localizeInternalLinks() {
    const currentPath = window.location.pathname;
    const isOnDutchVersion = currentPath.startsWith('/nl/');

    // Find all internal links (relative links that don't start with http)
    document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');

        // Skip external links, anchors, and special links
        if (!href ||
            href.startsWith('http') ||
            href.startsWith('#') ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:')) {
            return;
        }

        // Skip if already processed
        if (link.hasAttribute('data-localized')) {
            return;
        }

        // Mark as processed
        link.setAttribute('data-localized', 'true');

        // Convert relative paths to absolute
        let absolutePath = href;
        if (href.startsWith('../')) {
            // Remove ../ and add /
            absolutePath = '/' + href.replace(/\.\.\//g, '');
        } else if (href.startsWith('./')) {
            // Remove ./ and add current directory
            const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
            absolutePath = currentDir + '/' + href.substring(2);
        } else if (!href.startsWith('/')) {
            // Relative to current directory
            const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
            absolutePath = currentDir + '/' + href;
        }

        // Add /nl/ prefix if on Dutch version and not already there
        if (isOnDutchVersion && !absolutePath.startsWith('/nl/')) {
            link.setAttribute('href', '/nl' + absolutePath);
        }
        // Remove /nl/ prefix if on English version and it's there
        else if (!isOnDutchVersion && absolutePath.startsWith('/nl/')) {
            link.setAttribute('href', absolutePath.replace('/nl/', '/'));
        }
    });
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    initializeNavigation();
    initializeLanguageSwitch();
});

/**
 * Scroll effects - optimized
 */
function initializeScrollEffects() {
    const navbar = document.querySelector('.navbar');
    const heroSection = document.querySelector('.hero, .blog-header');

    if (navbar && heroSection) {
        let isScrolled = false;

        const updateNavbar = throttle(() => {
            const shouldScroll = window.scrollY > (heroSection.offsetHeight - 100);

            if (shouldScroll !== isScrolled) {
                isScrolled = shouldScroll;
                navbar.classList.toggle('scrolled', shouldScroll);

                if (shouldScroll) {
                    navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                    navbar.style.backdropFilter = 'blur(10px)';
                    navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
                } else {
                    navbar.style.backgroundColor = 'transparent';
                    navbar.style.backdropFilter = 'none';
                    navbar.style.boxShadow = 'none';
                }
            }
        }, 100);

        window.addEventListener('scroll', updateNavbar, { passive: true });
        updateNavbar(); // Initial call
    }
}

/**
 * Form handling - optimized
 */
function initializeFormHandling() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactFormSubmit);
    }
}

/**
 * Optimized form submission
 */
function handleContactFormSubmit(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('name')?.value?.trim() || '',
        email: document.getElementById('email')?.value?.trim() || '',
        company: document.getElementById('company')?.value?.trim() || '',
        automation: document.getElementById('automation')?.value?.trim() || ''
    };

    if (!formData.name || !formData.email) {
        showNotification('Please fill in all required fields.', 'error');
        return;
    }

    if (!isValidEmail(formData.email)) {
        showNotification('Please enter a valid email address.', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    submitBtn.textContent = '⏳ Sending...';
    submitBtn.disabled = true;

    const scriptUrl = 'https://script.google.com/macros/s/AKfycbyq0Y_ILIVb2Ubs9Ye1FKuqLw7LHpOz7u9ZkxHStd_T7EVUaeds9ZqUZRnIzU3h4I1PrQ/exec';

    fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    })
        .then(() => {
            showNotification('Thank you! Your message has been sent successfully. We\'ll get back to you within 24 hours.', 'success');
            e.target.reset();
        })
        .catch(error => {
            console.error('❌ Contact form submission error:', error);
            showNotification('Sorry, there was an error sending your message. Please try again or email us directly.', 'error');
        })
        .finally(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
}

// Newsletter - constant moved to function scope for better memory usage
function initializeNewsletter() {
    const emailInput = document.querySelector('input[type="email"]');

    if (emailInput) {
        const newsletterButton = emailInput.nextElementSibling;

        if (newsletterButton && newsletterButton.classList.contains('cta-button')) {
            newsletterButton.addEventListener('click', async (e) => {
                e.preventDefault();

                const email = emailInput.value.trim();

                if (!email) {
                    showNotification('Please enter your email address.', 'error');
                    return;
                }

                if (!isValidEmail(email)) {
                    showNotification('Please enter a valid email address.', 'error');
                    return;
                }

                const originalText = e.target.textContent;
                e.target.textContent = 'Subscribing...';
                e.target.disabled = true;

                try {
                    await fetch('https://script.google.com/macros/s/AKfycbyee7JkEOt3kgtLiYHBRc--cbBf3p2GaxKN15Yq_fTlVpfE7VRArUpy9jf-9j0uB8wG/exec', {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: email })
                    });

                    showNotification('🎉 Successfully subscribed! Check your email for a welcome message.', 'success');
                    emailInput.value = '';
                } catch (error) {
                    showNotification('Network error. Please try again.', 'error');
                } finally {
                    e.target.textContent = originalText;
                    e.target.disabled = false;
                }
            });
        }
    }
}

/**
 * CTA buttons - optimized
 */
function initializeCTAButtons() {
    document.querySelectorAll('.cta-button').forEach(button => {
        // Skip newsletter button (handled separately)
        if (button.previousElementSibling && button.previousElementSibling.type === 'email') {
            return;
        }

        // Identify button type by text and href
        const buttonText = button.textContent.toLowerCase().trim();
        const buttonHref = button.getAttribute('href');

        // Let normal links work normally
        if (buttonText.includes('view full case study') ||
            (buttonHref && (buttonHref.includes('Project') || buttonHref.includes('.html')))) {
            return;
        }

        // Attach specific handlers based on button text
        if (buttonText.includes('book') ||
            buttonText.includes('audit') ||
            buttonText.includes('start your project') ||
            buttonText.includes('schedule') ||
            buttonText.includes('get your free') ||
            (buttonHref && buttonHref.includes('calendly.com'))) {
            button.addEventListener('click', () => {
                console.log('Booking button clicked:', buttonText);
            });
        } else if (buttonText.includes('case study') && !buttonText.includes('view full')) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                showNotification('Case study details would be shown here.', 'info');
                setTimeout(() => {
                    window.location.href = 'portfolio.html';
                }, 1000);
            });
        } else if (buttonText.includes('learn more')) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                showNotification('More details would be shown here.', 'info');
                setTimeout(() => {
                    window.location.href = 'contact.html';
                }, 1000);
            });
        }
    });
}

/**
 * Email validation - optimized
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Optimized notification system
 */
function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(notification => {
        notification.remove();
    });

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;

    // Add styles if not already present
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                padding: 15px 20px;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(10px);
            }
            
            .notification-success {
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.9), rgba(16, 185, 129, 0.9));
                color: white;
            }
            
            .notification-error {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9));
                color: white;
            }
            
            .notification-info {
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 0.9));
                color: white;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 15px;
            }
            
            .notification-message {
                flex-grow: 1;
                font-weight: 500;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: inherit;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            }
            
            .notification-close:hover {
                background-color: rgba(255, 255, 255, 0.2);
            }
        `;
        document.head.appendChild(styles);
    }

    // Add to page
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    const autoRemoveTimeout = setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);

    // Handle close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        clearTimeout(autoRemoveTimeout);
        notification.remove();
    });
}

/**
 * Animations - optimized to use IntersectionObserver once
 */
function initializeAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;

                // Simplified animations - just fade in everything
                gsap.fromTo(element,
                    { y: 30, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
                );

                observer.unobserve(element);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe elements that should animate
    document.querySelectorAll('.feature-card, .step, .pricing-card, .testimonial, .blog-card, .portfolio-card, .work-stats .stat-item')
        .forEach(el => observer.observe(el));
}

/**
 * GSAP interactions - simplified
 */
function initializeGSAPInteractions() {
    // Only run on desktop
    if (window.innerWidth < 1024) return;

    // Simple hover effects for cards
    document.querySelectorAll('.feature-card, .testimonial, .step')
        .forEach(card => {
            card.addEventListener('mouseenter', () => {
                gsap.to(card, { y: -5, duration: 0.3, ease: "power2.out" });
            });

            card.addEventListener('mouseleave', () => {
                gsap.to(card, { y: 0, duration: 0.3, ease: "power2.out" });
            });
        });
}

/**
 * Utility functions - optimized
 */
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function () {
        if (!inThrottle) {
            func.apply(this, arguments);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// RequestIdleCallback polyfill
window.requestIdleCallback = window.requestIdleCallback ||
    function (cb) {
        return setTimeout(function () {
            var start = Date.now();
            cb({
                didTimeout: false,
                timeRemaining: function () {
                    return Math.max(0, 50 - (Date.now() - start));
                }
            });
        }, 1);
    };

// Export utility functions
window.AutoFlowStudio = {
    showNotification,
    isValidEmail,
    debounce,
    throttle,
    smoothScrollTo: null // Will be set after initialization
};
