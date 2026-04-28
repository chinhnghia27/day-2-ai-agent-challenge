document.addEventListener('DOMContentLoaded', async () => {
    // --- APP CONFIGURATION ---
    let appConfig = {
        BANK_ACC: '',
        BANK_NAME: '',
        GOOGLE_SCRIPT_URL: ''
    };

    try {
        const configRes = await fetch('/api/config');
        appConfig = await configRes.json();
    } catch (err) {
        console.error('Failed to load app config:', err);
    }

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
    // const formSuccess = document.getElementById('form-success');
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
            const modalHeader = document.getElementById('modal-header');
            if (modalHeader) modalHeader.classList.remove('hidden');
            const checkoutStep = document.getElementById('checkout-step');
            const paymentSuccess = document.getElementById('payment-success');
            if (checkoutStep) checkoutStep.classList.add('hidden');
            if (paymentSuccess) paymentSuccess.classList.add('hidden');
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
            submitBtn.innerText = 'ĐANG XỬ LÝ...';

            // Bước 1: Gọi API tạo đơn hàng pending
            const checkoutRes = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const checkoutData = await checkoutRes.json();

            if (!checkoutData.success) {
                throw new Error(checkoutData.error || 'Checkout failed');
            }

            // Payment info - Tạo QR
            const orderCode = 'CAPCUTMASTER';
            const bank = appConfig.BANK_NAME || 'BIDV';
            const acc = appConfig.BANK_ACC || '96247NGHIA27';
            const qrUrl = `https://qr.sepay.vn/img?acc=${acc}&bank=${bank}&des=${orderCode}`;

            document.getElementById('qr-code-img').src = qrUrl;
            document.getElementById('transfer-code').innerText = orderCode;

            // Show Checkout Step
            leadForm.classList.add('hidden');
            const modalHeader = document.getElementById('modal-header');
            if (modalHeader) modalHeader.classList.add('hidden');
            document.getElementById('checkout-step').classList.remove('hidden');

            // Setup polling for payment confirmation
            const paymentBtn = document.getElementById('btn-payment-done');
            paymentBtn.disabled = true;
            paymentBtn.style.opacity = '0.5';
            paymentBtn.style.cursor = 'not-allowed';
            paymentBtn.innerText = '⏳ ĐANG ĐỢI THANH TOÁN...';

            const pollInterval = setInterval(async () => {
                try {
                    const response = await fetch(`/api/checkout/${checkoutData.orderId}/status`);
                    const statusData = await response.json();

                    if (statusData.status === 'success') {
                        clearInterval(pollInterval);
                        
                        // Enable button for user to proceed
                        paymentBtn.disabled = false;
                        paymentBtn.style.opacity = '1';
                        paymentBtn.style.cursor = 'pointer';
                        paymentBtn.style.background = '#22c55e'; // Green success color
                        paymentBtn.innerText = '✅ ĐÃ NHẬN TIỀN - TIẾP TỤC';
                        
                        paymentBtn.onclick = () => {
                            document.getElementById('checkout-step').classList.add('hidden');
                            document.getElementById('payment-success').classList.remove('hidden');
                        };
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                }
            }, 3000);

            // Cleanup polling if modal is closed manually
            const modalCloseBtns = document.querySelectorAll('.close-modal');
            modalCloseBtns.forEach(btn => {
                btn.addEventListener('click', () => clearInterval(pollInterval), { once: true });
            });

            // Gửi song song data sang Google Sheets (backup)
            const SCRIPT_URL = appConfig.GOOGLE_SCRIPT_URL;
            if (SCRIPT_URL) {
                fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: JSON.stringify({ ...data, orderCode: orderCode }),
                    headers: { 'Content-Type': 'application/json' }
                }).catch(console.error);
            }

        } catch (error) {
            alert('Có lỗi xảy ra, vui lòng thử lại sau.');
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
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    };

    const qaData = [
        { keys: ["may tinh", "cau hinh", "iphone", "android", "dien thoai", "lap", "pc", "can gi", "dung gi", "bang gi"], a: "Hoàn toàn không bạn nha! Tụi mình sẽ thực chiến 100% trên điện thoại luôn (cả iOS lẫn Android). Bạn cứ nằm trên giường cầm điện thoại vẫn ra được video xịn, không cần đụng đến máy tính nặng nề đâu." },
        { keys: ["mu cong nghe", "khong ranh", "chua biet", "nguoi moi", "moi bat dau", "kho khong", "lam duoc khong", "kem", "chua hieu"], a: "Chắc chắn là được nè! Nghĩa thiết kế lộ trình này siêu đơn giản luôn, giống như có người cầm tay chỉ việc vậy đó. Mọi thứ đều có quy trình rõ ràng từng bước. Đặc biệt là bạn sẽ được add vô nhóm kín, vướng chỗ nào chụp màn hình gửi lên là có người gỡ rối liền." },
        { keys: ["bao lau", "thoi gian", "ban ron", "moi ngay", "may tieng", "bao nhieu phut", "toi ban", "hay ban"], a: "Học đi đôi với hành bạn nhé, không lý thuyết suông đâu! Khóa học tinh gọn lắm, mỗi bài chưa tới 10 phút. Bạn cứ tận dụng lúc đi xe bus hay nghỉ trưa xem rồi lôi điện thoại ra làm theo luôn. Cứ túc tắc vài hôm tay nghề sẽ lên thấy rõ à." },
        { keys: ["khi nao", "thanh qua", "biet lam", "muot ma", "muc tieu", "tay nghe", "kq", "ket qua", "het bao lau"], a: "Thông thường chỉ sau 7 ngày thực hành nghiêm túc theo quy trình là bạn có thể tự tin bung xõa ý tưởng và tự ra đều đặn 2-3 video mượt mà mỗi ngày rồi nha." },
        { keys: ["xu huong", "viral", "view", "tiktok", "len dau", "de xuat", "trieu view", "thu thuat", "foryou", "xuhuong"], a: "Edit xịn, có hook (điểm neo 3s đầu) cuốn là bước đệm khổng lồ để thuật toán đẩy video lên. Trong khóa này Nghĩa có gửi luôn chiến thuật đăng bài và cách giữ chân người xem. Mình áp dụng đúng thì cơ hội viral sẽ tự nhiên đến mà không cần đốt tiền chạy ads đâu!" },
        { keys: ["update", "cap nhat", "trend", "moi", "suot doi", "mai mai", "thay doi", "sau nay"], a: "Đương nhiên rồi bạn! Bạn mua khóa này 1 lần là được sở hữu trọn đời. Nền tảng có tính năng xịn gì mới, tụi mình sẽ update liền và hoàn toàn miễn phí cho bạn luôn nè." },
        { keys: ["qua tang", "bonus", "sfx", "am thanh", "ebook", "kich ban", "duoc tang", "co gi them"], a: "Đăng ký khóa học bạn sẽ gói mang về trọn combo: Bộ 500+ Sound Effects chuẩn trend, Ebook 50 ý tưởng kịch bản cực cuốn, và Cấp quyền vào nhóm VIP hỗ trợ 1 kèm 1." },
        { keys: ["gia", "gia ca", "bao nhieu", "bao tien", "tien", "hoc phi", "chi phi", "uu dai", "giam gia", "khuyen mai", "tong cong", "mat tien khong", "phi", "thanh tien"], a: "Khóa học thực chiến này đang có ưu đãi 66%, chỉ còn 499.000 VNĐ. Tính ra nhịn một chầu ăn vặt cuối tuần là bạn đã sở hữu một quy trình làm nghề nghiêm túc có thể tận dụng lâu dài luôn rồi á." },
        { keys: ["quang cao", "chay ads", "bot", "hack", "buff"], a: "Tụi mình tập trung vào học tư duy dựng video và phân bố kịch bản tốt để kéo view tự nhiên. Xây content mộc tự nhiên đang là phong cách cực trend mà lại không tốn thêm đồng nào cho nền tảng nha!" },

        // --- 4 Nhóm Bổ Sung Từ Nội Dung Khóa Học ---
        { keys: ["giat giat", "chuyen canh", "ky xao", "keyframe", "effect", "mask", "tracking", "hieu ung", "ao dieu"], a: "Khóa học có hẳn một chương chuyên sâu về Kỹ xảo nhé! Bạn sẽ làm chủ được Keyframe, Auto Tracking, Mask và các hiệu ứng chuyển cảnh siêu mượt mà không thua kém gì edit trên máy tính đâu." },
        { keys: ["phu de", "caption", "chu chay", "khu on", "tap am", "long tieng", "thu am", "chinh mau", "mau sac", "mau video"], a: "Chắc chắn rồi! Trong khoá có bài hướng dẫn chi tiết cách tự hiển thị phụ đề (Auto-Caption) chuẩn Idol. Kèm theo kỹ thuật căn chỉnh màu sắc tự nhiên, lồng tiếng và khử tạp âm sạch sẽ để video của bạn trông như được sản xuất ở studio vậy." },
        { keys: ["vlog", "review", "podcast", "ban hang", "xay kenh", "the loai", "chu de", "nganh hang"], a: "Kỹ năng Edit CapCut này là nền tảng cốt lõi nên bạn áp dụng được cho mọi thể loại luôn nha! Dù bạn làm Vlog đời sống, Review sản phẩm, bán hàng hay Podcast thì vẫn áp dụng form quay dựng chuẩn này để giữ chân người xem." },
        { keys: ["ho tro", "1 kem 1", "ai day", "khong hieu", "hoi ai", "cam ket", "bao hanh", "lua dao", "day ghep"], a: "Nghĩa là người trực tiếp hướng dẫn và sẽ có hẳn đặc quyền Add vào nhóm VIP 1 kèm 1 nha. Chỗ nào thực hành không giống mẫu, bạn cứ cap màn hình gửi vào nhóm là mình hỗ trợ tháo gỡ đến khi làm được thì thôi. Rủi ro học không được việc là bằng 0!" },
        // ------------------------------------------

        { keys: ["dang nhap", "tai khoan", "thanh toan xong", "cach hoc", "hoc nhu the nao", "khi nao duoc hoc", "thanh toan", "chuyen khoan xong"], a: "Thanh toán xong là hệ thống tự động mở tài khoản cho bạn luôn. Có email và Zalo gửi thông tin đăng nhập vô tận tay bạn." },
        { keys: ["mua", "dang ky", "chot", "link", "muon hoc", "dk", "tham gia", "huong dan dk", "muon", "dang ki"], a: "Hiện tại bên mình chỉ còn lại vài suất giữ mức giá 499.000đ cùng toàn bộ gói quà khủng. Thấy phù hợp thì bấm nút đăng ký nha, Nghĩa đang đợi bạn ở trong nhóm hỗ trợ kín rồi nè!", action: "buy" },
        { keys: ["suy nghi", "tu tu", "chu", "de sau", "chua mua", "tu van", "de xem", "nghi lai", "xem lai", "ban khoan", "nghi them", "chua quyet"], a: "Mình rất hiểu để bắt đầu học thứ mới luôn cần xíu thời gian để xem xét kĩ lưỡng. Bạn cứ để lại xíu thông tin qua form bên dưới nha. Khi nào có nội dung thú vị hay có update bài mẫu thì Nghĩa mới nhẹ nhàng gõ cửa báo bạn nghen!", action: "lead" },

        // Đưa nhóm Chào hỏi (Greeting) xuống vị trí cuối cùng ưu tiên thấp để không chặn các câu hỏi chính (VD: "Chào bạn, khóa này giá bao nhiêu" -> sẽ chạy vào Giá chứ không kẹt ở Chào hỏi)
        { keys: ["hello", "hi", "chao", "xin chao", "alo", "he lo", "chao ban", "hey", "e bot"], a: "Chào bạn nha! Mình là trợ lý ảo của Nghĩa đây. Bạn cần hỗ trợ gì về lịch học, ưu đãi hay khóa học CapCut thực chiến thì cứ gõ thẳng vô đây nhé!" }
    ];

    const getBotResponse = (text) => {
        const cleanText = removeAccents(text);

        // Find best match
        for (let qa of qaData) {
            for (let key of qa.keys) {
                // Dùng Regex biên từ (word boundary) để tránh việc chữ "hi" (chào) 
                // lại match trùng với từ "chi pHI", "hoc pHI"...
                const regex = new RegExp("\\b" + key + "\\b", "i");
                if (regex.test(cleanText)) {
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
                    if (modal) {
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
