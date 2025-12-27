// ==================== Configuration ====================
class DynamicPasswordGenerator {
    static generate() {
        const now = new Date();
        // Format: 6 + DDMMYY + HH (date + hour)
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const hour = String(now.getHours()).padStart(2, '0');
        
        return `6${day}${month}${year}${hour}`;
    }
}

const CONFIG = {
    CONTENT_PASSWORD: () => DynamicPasswordGenerator.generate(),
    COPY_PASSWORD: 'protect2024',
    PASSWORD_DELAY: 10000, // 10 seconds
    MAX_PASSWORD_ATTEMPTS: 5
};

// ==================== State Management ====================
const state = {
    passwordVerified: false,
    copyProtectionVerified: false,
    passwordAttempts: 0,
    copyProtectionAttempts: 0
};

// ==================== Password Protection ====================
class PasswordManager {
    constructor() {
        this.modal = document.getElementById('passwordModal');
        this.input = document.getElementById('passwordInput');
        this.btn = document.getElementById('passwordBtn');
        this.errorMsg = document.getElementById('errorMessage');
        
        this.init();
    }

    init() {
        // Show password modal after delay
        setTimeout(() => {
            this.showPasswordModal();
        }, CONFIG.PASSWORD_DELAY);

        // Event listeners
        this.btn.addEventListener('click', () => this.verifyPassword());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.verifyPassword();
        });
    }

    showPasswordModal() {
        this.modal.classList.add('active');
        this.input.focus();
    }

    hidePasswordModal() {
        this.modal.classList.remove('active');
    }

    verifyPassword() {
        const password = this.input.value.trim();
        const correctPassword = CONFIG.CONTENT_PASSWORD(); // Call function to get dynamic password

        if (password === correctPassword) {
            state.passwordVerified = true;
            this.hidePasswordModal();
            this.input.value = '';
            this.showNotification('✓ تم التحقق بنجاح!');
        } else {
            state.passwordAttempts++;
            this.showError('كلمة المرور غير صحيحة!');
            
            if (state.passwordAttempts >= CONFIG.MAX_PASSWORD_ATTEMPTS) {
                this.showError('عدد محاولات كبير جداً. إعادة تحميل الصفحة...');
                setTimeout(() => location.reload(), 2000);
            }
            
            this.input.value = '';
            this.input.focus();
        }
    }

    showError(message) {
        this.errorMsg.textContent = message;
        this.errorMsg.style.display = 'block';
        this.input.classList.add('error-shake');
        
        setTimeout(() => {
            this.input.classList.remove('error-shake');
        }, 500);
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }
}

// ==================== Copy Protection ====================
class CopyProtection {
    constructor() {
        this.modal = document.getElementById('copyProtectionModal');
        this.input = document.getElementById('copyProtectionInput');
        this.btn = document.getElementById('copyProtectionBtn');
        
        this.init();
    }

    init() {
        // Disable copy initially
        document.addEventListener('copy', (e) => this.handleCopy(e));
        document.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        
        this.btn.addEventListener('click', () => this.verifyCopyPassword());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.verifyCopyPassword();
        });
    }

    handleCopy(e) {
        if (!state.copyProtectionVerified) {
            e.preventDefault();
            this.showCopyProtectionModal();
        }
    }

    handleContextMenu(e) {
        if (!state.copyProtectionVerified) {
            e.preventDefault();
            this.showCopyProtectionModal();
        }
    }

    showCopyProtectionModal() {
        this.modal.classList.add('active');
        this.input.focus();
    }

    hideCopyProtectionModal() {
        this.modal.classList.remove('active');
    }

    verifyCopyPassword() {
        const password = this.input.value.trim();

        if (password === CONFIG.COPY_PASSWORD) {
            state.copyProtectionVerified = true;
            this.hideCopyProtectionModal();
            this.input.value = '';
            this.showNotification('✓ تم تفعيل النسخ بنجاح!');
        } else {
            state.copyProtectionAttempts++;
            this.showError('كلمة المرور غير صحيحة!');
            
            if (state.copyProtectionAttempts >= CONFIG.MAX_PASSWORD_ATTEMPTS) {
                this.showError('عدد محاولات كبير. إعادة تحميل الصفحة...');
                setTimeout(() => location.reload(), 2000);
            }
            
            this.input.value = '';
            this.input.focus();
        }
    }

    showError(message) {
        const errorEl = this.modal.querySelector('.error-message');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }
}

// ==================== Content Protection ====================
class ContentProtection {
    static protectPage() {
        // Disable developer tools shortcuts
        document.addEventListener('keydown', (e) => {
            // F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.shiftKey && e.key === 'C') ||
                (e.ctrlKey && e.shiftKey && e.key === 'J')
            ) {
                e.preventDefault();
            }
        });

        // Disable right-click context menu unless verified
        document.addEventListener('contextmenu', (e) => {
            if (!state.copyProtectionVerified) {
                e.preventDefault();
            }
        });

        // Prevent selection drag unless verified
        document.addEventListener('selectstart', (e) => {
            if (!state.copyProtectionVerified) {
                // Allow selection but protect copying
            }
        });

        // Prevent text selection via CSS (will be overridden when verified)
        if (!state.copyProtectionVerified) {
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
        }
    }

    static allowContentInteraction() {
        document.body.style.userSelect = 'auto';
        document.body.style.webkitUserSelect = 'auto';
    }
}

// ==================== Animations ====================
class AnimationManager {
    static observeElements() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeInUp 0.8s ease-out forwards';
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('section, .card').forEach((el) => {
            observer.observe(el);
        });
    }

    static initScrollEffects() {
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            const parallax = document.querySelector('header::before');
            if (parallax) {
                parallax.style.transform = `translateX(${scrolled * 0.5}px)`;
            }
        });
    }
}

// ==================== Utility Functions ====================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideDown 0.5s ease-out;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function copyToClipboard(text) {
    if (state.copyProtectionVerified) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('✓ تم النسخ بنجاح!', 'success');
        });
    } else {
        showNotification('⚠ يجب إدخال كلمة مرور النسخ أولاً', 'info');
    }
}

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize managers
    const passwordManager = new PasswordManager();
    const copyProtection = new CopyProtection();
    
    // Protect content
    ContentProtection.protectPage();
    
    // Initialize animations
    AnimationManager.observeElements();
    AnimationManager.initScrollEffects();

    // Check if password verified and update UI accordingly
    const observer = setInterval(() => {
        if (state.copyProtectionVerified) {
            ContentProtection.allowContentInteraction();
        }
    }, 100);

    // Cleanup
    window.addEventListener('unload', () => {
        clearInterval(observer);
    });

    // Log initialization
    console.log('%c🎓 GenAI Training Kit', 'font-size: 20px; color: #667eea; font-weight: bold;');
    console.log('حقيبة تدريبية حديثة في الذكاء الاصطناعي');
});

// ==================== Service Worker Registration ====================
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
        // Service worker not available or failed to load
    });
}
