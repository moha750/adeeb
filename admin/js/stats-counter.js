class StatsCounter {
    constructor(options = {}) {
        this.duration = options.duration || 2000;
        this.easing = options.easing || 'easeOutExpo';
        this.separator = options.separator || ',';
        this.decimal = options.decimal || '.';
        this.prefix = options.prefix || '';
        this.suffix = options.suffix || '';
        this.observerOptions = {
            threshold: 0.3,
            rootMargin: '0px'
        };
        
        this.init();
    }

    init() {
        this.setupObserver();
        this.observeCards();
    }

    setupObserver() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                    this.animateCard(entry.target);
                    entry.target.classList.add('counted');
                }
            });
        }, this.observerOptions);
    }

    observeCards() {
        const cards = document.querySelectorAll('.stat-card');
        cards.forEach(card => {
            this.observer.observe(card);
        });
    }

    animateCard(card) {
        const valueElement = card.querySelector('.stat-card__value');
        if (!valueElement) return;

        const targetValue = this.parseValue(valueElement.textContent);
        if (isNaN(targetValue)) return;

        valueElement.setAttribute('data-count', 'true');
        
        this.animateValue(valueElement, 0, targetValue, this.duration);
        
        const icon = card.querySelector('.stat-card__icon');
        if (icon) {
            icon.style.animation = 'iconPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        }

        card.style.animation = 'cardSlideIn 0.6s ease-out';
    }

    parseValue(text) {
        const cleanText = text.replace(/[^0-9.-]/g, '');
        return parseFloat(cleanText);
    }

    animateValue(element, start, end, duration) {
        const startTime = performance.now();
        const isDecimal = end % 1 !== 0;
        const decimalPlaces = isDecimal ? (end.toString().split('.')[1] || '').length : 0;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easedProgress = this.easingFunctions[this.easing](progress);
            const current = start + (end - start) * easedProgress;
            
            const formattedValue = this.formatNumber(current, decimalPlaces);
            element.textContent = this.prefix + formattedValue + this.suffix;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = this.prefix + this.formatNumber(end, decimalPlaces) + this.suffix;
                element.removeAttribute('data-count');
            }
        };

        requestAnimationFrame(animate);
    }

    formatNumber(num, decimalPlaces = 0) {
        const fixed = num.toFixed(decimalPlaces);
        const parts = fixed.split('.');
        
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, this.separator);
        
        return parts.join(this.decimal);
    }

    easingFunctions = {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        easeInQuart: t => t * t * t * t,
        easeOutQuart: t => 1 - (--t) * t * t * t,
        easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
        easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
        easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
        easeInOutExpo: t => {
            if (t === 0 || t === 1) return t;
            if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
            return (2 - Math.pow(2, -20 * t + 10)) / 2;
        },
        easeInCirc: t => 1 - Math.sqrt(1 - t * t),
        easeOutCirc: t => Math.sqrt(1 - (--t) * t),
        easeInOutCirc: t => {
            t *= 2;
            if (t < 1) return -(Math.sqrt(1 - t * t) - 1) / 2;
            t -= 2;
            return (Math.sqrt(1 - t * t) + 1) / 2;
        },
        easeInBack: t => {
            const c1 = 1.70158;
            return t * t * ((c1 + 1) * t - c1);
        },
        easeOutBack: t => {
            const c1 = 1.70158;
            return 1 + (--t) * t * ((c1 + 1) * t + c1);
        },
        easeInOutBack: t => {
            const c1 = 1.70158;
            const c2 = c1 * 1.525;
            t *= 2;
            if (t < 1) return (t * t * ((c2 + 1) * t - c2)) / 2;
            t -= 2;
            return (t * t * ((c2 + 1) * t + c2) + 2) / 2;
        }
    };

    updateCard(cardElement, newValue) {
        const valueElement = cardElement.querySelector('.stat-card__value');
        if (!valueElement) return;

        const currentValue = this.parseValue(valueElement.textContent);
        const targetValue = parseFloat(newValue);

        if (isNaN(targetValue)) return;

        valueElement.setAttribute('data-count', 'true');
        this.animateValue(valueElement, currentValue, targetValue, this.duration / 2);
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    refresh() {
        this.destroy();
        this.init();
    }
}

if (typeof window !== 'undefined') {
    window.StatsCounter = StatsCounter;
}

document.addEventListener('DOMContentLoaded', () => {
    window.statsCounter = new StatsCounter({
        duration: 2000,
        easing: 'easeOutExpo',
        separator: ',',
        decimal: '.',
        prefix: '',
        suffix: ''
    });
});
