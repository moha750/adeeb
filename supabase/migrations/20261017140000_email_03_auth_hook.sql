-- نظامُ البريد (٣): رسائلُ المصادقة تمرّ بالصادر (٢٠٢٦-١٠-١٧، المرحلة ٤ في v2/EMAIL-SYSTEM.md).
--
-- خطّافُ «إرسال البريد» في Supabase Auth: بدل أن يرسل GoTrue رسائلَه بـSMTP وقوالبِ لوحته، يناديه
-- بحدث (المستخدم + حقائقُ الرسالة: الرمز، وبصمتُه، ونوعُ الفعل، والوجهة)، فيكتبها هذا الخطّافُ في
-- الصادر، ويرسمها مُرسِلُ أدِيب بقالبه ويرسلها ويسجّلها كسائر بريده.
--
-- **هذه الهجرةُ تُنشئ الخطّافَ ولا تُفعّله.** التفعيلُ إعدادٌ في المصادقة (`hook_send_email_enabled`،
-- `scripts/auth-config.mjs`) لا يقع قبل أن يُختبر المُرسِلُ حيًّا برسالة تجربة. وإطفاؤه يُعيد SMTP
-- كما كان في ثوانٍ: هو الاحتياط.
--
-- **أجلُ رسائل المصادقة عشرُ دقائق** (توأمُ `mailer_otp_exp` = 600): رمزٌ مات لا يُرسَل. وحقائقُها
-- (فيها الرمز) تُمحى لحظةَ الإرسال (`mark_email_sent`)، وسجلُّها يُمحى بعد شهر.
--
-- **وتغييرُ البريد رسالتان** حين يكون التأكيدُ المزدوج مفعّلًا (وهو مفعّل): للعنوان الحاليّ ببصمةٍ،
-- وللجديد ببصمةٍ أخرى. وأسماءُ الحقول في الحدث **معكوسة** لعلّةٍ تاريخيّة عند Supabase:
-- `token_hash_new` للعنوان **الحاليّ** مع `token`، و`token_hash` للعنوان **الجديد** مع `token_new`.

create or replace function public.hook_send_email(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  u        jsonb := coalesce(event->'user', '{}'::jsonb);
  d        jsonb := coalesce(event->'email_data', '{}'::jsonb);
  v_type   text  := coalesce(d->>'email_action_type', '');
  v_uid    uuid  := nullif(u->>'id', '')::uuid;
  v_email  text  := nullif(btrim(coalesce(u->>'email', '')), '');
  v_new    text  := nullif(btrim(coalesce(u->>'new_email', '')), '');
  v_exp    timestamptz := now() + interval '10 minutes';
  v_base   jsonb;
begin
  -- الاسمُ والجنسُ من الملفّ: «أدِيبنا» أو «أدِيبتنا» لا «أدِيبنا/أدِيبتنا».
  select jsonb_build_object(
           'name', coalesce(p.full_name, u->'user_metadata'->>'full_name'),
           'gender', p.gender,
           'type', v_type,
           'redirect', nullif(d->>'redirect_to', ''),
           'site', nullif(d->>'site_url', ''))
    into v_base
    from (select 1) x left join profiles p on p.id = v_uid;

  if v_type = 'email_change' then
    if coalesce(d->>'token_hash_new', '') <> '' and v_email is not null then
      -- التأكيدُ المزدوج: الحاليُّ يعلم ويؤكّد، والجديدُ يُثبت ملكيّته.
      perform enqueue_email('auth.email_change_current', v_email, v_uid,
        v_base || jsonb_build_object('hash', d->>'token_hash_new', 'token', d->>'token',
                                     'from', v_email, 'to', v_new),
        null, v_exp);
      if v_new is not null then
        perform enqueue_email('auth.email_change_new', v_new, v_uid,
          v_base || jsonb_build_object('hash', d->>'token_hash', 'token', d->>'token_new',
                                       'from', v_email, 'to', v_new),
          null, v_exp);
      end if;
    elsif v_new is not null then
      -- بلا تأكيدٍ مزدوج: رسالةٌ واحدةٌ للجديد.
      perform enqueue_email('auth.email_change_new', v_new, v_uid,
        v_base || jsonb_build_object('hash', d->>'token_hash',
                                     'token', coalesce(nullif(d->>'token_new', ''), d->>'token'),
                                     'from', v_email, 'to', v_new),
        null, v_exp);
    end if;
    return '{}'::jsonb;
  end if;

  if v_email is null then
    return jsonb_build_object('error', jsonb_build_object('http_code', 400, 'message', 'لا بريد لهذا الحساب.'));
  end if;

  perform enqueue_email(
    case v_type
      when 'recovery'         then 'auth.recovery'
      when 'magiclink'        then 'auth.code'
      when 'reauthentication' then 'auth.code'
      when 'email'            then 'auth.code'
      when 'signup'           then 'auth.confirm'
      when 'invite'           then 'auth.confirm'
      else                         'auth.confirm'
    end,
    v_email, v_uid,
    v_base || jsonb_build_object('hash', d->>'token_hash', 'token', d->>'token'),
    null, v_exp);

  return '{}'::jsonb;
exception when others then
  -- لا يُبتلَع: GoTrue يقول للمستخدم «تعذّر الإرسال» بدل أن يقول «أُرسل» ولم يُكتب شيء.
  return jsonb_build_object('error', jsonb_build_object('http_code', 500, 'message', 'تعذّر تجهيز البريد: ' || sqlerrm));
end;
$$;

-- لا يناديه إلّا GoTrue (`supabase_auth_admin`). وُلد مغلقًا، ويُصرَّح بالمنح هنا لعلّته.
revoke all on function public.hook_send_email(jsonb) from public, anon, authenticated;
grant execute on function public.hook_send_email(jsonb) to supabase_auth_admin;

-- ══ رمزٌ لا يبقى ═══════════════════════════════════════════════════════════════
-- حقائقُ رسائل المصادقة (فيها رمزُ الدخول وبصمتُه) تُمحى حين تنتهي الرسالة على أيّ وجه: أُرسلت،
-- أو ماتت (أجلٌ فات، أو رفضٌ نهائيّ)، أو أُلغيت. قاعدةٌ واحدةٌ في محفّز، فلا يفلت منها بابٌ يُكتب لاحقًا.
create or replace function public._email_outbox_scrub_auth()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.kind like 'auth.%' and new.status in ('sent', 'dead', 'cancelled') then
    new.data := '{}'::jsonb;
  end if;
  return new;
end;
$$;

drop trigger if exists email_outbox_scrub_auth on public.email_outbox;
create trigger email_outbox_scrub_auth
  before update of status on public.email_outbox
  for each row execute function public._email_outbox_scrub_auth();
