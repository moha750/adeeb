-- =====================================================
-- قوالب الاستبيانات الجاهزة - نادي أدِيب
-- Survey Templates - Adeeb Club
-- =====================================================
-- تاريخ الإنشاء: 2026-01-26
-- الوصف: قوالب استبيانات جاهزة مع أسئلة متنوعة وكثيرة
-- =====================================================

-- =====================================================
-- 1. قالب استبيان رضا الأعضاء
-- =====================================================
INSERT INTO public.survey_templates (
    template_name,
    description,
    category,
    is_public,
    is_system,
    template_data,
    tags
) VALUES (
    'استبيان رضا الأعضاء',
    'قالب شامل لقياس مستوى رضا أعضاء النادي عن الخدمات والفعاليات',
    'membership',
    true,
    true,
    '{
        "title": "استبيان رضا الأعضاء - نادي أدِيب",
        "description": "نسعى لتحسين تجربتك في نادي أدِيب، شاركنا رأيك!",
        "survey_type": "feedback",
        "access_type": "members_only",
        "welcome_message": "عزيزي العضو، نقدر وقتك ومشاركتك في هذا الاستبيان. آراؤك تساعدنا على التطوير المستمر.",
        "completion_message": "شكراً لك! آراؤك ذات قيمة كبيرة بالنسبة لنا.",
        "show_progress_bar": true,
        "show_question_numbers": true,
        "estimated_duration_minutes": 10,
        "sections": [
            {
                "title": "المعلومات الأساسية",
                "description": "معلومات عامة عن عضويتك",
                "display_order": 1,
                "questions": [
                    {
                        "question_text": "كم مدة عضويتك في نادي أدِيب؟",
                        "question_type": "single_choice",
                        "is_required": true,
                        "display_order": 1,
                        "options": [
                            {"value": "less_than_6_months", "label": "أقل من 6 أشهر"},
                            {"value": "6_months_to_1_year", "label": "من 6 أشهر إلى سنة"},
                            {"value": "1_to_2_years", "label": "من سنة إلى سنتين"},
                            {"value": "more_than_2_years", "label": "أكثر من سنتين"}
                        ]
                    },
                    {
                        "question_text": "ما هي اللجنة التي تنتمي إليها؟",
                        "question_type": "single_choice",
                        "is_required": true,
                        "display_order": 2,
                        "options": [
                            {"value": "media", "label": "الإعلام"},
                            {"value": "events", "label": "الفعاليات"},
                            {"value": "training", "label": "التدريب"},
                            {"value": "relations", "label": "العلاقات العامة"},
                            {"value": "content", "label": "المحتوى"},
                            {"value": "other", "label": "أخرى"}
                        ]
                    }
                ]
            },
            {
                "title": "الرضا العام",
                "description": "تقييمك العام لتجربتك في النادي",
                "display_order": 2,
                "questions": [
                    {
                        "question_text": "ما مدى رضاك عن تجربتك الإجمالية في نادي أدِيب؟",
                        "question_type": "rating_scale",
                        "is_required": true,
                        "display_order": 1,
                        "settings": {
                            "min": 1,
                            "max": 5,
                            "min_label": "غير راضٍ إطلاقاً",
                            "max_label": "راضٍ جداً"
                        }
                    },
                    {
                        "question_text": "ما مدى احتمالية أن توصي بالانضمام لنادي أدِيب لصديق أو زميل؟",
                        "question_type": "nps",
                        "is_required": true,
                        "display_order": 2,
                        "settings": {
                            "min": 0,
                            "max": 10,
                            "min_label": "غير محتمل إطلاقاً",
                            "max_label": "محتمل جداً"
                        }
                    },
                    {
                        "question_text": "هل تشعر بالانتماء لنادي أدِيب؟",
                        "question_type": "agreement_scale",
                        "is_required": true,
                        "display_order": 3,
                        "options": [
                            {"value": "strongly_disagree", "label": "لا أوافق بشدة"},
                            {"value": "disagree", "label": "لا أوافق"},
                            {"value": "neutral", "label": "محايد"},
                            {"value": "agree", "label": "أوافق"},
                            {"value": "strongly_agree", "label": "أوافق بشدة"}
                        ]
                    }
                ]
            },
            {
                "title": "الفعاليات والأنشطة",
                "description": "تقييم الفعاليات والأنشطة",
                "display_order": 3,
                "questions": [
                    {
                        "question_text": "كم عدد الفعاليات التي حضرتها في الأشهر الثلاثة الماضية؟",
                        "question_type": "single_choice",
                        "is_required": true,
                        "display_order": 1,
                        "options": [
                            {"value": "none", "label": "لم أحضر أي فعالية"},
                            {"value": "1_to_2", "label": "من 1 إلى 2 فعالية"},
                            {"value": "3_to_5", "label": "من 3 إلى 5 فعاليات"},
                            {"value": "more_than_5", "label": "أكثر من 5 فعاليات"}
                        ]
                    },
                    {
                        "question_text": "قيّم جودة الفعاليات التي حضرتها",
                        "question_type": "rating_scale",
                        "is_required": false,
                        "display_order": 2,
                        "settings": {
                            "min": 1,
                            "max": 5,
                            "min_label": "ضعيفة جداً",
                            "max_label": "ممتازة"
                        }
                    },
                    {
                        "question_text": "ما نوع الفعاليات التي تفضلها؟ (يمكنك اختيار أكثر من إجابة)",
                        "question_type": "multiple_choice",
                        "is_required": true,
                        "display_order": 3,
                        "options": [
                            {"value": "workshops", "label": "ورش العمل"},
                            {"value": "lectures", "label": "المحاضرات"},
                            {"value": "competitions", "label": "المسابقات"},
                            {"value": "social_events", "label": "الفعاليات الاجتماعية"},
                            {"value": "training", "label": "الدورات التدريبية"},
                            {"value": "cultural", "label": "الفعاليات الثقافية"},
                            {"value": "sports", "label": "الفعاليات الرياضية"}
                        ]
                    },
                    {
                        "question_text": "ما الأوقات المفضلة لديك لحضور الفعاليات؟",
                        "question_type": "multiple_choice",
                        "is_required": true,
                        "display_order": 4,
                        "options": [
                            {"value": "weekday_morning", "label": "أيام الأسبوع - صباحاً"},
                            {"value": "weekday_afternoon", "label": "أيام الأسبوع - مساءً"},
                            {"value": "weekday_evening", "label": "أيام الأسبوع - ليلاً"},
                            {"value": "weekend_morning", "label": "نهاية الأسبوع - صباحاً"},
                            {"value": "weekend_afternoon", "label": "نهاية الأسبوع - مساءً"},
                            {"value": "weekend_evening", "label": "نهاية الأسبوع - ليلاً"}
                        ]
                    }
                ]
            },
            {
                "title": "التواصل والإدارة",
                "description": "تقييم التواصل مع الإدارة والأعضاء",
                "display_order": 4,
                "questions": [
                    {
                        "question_text": "ما مدى رضاك عن التواصل من قبل إدارة النادي؟",
                        "question_type": "rating_scale",
                        "is_required": true,
                        "display_order": 1,
                        "settings": {
                            "min": 1,
                            "max": 5,
                            "min_label": "غير راضٍ إطلاقاً",
                            "max_label": "راضٍ جداً"
                        }
                    },
                    {
                        "question_text": "هل تشعر أن صوتك مسموع في النادي؟",
                        "question_type": "yes_no",
                        "is_required": true,
                        "display_order": 2
                    },
                    {
                        "question_text": "ما هي القنوات التي تفضل استخدامها للتواصل مع النادي؟",
                        "question_type": "multiple_choice",
                        "is_required": true,
                        "display_order": 3,
                        "options": [
                            {"value": "whatsapp", "label": "واتساب"},
                            {"value": "email", "label": "البريد الإلكتروني"},
                            {"value": "twitter", "label": "تويتر (X)"},
                            {"value": "instagram", "label": "إنستغرام"},
                            {"value": "website", "label": "الموقع الإلكتروني"},
                            {"value": "in_person", "label": "شخصياً"}
                        ]
                    }
                ]
            },
            {
                "title": "التطوير والتحسين",
                "description": "اقتراحاتك لتطوير النادي",
                "display_order": 5,
                "questions": [
                    {
                        "question_text": "ما هي أكثر ثلاثة جوانب تحتاج للتحسين في النادي؟",
                        "question_type": "ranking",
                        "is_required": true,
                        "display_order": 1,
                        "options": [
                            {"value": "events_quality", "label": "جودة الفعاليات"},
                            {"value": "communication", "label": "التواصل"},
                            {"value": "organization", "label": "التنظيم"},
                            {"value": "facilities", "label": "المرافق"},
                            {"value": "training", "label": "التدريب والتطوير"},
                            {"value": "networking", "label": "فرص التواصل"},
                            {"value": "recognition", "label": "التقدير والتحفيز"}
                        ],
                        "settings": {
                            "max_selections": 3
                        }
                    },
                    {
                        "question_text": "ما هي المهارات أو المجالات التي تود أن يوفر النادي تدريباً فيها؟",
                        "question_type": "long_text",
                        "is_required": false,
                        "display_order": 2,
                        "placeholder_text": "مثال: الكتابة الإبداعية، التصوير الفوتوغرافي، إدارة المشاريع..."
                    },
                    {
                        "question_text": "هل لديك أي اقتراحات أو ملاحظات إضافية؟",
                        "question_type": "long_text",
                        "is_required": false,
                        "display_order": 3,
                        "placeholder_text": "شاركنا أفكارك واقتراحاتك..."
                    }
                ]
            }
        ]
    }',
    ARRAY['رضا', 'أعضاء', 'تقييم', 'تطوير']
);

-- =====================================================
-- 2. قالب استبيان تقييم فعالية
-- =====================================================
INSERT INTO public.survey_templates (
    template_name,
    description,
    category,
    is_public,
    is_system,
    template_data,
    tags
) VALUES (
    'استبيان تقييم فعالية',
    'قالب لتقييم الفعاليات والأنشطة بعد انتهائها',
    'event',
    true,
    true,
    '{
        "title": "استبيان تقييم الفعالية",
        "description": "ساعدنا في تحسين فعالياتنا القادمة من خلال مشاركة رأيك",
        "survey_type": "event",
        "access_type": "public",
        "welcome_message": "شكراً لحضورك! نود معرفة رأيك في الفعالية.",
        "completion_message": "شكراً لوقتك! ملاحظاتك ستساعدنا في تقديم فعاليات أفضل.",
        "show_progress_bar": true,
        "estimated_duration_minutes": 5,
        "sections": [
            {
                "title": "معلومات الحضور",
                "display_order": 1,
                "questions": [
                    {
                        "question_text": "هل حضرت الفعالية؟",
                        "question_type": "yes_no",
                        "is_required": true,
                        "display_order": 1
                    },
                    {
                        "question_text": "كيف علمت بالفعالية؟",
                        "question_type": "single_choice",
                        "is_required": true,
                        "display_order": 2,
                        "options": [
                            {"value": "social_media", "label": "وسائل التواصل الاجتماعي"},
                            {"value": "email", "label": "البريد الإلكتروني"},
                            {"value": "friend", "label": "من صديق"},
                            {"value": "website", "label": "الموقع الإلكتروني"},
                            {"value": "poster", "label": "ملصق إعلاني"},
                            {"value": "other", "label": "أخرى"}
                        ]
                    }
                ]
            },
            {
                "title": "تقييم المحتوى",
                "display_order": 2,
                "questions": [
                    {
                        "question_text": "ما مدى رضاك عن محتوى الفعالية؟",
                        "question_type": "rating_scale",
                        "is_required": true,
                        "display_order": 1,
                        "settings": {
                            "min": 1,
                            "max": 5,
                            "min_label": "غير راضٍ",
                            "max_label": "راضٍ جداً"
                        }
                    },
                    {
                        "question_text": "هل كان المحتوى مفيداً وذا قيمة؟",
                        "question_type": "agreement_scale",
                        "is_required": true,
                        "display_order": 2,
                        "options": [
                            {"value": "strongly_disagree", "label": "لا أوافق بشدة"},
                            {"value": "disagree", "label": "لا أوافق"},
                            {"value": "neutral", "label": "محايد"},
                            {"value": "agree", "label": "أوافق"},
                            {"value": "strongly_agree", "label": "أوافق بشدة"}
                        ]
                    },
                    {
                        "question_text": "قيّم أداء المتحدثين/المقدمين",
                        "question_type": "rating_scale",
                        "is_required": true,
                        "display_order": 3,
                        "settings": {
                            "min": 1,
                            "max": 5,
                            "min_label": "ضعيف",
                            "max_label": "ممتاز"
                        }
                    }
                ]
            },
            {
                "title": "التنظيم والإدارة",
                "display_order": 3,
                "questions": [
                    {
                        "question_text": "ما مدى رضاك عن تنظيم الفعالية؟",
                        "question_type": "rating_scale",
                        "is_required": true,
                        "display_order": 1,
                        "settings": {
                            "min": 1,
                            "max": 5,
                            "min_label": "سيء",
                            "max_label": "ممتاز"
                        }
                    },
                    {
                        "question_text": "هل كانت مدة الفعالية مناسبة؟",
                        "question_type": "single_choice",
                        "is_required": true,
                        "display_order": 2,
                        "options": [
                            {"value": "too_short", "label": "قصيرة جداً"},
                            {"value": "appropriate", "label": "مناسبة"},
                            {"value": "too_long", "label": "طويلة جداً"}
                        ]
                    },
                    {
                        "question_text": "قيّم المكان والمرافق",
                        "question_type": "rating_scale",
                        "is_required": true,
                        "display_order": 3,
                        "settings": {
                            "min": 1,
                            "max": 5,
                            "min_label": "غير مناسب",
                            "max_label": "ممتاز"
                        }
                    }
                ]
            },
            {
                "title": "التوصيات والاقتراحات",
                "display_order": 4,
                "questions": [
                    {
                        "question_text": "هل ستوصي بحضور فعالياتنا القادمة؟",
                        "question_type": "nps",
                        "is_required": true,
                        "display_order": 1,
                        "settings": {
                            "min": 0,
                            "max": 10
                        }
                    },
                    {
                        "question_text": "ما الذي أعجبك أكثر في الفعالية؟",
                        "question_type": "long_text",
                        "is_required": false,
                        "display_order": 2
                    },
                    {
                        "question_text": "ما الذي يمكن تحسينه؟",
                        "question_type": "long_text",
                        "is_required": false,
                        "display_order": 3
                    }
                ]
            }
        ]
    }',
    ARRAY['فعالية', 'تقييم', 'حدث']
);

-- =====================================================
-- 3. قالب استبيان بحثي شامل
-- =====================================================
INSERT INTO public.survey_templates (
    template_name,
    description,
    category,
    is_public,
    is_system,
    template_data,
    tags
) VALUES (
    'استبيان بحثي شامل',
    'قالب لإجراء بحوث ودراسات شاملة',
    'research',
    true,
    true,
    '{
        "title": "استبيان بحثي",
        "description": "استبيان بحثي لجمع البيانات والمعلومات",
        "survey_type": "research",
        "access_type": "public",
        "welcome_message": "نشكرك على مشاركتك في هذا البحث. جميع البيانات سرية وستستخدم لأغراض البحث فقط.",
        "show_progress_bar": true,
        "is_anonymous": true,
        "estimated_duration_minutes": 15,
        "sections": [
            {
                "title": "المعلومات الديموغرافية",
                "display_order": 1,
                "questions": [
                    {
                        "question_text": "الفئة العمرية",
                        "question_type": "single_choice",
                        "is_required": true,
                        "display_order": 1,
                        "options": [
                            {"value": "18_24", "label": "18-24"},
                            {"value": "25_34", "label": "25-34"},
                            {"value": "35_44", "label": "35-44"},
                            {"value": "45_54", "label": "45-54"},
                            {"value": "55_plus", "label": "55+"}
                        ]
                    },
                    {
                        "question_text": "الجنس",
                        "question_type": "single_choice",
                        "is_required": true,
                        "display_order": 2,
                        "options": [
                            {"value": "male", "label": "ذكر"},
                            {"value": "female", "label": "أنثى"},
                            {"value": "prefer_not_to_say", "label": "أفضل عدم الإجابة"}
                        ]
                    },
                    {
                        "question_text": "المستوى التعليمي",
                        "question_type": "single_choice",
                        "is_required": true,
                        "display_order": 3,
                        "options": [
                            {"value": "high_school", "label": "ثانوية عامة"},
                            {"value": "diploma", "label": "دبلوم"},
                            {"value": "bachelor", "label": "بكالوريوس"},
                            {"value": "master", "label": "ماجستير"},
                            {"value": "phd", "label": "دكتوراه"}
                        ]
                    },
                    {
                        "question_text": "الحالة الوظيفية",
                        "question_type": "single_choice",
                        "is_required": true,
                        "display_order": 4,
                        "options": [
                            {"value": "student", "label": "طالب"},
                            {"value": "employed", "label": "موظف"},
                            {"value": "self_employed", "label": "عمل حر"},
                            {"value": "unemployed", "label": "باحث عن عمل"},
                            {"value": "retired", "label": "متقاعد"}
                        ]
                    }
                ]
            },
            {
                "title": "الاهتمامات والسلوكيات",
                "display_order": 2,
                "questions": [
                    {
                        "question_text": "ما هي اهتماماتك الرئيسية؟ (اختر جميع ما ينطبق)",
                        "question_type": "multiple_choice",
                        "is_required": true,
                        "display_order": 1,
                        "options": [
                            {"value": "literature", "label": "الأدب"},
                            {"value": "arts", "label": "الفنون"},
                            {"value": "technology", "label": "التقنية"},
                            {"value": "sports", "label": "الرياضة"},
                            {"value": "music", "label": "الموسيقى"},
                            {"value": "cinema", "label": "السينما"},
                            {"value": "travel", "label": "السفر"},
                            {"value": "cooking", "label": "الطبخ"},
                            {"value": "reading", "label": "القراءة"},
                            {"value": "volunteering", "label": "العمل التطوعي"}
                        ]
                    },
                    {
                        "question_text": "كم ساعة تقضيها يومياً على وسائل التواصل الاجتماعي؟",
                        "question_type": "single_choice",
                        "is_required": true,
                        "display_order": 2,
                        "options": [
                            {"value": "less_1", "label": "أقل من ساعة"},
                            {"value": "1_2", "label": "1-2 ساعة"},
                            {"value": "3_4", "label": "3-4 ساعات"},
                            {"value": "5_plus", "label": "5 ساعات أو أكثر"}
                        ]
                    },
                    {
                        "question_text": "كم كتاباً تقرأ في السنة تقريباً؟",
                        "question_type": "number",
                        "is_required": true,
                        "display_order": 3,
                        "settings": {
                            "min": 0,
                            "max": 365
                        }
                    }
                ]
            },
            {
                "title": "الآراء والمواقف",
                "display_order": 3,
                "questions": [
                    {
                        "question_text": "قيّم مدى موافقتك على العبارات التالية",
                        "question_type": "matrix",
                        "is_required": true,
                        "display_order": 1,
                        "settings": {
                            "rows": [
                                {"value": "culture_important", "label": "الثقافة مهمة في حياتي"},
                                {"value": "continuous_learning", "label": "أؤمن بالتعلم المستمر"},
                                {"value": "community_engagement", "label": "أحب المشاركة في الأنشطة المجتمعية"},
                                {"value": "digital_transformation", "label": "التحول الرقمي ضروري"},
                                {"value": "environmental_awareness", "label": "الوعي البيئي مهم"}
                            ],
                            "columns": [
                                {"value": "1", "label": "لا أوافق بشدة"},
                                {"value": "2", "label": "لا أوافق"},
                                {"value": "3", "label": "محايد"},
                                {"value": "4", "label": "أوافق"},
                                {"value": "5", "label": "أوافق بشدة"}
                            ]
                        }
                    }
                ]
            },
            {
                "title": "التفضيلات والتوقعات",
                "display_order": 4,
                "questions": [
                    {
                        "question_text": "رتب التالي حسب أهميته بالنسبة لك (1 الأكثر أهمية)",
                        "question_type": "ranking",
                        "is_required": true,
                        "display_order": 1,
                        "options": [
                            {"value": "career", "label": "التطور المهني"},
                            {"value": "family", "label": "العائلة"},
                            {"value": "health", "label": "الصحة"},
                            {"value": "wealth", "label": "الثروة"},
                            {"value": "knowledge", "label": "المعرفة"},
                            {"value": "relationships", "label": "العلاقات الاجتماعية"}
                        ]
                    },
                    {
                        "question_text": "ما هي توقعاتك للمستقبل؟",
                        "question_type": "long_text",
                        "is_required": false,
                        "display_order": 2,
                        "placeholder_text": "شاركنا رؤيتك..."
                    }
                ]
            }
        ]
    }',
    ARRAY['بحث', 'دراسة', 'تحليل']
);

-- =====================================================
-- 4. قالب استطلاع رأي سريع
-- =====================================================
INSERT INTO public.survey_templates (
    template_name,
    description,
    category,
    is_public,
    is_system,
    template_data,
    tags
) VALUES (
    'استطلاع رأي سريع',
    'قالب لاستطلاعات الرأي السريعة والمباشرة',
    'poll',
    true,
    true,
    '{
        "title": "استطلاع رأي",
        "description": "شاركنا رأيك في دقيقة واحدة",
        "survey_type": "poll",
        "access_type": "public",
        "show_progress_bar": false,
        "estimated_duration_minutes": 1,
        "sections": [
            {
                "title": "السؤال الرئيسي",
                "display_order": 1,
                "questions": [
                    {
                        "question_text": "ما رأيك في الموضوع؟",
                        "question_type": "single_choice",
                        "is_required": true,
                        "display_order": 1,
                        "options": [
                            {"value": "option1", "label": "الخيار الأول"},
                            {"value": "option2", "label": "الخيار الثاني"},
                            {"value": "option3", "label": "الخيار الثالث"},
                            {"value": "other", "label": "أخرى"}
                        ]
                    },
                    {
                        "question_text": "هل لديك تعليق إضافي؟",
                        "question_type": "short_text",
                        "is_required": false,
                        "display_order": 2,
                        "placeholder_text": "اكتب تعليقك هنا (اختياري)"
                    }
                ]
            }
        ]
    }',
    ARRAY['استطلاع', 'رأي', 'سريع']
);

-- =====================================================
-- 5. قالب تقييم تدريبي
-- =====================================================
INSERT INTO public.survey_templates (
    template_name,
    description,
    category,
    is_public,
    is_system,
    template_data,
    tags
) VALUES (
    'تقييم دورة تدريبية',
    'قالب شامل لتقييم الدورات التدريبية وورش العمل',
    'feedback',
    true,
    true,
    '{
        "title": "تقييم الدورة التدريبية",
        "description": "ساعدنا في تحسين دوراتنا التدريبية",
        "survey_type": "feedback",
        "access_type": "members_only",
        "show_progress_bar": true,
        "estimated_duration_minutes": 8,
        "sections": [
            {
                "title": "معلومات عامة",
                "display_order": 1,
                "questions": [
                    {
                        "question_text": "اسم الدورة التدريبية",
                        "question_type": "short_text",
                        "is_required": true,
                        "display_order": 1
                    },
                    {
                        "question_text": "تاريخ الدورة",
                        "question_type": "date",
                        "is_required": true,
                        "display_order": 2
                    }
                ]
            },
            {
                "title": "تقييم المحتوى التدريبي",
                "display_order": 2,
                "questions": [
                    {
                        "question_text": "كان المحتوى التدريبي واضحاً ومفهوماً",
                        "question_type": "agreement_scale",
                        "is_required": true,
                        "display_order": 1,
                        "options": [
                            {"value": "1", "label": "لا أوافق بشدة"},
                            {"value": "2", "label": "لا أوافق"},
                            {"value": "3", "label": "محايد"},
                            {"value": "4", "label": "أوافق"},
                            {"value": "5", "label": "أوافق بشدة"}
                        ]
                    },
                    {
                        "question_text": "المحتوى كان ذا صلة باحتياجاتي",
                        "question_type": "agreement_scale",
                        "is_required": true,
                        "display_order": 2,
                        "options": [
                            {"value": "1", "label": "لا أوافق بشدة"},
                            {"value": "2", "label": "لا أوافق"},
                            {"value": "3", "label": "محايد"},
                            {"value": "4", "label": "أوافق"},
                            {"value": "5", "label": "أوافق بشدة"}
                        ]
                    },
                    {
                        "question_text": "مستوى الدورة كان مناسباً",
                        "question_type": "single_choice",
                        "is_required": true,
                        "display_order": 3,
                        "options": [
                            {"value": "too_basic", "label": "أساسي جداً"},
                            {"value": "appropriate", "label": "مناسب"},
                            {"value": "too_advanced", "label": "متقدم جداً"}
                        ]
                    }
                ]
            },
            {
                "title": "تقييم المدرب",
                "display_order": 3,
                "questions": [
                    {
                        "question_text": "قيّم أداء المدرب في الجوانب التالية",
                        "question_type": "matrix",
                        "is_required": true,
                        "display_order": 1,
                        "settings": {
                            "rows": [
                                {"value": "knowledge", "label": "المعرفة بالموضوع"},
                                {"value": "communication", "label": "مهارات التواصل"},
                                {"value": "engagement", "label": "التفاعل مع المتدربين"},
                                {"value": "time_management", "label": "إدارة الوقت"},
                                {"value": "answering_questions", "label": "الإجابة على الأسئلة"}
                            ],
                            "columns": [
                                {"value": "1", "label": "ضعيف"},
                                {"value": "2", "label": "مقبول"},
                                {"value": "3", "label": "جيد"},
                                {"value": "4", "label": "جيد جداً"},
                                {"value": "5", "label": "ممتاز"}
                            ]
                        }
                    }
                ]
            },
            {
                "title": "التطبيق العملي",
                "display_order": 4,
                "questions": [
                    {
                        "question_text": "هل ستتمكن من تطبيق ما تعلمته؟",
                        "question_type": "yes_no",
                        "is_required": true,
                        "display_order": 1
                    },
                    {
                        "question_text": "ما مدى استفادتك من الدورة؟",
                        "question_type": "rating_scale",
                        "is_required": true,
                        "display_order": 2,
                        "settings": {
                            "min": 1,
                            "max": 10,
                            "min_label": "لم أستفد",
                            "max_label": "استفدت كثيراً"
                        }
                    },
                    {
                        "question_text": "هل توصي بهذه الدورة للآخرين؟",
                        "question_type": "nps",
                        "is_required": true,
                        "display_order": 3,
                        "settings": {
                            "min": 0,
                            "max": 10
                        }
                    }
                ]
            },
            {
                "title": "الملاحظات والاقتراحات",
                "display_order": 5,
                "questions": [
                    {
                        "question_text": "ما أكثر شيء أعجبك في الدورة؟",
                        "question_type": "long_text",
                        "is_required": false,
                        "display_order": 1
                    },
                    {
                        "question_text": "ما الذي يمكن تحسينه؟",
                        "question_type": "long_text",
                        "is_required": false,
                        "display_order": 2
                    },
                    {
                        "question_text": "هل لديك اقتراحات لدورات تدريبية مستقبلية؟",
                        "question_type": "long_text",
                        "is_required": false,
                        "display_order": 3
                    }
                ]
            }
        ]
    }',
    ARRAY['تدريب', 'دورة', 'ورشة', 'تقييم']
);

-- تحديث عداد الاستخدام للقوالب
UPDATE public.survey_templates SET usage_count = 0 WHERE is_system = true;
