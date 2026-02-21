/**
 * مساعد العداد التنازلي للانتخابات
 */

function initCountdownTimers() {
    const timers = document.querySelectorAll('.nomination-countdown-timer, .voting-countdown-timer');
    
    timers.forEach(timer => {
        const endDate = new Date(timer.dataset.endDate);
        
        function updateTimer() {
            const now = new Date();
            const diff = endDate - now;
            
            if (diff <= 0) {
                timer.innerHTML = '<div style="text-align: center; color: #fff; padding: 1rem;">انتهى الوقت</div>';
                return;
            }
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            const daysEl = timer.querySelector('.days');
            const hoursEl = timer.querySelector('.hours');
            const minutesEl = timer.querySelector('.minutes');
            const secondsEl = timer.querySelector('.seconds');
            
            if (daysEl) daysEl.textContent = days;
            if (hoursEl) hoursEl.textContent = hours;
            if (minutesEl) minutesEl.textContent = minutes;
            if (secondsEl) secondsEl.textContent = seconds;
        }
        
        updateTimer();
        setInterval(updateTimer, 1000);
    });
}

// تصدير الدالة للاستخدام العام
if (typeof window !== 'undefined') {
    window.initCountdownTimers = initCountdownTimers;
}
