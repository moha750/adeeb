/**
 * نافذة منبثقة إلزامية لاختيار الجنس
 * تظهر للأعضاء القدامى الذين لم يحدّدوا جنسهم (قبل تطبيق شرط الجنس).
 * لا يمكن إغلاقها إلا بعد اختيار الجنس وحفظه في profiles.
 */

window.GenderModal = (function () {
    const sb = window.sbClient;

    function buildHtml() {
        return `
            <div class="modal-confirm-icon">
                <i class="fa-solid fa-venus-mars"></i>
            </div>
            <div class="modal-confirm-content">
                <h3 class="modal-confirm-title">يرجى تحديد الجنس</h3>
                <p class="modal-confirm-message">
                    حسابك من الحسابات التي أُنشئت قبل تطبيق شرط تحديد الجنس،
                    وللإستفادة من خدمات أدِيب يرجى اختيار الجنس للمتابعة.
                </p>
                <form id="genderModalForm" style="margin-top: 1rem;">
                    <div class="form-radio-group horizontal" style="display:flex;justify-content:center;gap:1.5rem;flex-wrap:wrap;">
                        <label class="form-radio">
                            <input type="radio" name="gender" value="male" required>
                            <span class="form-radio-label">ذكر</span>
                        </label>
                        <label class="form-radio">
                            <input type="radio" name="gender" value="female" required>
                            <span class="form-radio-label">أنثى</span>
                        </label>
                        <label class="form-radio" title="للضحك فقط 😄">
                            <input type="radio" name="gender" value="other" required disabled>
                            <span class="form-radio-label">خيار آخر</span>
                        </label>
                    </div>
                    <small class="form-hint" style="display:block;text-align:center;margin-top:0.6rem;color:var(--color-text-muted);">
                      صبعك!! بتختار خيار آخر ها! ما عندنا هاللعب، يا ذكور يا إناث🤨
                    </small>
                </form>
            </div>
        `;
    }

    async function saveGender(userId, value) {
        const { error } = await sb
            .from('profiles')
            .update({ gender: value })
            .eq('id', userId);
        if (error) throw error;
    }

    async function show(user) {
        if (!window.ModalHelper) {
            console.warn('[GenderModal] ModalHelper غير متاح');
            return;
        }

        return new Promise((resolve) => {
            const api = window.ModalHelper.show({
                size: 'sm',
                extraClass: 'modal-confirm modal-warning gender-modal',
                html: buildHtml(),
                showClose: false,
                footerButtons: [
                    {
                        text: '<i class="fa-solid fa-check"></i> حفظ ومتابعة',
                        class: 'btn btn-primary',
                        keepOpen: true,
                        callback: async () => {
                            const checked = document.querySelector('#genderModalForm input[name="gender"]:checked');
                            if (!checked) {
                                if (window.Toast) Toast.warning('يرجى اختيار الجنس للمتابعة');
                                return;
                            }

                            const btn = api.element.querySelector('[data-action="btn-0"]');
                            if (btn) {
                                btn.classList.add('btn-loading');
                                btn.disabled = true;
                            }

                            try {
                                await saveGender(user.id, checked.value);
                                if (user) user.gender = checked.value;
                                if (window.Toast) Toast.success('تم حفظ الجنس بنجاح');
                                api.close();
                                resolve(checked.value);
                            } catch (err) {
                                console.error('[GenderModal] فشل حفظ الجنس:', err);
                                if (window.Toast) Toast.error('تعذّر حفظ الجنس، يرجى المحاولة مرة أخرى');
                                if (btn) {
                                    btn.classList.remove('btn-loading');
                                    btn.disabled = false;
                                }
                            }
                        }
                    }
                ]
            });

            // تعطيل إغلاق النافذة عند الضغط على الخلفية
            const backdrop = document.getElementById(api.element.id + '-backdrop');
            if (backdrop) backdrop.onclick = null;

            // تعطيل ESC
            const trapEscape = (e) => {
                if (e.key === 'Escape' && document.getElementById(api.element.id)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                }
            };
            document.addEventListener('keydown', trapEscape, true);

            const observer = new MutationObserver(() => {
                if (!document.getElementById(api.element.id)) {
                    document.removeEventListener('keydown', trapEscape, true);
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true });
        });
    }

    async function checkAndShow(user) {
        if (!user?.id) return false;
        if (user.gender) return false;
        await show(user);
        return true;
    }

    return { checkAndShow, show };
})();
