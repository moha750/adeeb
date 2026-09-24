/* eslint-disable */
// @ts-nocheck
/**
 * **لبُّ «ركضة وطن» — مولَّدٌ من اللعبة نفسِها، فلا يُحرَّر هنا بيد.**
 *
 * هذا هو القلبُ الحتميُّ للّعبة كما يجري في جوّال اللاعب حرفًا بحرف: البذرةُ
 * والعوائقُ والحروفُ والمصّاصُ والخصائصُ والتصادم. والخادمُ يُعيد به الجولةَ من
 * بذرتها وضغطاتها وحدَها، فالنتيجةُ ما يحسبه هو لا ما يقوله الجهاز.
 *
 * **ولا شيءَ فيه غيرُ + − × ÷ و`Math.floor` والمقارنات** (قاعدةٌ في اللعبة من يومها
 * الأوّل): هذه وحدَها مضمونةُ النتيجة بالبِت في كلّ محرّك JavaScript، في سفاري
 * الآيفون وفي كروم وفي Node على الخادم. ودوالُّ مثل `sin` و`sqrt` و`pow` تختلف
 * خانتُها الأخيرة بين المحرّكات، فتفترق الجولتان بعد دقيقة.
 *
 * **النسخة `7ed1d976ee02`** بصمةُ هذا النصّ (sha256، أوّلُ ١٢ خانة). واللعبةُ ترسل بصمتَها
 * مع كلّ جولة، فإن اختلفتا رُدّت الجولةُ بطلب تحديث الصفحة: لبّان مختلفان يعطيان
 * لنفس الضغطات مسافتين مختلفتين، والخادمُ لا يحكم بلبٍّ غيرِ الذي لُعب به.
 *
 * والتوليدُ: `python3 tools/site.py <v2/apps/web>` في حزمة اللعبة، يبني معه `public/watan/game.html`
 * بالبصمة نفسِها. ويُقتطع اللبُّ من قالب اللعبة (`g3.html`) من `var STEP=1/60` إلى نهاية
 * `Sim.prototype.score`، ولا يُمَسّ منه حرف.
 */
var STEP=1/60, SLOT=16, GRACE=7, LANE_STEPS=8;
/* ── مُدَدُ الحركةِ وخزنُ الضغطة ──────────────────────────────────
   كانت الضغطةُ تُرمى رميًا إن وقعت أثناءَ حركةٍ جارية: يضغطُ اللاعبُ فلا
   يحدثُ شيء، فيظنُّ اللعبةَ لم تسمعْه فيضغطُ ثانية — وذاك بعينُه
   «أنتظرُ كم ثانيةً ثمّ يقفز». فصارت تُخزَنُ نافذةً قصيرةً (BUF_W) ثمّ
   تُنفَّذُ في أوّلِ تكّةٍ تصيرُ فيها مشروعة. والخزنُ في اللبِّ لا في الرسمِ
   حتّى يُعيدَ الخادمُ الحسابَ نفسَه حرفًا بحرف؛ والسجلُّ يقيّدُ الضغطةَ
   بلحظةِ وقوعِها لا بلحظةِ تنفيذِها، فالإعادةُ تمرُّ بالمنطقِ نفسِه.
   ولا شيءَ هنا غيرُ + − × ÷. */
var JUMP_D=0.52, SLIDE_D=0.42, BUF_W=0.20;
var WORDS=[["و","ط","ن"],["ر","ؤ","ي","ة"],["ت","ل","ا","ح","م"],["ث","ب","ا","ت"]];
/* ── الخصائصُ والمصّاص ─────────────────────────────────────────────────────
   النتيجةُ صارت المسافةَ بالمتر، والمصّاصُ عدٌّ مستقلّ — لكلٍّ منهما متصدّرون.
   والحروفُ لم تعد نقاطًا: كلُّ كلمةٍ تكتملُ تمنحُ خاصيّةً ١٥ ثانية، والكلمةُ من معنى خاصيّتِها:
     وطن   ← درع      يصدُّ عنك صدمةً واحدة (أو تنقضي مدّتُه): العائقُ يطيرُ وأنت تمضي
     رؤية  ← تحليق    تحلّقُ فوقَ كلِّ شيءٍ وتُسرعُ ٢٥٪، ثمّ نفَسُ هبوطٍ ٠٫٤ ث لا يُصدَمُ فيه
     تلاحم ← مغناطيس  تتلاحمُ إليك الحروفُ والمصّاصُ من المساراتِ الثلاثة
     ثبات  ← تمهّل    يبطؤ الجريُ ٢٨٪ فتثبتُ خطاك
   المُدَدُ بالتكّات (٦٠ في الثانية)، وتغيّرُ السرعةِ يدخلُ ويخرجُ في نصفِ ثانية (PW_RAMP).
   وكانت الحروفُ ٠٫٢٩ في كلِّ خانة — أي كلمةٌ كلَّ ٥ ثوانٍ، فتبقى الخاصيّةُ قائمةً أبدًا.
   فصارت ٠٫١٥. ومع الكلماتِ الأطول (٣–٥ أحرف) والمدّةِ ١٥ ث قِيسَت بلاعبٍ آليٍّ يسهو في ١٠٪
   من الخانات: خاصيّةٌ كلَّ ٦٤٠م تقريبًا، والجولةُ الوسطى أطولُ ١٣٪ (٥٤٤م مقابلَ ٤٨٠م) والرُّبعُ
   الأعلى أطولُ ٦٠٪ (١٣٤٤م مقابلَ ٨٣٢م) — تُعينُ من يجمعُ ولا تُغني عن اللعب.
   والمصّاصُ نحوَ ١٫٥ في كلِّ ١٠٠٠م.
   الحالةُ أعدادٌ مسطّحةٌ لا مصفوفات: تُنسَخُ حقلًا حقلًا للتنبّؤ (ctPredict)، والمصفوفةُ
   تُنسَخُ مرجعًا فيعبثُ التنبّؤُ بحالةِ اللعبِ نفسِها. */
var PW_T=[900,900,900,900], PW_RAMP=30, PW_LAND=24, PW_BRK=15;
var FLY_V=1.25, SLOW_V=0.72, LETTER_P=0.22, CANDY_P=0.05;

function hash(seed,k,salt){
  var h=(seed^0x9E3779B9)>>>0;
  h=Math.imul(h^k,0x85EBCA6B)>>>0;
  h=Math.imul(h^salt,0xC2B2AE35)>>>0;
  h^=h>>>15; h=Math.imul(h,0x27D4EB2F)>>>0; h^=h>>>13;
  return h>>>0;
}
function rnd(seed,k,salt){ return hash(seed,k,salt)/4294967296; }
function emptyP(k){ return 0.03 + 0.20*140/(k+140); }   // ٣٠٪ فارغةٌ بدءًا ← ٥٪

/* ── ممرُّ المرور ─────────────────────────────────────────────
   كانت السيّاراتُ تُوضَع في أيِّ مسار، فيقع خلفَها صبٌّ ثابتٌ في المسار
   نفسِه — والسيّارةُ لا تمرُّ من الصبّة، فلا تستطيع أن تكون قد جاءت من
   ورائها. قِسْتُ الأثر: متوسّطُ ما تقطعه سيّارةٌ ١٠٫٨ أمتارٍ فقط — لذلك
   كانت تبدو واقفةً ثمّ تنطلق.

   الحلُّ في التوليد لا في الرسم: مسارٌ واحدٌ في كلِّ عشر خاناتٍ يُخصَّص
   للمرور، لا تُوضَع فيه صبّةٌ ولا لافتةٌ أبدًا — فالطريق أمام السيّارة
   خالٍ عشراتِ الأمتار، وتنقضُّ عليك انقضاضًا حقيقيًّا. والصبّاتُ تملأ
   المسارَين الآخرَين. ويبقى مسارٌ حرٌّ في كلِّ خانةٍ دائمًا:
     · سيّارةٌ في الممرّ + صبٌّ في مسارٍ آخر ⇒ الثالثُ حرّ
     · صبّانِ في المسارين الآخرين        ⇒ الممرُّ حرّ
   وثالثةَ لا رابعةَ لها. */
function trafficLane(seed,k){ return hash(seed,(k/10)|0,90)%3; }
function carP(k)   { return 0.50 + 0.24*k/(k+300); }
function statP(k)  { return 0.54 + 0.30*k/(k+300); }
function bothP(k)  { return 0.26 + 0.42*k/(k+420); }

function rawSlot(seed,k){
  if(k<GRACE) return null;
  if(rnd(seed,k,1) < emptyP(k)) return null;
  var C=trafficLane(seed,k), o1=(C+1)%3, o2=(C+2)%3;
  var lanes=[null,null,null];
  var car = rnd(seed,k,3) < carP(k);
  if(car) lanes[C]="block";
  var pick = (rnd(seed,k,4)<0.5) ? o1 : o2;
  if(rnd(seed,k,7) < statP(k))
    lanes[pick] = rnd(seed,k,6)<0.5 ? "low" : "high";
  if(!car && rnd(seed,k,8) < bothP(k)){
    var other = (pick===o1) ? o2 : o1;
    lanes[other] = rnd(seed,k,9)<0.5 ? "low" : "high";
  }
  if(!lanes[0] && !lanes[1] && !lanes[2]) return null;
  return lanes;
}
/* ── نافذةُ رَدِّ الفعل ───────────────────────────────────────────────
   القفزةُ ٠٫٦٦ث والانزلاقُ ٠٫٥٢ث، والزمنُ بين مقطعين SLOT/v يقصُر كلَّما
   أسرعت. فبعد ٢٣١م تمتدُّ القفزةُ أكثرَ من مقطعٍ كامل: تقفز، ثمّ يصلك
   المقطعُ التالي وأنت في الهواءِ لا تملك الانزلاق. ذاك مأزقٌ لا مخرجَ منه
   مهما أحسن اللاعب — قِيسَ فوُجد في ٦٠٪ من الجولات.
   فتُمسَح الحركةُ المناقِضةُ إن وقعت داخل نافذةِ الحركةِ التي قبلَها في
   المسارِ نفسِه. بـ + − × ÷ وFloor فقط، فتبقى الدالّةُ حتميّةً محضة. */
function spanOf(k,dur){
  var d=k*SLOT, v=17 + 45*d/(d+1200);
  return Math.floor(dur*v/SLOT);
}
function slotOf(seed,k){
  var o=rawSlot(seed,k); if(!o) return null;
  var out=null;
  for(var li=0;li<3;li++){
    var r=o[li];
    if(r!=="low" && r!=="high") continue;
    var foe = (r==="high") ? "low" : "high";         /* الحركةُ المناقِضة */
    var n   = spanOf(k, (r==="high") ? JUMP_D : SLIDE_D); /* طولُ نافذتِها */
    for(var j=1;j<=n;j++){
      var prev=rawSlot(seed,k-j);
      if(prev && prev[li]===foe){
        if(!out) out=[o[0],o[1],o[2]];
        out[li]=null; break;
      }
    }
  }
  if(out) o=out;
  if(!o[0] && !o[1] && !o[2]) return null;
  return o;
}
function letterAt(seed,k){
  if(k<GRACE) return false;
  if(rnd(seed,k,11)>=LETTER_P) return false;
  var L=Math.floor(rnd(seed,k,12)*3);
  var o=slotOf(seed,k);
  if(o && o[L]) return false;            // لا حرفَ فوق عائقٍ مهما كان نوعُه
  return L-1;
}
/* المصّاص: نادرٌ، في مسارٍ خالٍ، ولا يشاركُ حرفًا خانتَه ومسارَه */
function candyAt(seed,k){
  if(k<GRACE) return false;
  if(rnd(seed,k,31)>=CANDY_P) return false;
  var L=Math.floor(rnd(seed,k,32)*3), o=slotOf(seed,k);
  if(o && o[L]) return false;
  if(letterAt(seed,k)===L-1) return false;
  return L-1;
}
/* ── المرورُ المقابل ─────────────────────────────────────────
   كلُّ سيّارةٍ في الطريق قادمةٌ في وجهك. ولحظةُ لقائها مثبَّتةٌ عند حدِّ
   خانتها — كالصبّة تمامًا — فلا تتقدّم على عائقٍ ولا تتأخّر.

   الحركةُ تأتي من «زحفٍ» E يُضاف إلى المسافة ثمّ يتلاشى:

       المسافةُ المرسومة(u) = u + E · min(1, u/U)،   u = حدُّ الخانة − مسافتك

   عند u=0 يصير الزحفُ صفرًا فتلتقيان عند الحدّ بالضبط، وفي آخر U مترًا
   تقترب بمعدّل (1 + E/U) — أي مرّةً وربعًا إلى مرّةٍ ونصف.

   والشرطُ الذي يمنع اختراقَ الصبّات: أقصى زحفٍ ١٠٫٥م، والمسافةُ بين
   خانتين ١٦م — فأقلُّ فجوةٍ ممكنةٍ بين عائقين في مسارٍ واحدٍ ٥٫٥ أمتار،
   وطولُ أطولِ سيّارةٍ ٤٫٧٦. أي أنّ التداخلَ مستحيلٌ رياضيًّا لا تجريبيًّا. */
/* مدى الزحف E يتحدّد بالطريق الخالي خلفها في مسارها نفسِه: السيّارةُ
   لا يمكن أن تكون قد قطعت طريقًا مسدودًا، فلا تتخطّى شيئًا أبدًا.
   والزحفُ يتوزّع بدالّةٍ لا تنقطع:

        الزحف(u) = E · u/(u+U)

   صفرٌ عند اللقاء، ويقارب E في البعد، ومشتقُّها موجبٌ في كلِّ نقطة —
   أي أنّ السيّارةَ تقترب منك أسرعَ من الطريق في كلِّ لحظةٍ من حياتها،
   بلا وقوفٍ ولا انطلاقةٍ مفاجئة، وتزداد سرعتُها كلّما دنت. */
function clearRun(seed,k,li){
  var n=1, o;
  while(n<6){ o=slotOf(seed,k+n); if(o && o[li]) break; n++; }
  return n;
}
function crawlE(seed,k,li){
  var cap=clearRun(seed,k,li)*16-5.2; if(cap>46) cap=46;
  return cap*(0.74+0.26*rnd(seed,k,70+li));
}
function crawlU(seed,k,li){ return 30+30*rnd(seed,k,73+li); }
function obZ(seed,k,li,d){
  var u=k*SLOT-d;
  if(u<=0) return -u;                       // خلفك: لا زحف
  return -(u + crawlE(seed,k,li)*u/(u+crawlU(seed,k,li)));
}
/* ── أنفُ السيّارة ──────────────────────────────────────────────
   obZ تعطي موضعَ مركزِ السيّارة، والسيّارةُ طولُها ٤٫٧٥ مترًا. فحين
   يقع اللقاءُ عند حدِّ الخانةِ يكون **مركزُها** عندك: مقدّمتُها جاوزتك
   بـ ٢٫٣٧ مترًا قبلَ ذلك بلحظاتٍ، وأنت داخلَها. وهذا بعينُه ما يراه
   اللاعب: «يصطدم بشيءٍ فيدخلُ داخلَه».
   فتُزاحُ السيّارةُ المرسومةُ إلى الخلفِ بمقدارِ نصفِ طولِها ونصفِ عمقِ
   خُضَيران، فيقعُ اللقاءُ عند **مقدّمتِها** لا عند منتصفِها. الإزاحةُ
   ثابتةٌ فلا تمسُّ شكلَ سرعتِها ولا تسارعَها، ولا تمسُّ اللبَّ بحال:
   obZ رسمٌ محض، والنواةُ لا تستعملها.

   ولئلّا تُدخِلَ مؤخّرتُها في صبّةٍ أمامَها في مسارِها، تُحَدُّ الإزاحةُ
   بما يسمحُ به الطريقُ الخالي هناك فعلًا. أقربُ عائقٍ أمامَها في مسارِها
   عند الخانةِ k+clearRun، والفجوةُ بين مركزَيهما لا تقلُّ عن
   g = clearRun·16 − crawlE ≥ 5٫٢ (لأنّ crawlE ≤ clearRun·16 − 5٫2).
   يُطرَحُ من g: ٢٫٣٧٥ (مؤخّرةُ السيّارة) و٠٫٧٩٤ (أعمقُ نصفِ صبّةٍ نحوَ
   اللاعب — قِيست من مجسّماتِ makeJump الثلاثةِ ومقاييسِها) و٠٫١٣ هامشًا،
   فالحدُّ ٣٫٣٠.

   والفسحةُ الناتجةُ لا تقلُّ عن ٠٫١٣ مترًا مهما كان g:
     إن g ≥ 5٫97 فالإزاحةُ 2٫67 والفسحةُ = g − 5٫839 ≥ 0٫13،
     وإن g < 5٫97 فالإزاحةُ g − 3٫30 والفسحةُ = 0٫131 بالضبط.
   وسيّارةٌ أمامَ سيّارةٍ: الاثنتانِ تُزاحان، وكلُّ إزاحةٍ بين ١٫٩٠ و٢٫٦٧،
   فالفسحةُ بينهما = g − 4٫75 − إزاحتُنا + إزاحتُها ≥ ٠٫٤٥٦ في الحالين.
   (القياسُ على ستِّ بذورٍ × ٣٠٠٠ خانة: أصغرُ g وُجدت ٥٫٢٠٦.) */
var BLK_NOSE=2.67;
function blkNose(seed,k,li){
  var room=clearRun(seed,k,li)*SLOT-crawlE(seed,k,li)-3.30;
  if(room>=BLK_NOSE) return BLK_NOSE;
  return room>0?room:0;
}

function Sim(seed){
  this.seed=seed>>>0;
  this.s={ step:0, dist:0, lane:0, laneFrom:0, laneT:0, air:0, slide:0, alive:true,
           bufA:0, bufT:0,
           picked:0, words:0, wordIx:0, letterIx:0, hitAt:-1,
           hitK:-1, hitLi:-1, hitReq:'', hitOx:0, hitDx:0,
           candy:0, pwS:0, pwF:0, pwM:0, pwW:0, inv:0, pwN:0, pwLast:-1, pwAt:-1,
           brkK:-1, brkLi:-1, brkAt:-1, evL:-1, evC:-1 };
  this.log=[];
}
/* مُعامِلُ دخولِ الخاصيّةِ وخروجِها: 0 ← 1 في أوّلِ PW_RAMP تكّةً، و1 ← 0 في آخرِها */
function pwRamp(t,T){ var a=(T-t)/PW_RAMP, b=t/PW_RAMP, r=a<b?a:b; return r>1?1:(r<0?0:r); }
Sim.prototype.speed=function(){
  var s=this.s, d=s.dist, v=17 + 45*d/(d+1200), m=1;
  if(s.pwF>0) m=m+(FLY_V-1)*pwRamp(s.pwF,PW_T[1]);
  if(s.pwW>0) m=m+(SLOW_V-1)*pwRamp(s.pwW,PW_T[3]);
  return v*m;
};
/* منحُ الخاصيّة: إن كانت قائمةً تتجدّدُ مدّتُها دون أن تُعادَ فتحتُها (فلا تهبطُ السرعةُ ثمّ تعود) */
Sim.prototype.grant=function(i){
  var s=this.s, T=PW_T[i];
  if(i===0) s.pwS=(s.pwS>0?T-PW_RAMP:T);
  else if(i===1) s.pwF=(s.pwF>0?T-PW_RAMP:T);
  else if(i===2) s.pwM=(s.pwM>0?T-PW_RAMP:T);
  else s.pwW=(s.pwW>0?T-PW_RAMP:T);
  s.pwN++; s.pwLast=i; s.pwAt=s.step;
};
/* الموضع الأفقيّ عددٌ كسريّ بين -١ و١، لا رقمُ مسارٍ يقفز.
   الرسمُ يقرأ هذا العدد نفسَه، فما يُحسَب هو ما يُرى — لا فرقَ بينهما. */
Sim.prototype.laneX=function(){
  var s=this.s;
  if(s.laneT<=0) return s.lane;
  var t=1-s.laneT/LANE_STEPS;
  return s.laneFrom+(s.lane-s.laneFrom)*t;
};
/* ما دام الموضعُ عددًا كسريًّا، فالتصادمُ يجب أن يكون قياسَ بُعدٍ لا رقمَ
   مسار. HITW نصفُ عرض التماسّ (الشخصيّةُ + العائق) بوحدة المسار،
   وGRABW نصفُ مدى التقاط الحرف. ولا شيءَ هنا غيرُ + - * / — فالخادمُ
   يعيد الحسابَ نفسَه حرفًا بحرف. */
var HITW=0.46, GRABW=0.58;
Sim.prototype.laneAt=function(){
  var x=this.laneX(); return x<-0.5?-1:(x>0.5?1:0);
};
Sim.prototype.input=function(a){
  var s=this.s; if(!s.alive) return;
  if(a===1||a===2){
    var dir=(a===1?-1:1), tgt=s.lane+dir;
    if(tgt>=-1&&tgt<=1){
      s.laneFrom=this.laneX(); s.lane=tgt; s.laneT=LANE_STEPS;
      this.log.push([s.step,a]);
    }
  }
  else if(a===3||a===4){
    if(s.pwF>0){ this.log.push([s.step,a]); return; }     /* طائرٌ: لا قفزَ ولا انزلاق */
    if(s.air<=0&&s.slide<=0){ if(a===3) s.air=JUMP_D; else s.slide=SLIDE_D; }
    else { s.bufA=a; s.bufT=BUF_W; }       /* الأحدثُ يغلبُ الأقدم */
    this.log.push([s.step,a]);             /* يُقيَّدُ كلُّ ضغطٍ بلحظةِ وقوعِه */
  }
};
Sim.prototype.tick=function(){
  var s=this.s; if(!s.alive){ s.step++; return; }
  var d0=s.dist;
  if(s.laneT>0) s.laneT--;
  s.dist += this.speed()*STEP;
  if(s.air>0)   s.air   = Math.max(0,s.air-STEP);
  if(s.slide>0) s.slide = Math.max(0,s.slide-STEP);
  /* المخزونُ يُصرَفُ هنا — بعدَ إنقاصِ العدّادين وقبلَ فحصِ الاصطدام —
     فتبدأُ الحركةُ في التكّةِ نفسِها التي صارت فيها مشروعة، لا في التي بعدَها. */
  if(s.bufA>0){
    if(s.air<=0&&s.slide<=0){
      if(s.bufA===3) s.air=JUMP_D; else s.slide=SLIDE_D;
      s.bufA=0; s.bufT=0;
    } else {
      s.bufT=s.bufT-STEP;
      if(s.bufT<=0){ s.bufA=0; s.bufT=0; }
    }
  }
  /* الخصائصُ تنقصُ كلَّ تكّة، وانتهاءُ التحليقِ يمنحُ نفَسَ هبوطٍ لا يُصدَمُ فيه */
  if(s.inv>0) s.inv--;
  if(s.pwS>0) s.pwS--;
  if(s.pwF>0){ s.pwF--; if(s.pwF===0 && s.inv<PW_LAND) s.inv=PW_LAND; }
  if(s.pwM>0) s.pwM--;
  if(s.pwW>0) s.pwW--;
  var x=this.laneX();
  var k0=Math.floor(d0/SLOT)+1, k1=Math.floor(s.dist/SLOT);
  for(var k=k0;k<=k1;k++){                          // الحروفُ ثابتةٌ في مكانها
    var L=letterAt(this.seed,k);
    if(L===false) continue;
    var dl=x-L; if(dl<0) dl=-dl;
    if(dl<GRABW || s.pwM>0){
      var w=WORDS[s.wordIx]; s.picked++; s.letterIx++; s.evL=k;
      if(s.letterIx>=w.length){ s.words++; s.letterIx=0; this.grant(s.wordIx); s.wordIx=(s.wordIx+1)%WORDS.length; }
    }
  }
  for(var kc=k0;kc<=k1;kc++){                       // المصّاص
    var Cn=candyAt(this.seed,kc);
    if(Cn===false) continue;
    var dc=x-Cn; if(dc<0) dc=-dc;
    if(dc<GRABW || s.pwM>0){ s.candy++; s.evC=kc; }
  }
  var K0=Math.floor(d0/SLOT)+1, K1=Math.floor(s.dist/SLOT);
  for(var k=(K0<0?0:K0);k<=K1;k++){                 // اللقاءُ عند حدِّ الخانة، متحرّكًا كان أو ثابتًا
    var o=slotOf(this.seed,k); if(!o) continue;
    for(var li=0;li<3;li++){
      var req=o[li]; if(!req) continue;
      var dx=x-(li-1); if(dx<0) dx=-dx;
      if(dx>=HITW) continue;                        // لم يمسَّه أصلًا
      if(req==="low"  && s.air>0.12)   continue;
      if(req==="high" && s.slide>0.08) continue;
      if(s.pwF>0 || s.inv>0) continue;              // طائرٌ، أو في نفَسِ الهبوط، أو لحظةَ كسرِ الدرع
      if(s.pwS>0){ s.pwS=0; s.inv=PW_BRK; s.brkK=k; s.brkLi=li; s.brkAt=s.step; continue; }
      s.alive=false; s.hitAt=s.step;
      s.hitK=k; s.hitLi=li; s.hitReq=req; s.hitOx=li-1; s.hitDx=dx;
    }
  }
  s.step++;
};
Sim.prototype.candies=function(){ return this.s.candy; };
/* النتيجةُ هي المسافةُ بالمتر — والمصّاصُ عدٌّ مستقلٌّ (candies) */
Sim.prototype.score=function(){ return Math.floor(this.s.dist); };
export const CORE_VERSION = "7ed1d976ee02";
export { STEP, SLOT, Sim, PW_T, WORDS };
