-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260801034926   الاسم: v1_death_00a_rewrite_dependent_policies

begin;

-- أ: سياسات الأخبار الثلاث — من `status` إلى `workflow_status`

drop policy if exists news_select on public.news;
create policy news_select on public.news
  as permissive for select to public
  using (
    (workflow_status = 'published'::text)
    or (news_role(auth.uid(), id) <> 'none'::text)
  );

drop policy if exists news_likes_insert on public.news_likes;
create policy news_likes_insert on public.news_likes
  as permissive for insert to public
  with check (
    (exists (
      select 1 from public.news n
       where n.id = news_likes.news_id
         and n.workflow_status = 'published'::text
    ))
    and (
      ((auth.uid() is not null) and (user_id = auth.uid()))
      or ((auth.uid() is null) and (user_id is null) and (guest_identifier is not null))
    )
  );

drop policy if exists news_public_comments_insert on public.news_public_comments;
create policy news_public_comments_insert on public.news_public_comments
  as permissive for insert to public
  with check (
    (is_approved = false)
    and (exists (
      select 1 from public.news n
       where n.id = news_public_comments.news_id
         and n.workflow_status = 'published'::text
    ))
    and (
      ((auth.uid() is not null) and (user_id = auth.uid()) and (guest_name is null))
      or ((auth.uid() is null) and (user_id is null) and (guest_name is not null))
    )
  );

-- ب: تسع سياسات — من الرقم إلى الاسم

drop policy if exists departments_modify_president on public.departments;
create policy departments_modify_president on public.departments
  as permissive for all to public
  using (exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.is_active = true
       and ur.role_name = 'club_president'::text
  ));

drop policy if exists permissions_admin_all on public.permissions;
create policy permissions_admin_all on public.permissions
  as permissive for all to public
  using (exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.is_active = true
       and ur.role_name = 'club_president'::text
  ));

drop policy if exists role_permissions_admin_all on public.role_permissions;
create policy role_permissions_admin_all on public.role_permissions
  as permissive for all to public
  using (exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.is_active = true
       and ur.role_name = 'club_president'::text
  ));

drop policy if exists usp_manage_president on public.user_specific_permissions;
create policy usp_manage_president on public.user_specific_permissions
  as permissive for all to authenticated
  using (exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.is_active = true
       and ur.role_name = 'club_president'::text
  ));

drop policy if exists committee_leaders_can_read_members_details on public.member_details;
create policy committee_leaders_can_read_members_details on public.member_details
  as permissive for select to public
  using (exists (
    select 1
      from public.user_roles leader_ur
      join public.user_roles member_ur
        on member_ur.committee_id = leader_ur.committee_id
     where leader_ur.user_id = auth.uid()
       and leader_ur.is_active = true
       and leader_ur.role_name = any (array['committee_leader'::text, 'deputy_committee_leader'::text])
       and member_ur.user_id = member_details.user_id
       and member_ur.is_active = true
       and leader_ur.committee_id is not null
  ));

drop policy if exists allow_delete_for_admins on public.membership_applications;
create policy allow_delete_for_admins on public.membership_applications
  as permissive for delete to authenticated
  using (exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.is_active = true
       and ur.role_name = any (array['club_president'::text, 'executive_council_president'::text])
  ));

drop policy if exists allow_update_for_admins on public.membership_applications;
create policy allow_update_for_admins on public.membership_applications
  as permissive for update to authenticated
  using (exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.is_active = true
       and ur.role_name = any (array['club_president'::text, 'executive_council_president'::text])
  ));

drop policy if exists allow_select_for_service_role on public.membership_applications;
create policy allow_select_for_service_role on public.membership_applications
  as permissive for select to authenticated
  using (exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.is_active = true
       and ur.role_name = any (array['club_president'::text, 'executive_council_president'::text, 'committee_leader'::text])
  ));

drop policy if exists "Users can view their notifications" on public.notifications;
create policy "Users can view their notifications" on public.notifications
  as permissive for select to public
  using (
    (target_audience = 'all'::text)
    or ((target_audience = 'specific_users'::text) and (auth.uid() = any (target_user_ids)))
    or ((target_audience = 'members'::text) and (exists (
          select 1 from public.member_details
           where member_details.user_id = auth.uid()
        )))
    or ((target_audience = 'committee_leaders'::text)
        and check_user_permission(auth.uid(), 'view_pending_members'::text))
    or ((target_audience = 'admins'::text) and (exists (
          select 1 from public.user_roles ur
           where ur.user_id = auth.uid() and ur.is_active
             and ur.role_name = any (array['club_president'::text, 'president_advisor'::text])
        )))
    or ((target_audience = 'election_admins'::text) and has_election_admin_permission(auth.uid()))
    or ((target_audience = 'specific_committee'::text) and (exists (
          select 1 from public.user_roles
           where user_roles.user_id = auth.uid()
             and user_roles.committee_id = notifications.target_committee_id
        )))
    or ((target_audience = 'election_voters'::text) and (target_election_id is not null) and (
          is_top_admin_role(auth.uid())
          or (exists (
            select 1 from public.elections e
             where e.id = notifications.target_election_id
               and (
                 ((e.target_committee_id is not null) and (exists (
                    select 1 from public.user_roles ur
                     where ur.user_id = auth.uid()
                       and ur.committee_id = e.target_committee_id
                       and ur.is_active
                 )))
                 or ((e.target_department_id is not null) and (exists (
                    select 1 from public.user_roles ur
                      join public.committees c2 on c2.id = ur.committee_id
                     where ur.user_id = auth.uid()
                       and c2.department_id = e.target_department_id
                       and ur.is_active
                 )))
               )
          ))
        ))
    or ((target_audience = 'election_candidates'::text) and (target_election_id is not null) and (exists (
          select 1 from public.election_candidates ec
           where ec.election_id = notifications.target_election_id
             and ec.user_id = auth.uid()
             and ec.status = any (array['pending'::text, 'approved'::text, 'needs_edit'::text])
        )))
    or ((target_audience = 'election_participants'::text) and (target_election_id is not null) and (
          is_top_admin_role(auth.uid())
          or (exists (
            select 1 from public.election_candidates ec
             where ec.election_id = notifications.target_election_id
               and ec.user_id = auth.uid()
               and ec.status = any (array['pending'::text, 'approved'::text, 'needs_edit'::text, 'withdrawn'::text, 'rejected'::text])
          ))
          or (exists (
            select 1 from public.elections e
             where e.id = notifications.target_election_id
               and (
                 ((e.target_committee_id is not null) and (exists (
                    select 1 from public.user_roles ur
                     where ur.user_id = auth.uid()
                       and ur.committee_id = e.target_committee_id
                       and ur.is_active
                 )))
                 or ((e.target_department_id is not null) and (exists (
                    select 1 from public.user_roles ur
                      join public.committees c2 on c2.id = ur.committee_id
                     where ur.user_id = auth.uid()
                       and c2.department_id = e.target_department_id
                       and ur.is_active
                 )))
               )
          ))
        ))
  );

-- ج: دالّةٌ تموت مع جدولها (يُعدمه ٠١، وبوستجرس لا يمنعه من تحتها)

drop function if exists public.can_writer_edit_field(uuid, uuid, text);

commit;
