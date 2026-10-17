-- قيدا التفرّد في comment_likes كانا NULLS NOT DISTINCT: فكلُّ صفوف الزوّار (user_id فارغ) تُعدّ «مستخدمًا واحدًا»
-- وكلُّ صفوف المسجَّلين (guest_identifier فارغ) «زائرًا واحدًا»، فلا يقبل التعليقُ إلّا إعجابًا واحدًا من كلّ صنف.
-- يُعادان كقيدَي news_likes (NULLS DISTINCT الافتراضيّ): الشخصُ الواحدُ مرّةً واحدة، والفارغُ لا يُعدّ اسمًا.
alter table public.comment_likes drop constraint comment_likes_unique_user;
alter table public.comment_likes drop constraint comment_likes_unique_guest;
alter table public.comment_likes add constraint comment_likes_unique_user unique (comment_id, user_id);
alter table public.comment_likes add constraint comment_likes_unique_guest unique (comment_id, guest_identifier);
