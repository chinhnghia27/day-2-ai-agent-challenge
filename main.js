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

    // --- MODAL & FORM LOGIC ---
    const modal = document.getElementById('lead-modal');
    const leadForm = document.getElementById('lead-form');
    const formSuccess = document.getElementById('form-success');
    const triggerButtons = document.querySelectorAll('.trigger-modal');
    const closeButtons = document.querySelectorAll('.close-modal');

    // Open Modal
    const openModal = (e) => {
        if (e) e.preventDefault();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    };

    // Close Modal
    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        // Reset form state after a delay
        setTimeout(() => {
            leadForm.classList.remove('hidden');
            formSuccess.classList.add('hidden');
            leadForm.reset();
        }, 500);
    };

    triggerButtons.forEach(btn => btn.addEventListener('click', openModal));
    closeButtons.forEach(btn => btn.addEventListener('click', closeModal));

    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Handle Form Submit
    leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = leadForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerText;
        
        // Form Data
        const formData = new FormData(leadForm);
        const data = Object.fromEntries(formData.entries());
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerText = 'ĐANG GỬI...';

            // Google Apps Script URL
            const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3A4h8qbFJV2u49KWB2kG_XuwuNc0IfDk_fCgOldxvjzcngwWHkWIUu2Zi-Qgd2c0uVg/exec';
            
            // Gửi dữ liệu qua fetch API
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // Cần thiết khi gửi sang Google Apps Script từ web khác domain
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Vì dùng mode 'no-cors', ta không đọc được response body, 
            // nhưng nếu không có error thì mặc định là thành công.
            console.log('Dữ liệu đã gửi đến Google Sheets.');
            
            // Show Success State
            leadForm.classList.add('hidden');
            formSuccess.classList.remove('hidden');
            
        } catch (error) {
            alert('Có lỗi xảy ra, vui lòng thử lại sau hoặc liên hệ trực tiếp qua Zalo.');
            console.error('Error:', error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
    });

    console.log("Animation observers & Modal logic initialized successfully.");
});
