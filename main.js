document.addEventListener('DOMContentLoaded', () => {
    // Scroll animation functionality using IntersectionObserver
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
                scrollObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Apply starting properties and observe elements
    const elementsToAnimate = document.querySelectorAll('.split-content, .split-image, .stat-item, .glass-card');
    
    elementsToAnimate.forEach((el, index) => {
        el.style.opacity = "0";
        el.style.transform = "translateY(40px)";
        el.style.transition = `opacity 0.8s ease-out ${index * 0.1}s, transform 0.8s ease-out ${index * 0.1}s`;
        scrollObserver.observe(el);
    });

    console.log("Animation observers initialized successfully. Welcome to CapCut Master!");
});
