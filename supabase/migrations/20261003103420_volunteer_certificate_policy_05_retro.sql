-- ٩ ── بأثرٍ رجعيّ: من حضر وقيل فيه «لا يستحقّ» تصير شهادتُه جاهزة (قرارُ «يأخذها الآن»)
update volunteer_applications
   set deserves_certificate = null, denial_reason = null
 where status = 'accepted' and attendance = 'attended' and deserves_certificate is false;
