/**
 * نظام عرض الملف الشخصي العام
 * يعرض معلومات العضو للزوار بناءً على profile_slug
 */

(async function() {
    'use strict';

    const loadingScreen = document.getElementById('loadingScreen');
    const errorScreen = document.getElementById('errorScreen');
    const profileContainer = document.getElementById('profileContainer');

    const degreeMap = {
        'high_school': 'ثانوية عامة',
        'diploma': 'دبلوم',
        'bachelor': 'بكالوريوس',
        'master': 'ماجستير',
        'phd': 'دكتوراه',
        'other': 'أخرى'
    };

    async function loadPublicProfile() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const profileSlug = urlParams.get('slug') || urlParams.get('profile');

            if (!profileSlug) {
                showError();
                return;
            }

            const { data: memberData, error: memberError } = await window.sbClient
                .from('member_details')
                .select(`
                    *,
                    profiles!member_details_user_id_fkey(
                        id,
                        full_name,
                        email,
                        avatar_url,
                        created_at
                    )
                `)
                .eq('profile_slug', profileSlug)
                .single();

            if (memberError || !memberData) {
                console.error('خطأ في جلب بيانات الملف:', memberError);
                showError();
                return;
            }

            const { data: userRole } = await window.sbClient
                .from('user_roles')
                .select('committee_id, committees(committee_name_ar), roles(role_name, role_level)')
                .eq('user_id', memberData.user_id)
                .eq('is_active', true)
                .order('roles(role_level)', { ascending: false })
                .limit(1)
                .single();

            displayProfile(memberData, userRole);
            updateMetaTags(memberData);

        } catch (error) {
            console.error('خطأ في تحميل الملف الشخصي:', error);
            showError();
        }
    }

    async function displayProfile(memberData, userRole) {
        const profile = memberData.profiles;

        document.getElementById('profileAvatar').src = 
            profile.avatar_url || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(memberData.full_name_triple)}&background=3d8fd6&color=fff&size=200`;

        document.getElementById('profileName').textContent = memberData.full_name_triple || profile.full_name;

        const roleDisplay = getRoleDisplay(userRole);
        document.getElementById('profileRole').innerHTML = `
            <i class="fa-solid fa-shield-halved"></i>
            <span>${roleDisplay}</span>
        `;

        document.getElementById('profileEmail').textContent = memberData.email || profile.email;

        const joinDate = new Date(profile.created_at).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('profileJoinDate').textContent = joinDate;

        if (userRole?.committees?.committee_name_ar) {
            document.getElementById('committeeRow').style.display = 'flex';
            document.getElementById('profileCommittee').textContent = userRole.committees.committee_name_ar;
        }

        if (memberData.favorite_color) {
            document.getElementById('favoriteColorRow').style.display = 'flex';
            document.getElementById('profileFavoriteColor').textContent = memberData.favorite_color;
        }

        const roleName = userRole?.roles?.role_name || '';

        const adminCouncilRoles = [
            'club_president', 'president_advisor', 'executive_council_president',
            'hr_committee_leader', 'qa_committee_leader', 'hr_admin_member', 'qa_admin_member'
        ];
        const execCouncilRoles = ['department_head', 'committee_leader', 'deputy_committee_leader'];

        if (adminCouncilRoles.includes(roleName)) {
            document.getElementById('councilRow').style.display = 'flex';
            document.getElementById('profileCouncil').textContent = 'المجلس الإداري';
        } else if (execCouncilRoles.includes(roleName)) {
            document.getElementById('councilRow').style.display = 'flex';
            document.getElementById('profileCouncil').textContent = 'المجلس التنفيذي';
        }

        if (roleName === 'committee_member' && userRole?.committees?.committee_name_ar) {
            document.getElementById('committeeRowPublic').style.display = 'flex';
            document.getElementById('profileCommitteePublic').textContent = userRole.committees.committee_name_ar;

            const { data: committeeData } = await window.sbClient
                .from('committees')
                .select('departments(name_ar)')
                .eq('id', userRole.committee_id)
                .single();

            if (committeeData?.departments?.name_ar) {
                document.getElementById('departmentRow').style.display = 'flex';
                document.getElementById('profileDepartmentPublic').textContent = committeeData.departments.name_ar;
            }
        }

        displayAcademicInfo(memberData);
        displaySocialLinks(memberData);

        loadingScreen.style.display = 'none';
        profileContainer.style.display = 'block';
    }

    function displayAcademicInfo(memberData) {
        const academicCard = document.getElementById('academicCard');
        let hasAcademicInfo = false;

        if (memberData.academic_degree) {
            document.getElementById('degreeRow').style.display = 'flex';
            document.getElementById('profileDegree').textContent = 
                degreeMap[memberData.academic_degree] || memberData.academic_degree;
            hasAcademicInfo = true;
        }

        if (memberData.college) {
            document.getElementById('collegeRow').style.display = 'flex';
            document.getElementById('profileCollege').textContent = memberData.college;
            hasAcademicInfo = true;
        }

        if (memberData.major) {
            document.getElementById('majorRow').style.display = 'flex';
            document.getElementById('profileMajor').textContent = memberData.major;
            hasAcademicInfo = true;
        }

        if (hasAcademicInfo) {
            academicCard.style.display = 'block';
        }
    }

    function displaySocialLinks(memberData) {
        const socialCard = document.getElementById('socialCard');
        let hasSocialLinks = false;

        if (memberData.twitter_account) {
            const link = document.getElementById('twitterLink');
            link.href = `https://twitter.com/${memberData.twitter_account.replace('@', '')}`;
            link.style.display = 'flex';
            hasSocialLinks = true;
        }

        if (memberData.instagram_account) {
            const link = document.getElementById('instagramLink');
            link.href = `https://instagram.com/${memberData.instagram_account.replace('@', '')}`;
            link.style.display = 'flex';
            hasSocialLinks = true;
        }

        if (memberData.tiktok_account) {
            const link = document.getElementById('tiktokLink');
            link.href = `https://tiktok.com/@${memberData.tiktok_account.replace('@', '')}`;
            link.style.display = 'flex';
            hasSocialLinks = true;
        }

        if (memberData.linkedin_account) {
            const link = document.getElementById('linkedinLink');
            link.href = memberData.linkedin_account.startsWith('http') 
                ? memberData.linkedin_account 
                : `https://linkedin.com/in/${memberData.linkedin_account}`;
            link.style.display = 'flex';
            hasSocialLinks = true;
        }

        if (hasSocialLinks) {
            socialCard.style.display = 'block';
        }
    }

    function getRoleDisplay(userRole) {
        if (!userRole?.roles?.role_name) return 'عضو نادي أدِيب';

        const roleName = userRole.roles.role_name;
        const committeeName = userRole.committees?.committee_name_ar || '';

        switch (roleName) {
            case 'club_president':
                return 'رئيس نادي أدِيب';
            case 'executive_president':
                return 'الرئيس التنفيذي';
            case 'committee_leader':
                return committeeName ? `قائد ${committeeName}` : 'قائد لجنة';
            case 'deputy_committee_leader':
                return committeeName ? `نائب ${committeeName}` : 'نائب قائد لجنة';
            case 'committee_member':
                return committeeName ? `عضو ${committeeName}` : 'عضو لجنة';
            default:
                return 'عضو نادي أدِيب';
        }
    }

    function updateMetaTags(memberData) {
        const profile = memberData.profiles;
        const name = memberData.full_name_triple || profile.full_name;
        const avatarUrl = profile.avatar_url || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3d8fd6&color=fff&size=400`;

        document.title = `${name} - نادي أدِيب`;

        const metaTags = [
            { property: 'og:title', content: `${name} - نادي أدِيب` },
            { property: 'og:description', content: `الملف الشخصي لـ ${name} في نادي أدِيب الثقافي الأدبي` },
            { property: 'og:image', content: avatarUrl },
            { property: 'og:url', content: window.location.href },
            { name: 'twitter:title', content: `${name} - نادي أدِيب` },
            { name: 'twitter:description', content: `الملف الشخصي لـ ${name} في نادي أدِيب الثقافي الأدبي` },
            { name: 'twitter:image', content: avatarUrl }
        ];

        metaTags.forEach(tag => {
            let element = tag.property 
                ? document.querySelector(`meta[property="${tag.property}"]`)
                : document.querySelector(`meta[name="${tag.name}"]`);

            if (!element) {
                element = document.createElement('meta');
                if (tag.property) element.setAttribute('property', tag.property);
                if (tag.name) element.setAttribute('name', tag.name);
                document.head.appendChild(element);
            }
            element.setAttribute('content', tag.content);
        });
    }

    function showError() {
        loadingScreen.style.display = 'none';
        errorScreen.style.display = 'flex';
    }

    loadPublicProfile();
})();
