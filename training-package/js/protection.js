// ==================== Configuration ====================
class DynamicPasswordGenerator {
    static generate() {
        const now = new Date();
        // Format: 6 + MMDDYYYY (month/day/year)
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const year = String(now.getFullYear());

        return `6${month}${day}${year}`;
    }

    static normalize(input) {
        return String(input || '').replace(/\D/g, '');
    }
}

const CONFIG = {
    CONTENT_PASSWORD: () => DynamicPasswordGenerator.generate(),
    COPY_PASSWORD: 'protect2024',
    PASSWORD_DELAY: 0,
    MAX_PASSWORD_ATTEMPTS: 5
};

function isCopyProtectionEnabled() {
    return document.body?.dataset?.enableCopyProtection === '1';
}

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
        if (!this.modal || !this.input || !this.btn) return;

        // If already verified in this session, don't prompt again
        try {
            if (sessionStorage.getItem('gk_access') === '1') {
                state.passwordVerified = true;
                this.hidePasswordModal();
                return;
            }
        } catch (_) {
            // ignore
        }

        // Show password modal after delay
        const delayAttr = document.body?.dataset?.passwordDelay;
        const delay = Number.isFinite(Number(delayAttr)) ? Number(delayAttr) : CONFIG.PASSWORD_DELAY;
        setTimeout(() => this.showPasswordModal(), Math.max(0, delay));

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
        const entered = DynamicPasswordGenerator.normalize(password);
        const expected = DynamicPasswordGenerator.normalize(CONFIG.CONTENT_PASSWORD());

        if (entered === expected) {
            state.passwordVerified = true;
            try {
                sessionStorage.setItem('gk_access', '1');
            } catch (_) {
                // ignore
            }
            this.hidePasswordModal();
            this.input.value = '';
            this.showNotification('✓ تم التحقق بنجاح!');

            const redirectTo = document.body?.dataset?.redirectTo;
            if (redirectTo) {
                setTimeout(() => {
                    location.href = redirectTo;
                }, 250);
            }
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
        if (!this.modal || !this.input || !this.btn) return;
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
        if (document.body?.dataset?.disableContentProtection === '1') return;
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

        // Disable right-click context menu when copy protection is enabled
        document.addEventListener('contextmenu', (e) => {
            if (isCopyProtectionEnabled() && !state.copyProtectionVerified) {
                e.preventDefault();
            }
        });

        // Do not block selection by default (keep learning UX usable)
        // If copy protection is enabled and verified, allow interaction explicitly.
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
    const copyProtection = isCopyProtectionEnabled() ? new CopyProtection() : null;
    
    // Protect content
    ContentProtection.protectPage();
    
    // Initialize animations
    AnimationManager.observeElements();
    AnimationManager.initScrollEffects();

    // If copy protection is enabled and later verified, allow full interaction
    if (isCopyProtectionEnabled()) {
        const observer = setInterval(() => {
            if (state.copyProtectionVerified) {
                ContentProtection.allowContentInteraction();
            }
        }, 150);

        window.addEventListener('unload', () => {
            clearInterval(observer);
        });
    }

});

// ==================== Service Worker Registration ====================
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
        // Service worker not available or failed to load
    });
}
