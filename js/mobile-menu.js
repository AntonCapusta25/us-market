// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function () {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.mobile-menu-sidebar');
    const mobileOverlay = document.querySelector('.mobile-menu-overlay');
    const navItems = document.querySelectorAll('.mobile-menu-sidebar .nav-item');
    const closeMenuBtn = document.querySelector('.mobile-menu-close');

    if (!mobileMenuBtn || !navLinks || !mobileOverlay) {
        console.warn('Mobile menu elements not found');
        return;
    }

    // Toggle menu
    function toggleMenu() {
        navLinks.classList.toggle('active');
        mobileOverlay.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    }

    // Open menu
    mobileMenuBtn.addEventListener('click', toggleMenu);

    // Close menu button
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', toggleMenu);
    }

    // Close menu when clicking overlay
    mobileOverlay.addEventListener('click', toggleMenu);

    // Close menu when clicking a nav item
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (navLinks.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('active')) {
            toggleMenu();
        }
    });
});
