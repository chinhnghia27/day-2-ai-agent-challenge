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

    // --- CHATBOT LOGIC ---
    const chatbotToggler = document.getElementById('chatbot-toggler');
    const chatbotWindow = document.getElementById('chatbot-window');
    const chatbotContainer = document.getElementById('chatbot-widget');
    const chatbotBody = document.getElementById('chatbot-body');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    
    let chatInitialized = false;

    // Helper to non-accent characters
    const removeAccents = (str) => {
        return str.normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/đ/g, 'd')
                  .replace(/Đ/g, 'D')
                  .toLowerCase();
    };

    const qaData = [
        { keys: ["hello", "hi", "chao", "xin chao", "alo", "he lo", "chao ban", "e", "hey"], a: "Chào bạn nha! Mình là trợ lý ảo của Nghĩa đây. Bạn cần hỗ trợ gì về lịch học, ưu đãi hay khóa học CapCut thực chiến thì cứ gõ thẳng vô đây nhé!" },
        { keys: ["may tinh", "cau hinh", "iphone", "android", "dien thoai", "lap", "pc", "can gi", "dung gi", "bang gi"], a: "Hoàn toàn không bạn nha! Tụi mình sẽ thực chiến 100% trên điện thoại luôn (cả iOS lẫn Android). Bạn cứ nằm trên giường cầm điện thoại vẫn ra được video xịn, không cần đụng đến máy tính nặng nề đâu." },
        { keys: ["mu cong nghe", "khong ranh", "chua biet", "nguoi moi", "moi bat dau", "kho khong", "lam duoc khong", "kem", "chua hieu"], a: "Chắc chắn là được nè! Nghĩa thiết kế lộ trình này siêu đơn giản luôn, giống như có người cầm tay chỉ việc vậy đó. Mọi thứ đều có quy trình rõ ràng từng bước. Đặc biệt là bạn sẽ được add vô nhóm kín, vướng chỗ nào chụp màn hình gửi lên là có người gỡ rối liền." },
        { keys: ["bao lau", "thoi gian", "ban ron", "moi ngay", "may tieng", "bao nhieu phut", "toi ban", "hay ban"], a: "Học đi đôi với hành bạn nhé, không lý thuyết suông đâu! Khóa học tinh gọn lắm, mỗi bài chưa tới 10 phút. Bạn cứ tận dụng lúc đi xe bus hay nghỉ trưa xem rồi lôi điện thoại ra làm theo luôn. Cứ túc tắc vài hôm tay nghề sẽ lên thấy rõ à." },
        { keys: ["khi nao", "thanh qua", "biet lam", "muot ma", "muc tieu", "tay nghe", "kq", "ket qua", "het bao lau"], a: "Thông thường chỉ sau 7 ngày thực hành nghiêm túc theo quy trình là bạn có thể tự tin bung xõa ý tưởng và tự ra đều đặn 2-3 video mượt mà mỗi ngày rồi nha." },
        { keys: ["xu huong", "viral", "view", "tiktok", "len dau", "de xuat", "trieu view", "thu thuat", "foryou", "xuhuong"], a: "Edit xịn, có hook (điểm neo 3s đầu) cuốn là bước đệm khổng lồ để thuật toán đẩy video lên. Trong khóa này Nghĩa có gửi luôn chiến thuật đăng bài và cách giữ chân người xem. Mình áp dụng đúng thì cơ hội viral sẽ tự nhiên đến mà không cần đốt tiền chạy ads đâu!" },
        { keys: ["update", "cap nhat", "trend", "moi", "suot doi", "mai mai", "thay doi", "sau nay"], a: "Đương nhiên rồi bạn! Bạn mua khóa này 1 lần là được sở hữu trọn đời. Nền tảng có tính năng xịn gì mới, tụi mình sẽ update liền và hoàn toàn miễn phí cho bạn luôn nè." },
        { keys: ["qua tang", "bonus", "sfx", "am thanh", "ebook", "kich ban", "duoc tang", "co gi them"], a: "Đăng ký khóa học bạn sẽ gói mang về trọn combo: Bộ 500+ Sound Effects chuẩn trend, Ebook 50 ý tưởng kịch bản cực cuốn, và Cấp quyền vào nhóm VIP hỗ trợ 1 kèm 1." },
        { keys: ["gia", "bao nhieu", "tien", "hoc phi", "chi phi", "uu dai", "giam gia", "khuyen mai", "tong cong"], a: "Khóa học thực chiến này đang có ưu đãi 66%, chỉ còn 499.000 VNĐ. Tính ra nhịn một chầu ăn vặt cuối tuần là bạn đã sở hữu một quy trình làm nghề nghiêm túc có thể tận dụng lâu dài luôn rồi á." },
        { keys: ["quang cao", "chay ads", "bot", "hack", "buff"], a: "Tụi mình tập trung vào học tư duy dựng video và phân bố kịch bản tốt để kéo view tự nhiên. Xây content mộc tự nhiên đang là phong cách cực trend mà lại không tốn thêm đồng nào cho nền tảng nha!" },
        { keys: ["dang nhap", "tai khoan", "thanh toan xong", "cach hoc", "hoc nhu the nao", "khi nao duoc hoc", "thanh toan", "chuyen khoan xong"], a: "Thanh toán xong là hệ thống tự động mở tài khoản cho bạn luôn. Có email và Zalo gửi thông tin đăng nhập vô tận tay bạn." },
        { keys: ["mua", "dang ky", "chot", "link", "muon hoc", "dk", "tham gia", "huong dan dk", "muon", "dang ki"], a: "Hiện tại bên mình chỉ còn lại vài suất giữ mức giá 499.000đ cùng toàn bộ gói quà khủng. Thấy phù hợp thì bấm nút đăng ký nha, Nghĩa đang đợi bạn ở trong nhóm hỗ trợ kín rồi nè!", action: "buy" },
        { keys: ["suy nghi", "tu tu", "chu", "de sau", "chua mua", "tu van", "de xem", "nghi lai", "xem lai", "ban khoan", "nghi them", "chua quyet"], a: "Mình rất hiểu để bắt đầu học thứ mới luôn cần xíu thời gian để xem xét kĩ lưỡng. Bạn cứ để lại xíu thông tin qua form bên dưới nha. Khi nào có nội dung thú vị hay có update bài mẫu thì Nghĩa mới nhẹ nhàng gõ cửa báo bạn nghen!", action: "lead" }
    ];

    const getBotResponse = (text) => {
        const cleanText = removeAccents(text);
        
        // Find best match
        for (let qa of qaData) {
            for (let key of qa.keys) {
                if (cleanText.includes(key)) {
                    return { text: qa.a, action: qa.action || null };
                }
            }
        }
        
        // Fallback
        return { text: "Dạ, hiện tại chatbot chưa nắm rõ ý này lắm. Bạn có thể hỏi cụ thể hơn về Giá cả, Quà tặng, Thời gian học hay Máy tính/Điện thoại nhé! Hoặc bấm Đăng Ký để trò chuyện với team Zalo tụi mình.", action: "lead" };
    }

    const addMessage = (text, type, action) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${type === 'bot' ? 'chat-bot' : 'chat-user'}`;
        msgDiv.innerText = text;
        chatbotBody.appendChild(msgDiv);
        
        if (action === 'buy' || action === 'lead') {
            const btn = document.createElement('button');
            btn.className = 'chat-action-btn';
            
            if (action === 'buy') {
                btn.innerText = 'ĐĂNG KÝ NGAY 🚀';
                btn.addEventListener('click', () => {
                    const modal = document.getElementById('lead-modal');
                    if(modal) {
                        modal.classList.add('active');
                        document.body.style.overflow = 'hidden';
                    }
                });
            } else if (action === 'lead') {
                btn.innerText = 'HỖ TRỢ GỠ RỐI 💡';
                btn.addEventListener('click', () => {
                    const surveySection = document.getElementById('survey');
                    if (surveySection) {
                        surveySection.scrollIntoView({ behavior: 'smooth' });
                        // Đóng chatbot nhẹ nhàng để khách nhìn thấy section form
                        chatbotWindow.classList.add('hidden');
                        chatbotContainer.classList.remove('open');
                    }
                });
            }
            
            chatbotBody.appendChild(btn);
        }
        
        chatbotBody.scrollTop = chatbotBody.scrollHeight;
    };

    const handleSendMessage = () => {
        const text = chatInput.value.trim();
        if (!text) return;
        
        // Add user message
        addMessage(text, 'user');
        chatInput.value = '';
        chatInput.focus();

        // Bot typing simulation delay
        setTimeout(() => {
            const response = getBotResponse(text);
            addMessage(response.text, 'bot', response.action);
        }, 600);
    };

    if (chatSend && chatInput) {
        chatSend.addEventListener('click', handleSendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSendMessage();
        });
    }

    if (chatbotToggler) {
        chatbotToggler.addEventListener('click', () => {
            const isHidden = chatbotWindow.classList.contains('hidden');
            if (isHidden) {
                chatbotWindow.classList.remove('hidden');
                chatbotContainer.classList.add('open');
                if (!chatInitialized) {
                    setTimeout(() => {
                        addMessage("Xin chào bạn! Mình là trợ lý ảo của Nghĩa đây. Bạn có thắc mắc gì về khóa học Edit Video CapCut thực chiến trên điện thoại thì cứ nhắn tin cho mình nhé!", 'bot');
                    }, 500);
                    chatInitialized = true;
                }
                setTimeout(() => chatInput.focus(), 300);
            } else {
                chatbotWindow.classList.add('hidden');
                chatbotContainer.classList.remove('open');
            }
        });
    }
});
