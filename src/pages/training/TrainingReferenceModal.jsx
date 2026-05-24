// src/pages/training/TrainingReferenceModal.jsx
// Shared trainer reference card — used by TrainingSessionCreate AND TrainingSessionsList
import React, { useState } from 'react';
import { useGlobalLang, getModuleName } from './TrainingSessionsList.helpers';

/* ===================== Letter colour palette (A–L) ===================== */
export const LETTER_PALETTE = [
  '#4338ca','#0d9488','#dc2626','#7c3aed','#d97706','#059669',
  '#2563eb','#db2777','#0891b2','#65a30d','#ea580c','#9333ea',
];

export const DEFAULT_DETAILS_BI = `A) General food safety & hygiene requirements (site rules).
   أ) متطلبات السلامة الغذائية والنظافة العامة (قواعد الموقع).
B) Time/Temperature control basics and monitoring.
   ب) أساسيات التحكم بالوقت/الحرارة والمراقبة.
C) Date control: production/slaughter/expiry and FEFO.
   ج) التحكم بالتواريخ: إنتاج/ذبح/انتهاء وتطبيق FEFO.
D) Segregation: expired/hold/reject identification.
   د) العزل: تمييز منتهي/معلّق/مرفوض.
E) Cross contamination prevention (tools, surfaces, covering).
   هـ) منع التلوث المتبادل (أدوات، أسطح، تغطية).
F) Cleaning and sanitation basics (sequence and records).
   و) أساسيات التنظيف والتعقيم (التسلسل والسجلات).
G) Chemical storage & safe handling (SDS/PPE).
   ز) تخزين واستخدام المواد الكيميائية بأمان (SDS/PPE).
H) Personal hygiene & PPE compliance.
   ح) نظافة شخصية والالتزام بوسائل الوقاية.
I) Waste handling and housekeeping.
   ط) إدارة النفايات ونظافة الموقع.
J) Incident/NC reporting and corrective action.
   ي) الإبلاغ عن الحوادث/عدم المطابقة والإجراء التصحيحي.
K) Verification: supervisor/QA checks.
   ك) التحقق: تفتيش المشرف/QA.
L) Documentation: fill records correctly and on time.
   ل) التوثيق: تعبئة السجلات بشكل صحيح وفي الوقت المحدد.`;

export const MODULE_DETAILS_BI = {
  "Personnel Hygiene": `A) Hand Washing — First and most critical defense against contamination and foodborne illness.
   WHEN: Before work • After toilet • After sneezing/coughing • After touching face/hair • After raw materials • After each break • Every hour in high-risk zones.
   HOW: Warm water (38–45°C) → soap → scrub 20–30 sec (palms, back, inter-digital spaces, nails, wrist) → rinse → paper-towel dry → 70–80% alcohol sanitizer (30-sec contact, air-dry — do NOT wipe off).
   أ) غسل اليدين — الخط الأول والأهم للدفاع ضد التلوث والأمراض الغذائية.
   متى: قبل العمل • بعد الحمام • بعد العطاس/السعال • بعد لمس الوجه/الشعر • بعد المواد الخام • بعد كل استراحة • كل ساعة في المناطق عالية الخطر.
   كيف: ماء دافئ (38–45°C) ← صابون ← فرك 20–30 ثانية (كف، ظهر، بين الأصابع، أظافر، معصم) ← شطف ← منديل ورقي ← مطهر 70–80% (30 ثانية جفاف هوائي — لا تمسح).
B) PPE — Personal Protective Equipment: correct use is non-negotiable.
   Gloves: Replace every hour or when torn/soiled/task changes. Wash hands before wearing.
   Mask: Cover nose & mouth fully. Replace every 4 hours or when wet/soiled.
   Hairnet: Cover ALL hair. Beard net required if beard present.
   Apron: Clean and ironed daily. Remove before leaving production area (hang on designated hook). NEVER wear apron in toilet.
   ب) معدات الوقاية الشخصية — الاستخدام الصحيح غير قابل للتفاوض.
   قفازات: استبدال كل ساعة أو عند التلف/التسخ/تغيير المهمة. غسل اليدين قبل اللبس.
   كمامة: تغطية الأنف والفم بالكامل. تغيير كل 4 ساعات أو عند البلل.
   شبكة شعر: تغطية كامل الشعر. شبكة لحية إلزامية عند وجود لحية.
   مريول: نظيف ومكوي يومياً. خلعه قبل مغادرة الإنتاج. ممنوع ارتداؤه في الحمام.
C) Personal Appearance — Presentation reflects food safety discipline.
   JEWELRY: No rings (plain wedding band allowed in some areas), watches, earrings, bracelets, chains, piercings — pathogens trap under jewelry; jewelry may fall into food.
   NAILS: Short, clean, smooth edges. No nail polish (regular or gel). No artificial/acrylic nails.
   UNIFORM: Clean and ironed daily, stain-free, all buttons intact.
   HEALTH CARD: Dubai Municipality Occupational Health Card mandatory for all food handlers — renew per DM schedule.
   ج) المظهر الشخصي — يعكس مستوى الانضباط بسلامة الغذاء.
   المجوهرات: ممنوع الخواتم (يُسمح خاتم زواج سادة في بعض المناطق)، الساعات، الأقراط، الأساور، السلاسل — تحجز البكتيريا وقد تسقط في الطعام.
   الأظافر: قصيرة، نظيفة، حواف ناعمة. ممنوع طلاء الأظافر (عادي أو جل). ممنوع الأظافر الصناعية.
   الزي: نظيف ومكوي يومياً، خالٍ من البقع، أزرار مكتملة.
   بطاقة الصحة المهنية: إلزامية لجميع متداولي الغذاء من بلدية دبي — تجديد حسب الجدول المحدد.
D) Illness Reporting & Exclusion — Sick handlers are the #1 cause of foodborne outbreaks.
   REPORT IMMEDIATELY to supervisor: fever, diarrhea, vomiting, sore throat + fever, jaundice (yellow eyes/skin), infectious skin condition.
   EXCLUSION RULE: Banned from food areas for ≥48 hours after ALL symptoms stop. Medical clearance certificate required before returning.
   WHY: Norovirus, Salmonella, Hepatitis A, Staphylococcus aureus (lives on skin & nasal passages) — all transmitted by sick food handlers.
   POLICY: No employee loses their job for honestly reporting illness — food safety culture depends on open reporting.
   د) الإبلاغ عن المرض والاستبعاد — المتداولون المرضى هم السبب الأول لحوادث التسمم الغذائي.
   أبلغ المشرف فوراً عند: حمى، إسهال، قيء، التهاب حلق مع حمى، يرقان (اصفرار العينين/الجلد)، التهاب جلدي معدٍ.
   قاعدة الاستبعاد: ≥48 ساعة بعد توقف جميع الأعراض + شهادة طبية للعودة.
   لماذا: نوروفيروس، سالمونيلا، التهاب كبد A، المكورات العنقودية (تعيش على الجلد والممرات الأنفية) — كلها تنتقل عبر العاملين المرضى.
   السياسة: لا يفقد أي موظف وظيفته بسبب الإبلاغ الصادق عن مرضه.
E) Wound Management — BLUE plasters are a critical food safety control.
   PROTOCOL: Cut/scratch → clean & disinfect → BLUE waterproof plaster → cover with fresh glove on top → report to supervisor immediately → record in Injury Log.
   WHY BLUE? Blue is rare in food — instantly visible if plaster falls off. Any other colour risks missing it in the product.
   Check plaster at each task change and at shift end. Replace if wet, loose, or soiled.
   هـ) إدارة الجروح — الضمادات الزرقاء إجراء تحكم حرج لسلامة الغذاء.
   الإجراء: خدش/جرح ← تنظيف وتطهير ← ضماد مقاوم للماء أزرق ← قفاز جديد فوقه ← إبلاغ المشرف فوراً ← تسجيل في سجل الإصابات.
   لماذا الأزرق؟ نادراً ما يكون الطعام أزرق — يُكتشف فوراً إذا سقط. أي لون آخر قد يمر مجهولاً في المنتج.
   افحص الضماد عند كل تغيير مهمة ونهاية الشفت. استبدله إذا كان مبللاً أو مرخياً.
F) Eating, Drinking & Smoking — STRICTLY FORBIDDEN in all food-handling areas.
   FORBIDDEN in production, storage, packaging, and receiving areas: eating, drinking, smoking, chewing gum, e-cigarettes, open beverages of any kind.
   PERMITTED ONLY in designated break rooms — completely separate from food zones.
   RETURN PROTOCOL: Full handwash + sanitizer mandatory before re-entering any food area.
   و) الأكل والشرب والتدخين — ممنوع تماماً في جميع مناطق تداول الغذاء.
   ممنوع في الإنتاج/التخزين/التغليف/الاستلام: الأكل، الشرب، التدخين، العلكة، السجائر الإلكترونية، أي مشروبات مفتوحة.
   يُسمح فقط في غرف الاستراحة المخصصة المعزولة عن مناطق الغذاء.
   عند العودة: غسل كامل + مطهر إلزامي قبل الدخول لأي منطقة تداول غذاء.
G) Hand Sanitizer — Enhances protection; NOT a replacement for handwashing.
   TYPE: 70–80% ethanol-based (approved). Use AFTER proper handwashing ONLY — never instead of it.
   AMOUNT: 3 mL — cover all surfaces of both hands completely.
   CONTACT TIME: 30 seconds, air-dry completely. Do NOT wipe off — wiping removes sanitizer before it acts.
   LOCATION: At every area entry point, along production lines, and after each toilet exit.
   ز) معقم اليدين — يعزز الحماية وليس بديلاً عن الغسل.
   النوع: إيثانول 70–80% (معتمد). بعد الغسل الكامل فقط — ليس بدلاً منه.
   الكمية: 3 مل تغطي جميع أسطح اليدين.
   زمن التماس: 30 ثانية، جفاف هوائي كامل. لا تمسح — المسح يزيل فاعلية المطهر.
   الموقع: عند كل مدخل منطقة، وعلى طول خطوط الإنتاج، وبعد كل خروج من الحمام.
H) Personal Items — Zero tolerance for personal items inside food areas.
   ALL personal items in personal lockers ONLY — outside all work areas at all times.
   FORBIDDEN inside production: mobile phones, wallets, bags, keys, watches, personal food or drink.
   EXCEPTION: Medical devices (EpiPen, inhaler) — inform supervisor; secure nearby storage may be arranged.
   ح) الأغراض الشخصية — تسامح صفري مع الأغراض الشخصية في مناطق الغذاء.
   جميع الأغراض الشخصية في الخزائن (Lockers) فقط خارج مناطق العمل.
   ممنوع داخل الإنتاج: الموبايل، المحفظة، الشنطة، المفاتيح، الساعات، طعام أو شراب شخصي.
   استثناء: الأدوية الطبية (EpiPen/بخاخ) — أبلغ المشرف؛ قد يُرتَّب تخزين آمن قريب.
I) Visitors & Contractors — Same rules, no exceptions.
   REGISTRATION: Visitor log + health questionnaire (no fever/diarrhea/infections in past 48 hours).
   FULL PPE: Lab coat, hairnet + beard net if applicable, safety shoes, gloves on production floor.
   ACCOMPANIMENT: QA/authorized staff must accompany at ALL times — zero unaccompanied access.
   SAME RULES APPLY: Handwashing, no jewelry, no mobile phones in food areas — visitors are not exempt.
   ط) الزوار والمقاولون — نفس القواعد، لا استثناءات.
   التسجيل: سجل الزوار + استبيان صحي (لا حمى/إسهال/التهابات في آخر 48 ساعة).
   PPE كامل: معطف، شبكة شعر + لحية، أحذية واقية، قفازات على أرضية الإنتاج.
   المرافقة: موظف QA/مخوّل في جميع الأوقات — ممنوع الدخول منفرداً.
   نفس القواعد: غسل اليدين، لا مجوهرات، لا موبايل في مناطق الغذاء.
J) Toilet & Return Protocol — A major contamination risk if steps are skipped.
   BEFORE toilet: Remove apron → hang on designated hook outside. Discard gloves.
   IN toilet: Full handwash (soap + 20–30 sec scrub + rinse + paper-towel dry).
   ON RETURN: Re-wash hands at production sink + apply sanitizer → put on CLEAN apron → re-enter.
   NEVER bring apron, gloves, or food-contact PPE into toilet — high contamination cross-over risk.
   ي) بروتوكول الحمام والعودة — خطر تلوث كبير إذا تُجاهلت الخطوات.
   قبل الحمام: خلع المريول ← تعليقه على المكان المخصص خارجاً. رمي القفازات.
   في الحمام: غسل كامل (صابون + فرك 20–30 ثانية + شطف + تجفيف بمنديل).
   عند العودة: إعادة الغسل في مغسلة الإنتاج + تطبيق المطهر ← ارتداء مريول نظيف ← الدخول.
   ممنوع إدخال المريول أو القفازات أو PPE ملامس الغذاء إلى الحمام.
K) Cough & Sneeze Etiquette — Immediate action required, every single time.
   STEP AWAY from ALL food and food-contact surfaces immediately — no exceptions.
   INTO: Elbow crook (preferred) OR disposable tissue → discard tissue immediately.
   AFTER EACH EPISODE: Change mask + full handwash + change gloves → then return to food handling.
   REPEATED coughing/sneezing may indicate illness → inform supervisor → follow Illness Exclusion Protocol (see D above).
   ك) آداب السعال والعطاس — إجراء فوري مطلوب في كل مرة بدون استثناء.
   ابتعد فوراً عن جميع الأغذية والأسطح الملامسة للغذاء.
   في: ثنية المرفق (الأفضل) أو منديل ← يُرمى فوراً.
   بعد كل مرة: غيّر الكمامة + اغسل اليدين كاملاً + غيّر القفازات ← عد للعمل.
   تكرار السعال/العطاس يشير لمرض محتمل ← أبلغ المشرف ← اتبع بروتوكول الاستبعاد (راجع D).
L) Daily Entry Check & Non-Compliance — Discipline makes food safety real.
   SUPERVISOR CHECK before every shift: uniform, full hair coverage, nails (length/polish), visible illness signs, wound coverage, jewelry/accessories — documented in Daily Entry Check form.
   NON-COMPLIANCE: 1st = verbal warning + immediate on-the-spot correction. 2nd = written warning + mandatory retraining. Repeated/severe = suspension + disciplinary action per company HR policy.
   ANNUAL RETRAINING: Required by ISO 22000:2018 and Dubai Municipality regulations — every 12 months for all food handlers. Assessment: 10 questions, 80% passing score.
   References: HACCP | ISO 22000:2018 | Codex Alimentarius CXC 1-1969 | Dubai Municipality Food Code 2.0 (2023).
   ل) الفحص اليومي وعدم الالتزام — الانضباط يجعل سلامة الغذاء حقيقية.
   فحص المشرف قبل كل شفت: الزي، تغطية الشعر كاملاً، الأظافر (طول/طلاء)، أعراض مرض، تغطية الجروح، المجوهرات — موثق في نموذج الفحص اليومي.
   عدم الالتزام: أولى = تنبيه شفهي + تصحيح فوري. ثانية = إنذار كتابي + إعادة تدريب. متكررة = إيقاف + إجراء تأديبي حسب لائحة الشركة.
   إعادة التدريب السنوية: متطلب ISO 22000:2018 وبلدية دبي — كل 12 شهراً لجميع متداولي الغذاء. التقييم: 10 أسئلة، نجاح 80%.
   المراجع: HACCP | ISO 22000:2018 | Codex Alimentarius CXC 1-1969 | كود الغذاء لبلدية دبي 2.0 (2023).`,

  "GHP / Cleaning & Sanitation": `A) Why cleaning and sanitation matter — the foundation of food safety.
   أ) لماذا التنظيف والتعقيم مهمان — أساس سلامة الغذاء.
   WHY: Dirty surfaces harbour pathogens (Salmonella, Listeria, E. coli) that survive and multiply, transferring to food. Without proper cleaning, GHP programs fail and HACCP loses its foundation.
   لماذا: الأسطح المتسخة تحتضن مسببات الأمراض التي تنتقل إلى الغذاء. بدون تنظيف سليم تنهار برامج GHP وتفقد HACCP أساسها.
   STANDARD: ISO 22000:2018 §8.2.3 | Dubai Municipality Food Code | Codex CXC 1-1969 Annex 2.
B) The 5-step cleaning sequence — never skip a step.
   ب) تسلسل التنظيف الخماسي — لا تتخطى خطوة.
   HOW: 1) Pre-rinse with water to remove loose debris. 2) Apply detergent + scrub to break down fats/proteins. 3) Rinse thoroughly to remove all detergent residue. 4) Apply sanitizer at correct dilution and leave for full contact time. 5) Final rinse if sanitizer type requires it (check SDS).
   كيف: 1) شطف مسبق لإزالة المخلفات. 2) تطبيق المنظف + فرك لكسر الدهون/البروتينات. 3) شطف جيد لإزالة بقايا المنظف. 4) تطبيق المعقم بالتخفيف الصحيح مع كامل زمن التلامس. 5) شطف نهائي إذا تطلب نوع المعقم ذلك.
   CRITICAL: Sanitizer applied to a surface still coated with detergent/soil does NOT work — the organic load neutralises it.
C) Sanitizer dilution, contact time, and verification.
   ج) تخفيف المعقم وزمن التلامس والتحقق.
   HOW: Mix sanitizer at concentration per SDS/SOP (e.g. chlorine-based: 100–200 ppm; QAC: per label). Contact time: minimum 30 seconds — do NOT wipe off early. Use test strips to verify concentration every session.
   كيف: اخلط المعقم بتركيز حسب SDS/SOP (مثلاً: كلور 100–200 ppm؛ QAC: حسب الملصق). زمن التلامس: 30 ثانية كحد أدنى — لا تمسح مبكراً. استخدم شرائط الاختبار للتحقق في كل جلسة.
   WHY: Under-concentration = ineffective. Over-concentration = chemical contamination + surface damage + illegal residue.
D) Colour-coded equipment and zone separation.
   د) نظام الألوان للمعدات وفصل المناطق.
   HOW: Follow site colour chart: e.g. RED = raw meat, BLUE = RTE/fish, GREEN = vegetables, YELLOW = cooked, WHITE = dairy. Never mix across zones. Wash separately to prevent cross-contamination between colours.
   كيف: اتبع مخطط الألوان للموقع: مثلاً أحمر = لحم نيء، أزرق = جاهز/سمك، أخضر = خضار، أصفر = مطبوخ، أبيض = ألبان. لا تخلط بين المناطق. اغسل كل مجموعة بشكل منفصل.
   WHY: A single cross-colour use can transfer raw-meat pathogens to RTE food — a direct food safety incident.
E) Cleaning schedule: frequency, responsibility, sign-off.
   هـ) جدول التنظيف: التكرار والمسؤولية والتوقيع.
   WHEN: During shift (as-needed for spills/high-touch). After use (equipment). End-of-shift (full area). Weekly/monthly deep clean. Supervisor signs off after verification.
   متى: خلال الشفت (عند الانسكاب/نقاط اللمس). بعد الاستخدام (معدات). نهاية الشفت (منطقة كاملة). تنظيف عميق أسبوعي/شهري. يوقع المشرف بعد التحقق.
   KEY POINT: Unsigned schedule = unverified clean. Always sign after verifying — not before.
F) High-touch point cleaning (handles, switches, scales, trolleys).
   و) تنظيف نقاط اللمس العالية (مقابض/مفاتيح/موازين/عربات).
   WHY: These points are touched by many hands throughout the shift. Pathogens accumulate rapidly. Cross-contamination from hands → surface → food is a well-documented transmission route.
   لماذا: تُلمس هذه النقاط بأيادٍ كثيرة خلال الشفت. تتراكم الميكروبات بسرعة. التلوث من اليد → السطح → الغذاء مسار موثق.
   FREQUENCY: Every 2–4 hours during production and after any suspected contamination event. Document in high-touch log.
G) Spill management — raw meat juices.
   ز) التعامل مع الانسكابات — عصارة اللحم النيء.
   HOW IMMEDIATELY: 1) Isolate area (place wet floor sign). 2) Absorb liquid with paper towel — dispose in biohazard/food waste bin. 3) Clean surface with detergent. 4) Rinse. 5) Apply sanitizer for full contact time. 6) Dry. 7) Record in spill/cleaning log.
   فوراً: 1) عزل المنطقة. 2) امتصاص السائل بورق وتخلص منه. 3) تنظيف بالمنظف. 4) شطف. 5) تعقيم بكامل زمن التلامس. 6) تجفيف. 7) تسجيل في سجل الانسكاب.
   NEVER: Wipe across a wider area without absorbing first — this spreads contamination.
H) Waste bins: liners, cleaning, and pest prevention.
   ح) سلال النفايات: البطانات والتنظيف ومنع الآفات.
   HOW: Lined bins only. Empty at least every 2 hours (more if busy). Clean and sanitize bin daily. Keep lids closed. Never overfill. Dedicated food-waste bins kept away from food-contact surfaces.
   كيف: استخدم سلال مبطنة فقط. أفرغ كل ساعتين على الأقل. نظّف وعقّم السلة يومياً. أبقِ الغطاء مغلقاً. لا تفرط في الامتلاء. سلال نفايات الغذاء بعيدة عن أسطح التلامس.
   PEST LINK: Open/overflowing waste bins are the #1 attractor for rodents and flies in food facilities.
I) Tool and equipment storage after cleaning.
   ط) تخزين الأدوات والمعدات بعد التنظيف.
   HOW: Cleaned tools must be: air-dried before storage (never store wet), placed in dedicated racks/holders off the floor (≥15 cm), labelled by zone/colour, protected from re-contamination (covered if not used immediately).
   كيف: يجب على الأدوات المنظفة: التجفيف بالهواء قبل التخزين، وضعها على حوامل مخصصة بعيدة عن الأرض (≥15 سم)، مُعلَّمة حسب المنطقة/اللون، محمية من التلوث المجدد.
J) Post-cleaning inspection and corrective action.
   ي) التفتيش بعد التنظيف والإجراء التصحيحي.
   HOW: Supervisor or QA uses inspection checklist: visual check (no visible residue), smell check, ATP swab (if applicable). FAIL = reclean + retest before resuming production. Document finding + corrective action.
   كيف: يستخدم المشرف أو QA قائمة تفتيش: فحص بصري (لا بقايا مرئية)، فحص رائحة، مسحة ATP (إن وُجدت). فشل = إعادة تنظيف + إعادة اختبار قبل استئناف الإنتاج.
K) Chemical safety and SDS awareness.
   ك) سلامة الكيميائيات والوعي بـ SDS.
   KEY RULES: Never mix chemicals (chlorine + acids = chlorine gas — FATAL). Always use PPE (gloves + eye protection). Store in locked cabinet away from food. Dilute in ventilated area. SDS must be on-site and accessible.
   قواعد أساسية: لا تخلط الكيميائيات أبداً (كلور + حوامض = غاز الكلور — قاتل). استخدم PPE دائماً. خزّن في خزانة مغلقة بعيداً عن الغذاء. خفّف في منطقة مهوّاة. SDS يجب أن يكون في الموقع وسهل الوصول.
L) Records and documentation.
   ل) السجلات والتوثيق.
   REQUIRED RECORDS: Cleaning log (area/equipment, date, time, method, signature). Chemical dilution/verification log. Post-cleaning inspection form. Corrective action records. QA reviews weekly; retained for minimum 1 year per ISO 22000.
   السجلات المطلوبة: سجل التنظيف. سجل تخفيف/تحقق الكيميائيات. نموذج تفتيش ما بعد التنظيف. سجلات الإجراءات التصحيحية. يراجعها QA أسبوعياً وتُحفظ سنة على الأقل.
   References: ISO 22000:2018 §8.2.3 | HACCP PRP | Dubai Municipality Food Code | Codex CXC 1-1969.`,

  Receiving: `A) Why receiving is a critical control point.
   أ) لماذا الاستلام نقطة تحكم حرجة.
   WHY: The receiving dock is the first opportunity to stop non-conforming products from entering the supply chain. Accepting substandard product (wrong temp, expired, damaged) puts every downstream process at risk and is a direct HACCP failure.
   لماذا: منطقة الاستلام هي الفرصة الأولى لمنع دخول المنتجات غير المطابقة. قبول منتج غير مطابق يُعرّض كل العمليات اللاحقة للخطر وهو فشل في HACCP.
   STANDARD: ISO 22000:2018 §8.5.1 | HACCP PRP | Dubai Municipality Food Code §4.
B) Temperature checks — product and vehicle.
   ب) فحص الحرارة — المنتج والسيارة.
   HOW: Use calibrated probe thermometer. Insert into product core or measure surface. Record vehicle chiller temp before unloading and after.
   كيف: استخدم مقياس حرارة مُعاير. أدخل في مركز المنتج أو قِس السطح. سجّل حرارة مبرد السيارة قبل وبعد التنزيل.
   LIMITS — Fresh/chilled meat: ≤5°C. Frozen: ≤-18°C. Vehicle chiller: ≤5°C. REJECT if temp is exceeded by >2°C without documented justification.
   الحدود — اللحم الطازج/المبرد: ≤5°C. مجمّد: ≤-18°C. مبرد السيارة: ≤5°C. ارفض إذا تجاوزت الحرارة 2°C دون مبرر موثق.
C) Date verification — production, slaughter, and expiry.
   ج) التحقق من التواريخ — الإنتاج والذبح والانتهاء.
   HOW: Check ALL date markings. Compare slaughter/production date vs company shelf-life SOP. Calculate remaining shelf life. Any product at or past expiry = immediate rejection — no exceptions.
   كيف: تحقق من جميع علامات التواريخ. قارن تاريخ الذبح/الإنتاج بـ SOP العمر الافتراضي. احسب الأيام المتبقية. أي منتج منتهٍ أو على وشك الانتهاء = رفض فوري.
   RULE: When in doubt about date validity — HOLD + inform QA. Never guess.
D) Packaging integrity — seal, vacuum, leakage, damage.
   د) سلامة التغليف — إحكام/فاكيوم/تسريب/تلف.
   CHECK: Vacuum packs — must be firm and tight (no air pockets). Seals — no tears, pinholes, or delamination. No visible leaks or exudate on outer surface. No crushed, punctured, or severely dented packaging. No ice crystal buildup (indicates thaw-refreeze for frozen).
   فحص: أكياس الفاكيوم — صلبة ومحكمة. الإغلاق — بدون تمزق أو ثقوب. لا تسريبات أو سوائل خارجية. لا تغليف مسحوق/مثقوب. لا بلورات ثلج متراكمة.
E) Label and document verification.
   هـ) التحقق من الملصقات والمستندات.
   LABEL MUST HAVE: Product name, batch/lot number, origin, weight, production date, expiry date, halal certification mark (if applicable), storage instruction.
   الملصق يجب أن يحتوي: اسم المنتج، رقم الدفعة، المنشأ، الوزن، تاريخ الإنتاج، تاريخ الانتهاء، علامة الحلال (إن مطلوب)، تعليمة التخزين.
   DOCUMENTS: Invoice matching product. COA (Certificate of Analysis) if required by QA. Halal certificate for new/unfamiliar suppliers. Veterinary health certificate if applicable. REJECT delivery with missing critical documents — inform QA first.
F) Acceptance, hold, and rejection decisions.
   و) قرارات القبول والحجز والرفض.
   ACCEPT: All parameters within specification. HOLD (yellow tag): Minor issue requiring QA evaluation before acceptance — keep segregated. REJECT (red tag + return): Temperature breach, expiry, major packaging failure, missing critical docs, wrong product.
   قبول: جميع المعاملات ضمن المواصفة. حجز (بطاقة صفراء): مشكلة بسيطة تتطلب تقييم QA قبل القبول. رفض (بطاقة حمراء + إعادة): تجاوز حراري، انتهاء، فشل تغليف كبير، وثائق ناقصة، منتج خاطئ.
   KEY: The receiving inspector signs the decision — they are accountable. Never accept because of supplier pressure.
G) Segregation and labelling during receiving.
   ز) الفصل والتعليم أثناء الاستلام.
   HOW: Accepted → move to designated storage immediately. Held → HOLD tag with date/reason/QA contact. Rejected → return with documented NC form. NEVER mix accepted and rejected on same pallet/shelf.
   كيف: مقبول → انقله للتخزين فوراً. محجوز → ضع بطاقة HOLD بالتاريخ/السبب/جهة الاتصال. مرفوض → أعده مع نموذج NC موثق. لا تخلط المقبول والمرفوض أبداً.
H) Time control — minimise time out of temperature.
   ح) التحكم بالوقت — تقليل الوقت خارج درجة الحرارة.
   WHY: Every minute chilled product sits at ambient temperature, bacteria multiply. Target: product should be in chiller within 20 minutes of arrival. Unload in batches if large delivery. Never leave product sitting at dock unattended.
   لماذا: كل دقيقة يمكث فيها المنتج المبرد بدرجة حرارة المحيط تتكاثر الجراثيم. هدف: المنتج في البراد خلال 20 دقيقة من الوصول. فرّغ على دفعات إذا كان التسليم كبيراً.
I) Cross-contamination prevention during unloading.
   ط) منع التلوث المتبادل أثناء التنزيل.
   HOW: Use clean, food-grade pallets and trolleys. No wooden pallets in refrigerated areas. Keep different species/products separated. Raw meat never placed directly on floor. Receiving staff wear gloves and clean apron.
   كيف: استخدم طبالي وعربات نظيفة ومناسبة للغذاء. لا طبالي خشبية في مناطق التبريد. افصل الأنواع/المنتجات المختلفة. لا لحم نيء مباشرة على الأرض. موظفو الاستلام يرتدون قفازات ومريولاً نظيفاً.
J) Receiving area hygiene and housekeeping.
   ي) نظافة منطقة الاستلام والترتيب.
   STANDARD: Clean before receiving starts. No standing water. Floor drains clear. Walls/surfaces clean. Adequate lighting (min 220 lux per Dubai Municipality). Pest deterrents in place. No personal items in receiving area.
   المعيار: نظّف قبل بدء الاستلام. لا ماء راكد. مجاري الأرض مفتوحة. جدران/أسطح نظيفة. إضاءة كافية (220 lux كحد أدنى). وسائل ردع الآفات في مكانها.
K) Non-conformance documentation and escalation.
   ك) توثيق عدم المطابقة والتصعيد.
   HOW: Fill NC form immediately upon finding deviation. Photograph evidence (damaged product, temperature reading, label issue). Notify QA manager/supervisor. Supplier notification within same business day. Track corrective action.
   كيف: أكمل نموذج NC فوراً عند اكتشاف الانحراف. التقط صوراً للدليل. أبلغ مدير QA/المشرف. إبلاغ المورد في نفس اليوم. تابع الإجراء التصحيحي.
L) Receiving log and QA records.
   ل) سجل الاستلام وسجلات QA.
   REQUIRED: Receiving log per delivery (supplier, product, quantity, date, temperature, date check, decision, signature). NC forms for rejections/holds. Photo evidence archived. QA reviews daily and signs off. Records retained minimum 2 years.
   المطلوب: سجل استلام لكل تسليم (المورد، المنتج، الكمية، التاريخ، الحرارة، فحص التواريخ، القرار، التوقيع). نماذج NC للمرفوضات/المحجوزات. صور محفوظة. QA يراجع يومياً ويوقع. تُحفظ السجلات سنتين على الأقل.
   References: ISO 22000:2018 §8.5.1 | HACCP PRP | Dubai Municipality Food Code §4 | Codex CXC 1-1969.`,

  Storage: `A) Why proper storage is critical — protecting product integrity.
   أ) لماذا التخزين الصحيح حرج — حماية سلامة المنتج.
   WHY: Improper storage accelerates spoilage, enables pathogen growth, causes allergen cross-contact, and violates traceability — all simultaneously. Most food safety incidents traced back to a storage failure.
   لماذا: التخزين الخاطئ يسرّع الفساد ويمكّن نمو الميكروبات ويتسبب في تلوث الحساسية وينتهك التتبع. معظم حوادث سلامة الغذاء مصدرها فشل في التخزين.
   STANDARD: ISO 22000:2018 §8.2 | HACCP PRP | Dubai Municipality Food Code §5.
B) Chiller temperature monitoring and limits.
   ب) مراقبة حرارة البراد والحدود.
   LIMITS: Chiller (fresh/chilled meat): 0°C to +5°C. Blast chiller (rapid cooling): target ≤+3°C within 90 min. Freezer: ≤-18°C. Check and record temperature MINIMUM twice per shift (start + mid or end).
   الحدود: براد (لحم طازج/مبرد): 0°C إلى +5°C. تجميد سريع: هدف ≤+3°C خلال 90 دقيقة. ثلاجة تجميد: ≤-18°C. سجّل الحرارة مرتين على الأقل في كل شفت.
   ACTION: If chiller reads >5°C → inform supervisor immediately → check product → document → corrective action. Never assume it will self-correct.
C) FEFO stock rotation — First Expired, First Out.
   ج) تدوير المخزون FEFO — الأقرب للانتهاء أولاً.
   HOW: When placing new stock, move older stock to the FRONT. New stock goes to the BACK. Visual check: products at front should always have the earliest expiry. Conduct daily FEFO check at start of shift.
   كيف: عند وضع مخزون جديد، انقل القديم للأمام. الجديد يذهب للخلف. فحص بصري يومي: المنتجات في الأمام يجب أن تكون الأقرب للانتهاء.
   CONSEQUENCE: Ignoring FEFO leads to expired product being used — a direct food safety and legal violation.
D) Segregation — raw vs RTE, allergens, chemicals.
   د) الفصل — نيء ضد جاهز، الحساسية، الكيميائيات.
   RULES: Raw meat ALWAYS stored below RTE food (prevents drip contamination). Different species separated (beef/pork/poultry). Allergen-containing products sealed and labelled. NO chemicals stored in same area as food — even in sealed containers.
   القواعد: اللحم النيء يُخزن دائماً أسفل الجاهز. أنواع مختلفة مفصولة. منتجات الحساسية مُغلقة ومُعلَّمة. لا كيميائيات في نفس منطقة الغذاء.
E) Covering products and preventing drip contamination.
   هـ) تغطية المنتجات ومنع تلوث التنقيط.
   HOW: All open products must be covered with cling film or placed in sealed containers labelled with product name + date opened + expiry. Raw meat at bottom shelf. RTE at top. No uncovered products in chiller overnight.
   كيف: جميع المنتجات المفتوحة تُغطى بغشاء أو وضع في حاويات مُغلقة مع ملصق (اسم المنتج + تاريخ الفتح + الانتهاء). اللحم النيء في الرف السفلي. الجاهز في الأعلى.
F) Correct stacking, airflow, and off-floor storage.
   و) الرص الصحيح وتدفق الهواء والتخزين بعيداً عن الأرض.
   RULES: Products off-floor by minimum 15 cm (on pallets/shelves). Away from walls by 5 cm for air circulation. Do not over-stack (blocking airflow raises temperature). Stack stable — no risk of toppling. Heavy boxes at bottom.
   القواعد: المنتجات على ارتفاع 15 سم من الأرض. 5 سم بعيداً عن الجدران لتدفق الهواء. لا رص مفرط. رص مستقر بلا خطر سقوط. الصناديق الثقيلة في الأسفل.
G) Expired/near-expiry identification, hold, and disposal.
   ز) تمييز منتهي/قريب الانتهاء، الحجز، والإعدام.
   DAILY CHECK: During FEFO check, pull any product at or past expiry. Place in designated HOLD area with hold tag. QA decision: dispose, return to supplier, or use immediately. Complete condemnation form. Weigh and record waste quantity.
   فحص يومي: خلال فحص FEFO، أخرج أي منتج منتهٍ. ضعه في منطقة HOLD مع بطاقة. قرار QA: تخلص/إعادة للمورد/استخدام فوري. أكمل نموذج الإعدام. زن وسجّل كمية النفايات.
H) Traceability — batch visibility and labelling.
   ح) التتبع — ظهور الدفعة والتعليم.
   REQUIREMENT: Every stored item must be traceable to its source. Label must show: batch/lot number, product name, supplier, received date, expiry. In case of recall — you must be able to locate all affected stock within 4 hours.
   المتطلب: كل صنف مخزون يجب أن يكون قابلاً للتتبع. الملصق يجب أن يُظهر: رقم الدفعة، اسم المنتج، المورّد، تاريخ الاستلام، الانتهاء. عند الاسترجاع — يجب تحديد جميع المخزون المتأثر خلال 4 ساعات.
I) Cold room cleaning and pest prevention.
   ط) تنظيف غرفة التبريد ومنع الآفات.
   SCHEDULE: Daily: wipe shelves, check for spills. Weekly: full clean + sanitize. Monthly: deep clean including walls/ceiling/coils. PEST: Keep doors closed. Report any pest evidence immediately. No food debris on floor. Check door seals regularly.
   الجدول: يومياً: مسح الرفوف، فحص الانسكابات. أسبوعياً: تنظيف + تعقيم كامل. شهرياً: تنظيف عميق. مكافحة الآفات: أبقِ الأبواب مغلقة. أبلغ فوراً عن أي دليل.
J) Corrective actions for temperature, spill, and damage deviations.
   ي) الإجراءات التصحيحية لانحرافات الحرارة والانسكاب والتلف.
   TEMP DEVIATION: Check thermometer accuracy first. If confirmed high temp → product assessment (HOLD) → maintenance call → document. SPILL: Clean immediately, sanitize, dry, investigate cause. DAMAGE: Remove product, assess, document NC, corrective action.
   انحراف حراري: تحقق من دقة المقياس أولاً. إذا تأكد → تقييم المنتج (حجز) → إبلاغ الصيانة → توثيق.
K) Door discipline and temperature integrity.
   ك) الانضباط بالأبواب وسلامة الحرارة.
   WHY: Every time the door opens, warm humid air enters → temperature rises → condensation → potential mould/Listeria growth on walls. Rule: Plan what you need before opening, retrieve all items at once, close immediately. No propping doors open.
   لماذا: كل فتحة للباب تدخل هواء دافئاً رطباً → ترتفع الحرارة → تكاثف → نمو محتمل للعفن/الليستيريا. القاعدة: خطط لما تحتاج قبل الفتح، خذ كل شيء دفعة واحدة، أغلق فوراً.
L) Storage log and QA documentation.
   ل) سجل التخزين وتوثيق QA.
   REQUIRED: Temperature log (twice daily minimum). FEFO check record. Condemnation/disposal records. Cleaning verification records. NC forms for deviations. QA reviews weekly. All records retained 2 years minimum.
   المطلوب: سجل حرارة (مرتين يومياً كحد أدنى). سجل فحص FEFO. سجلات الإعدام/التخلص. سجلات تحقق التنظيف. نماذج NC. QA يراجع أسبوعياً. جميع السجلات تُحفظ سنتين.
   References: ISO 22000:2018 §8.2 | HACCP PRP | Dubai Municipality Food Code §5 | Codex CXC 1-1969.`,

  "Time & Temperature / CCP": `A) The Danger Zone — why temperature is the #1 food safety control.
   أ) منطقة الخطر — لماذا الحرارة هي التحكم الأول في سلامة الغذاء.
   WHY: Bacterial pathogens (Salmonella, E. coli, Listeria, Staphylococcus) grow most rapidly between 5°C and 60°C — doubling every 20 minutes under ideal conditions. Controlling temperature is the most powerful single tool to prevent foodborne illness.
   لماذا: الجراثيم المسببة للأمراض تنمو بسرعة بين 5°C و 60°C — تتضاعف كل 20 دقيقة. التحكم بالحرارة هو أقوى أداة لمنع الأمراض الغذائية.
   THE RULE: Keep cold food cold (≤5°C). Keep hot food hot (≥60°C). Minimise time in the danger zone to <2 hours total across the product's life.
B) Chilled holding — requirements and monitoring.
   ب) الحفظ المبرد — المتطلبات والمراقبة.
   LIMITS: Fresh/chilled meat ≤+5°C. Ready-to-eat products ≤+4°C. Check and log temperature minimum every 2 hours during service. If temp exceeds limit → assess product → determine safe disposition time.
   الحدود: لحم طازج/مبرد ≤+5°C. منتجات جاهزة ≤+4°C. سجّل الحرارة كل ساعتين خلال الخدمة. إذا تجاوزت الحد → قيّم المنتج → حدد وقت الاستخدام الآمن.
   KEY: Use calibrated probe thermometer — display unit temperatures are NOT sufficient verification; they measure air, not product core.
C) Hot holding requirements (where applicable).
   ج) متطلبات الحفظ الساخن (عند الانطباق).
   LIMIT: ≥60°C continuously. Check at minimum every 2 hours. Stir product before measuring to ensure uniform temperature. If product drops <60°C for >4 hours → discard. No reheating for food safety unless specific SOP allows and temp reaches ≥75°C core.
   الحد: ≥60°C باستمرار. قِس كل ساعتين على الأقل. حرّك قبل القياس. إذا انخفض <60°C لأكثر من 4 ساعات → أعدم. لا إعادة تسخين إلا إذا سمح SOP والحرارة ≥75°C.
D) CCP monitoring — critical limits, who, when, how.
   د) مراقبة CCP — الحدود الحرجة، من، متى، كيف.
   AT AL MAWASHI: The primary CCP in chilled operations is temperature control at receiving, storage, and display. Critical Limit: ≤5°C at all chilled stages. Monitoring: designated person, calibrated thermometer, minimum frequency per HACCP plan, documented on CCP monitoring form.
   في المواشي: CCP الرئيسي في العمليات المبردة هو التحكم بالحرارة عند الاستلام والتخزين والعرض. الحد الحرج: ≤5°C. المراقبة: شخص مخصص، مقياس حرارة معاير، تكرار حسب خطة HACCP، موثق في نموذج CCP.
E) Corrective action when CCP limits are exceeded.
   هـ) الإجراء التصحيحي عند تجاوز حدود CCP.
   STEPS: 1) Identify affected product. 2) HOLD — do not use or distribute. 3) Measure product core temperature. 4) Notify QA immediately. 5) Assess: if within 2-hr window and temp correctable → continue use. If not → discard. 6) Investigate root cause. 7) Document everything. 8) Corrective/preventive action.
   الخطوات: 1) حدد المنتج المتأثر. 2) احجز. 3) قِس حرارة المنتج. 4) أبلغ QA. 5) قيّم. 6) حقق في السبب الجذري. 7) وثّق كل شيء. 8) إجراء تصحيحي/وقائي.
F) Thermometer calibration and verification.
   و) معايرة مقياس الحرارة والتحقق.
   HOW: Ice-point method daily: fill glass with crushed ice + water, insert probe, should read 0°C ± 1°C. Boiling point (if needed): boiling water = 100°C ± 1°C (adjust for altitude). Record calibration date. If outside tolerance → remove from use and label "DO NOT USE" → report to QA.
   كيف: طريقة نقطة الجليد يومياً: كوب ثلج مجروش + ماء، أدخل المجس، يجب أن يقرأ 0°C ± 1°C. سجّل تاريخ المعايرة. إذا خارج التسامح → أخرجه من الاستخدام وعلّم عليه "لا تستخدم".
   FREQUENCY: Daily verification (ice point). Full calibration by certified service per manufacturer schedule.
G) Display/counter temperature monitoring.
   ز) مراقبة حرارة العرض/الكاونتر.
   RULE: Check display unit air temperature AND product surface/core temperature. Air temp ≤4°C for fresh product displays. If air temp reads OK but product is warm → check airflow, load level, door seals. Do not overload display counter (blocks airflow).
   القاعدة: افحص حرارة الهواء في وحدة العرض وحرارة سطح/مركز المنتج. هواء ≤4°C للمنتجات الطازجة. إذا حرارة الهواء جيدة لكن المنتج دافئ → افحص تدفق الهواء، مستوى التحميل، أختام الباب.
H) Transport/delivery vehicle temperature.
   ح) حرارة سيارة النقل/التوصيل.
   REQUIREMENT: Chilled vehicle ≤+5°C before loading. Frozen vehicle ≤-18°C. Pre-cool vehicle 30 minutes before loading. Record temp at departure and on arrival. If breach during transport → HOLD on arrival + QA assessment.
   المتطلب: سيارة مبردة ≤+5°C قبل التحميل. مجمّدة ≤-18°C. برّد السيارة 30 دقيقة قبل التحميل. سجّل الحرارة عند المغادرة والوصول. إذا حدث انتهاك → احجز عند الوصول + تقييم QA.
I) Thawing and cooling procedures (if applicable).
   ط) إجراءات الإذابة والتبريد (عند الانطباق).
   THAWING (if practised): Only in chiller (≤5°C) — never at room temperature. Thaw in dedicated container to catch drip. Separate from RTE. Use within 24 hours. COOLING (cooked product): From 60°C → <21°C within 2 hours; from 21°C → ≤5°C within 4 hours. Total cooling window ≤6 hours. Use blast chiller or ice bath.
   إذابة: فقط في البراد — أبداً بدرجة حرارة الغرفة. في وعاء مخصص لتجميع السوائل. استخدم خلال 24 ساعة. تبريد (مطبوخ): من 60°C → <21°C في ساعتين؛ من 21°C → ≤5°C في 4 ساعات.
J) Equipment breakdown plan.
   ي) خطة أعطال المعدات.
   STEPS WHEN CHILLER FAILS: 1) Note time of failure. 2) Measure product temperature. 3) Inform supervisor/maintenance immediately. 4) If product still ≤5°C and repair ETA <2 hours: continue to monitor. 5) If temp rising or repair delayed: move product to backup chiller. 6) No backup available → assess product shelf life + use/discard decision with QA. 7) Document timeline of events.
   خطوات عطل البراد: 1) سجّل وقت العطل. 2) قِس حرارة المنتج. 3) أبلغ المشرف/الصيانة. 4) إذا ≤5°C والإصلاح خلال ساعتين: راقب. 5) إذا الحرارة ترتفع: انقل لبراد احتياطي. 6) لا يوجد بديل → تقييم مع QA. 7) وثّق كل الأحداث.
K) Time-based controls — 2-hour and 4-hour rules.
   ك) ضوابط الوقت — قاعدتا ساعتين وأربع ساعات.
   RULES: Product in danger zone 0–2 hours: safe to use or return to safe temp. 2–4 hours: use immediately, do not return to storage. >4 hours cumulative: DISCARD. Total includes all time out of safe temperature across the product's life. Log time OUT and time IN for all products.
   القواعد: 0–2 ساعة في منطقة الخطر: آمن للاستخدام أو إعادة للحرارة الآمنة. 2–4 ساعات: استخدم فوراً. أكثر من 4 ساعات تراكمية: أعدم. سجّل وقت الخروج والدخول.
L) Records and trend analysis.
   ل) السجلات وتحليل الاتجاهات.
   REQUIRED: CCP monitoring forms (per HACCP plan). Temperature logs (chiller, display, transport). Thermometer calibration log. Corrective action records. QA reviews all records weekly. Trend analysis monthly: if recurring deviations in same area → root cause + systemic preventive action.
   المطلوب: نماذج مراقبة CCP. سجلات حرارة (براد، عرض، نقل). سجل معايرة المقياس. سجلات الإجراءات التصحيحية. QA يراجع أسبوعياً. تحليل شهري: إذا انحرافات متكررة → سبب جذري + إجراء وقائي منظومي.
   References: ISO 22000:2018 §8.5 (CCP/OPRP) | HACCP 7 Principles | Dubai Municipality Food Code §6 | Codex CXC 1-1969.`,

  "HACCP Basics": `A) What is HACCP and why it exists.
   أ) ما هو الهاسب ولماذا وُجد.
   HACCP stands for Hazard Analysis and Critical Control Points. It is a science-based, systematic approach to identifying and controlling food safety hazards BEFORE they cause harm. Developed for NASA in the 1960s; now required globally by ISO 22000, Codex, and Dubai Municipality.
   الهاسب = تحليل المخاطر ونقاط التحكم الحرجة. نهج علمي منهجي لتحديد والتحكم في مخاطر سلامة الغذاء قبل وقوع الضرر. طُوِّر لناسا في الستينيات ومطلوب الآن عالمياً.
   KEY PRINCIPLE: Prevent hazards — don't just inspect the finished product.
B) The three types of food safety hazards.
   ب) الأنواع الثلاثة لمخاطر سلامة الغذاء.
   BIOLOGICAL: Pathogens — Salmonella (raw poultry/meat), Listeria (RTE, cold environments), E. coli O157 (raw beef), Campylobacter (poultry). Grow in the Danger Zone (5–60°C). CHEMICAL: Cleaning chemicals, pesticide residues, allergens, lubricants, unapproved additives. PHYSICAL: Bone fragments, metal shards (from machinery), glass, plastic packaging debris, personal items (jewellery, plasters). In meat processing — bone and metal are the primary physical hazards.
   بيولوجية: مسببات الأمراض (سالمونيلا/ليستيريا/إي كولاي). كيميائية: كيميائيات التنظيف/بقايا مبيدات/مواد حساسية. فيزيائية: شظايا عظام/معدن/زجاج/مجوهرات.
C) PRPs, OPRPs, and CCPs — the three control tiers.
   ج) PRP و OPRP و CCP — مستويات التحكم الثلاثة.
   PRP (Prerequisite Programs): Basic hygiene/environmental controls that create the foundation — cleaning, pest control, personal hygiene, maintenance. CONTROL GENERAL CONDITIONS — not specific hazards. OPRP (Operational PRP): Controls specific hazards where loss of control is unlikely to reach critical level immediately — e.g. receiving temperature checks, chiller monitoring. CCP (Critical Control Point): Controls a specific hazard at a step where loss of control DIRECTLY results in an unacceptable risk — e.g. pasteurisation temperature, final chilled storage. CRITICAL LIMIT must be defined, monitored, and triggered for corrective action.
   PRP: برامج الشروط الأساسية — تنظيف/مكافحة آفات/نظافة شخصية. OPRP: تحكم محدد غير مباشر — فحص حرارة الاستلام. CCP: نقطة تحكم حرجة مباشرة — حد حرج محدد يُراقَب ويُتصرف عنده.
D) Critical limits — definition and importance.
   د) الحدود الحرجة — التعريف والأهمية.
   DEFINITION: The maximum or minimum value to which a biological, chemical, or physical parameter must be controlled to prevent, eliminate, or reduce the occurrence of a food safety hazard. EXAMPLES: ≤5°C for chilled meat storage; ≥75°C for cooking; ≤200 ppm for chlorine sanitiser; absence of metal >3mm. CRITICAL: If the limit is crossed and not corrected, the product is UNSAFE. No exceptions, no "close enough."
   التعريف: القيمة القصوى أو الدنيا التي يجب أن يُتحكم بها للوقاية من المخطر. أمثلة: ≤5°C للتخزين المبرد؛ ≥75°C للطهو. إذا تجاوز الحد → المنتج غير آمن.
E) Monitoring — method, frequency, responsibility.
   هـ) المراقبة — الطريقة والتكرار والمسؤولية.
   FOR EACH CCP: Define WHO monitors (named role, not generic "staff"). WHAT is measured (temperature, pH, etc.). HOW it is measured (calibrated instrument + method). WHEN/HOW OFTEN (before service, every 2 hrs, per batch). HOW it is recorded (specific form). Monitoring must be done in real-time — not estimated or back-filled.
   لكل CCP: حدد من يراقب (دور مسمى). ماذا يُقاس. كيف يُقاس (أداة معايَرة). متى/كم مرة. كيف يُسجَّل. المراقبة في الوقت الفعلي — لا تقدير ولا ملء بأثر رجعي.
F) Corrective action — 7-step process.
   و) الإجراء التصحيحي — عملية من 7 خطوات.
   WHEN CCP LIMIT IS EXCEEDED: 1) Stop process / isolate affected product. 2) Identify all affected product (batch/lot/quantity). 3) HOLD — do not release or use. 4) Investigate root cause. 5) Fix the cause (not just the symptom). 6) Evaluate affected product: safe? → release with QA approval. Unsafe? → discard with documented condemnation. 7) Document everything with timestamps and signatures.
   عند تجاوز حد CCP: 1) أوقف العملية وعزل المنتج. 2) حدد جميع المنتجات المتأثرة. 3) احجز. 4) حقق في السبب. 5) أصلح السبب. 6) قيّم المنتج. 7) وثّق كل شيء.
G) Verification — proving the system works.
   ز) التحقق — إثبات أن النظام يعمل.
   DIFFERENCE: Monitoring checks CCP in real time. Verification checks that the WHOLE SYSTEM is effective. EXAMPLES: Calibration of monitoring equipment. Review of monitoring records. Environmental/product microbiological testing. Internal audits. QA observations of actual monitoring activities. Annual HACCP plan review.
   الفرق: المراقبة تتحقق من CCP في الوقت الفعلي. التحقق يثبت أن النظام كله فعّال. أمثلة: معايرة الأجهزة، مراجعة السجلات، اختبار ميكروبيولوجي، تدقيقات.
H) Records — the documented evidence.
   ح) السجلات — الدليل الموثق.
   WHY RECORDS MATTER: Records are the legal and auditable proof that your HACCP system is working. They protect the company, enable traceability, and allow trend analysis. RULE: If it wasn't recorded, it didn't happen — in audits and legal proceedings.
   لماذا السجلات مهمة: السجلات هي الدليل القانوني والقابل للتدقيق. تحمي الشركة وتُمكّن التتبع وتتيح تحليل الاتجاهات. القاعدة: إذا لم يُسجَّل، فهو لم يحدث.
   REQUIRED: CCP monitoring records. Corrective action records. Verification records. Calibration records. Training records. Retain minimum 2 years (or per product shelf life if longer).
I) Traceability and product recall readiness.
   ط) التتبع والاستعداد لاسترجاع المنتج.
   TRACEABILITY CHAIN: Supplier → receiving → storage → processing → distribution → customer. Must be able to trace any product forward and backward through this chain. RECALL DRILL: Must locate all affected product within 4 hours of a recall trigger. Label every batch from receiving; never remove or alter batch markings.
   سلسلة التتبع: مورّد → استلام → تخزين → معالجة → توزيع → زبون. استرجاع: تحديد جميع المنتجات خلال 4 ساعات. علّم كل دفعة من الاستلام.
J) Customer complaints and food safety incidents.
   ي) شكاوى العملاء وحوادث سلامة الغذاء.
   ESCALATION: Any complaint suggesting illness, foreign body, or allergen must go to QA within the same hour. Do NOT dismiss, minimise, or handle informally. Preserve complaint evidence. Log all complaints. Track patterns. If ≥2 complaints of same nature → trigger investigation.
   التصعيد: أي شكوى تشير لمرض/جسم غريب/حساسية تذهب لـ QA خلال ساعة. لا رفض أو تهوين. احفظ أدلة الشكوى. سجّل كل الشكاوى. إذا ≥2 شكوى من نفس النوع → افتح تحقيقاً.
K) Everyone's role in HACCP.
   ك) دور الجميع في الهاسب.
   FOOD HANDLER: Follow procedures, monitor at assigned CCPs, report deviations immediately, complete records accurately. SUPERVISOR: Verify records, take corrective action, support staff, escalate to QA. QA: Maintain HACCP plan, verify effectiveness, manage audits, update plan when process changes. MANAGEMENT: Provide resources, commitment, and culture of food safety.
   متداول الغذاء: اتبع الإجراءات، راقب CCP، أبلغ عن الانحرافات، سجّل بدقة. المشرف: تحقق من السجلات، خذ إجراءات تصحيحية. QA: حافظ على خطة HACCP. الإدارة: وفّر الموارد والالتزام.
L) Continuous improvement — HACCP is a living system.
   ل) التحسين المستمر — الهاسب نظام حي.
   HACCP is not a one-time document. It must be reviewed and updated when: new products or processes are introduced, new hazards emerge, deviations occur repeatedly, audit findings require it, or at minimum annually. Every finding is an improvement opportunity — not a blame exercise.
   الهاسب ليس وثيقة لمرة واحدة. يجب مراجعته عند: منتجات/عمليات جديدة، مخاطر جديدة، انحرافات متكررة، نتائج تدقيق، أو سنوياً كحد أدنى.
   References: ISO 22000:2018 | Codex CXC 1-1969 (HACCP Guidelines) | Dubai Municipality Food Code | WHO HACCP principles.`,

  "Allergen Control": `A) Why allergen control is a life-safety issue.
   أ) لماذا التحكم بمسببات الحساسية قضية سلامة الحياة.
   WHY: Food allergies can trigger anaphylaxis — a rapid, potentially fatal immune reaction requiring emergency epinephrine (EpiPen). Even trace amounts (as low as 1 mg) of some allergens (e.g. peanut, tree nut) can kill a sensitised individual. Allergen mismanagement is among the top causes of food product recalls worldwide.
   لماذا: الحساسية الغذائية يمكن أن تُسبب صدمة الحساسية القاتلة. حتى كميات ضئيلة من بعض مسببات الحساسية (مثل الفول السوداني) يمكن أن تقتل. سوء إدارة الحساسية من أبرز أسباب الاسترجاع العالمي.
   STANDARD: EU 1169/2011 | Codex CXC 1-1969 | ISO 22000:2018 §8.9.
B) The 14 major allergens — know them all.
   ب) مسببات الحساسية الـ 14 الرئيسية — اعرفها جميعاً.
   THE 14 (EU/Codex standard): Cereals containing gluten (wheat, rye, barley, oats), Crustaceans (shrimp, crab, lobster), Eggs, Fish, Peanuts, Soybeans, Milk (including lactose), Tree nuts (almond, hazelnut, walnut, cashew, pecan, Brazil nut, pistachio, macadamia), Celery, Mustard, Sesame, Sulphur dioxide/sulphites (>10 ppm), Lupin, Molluscs.
   الـ 14 مسبباً: حبوب الغلوتين (قمح/جاودار/شعير/شوفان)، القشريات، البيض، السمك، الفول السوداني، فول الصويا، الحليب، المكسرات، الكرفس، الخردل، السمسم، ثاني أكسيد الكبريت، الترمس، المحار.
   AT AL MAWASHI: Primary allergens in scope: milk (marinades), gluten (breadings/seasonings), sesame, mustard. Know what's in every product you handle.
C) Preventing allergen cross-contact.
   ج) منع التلامس المتبادل بمسببات الحساسية.
   CROSS-CONTACT ≠ CROSS-CONTAMINATION: Cross-contamination (microbes) can be destroyed by heat. Cross-contact (allergen proteins) CANNOT be destroyed by cooking — once contaminated, always contaminated. PREVENTION: Dedicated equipment for allergen-containing products (labelled, colour-coded). Process allergen-free products first in the day. Full clean-down between allergen and allergen-free production. Never use the same utensil without washing.
   التلامس المتبادل ≠ التلوث المتبادل: بروتينات الحساسية لا تُدمَّر بالطهو. الوقاية: معدات مخصصة، منتجات خالية من الحساسية أولاً، تنظيف كامل بين الإنتاجين.
D) Labelling accuracy — your legal obligation.
   د) دقة الملصقات — التزامك القانوني.
   RULES: Every product must declare all allergens present — including trace ("may contain"). Never remove, cover, or alter a label. If ingredient changes → label MUST change before release. Check label matches recipe before any batch. Mislabelled allergen product = recall + legal liability.
   القواعد: كل منتج يجب أن يُفصح عن جميع مسببات الحساسية. لا تزيل/تغطي/تعدّل ملصقاً أبداً. إذا تغيرت المكونات → يجب تغيير الملصق قبل الإطلاق. ملصق خاطئ = استرجاع + مسؤولية قانونية.
E) Storage segregation for allergen-containing products.
   هـ) عزل التخزين لمنتجات الحساسية.
   HOW: Allergen-containing ingredients stored in sealed, labelled containers. Dedicated shelf/section in storage. Above allergen-free products if on same shelving. Never use measuring tools from allergen products on allergen-free ones. Wipe/mop spills from allergen products immediately and sanitize.
   كيف: تُخزن في حاويات محكمة مُعلَّمة. رف/قسم مخصص في التخزين. أعلى المنتجات الخالية. لا تستخدم أدوات القياس بين المجموعتين. نظّف الانسكابات فوراً.
F) Cleaning procedure between allergen and allergen-free products.
   و) إجراء التنظيف بين منتجات الحساسية والخالية منها.
   PROTOCOL: Full 5-step clean (detergent + rinse + sanitize + dry). ATP swab verification if required. Supervisor sign-off. Reclean if ATP fails. Document completion before starting allergen-free run. No shortcuts — allergen proteins are invisible and cannot be detected without testing.
   البروتوكول: تنظيف كامل (منظف + شطف + تعقيم + تجفيف). مسحة ATP للتحقق إذا مطلوب. توقيع المشرف. وثّق قبل بدء إنتاج بدون حساسية.
G) What to do when label is missing or incorrect.
   ز) ماذا تفعل عندما يكون الملصق ناقصاً أو خاطئاً.
   IMMEDIATELY: HOLD the product — do NOT allow to leave facility. Inform QA. Do not relabel without QA authorisation. Investigate: was product already distributed? If yes → potential recall. Document the NC. Root cause analysis required. Never assume it's fine — allergen errors have no margin.
   فوراً: احجز المنتج — لا تسمح بمغادرة المنشأة. أبلغ QA. لا تعيد وضع ملصق دون إذن QA. حقق: هل وُزّع المنتج؟ إذا نعم → استرجاع محتمل. لا هامش للخطأ في مسببات الحساسية.
H) Staff awareness — symptoms and emergency response.
   ح) وعي الموظفين — الأعراض والاستجابة الطارئة.
   MILD symptoms (appear within minutes to 2 hrs): hives, itching, swelling, runny nose, nausea, vomiting, abdominal cramps. SEVERE (anaphylaxis — EMERGENCY): throat tightening/swelling, difficulty breathing, drop in blood pressure, loss of consciousness. ACTION: Call 998 (UAE Emergency) IMMEDIATELY. If EpiPen available and person is trained → administer. Do not leave person alone. Do not give food or drink.
   أعراض خفيفة: طفح/حكة/تورم/غثيان. شديدة (طارئة): ضيق تنفس/تورم الحلق/انهيار. الإجراء: اتصل 998 فوراً. إذا متوفر EpiPen ومدرّب → استخدمه. لا تترك الشخص وحده.
I) Rework control — when and how.
   ط) التحكم في إعادة التصنيع — متى وكيف.
   RULE: Rework containing allergens MUST be added back ONLY to products with the same or higher allergen declaration — NEVER to allergen-free products. Rework must be labelled, dated, and tracked. QA must approve all rework decisions. Never use rework as a way to avoid waste at the expense of safety.
   القاعدة: إعادة التصنيع التي تحتوي على مسببات حساسية تُضاف فقط لمنتجات بنفس الإفصاح أو أعلى — أبداً للمنتجات الخالية. QA يجب أن يوافق.
J) Allergen spill response.
   ي) الاستجابة لانسكاب مسببات الحساسية.
   STEPS: 1) Isolate area. 2) Absorb spill completely — do not spread. 3) Remove all equipment/tools from area for full cleaning. 4) Full clean + sanitize the area (allergen-specific cleaning method). 5) Verify with ATP or visual inspection. 6) Document spill + cleaning actions. 7) Check if any product was affected — HOLD if yes.
   الخطوات: 1) عزل المنطقة. 2) امتص الانسكاب كاملاً. 3) أخرج جميع المعدات للتنظيف. 4) تنظيف كامل. 5) تحقق. 6) وثّق. 7) افحص إذا تأثر أي منتج — احجزه.
K) Allergen checklist and records.
   ك) قائمة التحقق من الحساسية والسجلات.
   REQUIRED RECORDS: Allergen risk assessment (per product). Allergen cleaning verification records. Label verification log (before each batch). NC forms for allergen deviations. Corrective action and root cause analysis. QA reviews monthly. All records retained minimum 3 years.
   السجلات المطلوبة: تقييم خطر الحساسية لكل منتج. سجلات تحقق تنظيف الحساسية. سجل التحقق من الملصقات. نماذج NC. مراجعة QA شهرياً. تُحفظ 3 سنوات.
L) Corrective actions and non-conformance handling.
   ل) الإجراءات التصحيحية ومعالجة عدم المطابقة.
   SEVERITY: Allergen NC = HIGH SEVERITY. Automatic QA escalation. Potential regulatory notification (Dubai Municipality) if product distributed. 24-hour corrective action deadline. Root cause report within 48 hours. Systemic prevention required. Near-miss reported same as actual NC — early detection prevents recalls.
   الخطورة: عدم مطابقة الحساسية = خطورة عالية. تصعيد تلقائي لـ QA. إبلاغ محتمل للجهات التنظيمية. تقرير سبب جذري خلال 48 ساعة.
   References: ISO 22000:2018 §8.9 | EU Regulation 1169/2011 | Codex CXC 1-1969 | Dubai Municipality Food Code.`,

  "Cross Contamination Control": `A) What is cross contamination and why it matters.
   أ) ما هو التلوث المتبادل ولماذا يهم.
   DEFINITION: The transfer of microbiological, chemical, or physical hazards from one surface, food, or person to another — rendering safe food unsafe. In meat handling, the primary risk is RAW → RTE transfer of pathogens (Salmonella, E. coli, Listeria, Campylobacter). RTE food receives no further kill step — what goes on it, stays on it.
   التعريف: انتقال المخاطر الميكروبية/الكيميائية/الفيزيائية من سطح أو غذاء أو شخص لآخر. اللحم النيء → الجاهز = الخطر الأكبر. الجاهز لا يخضع لمزيد من معالجة قتل الجراثيم.
   STANDARD: HACCP PRP | ISO 22000:2018 §8.2 | Dubai Municipality Food Code §7.
B) Separating raw and RTE — areas, tools, and people.
   ب) فصل النيء عن الجاهز — المناطق والأدوات والأشخاص.
   HOW: Physically separate areas (different rooms or zones with barriers). Dedicated cutting boards, knives, containers per zone. Dedicated staff where possible — if staff work in both zones, full PPE change + handwash between. Never carry raw product through RTE area. Air flow from RTE → raw direction (not reverse).
   كيف: فصل مادي للمناطق. ألواح/سكاكين/حاويات مخصصة لكل منطقة. موظفون مخصصون إن أمكن. لا تحمل منتجاً نيئاً عبر منطقة الجاهز. تدفق الهواء من الجاهز نحو النيء.
C) Colour-coding system.
   ج) نظام ترميز الألوان.
   STANDARD SCHEME: Red = raw meat. Blue = raw fish/RTE seafood. Yellow = cooked/RTE poultry. Green = vegetables/salads. White = dairy/bakery. Purple = allergen-containing items (site-specific). This is a MANDATORY control. Using a wrong colour in the wrong zone is an immediate NC requiring corrective action and retraining.
   المخطط: أحمر = لحم نيء. أزرق = سمك/مأكولات بحرية. أصفر = مطبوخ/جاهز. أخضر = خضار. أبيض = ألبان/مخبوزات. استخدام لون خاطئ = NC فوري.
D) Drip contamination prevention in the chiller.
   د) منع تلوث التنقيط في البراد.
   THE RULE: Raw meat ALWAYS on the BOTTOM shelf. RTE and cooked products on UPPER shelves. Never store raw product directly above RTE — no exceptions, even temporarily. Cover all products. Check shelf arrangement at start of every shift.
   القاعدة: اللحم النيء دائماً في الرف السفلي. الجاهز والمطبوخ في الأرفف العلوية. لا استثناءات ولو مؤقتاً. غطِّ جميع المنتجات.
E) Hand hygiene between tasks.
   هـ) نظافة اليدين بين المهام.
   MANDATORY HANDWASH (not just sanitizer) when: switching from raw to RTE. After touching phone, money, face, hair. After touching waste or cleaning equipment. After using the toilet. After removing gloves (gloves do not replace handwashing). PROCEDURE: Wet → soap → 20-second scrub → rinse → dry with single-use towel → sanitizer.
   غسل يدين إلزامي عند: الانتقال من نيء لجاهز. بعد لمس الهاتف/المال/الوجه. بعد النفايات/معدات التنظيف. بعد دورة المياه. بعد خلع القفازات.
F) Personal items, phones, and money.
   و) الأشياء الشخصية والهواتف والمال.
   RULE: Handling money, personal phones, or personal items = hands contaminated — even if "just for a second." AFTER ANY SUCH CONTACT: Remove gloves → discard. Full handwash. New gloves before touching food or food-contact surfaces. No mobile phones in production or storage areas.
   القاعدة: التعامل مع المال/الهاتف = أيادٍ ملوثة. بعد أي تلامس: اخلع القفازات/ارمها. اغسل يديك كاملاً. ارتدِ قفازات جديدة قبل لمس الغذاء.
G) Covering products and safe packaging.
   ز) تغطية المنتجات والتغليف الآمن.
   ALL EXPOSED PRODUCTS MUST BE COVERED: in storage (cling film/sealed container with label). During preparation (if not actively working on them). During transport or transit between areas. Exception: product being actively worked on by dedicated staff. Damaged or punctured packaging = treat as potential contamination → assess + document.
   جميع المنتجات المكشوفة يجب تغطيتها: في التخزين. أثناء التحضير. أثناء النقل. تغليف تالف = معالجة محتملة للتلوث.
H) Waste handling without contaminating food areas.
   ح) التعامل مع النفايات بدون تلويث مناطق الغذاء.
   RULES: Waste bins have lids — keep them closed. Never carry overflowing waste past food prep areas. Use dedicated waste route (not through production). Remove gloves and wash hands AFTER handling waste BEFORE returning to food work. Clean and sanitize the waste area and trolley after each collection.
   القواعد: سلال النفايات مغطاة. لا تحمل نفايات فائضة عبر مناطق الإنتاج. أزل القفازات واغسل يديك بعد النفايات. نظّف منطقة النفايات بعد كل جمع.
I) Workflow control — zoning and movement.
   ط) التحكم بسير العمل — التقسيم والحركة.
   ZONES: Define clean zone (RTE/processed), contaminated zone (raw/receiving), and transition zone with handwash stations. Staff must follow zoning protocols — no wandering between zones without hygiene transition. Visitors must follow same rules. Uniforms from raw zone must not enter RTE zone.
   المناطق: منطقة نظيفة (جاهز/معالج)، ملوثة (نيء/استلام)، انتقالية. الموظفون يتبعون بروتوكول التنقل. الزوار نفس القواعد. زي منطقة النيء لا يدخل منطقة الجاهز.
J) Equipment cleaning after raw product processing.
   ي) تنظيف المعدات بعد معالجة النيء.
   RULE: Any equipment (slicer, grinder, band saw, tray) that contacts raw meat must be fully cleaned and sanitised before contact with any other product — no exceptions. Disassemble slicers/grinders for thorough cleaning. Record cleaning on equipment cleaning log with time and signature.
   القاعدة: أي معدة تلامست مع اللحم النيء يجب تنظيفها وتعقيمها قبل ملامسة أي منتج آخر. فكّك الأجهزة للتنظيف العميق. سجّل مع التوقيت والتوقيع.
K) Verification through hygiene checks and environmental monitoring.
   ك) التحقق عبر فحوصات النظافة والمراقبة البيئية.
   METHODS: Visual inspection (no visible residue, blood, or debris). ATP bioluminescence swabs (detects organic contamination — fail = reclean). Microbiological environmental swabs (surface testing for Listeria, E. coli, TVC). Frequency: daily visual + periodic ATP + quarterly or as required micro swabs.
   الطرق: فحص بصري. مسحات ATP. مسحات ميكروبيولوجية. التكرار: يومياً بصرياً + ATP دوري + مسحات ميكروبية ربع سنوية.
L) Documentation and corrective actions.
   ل) التوثيق والإجراءات التصحيحية.
   REQUIRED RECORDS: Daily hygiene inspection log. Equipment cleaning records. ATP swab results. Microbiological monitoring results. NC forms for cross-contamination incidents. Corrective action follow-up. Staff training records. QA reviews monthly.
   السجلات المطلوبة: سجل تفتيش نظافة يومي. سجلات تنظيف معدات. نتائج مسحات ATP. نتائج المراقبة الميكروبيولوجية. نماذج NC.
   References: HACCP PRP | ISO 22000:2018 §8.2 | Dubai Municipality Food Code §7 | Codex CXC 1-1969.`,

  "Chemical Safety (Food + OHS)": `A) Why chemical safety is a dual threat — food safety AND worker safety.
   أ) لماذا سلامة الكيميائيات تهديد مزدوج — سلامة الغذاء وسلامة العمال.
   FOOD SAFETY RISK: Chemical residues on food-contact surfaces or in food → chemical contamination of product → consumer harm → recall. OHS RISK: Incorrect chemical handling → chemical burns, eye injury, respiratory damage, chemical fire. Both risks are PREVENTABLE with proper procedures.
   خطر سلامة الغذاء: بقايا كيميائية على أسطح التلامس → تلوث كيميائي للمنتج. خطر السلامة المهنية: تعامل خاطئ → حروق/إصابة عين/تلف تنفسي. كلاهما قابل للوقاية.
   STANDARD: ISO 22000:2018 §8.2 | UAE OHS Regulations | Dubai Municipality Food Code §8 | SDS (Safety Data Sheets).
B) Chemical identification and labelling.
   ب) تعريف الكيميائيات والتعليم عليها.
   RULE: Every chemical container MUST have a legible label showing: product name, hazard symbols, dilution rate/concentration, use instructions, first aid measures, supplier/manufacturer. NEVER use unlabelled bottles — even temporarily. NEVER transfer chemicals to food containers (bottles, jars). Transfer only to dedicated chemical containers with proper labels.
   القاعدة: كل حاوية كيميائية يجب أن تحمل: اسم المنتج، رموز الخطر، معدل التخفيف، تعليمات الاستخدام، إسعافات أولية. ممنوع عبوات بدون ملصق. ممنوع نقل الكيميائيات لعبوات الغذاء.
C) Chemical storage — safe location and conditions.
   ج) تخزين الكيميائيات — الموقع الآمن والشروط.
   REQUIREMENTS: Designated locked chemical cabinet or room — NEVER in food storage areas, production areas, or above food. Ventilated space. Separated by type (acids separate from bases/bleaches). Spill trays under containers. Current SDS folder accessible. Minimum/maximum stock — no excess accumulation.
   المتطلبات: خزانة/غرفة مغلقة مخصصة. مهوّاة. مفصولة حسب النوع. صواني تجميع تحت الحاويات. مجلد SDS متاح. لا تراكم مفرط.
D) Safety Data Sheets (SDS) — what you must know.
   د) صحائف بيانات السلامة SDS — ما يجب أن تعرفه.
   THE 5 KEY SECTIONS FOR DAILY USE: Section 2: Hazard identification (what can go wrong). Section 4: First aid measures (what to do if accident occurs). Section 6: Accidental release measures (spill response). Section 8: Exposure controls / PPE required. Section 13: Disposal (how to dispose safely). SDS must be on-site, current, and in a language staff can read.
   أقسام SDS الخمسة للاستخدام اليومي: القسم 2 (تحديد المخاطر)، 4 (إسعافات أولية)، 6 (الانسكاب)، 8 (PPE المطلوب)، 13 (التخلص الآمن). SDS يجب أن يكون في الموقع وبلغة يفهمها الموظفون.
E) PPE requirements for chemical handling.
   هـ) متطلبات PPE لمناولة الكيميائيات.
   MINIMUM PPE: Chemical-resistant gloves (not latex food gloves — different protection). Eye protection (safety goggles — not regular glasses). Chemical-resistant apron. Closed-toe safety shoes. When diluting concentrated chemicals: face shield in addition to goggles. When spraying chemicals: respiratory mask (P2/FFP2 minimum).
   PPE الأدنى: قفازات مقاومة للكيميائيات. نظارات سلامة. مريول مقاوم للكيميائيات. حذاء أمان. عند تخفيف المركّزات: درع وجه. عند الرش: قناع تنفسي.
F) Correct dilution — the science of effectiveness.
   و) التخفيف الصحيح — علم الفعالية.
   WHY DILUTION MATTERS: Too weak → ineffective (doesn't kill pathogens or clean properly). Too strong → chemical contamination risk + surface damage + wasted product + worker exposure risk. ALWAYS: Use measured dosing (cup/syringe/dispenser — never free-pour). Use room-temperature or warm water (not hot — degrades some sanitisers). Mix in correct order (water first, then chemical — never reverse for concentrate). Record dilution on log.
   لماذا التخفيف مهم: ضعيف جداً → غير فعّال. قوي جداً → خطر تلوث كيميائي. دائماً: استخدم جرعة مقاسة. ماء أولاً ثم الكيميائي. سجّل التخفيف.
G) The one rule that can save your life — NEVER MIX CHEMICALS.
   ز) القاعدة التي تنقذ حياتك — لا تخلط الكيميائيات أبداً.
   DEADLY COMBINATIONS: Bleach (sodium hypochlorite) + acid cleaners = CHLORINE GAS — respiratory damage and death. Bleach + ammonia = CHLORAMINE GAS — toxic. Bleach + hydrogen peroxide = OXYGEN GAS + explosive potential. Even "similar" chemicals can react unpredictably. RULE: If not specifically instructed by SOP and SDS — DO NOT MIX. If unsure — ask your supervisor BEFORE mixing.
   تركيبات قاتلة: كلور + حوامض = غاز كلور قاتل. كلور + أمونيا = غاز كلورامين سام. القاعدة: إذا لم يُعلَّمك SOP/SDS → لا تخلط. إذا شككت → اسأل المشرف أولاً.
H) Spill response and first aid.
   ح) الاستجابة للانسكاب والإسعافات الأولية.
   SPILL: 1) Alert others, ventilate area. 2) PPE on before approaching. 3) Contain spill with absorbent material. 4) Collect waste for proper disposal. 5) Decontaminate area. 6) Document in spill log. SKIN CONTACT: Immediately flush with large amounts of water for 15–20 minutes. Remove contaminated clothing. EYE CONTACT: Flush eye wash station minimum 15 minutes. Call for medical assistance. INHALATION: Move to fresh air immediately. Seek medical help if symptoms persist.
   انسكاب: 1) تنبيه/تهوية. 2) PPE. 3) احتواء. 4) تخلص آمن. 5) تنظيف. 6) توثيق. ملامسة جلد: شطف بالماء 15–20 دقيقة. العين: محطة غسيل عيون 15 دقيقة. استنشاق: هواء طلق فوراً.
I) Preventing chemical contamination of food.
   ط) منع التلوث الكيميائي للغذاء.
   RULES: Never use/store chemicals in food areas during production. Ensure correct contact time and rinse if sanitiser requires it. Never spray chemicals near open food. Remove all food/packaging before applying chemical treatments. Check no residue before returning to food production. Food-grade chemicals only for surfaces that contact food.
   القواعد: لا كيميائيات في مناطق الغذاء أثناء الإنتاج. تأكد من زمن التلامس والشطف الصحيح. أزل الغذاء/التغليف قبل تطبيق الكيميائيات. كيميائيات معتمدة للغذاء فقط.
J) Approved chemicals — use only what's authorised.
   ي) الكيميائيات المعتمدة — استخدم المصرح به فقط.
   RULE: Only chemicals on the site's approved chemical list (maintained by QA) may be used. New chemicals require QA/management approval + SDS review + staff training before first use. Never bring personal cleaning products to work. Never use a chemical for a purpose not stated on its label or SOP.
   القاعدة: فقط الكيميائيات في قائمة الموافقة (يحتفظ بها QA). كيميائيات جديدة تتطلب موافقة QA + مراجعة SDS + تدريب. ممنوع استخدام منتجات شخصية. لا تستخدم كيميائياً لغرض غير مذكور في ملصقه.
K) Disposal of empty containers and chemical waste.
   ك) التخلص من العبوات الفارغة والنفايات الكيميائية.
   RULES: Empty containers must be triple-rinsed before disposal if recyclable. Hazardous chemical waste must not go in regular waste — follow site hazardous waste disposal procedure. Never re-use chemical containers for any other purpose (especially not food). Return large containers to supplier for proper disposal where arranged.
   القواعد: العبوات الفارغة تُشطف ثلاث مرات قبل التخلص. النفايات الكيميائية الخطرة لا تذهب للنفايات العامة. لا تعيد استخدام العبوات الكيميائية لأي غرض آخر.
L) Records and corrective actions.
   ل) السجلات والإجراءات التصحيحية.
   REQUIRED: Chemical inventory log. Dilution verification record. Chemical usage log (who used, what, how much, where). SDS register (all on-site chemicals documented). Spill/incident log. Training records. Corrective action for misuse. QA audits chemical area monthly. Any unauthorised chemical found = immediate NC + investigation.
   المطلوب: سجل مخزون. سجل تحقق تخفيف. سجل استخدام. سجل SDS. سجل انسكاب/حوادث. سجلات تدريب. إجراء تصحيحي لسوء الاستخدام.
   References: ISO 22000:2018 §8.2 | UAE OHS Regulations | Dubai Municipality Food Code §8 | GHS (Globally Harmonised System).`,

  "Pest Control Awareness": `A) Why pests are a critical food safety threat.
   أ) لماذا الآفات تهديد حرج لسلامة الغذاء.
   WHY: Rodents (rats/mice) and insects (cockroaches, flies, stored-product insects) are mechanical vectors of pathogens — they carry Salmonella, Listeria, E. coli, hepatitis A, and other agents on their bodies and in their droppings. A single rat can contaminate 40+ kg of food in one night. Pest presence in a food facility = automatic major non-conformance in any audit.
   لماذا: القوارض والحشرات ناقلات ميكانيكية للمسببات المرضية. فأر واحد يمكن أن يلوّث 40+ كغم من الغذاء في ليلة. وجود الآفات في منشأة غذائية = عدم مطابقة كبير في أي تدقيق.
   STANDARD: ISO 22000:2018 §8.2.4 | HACCP PRP | Dubai Municipality Food Code §9.
B) Recognising signs of pest activity — what to look for.
   ب) التعرف على علامات نشاط الآفات — ماذا تبحث عنه.
   RODENTS: Fresh droppings (dark, moist, 6–12mm for rats; smaller for mice). Gnaw marks on packaging, cables, walls, wood. Grease/smear marks along walls (from fur). Runways/tracks in dusty areas. Nesting material (shredded paper, fabric). Rodent sightings (active at night — seeing one by day means major infestation). COCKROACHES: Oval dark droppings like ground pepper. Shed skins/egg cases (oothecae). Musty/oily odour. Sightings in dark, warm, humid areas. FLIES: Large numbers around waste, drains, or food sources. Larvae/pupae near waste or organic matter.
   قوارض: فضلات طازجة، آثار قضم، خطوط شحم على الجدران، مسارات في الغبار، مشاهدة قوارض. صراصير: فضلات مثل الفلفل المطحون، جلد منسلخ، رائحة كريهة. ذباب: أعداد كبيرة حول النفايات.
C) Deny entry — close all pest entry points.
   ج) منع الدخول — أغلق جميع نقاط دخول الآفات.
   DISCIPLINE: Keep all doors closed when not in use — especially external doors, loading dock doors, chiller doors. Fit door sweeps/seals on external doors. Report any gap under doors, holes in walls, broken screens to supervisor immediately. Check pipe/cable entries for gaps. Maintain drain covers. Rodents can enter through gaps as small as 6mm (size of pencil eraser).
   الانضباط: أغلق جميع الأبواب عند عدم الاستخدام. أبلغ عن أي فجوة تحت الأبواب/ثقوب في الجدران. تحقق من مداخل الأنابيب. القوارض تدخل من فجوات 6mm فقط.
D) Housekeeping — eliminate food, water, and shelter.
   د) النظافة والترتيب — ازل الغذاء والماء والمأوى.
   THE 3 PEST NEEDS: Food (any organic waste, spills, crumbs). Water (standing water, leaky pipes, condensation). Shelter (clutter, cardboard boxes, infrequently moved items). ELIMINATE ALL THREE: Clean spills immediately. Remove waste at least every 2 hours. No standing water on floors. No unnecessary clutter. Move/rotate stored items regularly. Inspect beneath/behind equipment.
   الاحتياجات الثلاثة للآفات: غذاء + ماء + مأوى. ازلها جميعاً: نظّف الانسكابات فوراً، أزل النفايات كل ساعتين، لا ماء راكد، لا فوضى.
E) Storage discipline — deny shelter and food access.
   هـ) انضباط التخزين — منع المأوى والوصول للغذاء.
   RULES: All products 15cm off the floor. 5cm away from walls. Cardboard boxes: inspect on receipt, remove excessive outer packaging, never store cardboard long-term (prime rodent nesting material). Seal all open product containers. Inspect incoming deliveries for pest evidence before accepting. Rotate stock to expose older items.
   القواعد: المنتجات 15 سم فوق الأرض. 5 سم عن الجدران. الكرتون: افحص عند الاستلام وأزل التغليف الخارجي الزائد. أغلق جميع العبوات المفتوحة. افحص التسليمات الواردة بحثاً عن علامات الآفات.
F) Reporting pest sightings — your responsibility.
   و) الإبلاغ عن مشاهدة الآفات — مسؤوليتك.
   IMMEDIATELY UPON SIGHTING: Do NOT attempt to catch or kill the pest yourself (can spread it further). Note the exact location, time, what was seen. Report to supervisor/QA immediately — same shift. Do NOT wait until end of day. Do NOT assume it was a one-off. Document on pest sighting report form. All staff are the eyes of the pest control program.
   فور المشاهدة: لا تحاول الإمساك بالآفة نفسك. سجّل الموقع والوقت وما شاهدت. أبلغ المشرف/QA فوراً في نفس الشفت. لا تنتظر. جميع الموظفين هم أعين برنامج مكافحة الآفات.
G) Pest control bait stations and traps — hands off.
   ز) محطات الطُعم والمصائد — لا تلمسها.
   RULES: Do NOT move, open, remove, or interfere with bait stations or traps in any way. Rodenticides are toxic — even skin contact can cause harm. Only the licensed pest control contractor is authorised to service them. Report if a station appears disturbed, removed, or accessed. Note the station locations so you can report changes.
   القواعد: لا تحرك/تفتح/تزيل/تعبث بمحطات الطُعم أو المصائد بأي شكل. المبيدات سامة. فقط المقاول المرخص مخوّل لصيانتها. أبلغ إذا بدت محطة متأثرة أو منقولة.
H) Licensed contractor — the only authorised pest control applicator.
   ح) المقاول المرخص — المطبّق الوحيد المخوّل لمكافحة الآفات.
   WHY: UAE regulations require pest control in food facilities to be performed by a licensed, trained contractor. Incorrect pesticide application by untrained staff can result in chemical contamination of food, illness, regulatory closure. NEVER apply any pesticide, insecticide, or rodenticide yourself. Contractor visits should be documented and scheduled. Ensure food is covered/removed before any treatment.
   لماذا: أنظمة الإمارات تشترط تنفيذ مكافحة الآفات بواسطة مقاول مرخص. التطبيق غير الصحيح = تلوث كيميائي + إغلاق تنظيمي. لا تطبّق أي مبيد بنفسك. تأكد من تغطية/إزالة الغذاء قبل أي معالجة.
I) Pest control monitoring — your role in the program.
   ط) مراقبة مكافحة الآفات — دورك في البرنامج.
   DAILY: Walk the area at start of shift — check for new droppings, gnaw marks, dead insects, or changes in bait stations. WEEKLY: Supervisor reviews all pest sighting reports. CONTRACTOR VISIT: Monthly minimum (more in high-risk periods). Staff to accompany and point out any issues noted. Review contractor report and ensure any identified issues are actioned.
   يومياً: جولة في المنطقة عند بدء الشفت — ابحث عن فضلات/آثار قضم/حشرات نافقة. أسبوعياً: المشرف يراجع التقارير. زيارة المقاول: شهرياً كحد أدنى.
J) Corrective actions when pest activity is found.
   ي) الإجراءات التصحيحية عند وجود نشاط آفات.
   STEPS: 1) Segregate/HOLD all potentially contaminated product. 2) Photograph evidence. 3) Inform QA immediately. 4) Contact pest control contractor for emergency treatment. 5) Deep clean affected area. 6) Root cause analysis (how did they get in?). 7) Seal entry points. 8) Increase monitoring frequency. 9) All affected product evaluated by QA — discard if risk. 10) Document all actions.
   الخطوات: 1) حجز المنتجات المحتمل تلوثها. 2) تصوير الأدلة. 3) إبلاغ QA. 4) إبلاغ المقاول لمعالجة طارئة. 5) تنظيف عميق. 6) تحليل سبب جذري. 7) إغلاق نقاط الدخول. 8) زيادة تكرار المراقبة. 9) تقييم جميع المنتجات المتأثرة.
K) Preventing contamination during pest treatments.
   ك) منع التلوث أثناء معالجات الآفات.
   BEFORE TREATMENT: Cover/remove all food and food-contact equipment. Store covered items in sealed area. Brief production staff on areas being treated. After treatment: ventilate, clean surfaces, verify no chemical residue before resuming food production. Document treatment and re-entry time.
   قبل المعالجة: غطِّ/أزل جميع الغذاء والمعدات. بعد المعالجة: هوّد، نظّف الأسطح، تحقق من عدم وجود بقايا كيميائية قبل استئناف الإنتاج.
L) Documentation and audit requirements.
   ل) التوثيق ومتطلبات التدقيق.
   REQUIRED: Pest sighting log (all sightings, date, location, species, action). Contractor visit reports and treatment records. Corrective action records. Bait station map (locations). Monthly QA review of pest control status. Dubai Municipality inspectors will specifically review pest control records — ensure up to date.
   المطلوب: سجل مشاهدة الآفات. تقارير زيارات المقاول. سجلات الإجراءات التصحيحية. خريطة محطات الطُعم. مراجعة QA الشهرية. مفتشو بلدية دبي يراجعون سجلات مكافحة الآفات تحديداً.
   References: ISO 22000:2018 §8.2.4 | HACCP PRP | Dubai Municipality Food Code §9 | UAE Pest Control Regulations.`,

  "Waste Management": `A) Why waste management is a food safety and regulatory requirement.
   أ) لماذا إدارة النفايات متطلب لسلامة الغذاء والجهات التنظيمية.
   WHY: Improperly managed waste: attracts pests (waste = food, water, shelter for rodents/insects). Creates cross-contamination risk (waste juices/odours can migrate to food). Causes regulatory violations (Dubai Municipality inspects waste areas). Harms environment and community. Proper waste management is a GHP prerequisite — it protects the facility, product, and people.
   لماذا: النفايات سيئة الإدارة: تجذب الآفات، تخلق خطر تلوث متبادل، تسبب مخالفات تنظيمية. إدارة النفايات برنامج GHP أساسي.
   STANDARD: ISO 22000:2018 §8.2.3 | Dubai Municipality Waste Regulations | HACCP PRP.
B) Waste segregation — the three streams.
   ب) فصل النفايات — المسارات الثلاثة.
   FOOD WASTE: Organic material (meat trimmings, fat, blood, bone, expired product). In dedicated food-waste bins with liners, lids always closed. Removed to cold waste room or external bin frequently. GENERAL WASTE: Packaging, cardboard, plastics, paper. Separate bins. Recycling where facility has the capability. HAZARDOUS WASTE: Chemicals, chemical containers, pesticide waste, contaminated PPE. Separate labelled container per UAE hazardous waste regulations — NEVER mix with general waste.
   نفايات الغذاء: مواد عضوية في سلال مغطاة مع بطانات. عامة: تغليف/كرتون/بلاستيك. خطرة: كيميائيات/حاويات/PPE ملوث — لا تخلط أبداً مع العامة.
C) Bin requirements and maintenance.
   ج) متطلبات السلال وصيانتها.
   REQUIREMENTS: Covered (lids that close properly). Lined (plastic liner — change with every emptying). Colour-coded or labelled by waste type. Non-porous, cleanable material (not cardboard). Food-waste bins: appropriate size to avoid overfilling. MAINTENANCE: Wash and sanitize bins daily. Replace damaged bins immediately. No bin without a liner in food production areas.
   المتطلبات: مغطاة (أغطية تُغلق). مبطنة (استبدل البطانة مع كل تفريغ). مُرمَّزة بالألوان. مادة غير مسامية. تنظيف وتعقيم السلال يومياً. استبدل السلال التالفة فوراً.
D) Emptying frequency — never allow overflow.
   د) تكرار التفريغ — لا تسمح بالفيضان أبداً.
   RULE: Food-waste bins must be emptied at minimum every 2 hours during production — more frequently if busy or if waste is high-volume. NEVER allow waste to overflow. An overflowing bin is a pest attraction, a hygiene failure, and an immediate corrective action trigger. In general: if a bin is 2/3 full — empty it now, don't wait.
   القاعدة: سلال النفايات الغذائية تُفرَّغ كل ساعتين على الأقل أثناء الإنتاج. لا تسمح بالفيضان. إذا السلة 2/3 ممتلئة → أفرّغها الآن.
E) Safe disposal of condemned and expired products.
   هـ) التخلص الآمن من المنتجات المعدمة والمنتهية.
   PROCESS: Complete condemnation form (QA authorised). Weigh and record quantity. Mark clearly as CONDEMNED — not for sale or use. Dispose in manner that prevents recovery (food-grade destruction, inedible waste stream, or licensed waste disposal). Do NOT put condemned product in general waste where it could be retrieved and misused. Photograph for records.
   العملية: أكمل نموذج الإعدام (QA يخوّل). زن وسجّل الكمية. علّم بوضوح بـ "معدوم". تخلص بطريقة تمنع الاسترداد. صوّر للسجلات.
F) Cross-contamination prevention during waste handling.
   و) منع التلوث المتبادل أثناء مناولة النفايات.
   RULES: Dedicated waste transport trolleys — never used for product. Waste route does NOT pass through food production or RTE areas. Waste handlers change gloves and wash hands BEFORE returning to any food work. Clean and sanitise waste trolleys after each use. Waste area physically separated from food areas.
   القواعد: عربات نقل نفايات مخصصة. مسار النفايات لا يمر بمناطق الإنتاج. أيدٍ نظيفة وقفازات جديدة قبل العودة للعمل الغذائي. تنظيف وتعقيم العربات بعد كل استخدام.
G) PPE for waste handling.
   ز) PPE لمناولة النفايات.
   REQUIRED: Heavy-duty gloves (not thin food gloves — waste can contain sharp packaging fragments). Safety shoes (protection from dropped items). Dedicated apron for waste duty (not the food production apron). Face protection when handling liquid waste or cleaning waste area (splash risk).
   المطلوب: قفازات سميكة (ليست قفازات الغذاء الرقيقة). حذاء أمان. مريول مخصص للنفايات. حماية الوجه عند معالجة النفايات السائلة.
H) Waste area discipline — the pest connection.
   ح) انضباط منطقة النفايات — الصلة بالآفات.
   KEY LINK: Food waste areas are the primary pest attraction point in any food facility. An undisciplined waste area = a guaranteed pest problem. REQUIREMENTS: External waste area/bins covered and secured. No waste left outside the designated collection point. Waste area cleaned and hosed down daily. Area around bins kept clear. Pest control contractor specifically treats waste areas.
   الصلة الأساسية: مناطق نفايات الغذاء هي نقطة الجذب الرئيسية للآفات. سلة نفايات غير منضبطة = مشكلة آفات مضمونة. المتطلبات: منطقة خارجية مغطاة ومؤمنة. تنظيف يومي.
I) Spill control during waste transport.
   ط) التحكم بالانسكاب أثناء نقل النفايات.
   RULE: Ensure bin liners are tied before removing from bin. Use trolleys with lids or secure bags to prevent drips during transport. If spillage occurs during transport: immediately stop, clean and sanitize the spill trail, document, investigate cause (overfilled bin, torn liner, etc.). A blood/juice trail through a corridor is a contamination incident.
   القاعدة: اربط البطانة قبل إزالتها. استخدم عربات مغطاة لمنع القطرات. إذا حدث انسكاب: أوقف، نظّف وعقّم مسار الانسكاب، وثّق.
J) Waste collection schedule and responsibilities.
   ي) جدول جمع النفايات والمسؤوليات.
   WHO: Designated waste handler per shift (named in shift rota). Supervisor monitors compliance. QA audits monthly. WHEN: Food waste every 2 hours. End-of-shift full clearance. External bin collected by licensed waste contractor per agreed frequency. ALL HANDOVERS: Outgoing shift confirms waste status to incoming shift in shift log.
   المسؤوليات: معالج نفايات مخصص لكل شفت. المشرف يراقب. QA يدقق شهرياً. الجدول: غذائية كل ساعتين. تصفية كاملة نهاية الشفت.
K) Condemnation and waste records.
   ك) سجلات الإعدام والنفايات.
   REQUIRED: Condemnation log (product, quantity, reason, date, QA signature, disposal method). Waste collection log (date, type, quantity, collector). Chemical waste disposal records. Contractor waste collection certificates. QA reviews monthly. Retained minimum 2 years.
   المطلوب: سجل إعدام (المنتج/الكمية/السبب/التاريخ/توقيع QA/طريقة التخلص). سجل جمع النفايات. سجلات التخلص من النفايات الكيميائية. شهادات المقاول.
L) Corrective actions and improvement.
   ل) الإجراءات التصحيحية والتحسين.
   COMMON WASTE FAILURES: Overflowing bins, bins without liners, waste in wrong area, no PPE, waste left overnight. ALL ARE IMMEDIATE NCs. Corrective action: fix immediately + retrain + investigate root cause. Monthly trend analysis: if same issue recurs → systemic fix (schedule change, bin relocation, additional bins, supervisor check frequency).
   إخفاقات النفايات الشائعة: سلال مفيضة/بدون بطانة/نفايات في مكان خاطئ/بدون PPE. كلها NCs فورية. التحليل الشهري للاتجاهات.
   References: ISO 22000:2018 §8.2.3 | Dubai Municipality Waste Regulations | HACCP PRP | UAE Environmental Regulations.`,

  "OHS: PPE & Safe Work": `A) Why PPE is the last line of defence — not the first.
   أ) لماذا PPE هو آخر خط دفاع — ليس الأول.
   THE HIERARCHY OF CONTROLS: 1) Eliminate the hazard. 2) Substitute (less hazardous method). 3) Engineering controls (guards, ventilation). 4) Administrative controls (procedures, training). 5) PPE — only when other controls cannot fully eliminate risk. PPE does NOT eliminate hazards — it reduces exposure. Wearing PPE incorrectly = false sense of safety. STANDARD: UAE OHS Federal Law No. 8/1980 | Dubai Municipality Health & Safety Code.
   التسلسل الهرمي للتحكم: 1) إزالة الخطر. 2) استبدال. 3) ضوابط هندسية. 4) ضوابط إدارية. 5) PPE — آخر خط دفاع فقط. PPE لا يُزيل المخاطر بل يقلل التعرض.
B) Required PPE by task — know what you need.
   ب) PPE المطلوب حسب المهمة — اعرف ما تحتاجه.
   FOOD HANDLING: Hairnet/beard net, food-grade disposable gloves, clean apron, safety shoes (closed-toe, non-slip, water-resistant). CUTTING/PROCESSING: Cut-resistant glove (non-dominant hand), chain mail apron if processing large cuts. CHEMICAL HANDLING: Chemical-resistant gloves, safety goggles, chemical-resistant apron, safety shoes. COLD ROOM: Thermal gloves, thermal jacket, appropriate footwear. CLEANING: Heavy-duty gloves, non-slip shoes, eye protection if using sprayers.
   مناولة الغذاء: شبكة شعر/لحية، قفازات غذائية، مريول، حذاء أمان. قطع/معالجة: قفاز مقاوم للقطع، درع سلسلة إن لزم. كيميائيات: قفازات مقاومة، نظارات، مريول. غرفة تبريد: قفازات حرارية، جاكيت حراري.
C) PPE inspection, fit, and maintenance.
   ج) فحص PPE والملاءمة والصيانة.
   BEFORE EVERY USE: Inspect PPE — no tears, cracks, deformation, or degradation. Check fit — gloves correct size, goggles create a seal. DAMAGED PPE: Remove from service immediately. Label "DO NOT USE." Report to supervisor. Replace before resuming work. CLEANING: Reusable PPE (goggles, aprons, gloves) — clean and sanitize after each shift. Safety shoes — clean and inspect weekly. Never share PPE without thorough cleaning.
   قبل كل استخدام: افحص PPE — بلا تمزق أو تشقق. افحص الملاءمة. تالف: أخرج من الخدمة فوراً، علّم وأبلغ المشرف. التنظيف: PPE القابل لإعادة الاستخدام — نظّف وعقّم بعد كل شفت.
D) Slips, trips, and falls — the top cause of workplace injury.
   د) الانزلاق والتعثر والسقوط — السبب الأول لإصابات العمل.
   COMMON CAUSES IN MEAT FACILITIES: Wet floors (water, blood, fat), poor drainage, lack of wet floor signs, trailing cables/hoses, uneven surfaces, poor lighting, inappropriate footwear. PREVENTION: Report wet/slippery floor immediately and place wet floor sign. Clean spills at once. Ensure floor drainage is functioning. Never run. Carry loads at manageable level — don't block sightline. Anti-slip matting at key points. Anti-slip safety shoes mandatory.
   أسباب شائعة: أرضيات رطبة، تصريف ضعيف، كابلات/خراطيم مدلاة، سطوح غير مستوية، إضاءة ضعيفة. الوقاية: أبلغ عن الأرضية الزلقة فوراً، ضع لافتة، نظّف الانسكابات فوراً.
E) Near-miss reporting — your safety duty.
   هـ) الإبلاغ عن الحوادث القريبة — واجب السلامة.
   DEFINITION: A near-miss is an unplanned event that did NOT result in injury/damage BUT COULD HAVE. Examples: Slipped but didn't fall. A box fell but missed someone. A knife slipped but didn't cut. WHY REPORT: Every near-miss reported prevents a real accident. Near-misses are data — they show where the next real injury will happen. No blame culture — reporting is protected. HOW: Verbal to supervisor immediately + written near-miss form same shift.
   التعريف: حدث غير مخطط لم ينتج عنه أذى لكن كان يمكن أن ينتج. لماذا تُبلّغ: كل near-miss مُبلَّغ عنه يمنع حادثاً حقيقياً. كيف: شفهياً للمشرف فوراً + نموذج كتابي.
F) Safe use of equipment and electrical safety.
   و) الاستخدام الآمن للمعدات وسلامة الكهرباء.
   EQUIPMENT RULES: Never operate equipment without training/authorisation. All guards must be in place before operation. Never bypass or remove safety guards. Switch off and lock out/tag out before cleaning or unjamming. Report malfunctions immediately — do not continue using faulty equipment. ELECTRICAL: No water near electrical panels. Report exposed wires, sparks, burning smell immediately. Never use wet hands with electrical equipment. Only authorised electricians do electrical work.
   قواعد المعدات: لا تشغّل معدة بدون تدريب. جميع الحواجز في مكانها. لا تتجاوز/تزيل حواجز الأمان. أوقف وأغلق قبل التنظيف. كهرباء: لا ماء بالقرب من اللوحات. أبلغ عن الأسلاك المكشوفة فوراً.
G) Emergency exits — life safety rule.
   ز) مخارج الطوارئ — قاعدة سلامة الحياة.
   ABSOLUTE RULES: Emergency exits must NEVER be blocked, locked, or obstructed — even temporarily. Exit routes must be clear at all times. Exit signs must be lit. Emergency lighting must function. Know your nearest exit AND alternate exit before starting work each day. In emergency: WALK, do not run. Do not use lifts. Assemble at designated muster point.
   قواعد مطلقة: مخارج الطوارئ لا تُحجب/تُقفل/تُعترض أبداً. الممرات خالية دائماً. اعرف أقرب مخرجين قبل بدء العمل يومياً.
H) Manual handling — protecting your spine.
   ح) المناولة اليدوية — حماية عمودك الفقري.
   STATISTICS: Back injuries are the most common occupational injury in food processing — responsible for 40% of time-off claims. Most are preventable. CORRECT TECHNIQUE: Plan lift and clear path first. Position feet shoulder-width apart. Bend at knees, NOT back. Keep load close to body. Grip firmly. Lift using legs — back stays straight. Avoid twisting — pivot feet instead. For heavy/awkward loads: use trolley or ask for help. TEAM LIFTS: One person calls the movement.
   إحصائيات: إصابات الظهر هي الأكثر شيوعاً — 40% من إجازات المرضى. الأسلوب: انحنِ من الركبتين لا الظهر. المنتج قريب من الجسم. استخدم الساقين للرفع. استخدم عربة أو اطلب مساعدة للأحمال الثقيلة.
I) Workplace behaviour — safe culture basics.
   ط) سلوك مكان العمل — أساسيات ثقافة السلامة.
   RULES: Never run in food production areas. Keep walkways clear at all times. Do not distract colleagues during hazardous tasks (cutting, operating machinery). Alert others when carrying hot/heavy/sharp items. Communicate before moving equipment. Horseplay is strictly prohibited — it is a disciplinary offence. Safety is everyone's responsibility — speak up if you see an unsafe act.
   القواعد: لا ركض في مناطق الإنتاج. ممرات خالية دائماً. لا تُلهِ الزملاء أثناء المهام الخطرة. المزاح الخطر محظور تماماً. السلامة مسؤولية الجميع.
J) Incident reporting procedure.
   ي) إجراءات الإبلاغ عن الحوادث.
   ANY INCIDENT (injury, near-miss, property damage, chemical exposure): IMMEDIATE: Alert supervisor. Get first aid if needed. Secure the scene (do not move anything if serious injury). SAME SHIFT: Supervisor completes incident report form. Photographs if appropriate. Witness statements. Within 24 HOURS: QA/HS reviews. Root cause investigation starts. Regulatory notification if required (serious injury → Dubai Municipality / MOHRE). NO INCIDENT GOES UNREPORTED. Unreported incidents = recurrence.
   أي حادث: فوراً: أبلغ المشرف. إسعاف إذا لزم. نفس الشفت: المشرف يكمل نموذج الحادث. خلال 24 ساعة: مراجعة QA/السلامة.
K) First response basics.
   ك) أساسيات الاستجابة الأولى.
   FOR MINOR INJURIES: Control bleeding (clean gloves + pressure). Cover with plaster (blue in food areas). Do not allow food handler to return until wound is fully covered. SERIOUS INJURY: Do NOT move person if back/neck injury suspected. Call emergency services (998 UAE) IMMEDIATELY. Send someone to meet ambulance. Stay with person. CHEMICAL EXPOSURE: Flush with water (skin: 15 min; eye: 15 min at eye wash station). Remove contaminated clothing. Call emergency if severe.
   إصابات بسيطة: أوقف النزيف. غطِّ بضمادة (زرقاء في مناطق الغذاء). إصابات خطيرة: لا تحرّك المصاب. اتصل 998 فوراً. ابقَ مع الشخص.
L) Documentation and corrective actions.
   ل) التوثيق والإجراءات التصحيحية.
   REQUIRED: Incident report (all incidents, all near-misses). First aid treatment record. Witness statements. Root cause analysis report (within 48 hours for injuries). Corrective and preventive action plan with responsible person and deadline. OHS statistics reviewed monthly by management. Trends analysed quarterly. UAE law requires serious injury to be reported to authorities within 24 hours.
   المطلوب: تقرير الحادث. سجل العلاج. شهادات الشهود. تقرير تحليل السبب الجذري (خلال 48 ساعة). خطة إجراءات تصحيحية/وقائية. إبلاغ السلطات خلال 24 ساعة للإصابات الخطيرة.
   References: UAE OHS Federal Law No. 8/1980 | Dubai Municipality Health & Safety Code | ISO 45001:2018 | UAE MOHRE Regulations.`,

  "OHS: Knife Safety": `A) Why knife injuries are a priority OHS risk in meat processing.
   أ) لماذا إصابات السكاكين من أولويات سلامة مناطق معالجة اللحوم.
   STATISTICS: Cuts from knives and sharp tools are the #1 cause of workplace injuries in meat processing and butchery. Most are preventable with proper technique and PPE. A laceration to tendons or blood vessels can cause permanent disability. Every cut — minor or major — must be reported and treated immediately. Unreported cuts become infected wounds.
   إحصائيات: الجروح من السكاكين والأدوات الحادة هي السبب الأول لإصابات مناطق معالجة اللحوم. معظمها قابل للوقاية بالأسلوب الصحيح وPPE.
   STANDARD: UAE OHS Federal Law No. 8/1980 | Dubai Municipality H&S Code | ISO 45001:2018.
B) The cut-resistant glove — when mandatory and how to use correctly.
   ب) القفاز المقاوم للقطع — متى إلزامي وكيف يُستخدم بشكل صحيح.
   WHEN MANDATORY: Whenever using a boning knife, breaking knife, or other cutting tool on the non-dominant (non-cutting) hand. During any task where the blade may contact the supporting hand. CORRECT USE: Worn on the hand that holds/supports the product (not the knife hand). Must fully cover palm and fingers — no exposed skin. CRITICAL: Cut-resistant gloves reduce severity — they do NOT make you invulnerable. Never assume protection means you can be careless. Inspect glove for damage before each use.
   متى إلزامي: عند استخدام سكين التعظيم/الفرم على اليد غير المهيمنة. الاستخدام الصحيح: على اليد التي تمسك/تثبت المنتج. يغطي الكف والأصابع كاملاً. يقلل الخطورة — لا يجعلك محصناً.
C) Carrying and passing knives — the safety rules.
   ج) حمل ونقل السكاكين — قواعد السلامة.
   CARRYING: Always carry knife with blade pointing DOWN and away from your body. Never swing or wave a knife. Never carry more than one knife at a time unless secured in knife roll. PASSING: Never pass a knife blade-first to another person — place it on a surface and allow the other person to pick it up. Or use the handle-first pass with a verbal alert ("knife"). Never throw a knife.
   الحمل: دائماً حمل السكين بالشفرة لأسفل وبعيداً عن الجسم. لا تمرير السكين بالشفرة للأمام — ضعه على سطح ليأخذه الآخر. لا رمي السكاكين.
D) Cutting technique — the foundation of knife safety.
   د) أسلوب التقطيع — أساس أمان السكاكين.
   SAFE SETUP: Stable cutting board (damp cloth underneath to prevent sliding). Product secure and stable. Adequate workspace — not rushed, not crowded. Body position balanced. TECHNIQUE: Guide hand uses "bear claw" grip — fingertips curled back, knuckles as guide. Knife stays in contact with knuckles. Controlled, deliberate strokes — never force. Work away from your body, not toward it. Slow down when tired.
   إعداد آمن: لوح ثابت (قطعة رطبة تحته). منتج ثابت. مساحة كافية. الأسلوب: اليد المرشدة "مخلب الدب" — أطراف الأصابع مطوية، المفاصل كمرشد. لا إجبار. اعمل بعيداً عن جسمك.
E) Knife sharpening — authorised persons and method.
   هـ) شحذ السكاكين — الأشخاص المخوّلون والطريقة.
   WHO: Only trained and authorised staff may sharpen knives. Untrained sharpening → blade angle inconsistency → blade snapping under use. HOW (authorised person): Use appropriate sharpening steel or stone at correct angle (15-20° per knife type). Draw AWAY from the body — never toward. Steel clean and dry before use. IMPORTANT: A dull knife is MORE dangerous than a sharp one — dull knives require more force → more likely to slip. Report dull knives to supervisor for authorised sharpening.
   من: فقط موظفون مدرّبون ومخوّلون. سكين معلّم يتطلب ضغطاً أكبر → يزيد خطر الانزلاق. أبلغ عن سكاكين معلّمة للمشرف.
F) Never leave knives in unsafe places.
   و) لا تترك السكاكين في أماكن غير آمنة.
   RULES: NEVER: Leave knives in sinks or under water (invisible to next person). Hide knives under product, towels, or paper. Leave knives on edges of tables (fall hazard). Leave unattended in walkways. ALWAYS: Place on knife rack, in knife block, or in knife roll when not in hand. Account for all knives at end of task. Magnetic knife strips only at approved locations.
   القواعد: ممنوع: السكاكين في المغاسل أو تحت الماء. إخفاؤها تحت المنتجات. تركها على حواف الطاولات. دائماً: على حامل السكاكين أو في الكيس عند عدم الاستخدام.
G) Cleaning knives safely.
   ز) تنظيف السكاكين بأمان.
   CORRECT METHOD: Wipe one side of blade at a time with a cloth, starting from spine (back) toward edge. NEVER: Soak in a sink with other items. Clean by running fingers along the blade. Submerge in cloudy water where blade is invisible. USE: Damp cloth folded over the blade, holding the spine — wipe from handle to tip in single controlled stroke on each side. Place cleaned knife on rack, not back in mixed equipment.
   الطريقة الصحيحة: امسح جانباً واحداً في كل مرة بقطعة قماش، ابدأ من الظهر نحو الحافة. ممنوع: نقع في مغسلة مع أشياء أخرى. تمرير الأصابع على الشفرة. غمر في ماء غير صافٍ.
H) First aid for cuts — immediate response.
   ح) إسعافات أولية للجروح — الاستجابة الفورية.
   STEP 1: Remove glove/hand from knife immediately. STEP 2: Apply direct pressure with clean cloth. Do NOT remove cloth if soaked — add more on top. STEP 3: Raise hand above heart level if possible. STEP 4: Assess depth — if deep, won't stop, tendon/bone visible → CALL EMERGENCY (998). STEP 5: Apply blue waterproof plaster (food area requirement) for minor wounds. STEP 6: Report to supervisor immediately — same moment, not end of shift. STEP 7: DO NOT return to food handling until wound is fully covered and gloved.
   الخطوات: 1) أزل القفاز/يدك. 2) اضغط مباشرة بقماش نظيف. 3) ارفع اليد فوق مستوى القلب. 4) قيّم العمق — عميق → 998. 5) ضع لاصق أزرق للجروح البسيطة. 6) أبلغ المشرف فوراً. 7) لا عودة للعمل الغذائي حتى يُغطى الجرح.
I) Knife maintenance and storage — end of shift.
   ط) صيانة وتخزين السكاكين — نهاية الشفت.
   END OF SHIFT: Account for all knives (knife count matches issue count). Clean and sanitize fully. Inspect blade for chips, cracks, bent tip — report and remove damaged knives. Dry thoroughly. Store in knife roll, block, or dedicated rack — never loose in drawers. Log in and out of knife register if used. Damaged knife returned to supervisor for authorised disposal or repair.
   نهاية الشفت: عدّ جميع السكاكين. نظّف وعقّم. افحص الشفرة بحثاً عن تشقق/انثناء. جفّف جيداً. خزّن في حامل/رول/كتلة. سكين تالف يُعاد للمشرف.
J) Reporting unsafe conditions.
   ي) الإبلاغ عن الحروف غير الآمنة.
   REPORT IMMEDIATELY: Slippery floor in cutting area (fat/blood/water). Damaged or dull knife. Missing knife from count. Inadequate lighting in cutting area. Crowded workspace creating knife contact risk. Colleague using unsafe knife technique. NEVER continue working in an unsafe condition — the momentary inconvenience of stopping to report is worth preventing a serious injury.
   أبلغ فوراً عن: أرضية زلقة. سكين تالف أو معلّم. سكين مفقود من العدد. إضاءة غير كافية. مساحة عمل مكتظة. زميل يستخدم أسلوباً غير آمن.
K) Supervision and compliance checks.
   ك) الإشراف وفحوصات الالتزام.
   SUPERVISOR ROLE: Daily check of knife count and condition. Observe cutting technique — give immediate coaching on unsafe technique (not end-of-day feedback). Verify PPE compliance before task starts. Review any knife-related incidents for systemic patterns. Monthly: audit knife safety compliance across all cutting stations. STAFF ROLE: Follow technique, use PPE, report, never take shortcuts.
   دور المشرف: فحص يومي لعدد السكاكين وحالتها. راقب الأسلوب وقدّم تدريباً فورياً. تحقق من PPE قبل بدء المهمة. مراجعة الحوادث شهرياً.
L) Documentation and corrective actions.
   ل) التوثيق والإجراءات التصحيحية.
   REQUIRED: Knife issue/return register. Knife inspection log. Incident/cut report (any cut, any severity). Near-miss reports. PPE compliance checks. Training records (knife safety signed off per employee). Corrective actions for unsafe practice findings. Any cut requiring medical treatment → formal incident investigation report within 48 hours.
   المطلوب: سجل إصدار/إعادة السكاكين. سجل تفتيش السكاكين. تقرير حادث/جرح. نماذج near-miss. فحوصات امتثال PPE. سجلات تدريب.
   References: UAE OHS Federal Law No. 8/1980 | Dubai Municipality H&S Code | ISO 45001:2018 | BS 8313 (Cutting Tool Safety).`,

  "OHS: Manual Handling": `A) Why manual handling injuries matter — the human and business cost.
   أ) لماذا إصابات المناولة اليدوية مهمة — التكلفة الإنسانية والتجارية.
   STATISTICS: Musculoskeletal disorders (MSDs) from manual handling account for 40% of all work-related injuries. Back injuries are the most common — many result in chronic (lifelong) pain and permanent disability. In meat processing and cold chain: workers lift heavy product repeatedly in cold, wet, slippery environments — high risk. Most injuries are PREVENTABLE with correct technique and task design.
   إحصائيات: اضطرابات الجهاز العضلي الهيكلي تمثل 40% من إصابات العمل. إصابات الظهر هي الأكثر شيوعاً — كثير منها ألم مزمن مدى الحياة. معظمها قابل للوقاية.
   STANDARD: UAE OHS Federal Law No. 8/1980 | Dubai Municipality H&S Code | ISO 45001:2018.
B) Step 1 — Assess the load and plan before lifting.
   ب) الخطوة 1 — قيّم الحمولة وخطّط قبل الرفع.
   ASSESS: Weight (too heavy alone? → ask for help or use equipment). Shape (awkward? → different grip or tool). Stability (shifting contents?). Surface (wet/slippery?). PLAN: Where am I moving this? Is the route clear? Are there steps, slopes, narrow passages? What will I do with it at the destination? RULE: Never lift first and think second.
   قيّم: الوزن (ثقيل؟ → اطلب مساعدة). الشكل (محرج؟ → غير الإمساك). السطح (رطب؟). خطّط: أين أنقل هذا؟ هل الطريق واضح؟ لا ترفع أولاً وتفكر لاحقاً.
C) The correct lifting technique — step by step.
   ج) أسلوب الرفع الصحيح — خطوة بخطوة.
   1) Stand close to the load — feet shoulder-width apart. 2) Bend at the KNEES — not the waist. Back stays straight/neutral. 3) Get a firm grip — test the weight before committing to full lift. 4) Keep load close to the body (elbow distance max). 5) Lift smoothly using leg muscles — no jerking. 6) Rise to full height before moving. 7) When placing: reverse the process — bend knees first, lower gently.
   1) قف قريباً — قدماك بعرض الكتفين. 2) انحنِ من الركبتين — ليس الخصر. 3) إمساك محكم — اختبر الوزن قبل الرفع الكامل. 4) الحمل قريب من الجسم. 5) ارفع بسلاسة باستخدام عضلات الساقين. 6) ارتفع إلى الطول الكامل قبل التحرك.
D) Avoid twisting while carrying a load.
   د) تجنب الالتفاف أثناء حمل الحمل.
   WHY: Twisting the spine under load = greatest risk for disc herniation and back injury. Twisting combines rotational and compressive force at the same time — discs are not designed for this under load. HOW TO TURN: Pivot with your feet — take small steps to turn your whole body. Never rotate the torso while keeping feet fixed. RULE: Turn your feet, not your back.
   لماذا: الالتفاف مع الحمل = أكبر خطر لانزلاق الفقرات. الحل: أدِّر قدميك — خطوات صغيرة تحرّك جسمك كله. لا تلتفّ بالجذع مع ثبات القدمين.
E) Use aids — trolleys, pallet jacks, conveyors.
   هـ) استخدم الأدوات المساعدة — العربات ورافعات البليت والناقلات.
   RULE: If a mechanical aid is available — USE IT. The only acceptable reason to manually lift is when no mechanical alternative is available and the load is within safe limits. TYPES: Hand trolleys (boxes, small crates). Pallet jacks (full pallets). Platform trolleys (large/awkward items). Conveyors where fitted. TEAM LIFT: For anything over 25 kg OR if awkward shape. One person calls the movement: "1-2-3 lift."
   القاعدة: إذا كانت أداة مساعدة متوفرة → استخدمها. رفع يدوي فقط عند عدم وجود بديل ميكانيكي. رفع فريق: أكثر من 25 كغم أو شكل محرج. شخص واحد يقود: "1-2-3 ارفع."
F) Stacking — safe height and stability.
   و) الرص — الارتفاع الآمن والاستقرار.
   RULES: Heavy items at bottom. Lightest at top. Stack straight and stable — no leaning. Do not exceed height where load becomes unstable or obstructs vision. Stack only to a height reachable without stretching (max shoulder height for heavy items). Secure with stretch wrap if required. BEFORE WALKING AWAY: Check stability — will it stand if someone bumps the shelf?
   القواعد: ثقيل في الأسفل. خفيف في الأعلى. رص مستقيم. لا تتجاوز الارتفاع الذي يجعله غير مستقر. تأكد من الاستقرار قبل المغادرة.
G) Cold room specific risks.
   ز) مخاطر غرفة التبريد الخاصة.
   RISKS: Slip hazard (condensation on floor from door opening, ice patches, drainage). Restricted movement (thermal clothing reduces dexterity). Cold muscles = higher injury risk (less flexible). Poor visibility (fog from warm/cold air difference). Limited escape route. PRECAUTIONS: Never enter cold room alone for extended period. Inform someone you are entering. Wear thermal PPE. Anti-slip footwear. Shorter handling sessions in extreme cold. Never touch metal surfaces with wet bare hands.
   المخاطر: انزلاق (تكاثف/جليد)، حركة محدودة، عضلات باردة، رؤية ضعيفة. الاحتياطات: لا تدخل وحدك لفترة طويلة. أبلغ شخصاً. PPE حراري. أحذية مقاومة للانزلاق.
H) Repetitive tasks and musculoskeletal health.
   ح) المهام المتكررة وصحة الجهاز العضلي الهيكلي.
   RISK: Repetitive manual tasks (cutting, sorting, packing) over hours → cumulative strain on joints, tendons, and muscles → musculoskeletal disorders. PREVENTION: Job rotation (change task every 1-2 hours where possible). Regular micro-breaks (30-second stretch every 30 minutes). Report early signs of discomfort/strain — early reporting prevents chronic injury. Supervisor monitors for signs of fatigue.
   خطر: المهام المتكررة على مدى ساعات → إجهاد تراكمي للمفاصل والأوتار. الوقاية: تناوب المهام كل 1-2 ساعة. فترات راحة قصيرة. أبلغ عن علامات التعب المبكرة.
I) Report pain and strain early — before it becomes chronic.
   ط) أبلغ عن الألم والتوتر مبكراً — قبل أن يصبح مزمناً.
   WHY EARLY REPORTING MATTERS: A strain reported on day 1 → 2 days modified duties → full recovery. The same strain ignored for 2 weeks → 3 months off work → possible permanent damage. WHAT TO REPORT: Pain, discomfort, stiffness, numbness, tingling in any joint, muscle, or limb. When it started, what task caused it. Reporting is not weakness — it is professionalism.
   لماذا التبليغ المبكر: توتر يُبلَّغ عنه في اليوم الأول → يومان على مهام خفيفة → شفاء كامل. نفس التوتر يُتجاهل أسبوعين → 3 أشهر إجازة → ضرر دائم محتمل. الإبلاغ ليس ضعفاً — هو احترافية.
J) Near-miss and unsafe conditions — report everything.
   ي) near-miss والحالات غير الآمنة — أبلغ عن كل شيء.
   EXAMPLES SPECIFIC TO MANUAL HANDLING: A load shifted while being carried (near-drop). Slipped while carrying heavy box (but didn't fall). Stack toppled but no one was hurt. Floor was wet and someone nearly fell. A trolley wheel locked unexpectedly. ALL of these are near-misses and MUST be reported. They identify the next accident before it happens.
   أمثلة: حمل تحوّل أثناء النقل. انزلاق أثناء حمل صندوق. رص انهار لكن لم يصب أحد. جميعها near-miss ويجب الإبلاغ عنها.
K) Supervision and coaching.
   ك) الإشراف والتدريب.
   SUPERVISOR RESPONSIBILITIES: Observe lifting technique daily — coach immediately, not at end of shift. Ensure mechanical aids are available and maintained. Monitor task rotation compliance. Investigate all manual handling injuries/near-misses for systemic causes. Monthly: review injury trends, modify task design if needed. Never pressure staff to lift unsafe loads for speed.
   مسؤوليات المشرف: راقب أسلوب الرفع يومياً — درّب فوراً. تأكد من توفر الأدوات. راقب تناوب المهام. لا تضغط على الموظفين لرفع أحمال غير آمنة من أجل السرعة.
L) Documentation and records.
   ل) التوثيق والسجلات.
   REQUIRED: Manual handling risk assessment (per task/area). Incident reports for all MSD injuries. Near-miss reports. Training records (manual handling technique signed off per employee). Job rotation schedule. Corrective action for unsafe conditions. Monthly OHS review includes manual handling injury trend. Modified duties plan for injured workers.
   المطلوب: تقييم خطر المناولة اليدوية. تقارير حوادث كل إصابة. نماذج near-miss. سجلات تدريب. جدول تناوب المهام. مراجعة شهرية.
   References: UAE OHS Federal Law No. 8/1980 | Dubai Municipality H&S Code | ISO 45001:2018 | HSE Manual Handling Regulations.`,

  "OHS: Fire Safety & Emergency": `A) Understanding fire — the fire triangle.
   أ) فهم الحريق — مثلث الحريق.
   FIRE REQUIRES 3 ELEMENTS: Fuel (anything that burns: cardboard, oil, chemicals, wood, waste). Heat/Ignition source (electrical fault, open flame, hot surfaces, friction sparks). Oxygen (air). REMOVE ANY ONE = fire cannot start or continue. COMMON CAUSES IN FOOD FACILITIES: Electrical overload/faulty wiring. Fat/oil fires (fryers, cooking). Cardboard/waste near heat sources. Improper chemical storage. Faulty refrigeration compressors.
   الحريق يتطلب 3 عناصر: وقود + مصدر حرارة/اشتعال + أكسجين. أزل أحدها = لا حريق. الأسباب الشائعة: عطل كهربائي، حرائق الزيوت، كرتون بالقرب من مصادر الحرارة.
   STANDARD: UAE Civil Defence Law | Dubai Municipality Fire Safety Code | ISO 45001:2018.
B) Know your exits and assembly point BEFORE you need them.
   ب) اعرف مخارجك ونقطة التجمع قبل أن تحتاجها.
   FIRST DAY AT ANY NEW LOCATION: Identify your nearest emergency exit. Identify your alternate emergency exit (in case the nearest is blocked by fire/smoke). Know the route to the assembly/muster point. Location of nearest fire extinguisher and alarm call point. Do NOT wait for an emergency to figure this out. RULE: Know 2 exits from every area you work in.
   في أي موقع جديد: حدد أقرب مخرج طوارئ. حدد مخرجاً بديلاً. اعرف طريق نقطة التجمع. موقع أقرب طفاية ونقطة إنذار. القاعدة: اعرف 2 مخارج من كل منطقة تعمل فيها.
C) Fire extinguishers — types and the PASS method.
   ج) الطفايات — الأنواع وطريقة PASS.
   TYPES AND USES: RED/WATER: Ordinary combustibles (paper, wood, cardboard). NEVER on electrical, oil, or chemical fires. CO2 (BLACK): Electrical fires and flammable liquids — no residue, safe indoors. DRY POWDER (BLUE): Multi-purpose — Class A, B, C fires. FOAM (CREAM): Flammable liquids (oil fires). NEVER on electrical fires. PASS METHOD: P — Pull the pin. A — Aim at the base of the fire (not the flames). S — Squeeze the handle. S — Sweep side-to-side. IMPORTANT: Only fight a small, contained fire (bin/small surface). If fire is larger — GET OUT. Never turn your back to the fire.
   الأنواع: أحمر/ماء: مواد عادية (ورق/خشب). CO2 أسود: كهرباء/سوائل قابلة للاشتعال. مسحوق جاف أزرق: متعدد الأغراض. رغوة كريمي: زيوت. طريقة PASS: اسحب الدبوس، صوّب على القاعدة، اضغط، انزلق. قاتل حرائق صغيرة فقط. إذا الحريق كبير → اخرج.
D) When the fire alarm sounds — evacuation discipline.
   د) عند سماع إنذار الحريق — انضباط الإخلاء.
   ALWAYS treat the alarm as a REAL fire until confirmed otherwise. STEPS: 1) Stop work immediately — do NOT finish the task. 2) Do NOT use lifts. 3) Close doors behind you as you leave (slows fire spread). 4) Walk — do not run. 5) Follow designated exit route. 6) Go directly to assembly point. 7) Report to floor warden/supervisor for roll call. 8) Do NOT re-enter until Civil Defence/fire marshal gives ALL CLEAR. If you encounter smoke: stay low, cover nose/mouth, find alternate route.
   دائماً تعامل مع الإنذار كحريق حقيقي. الخطوات: 1) أوقف العمل فوراً. 2) لا مصاعد. 3) أغلق الأبواب خلفك. 4) امشِ لا تركض. 5) اتجه لنقطة التجمع. 6) أفادة عند المشرف. إذا الدخان كثيف: ابقَ منخفضاً.
E) Keep exits and extinguishers accessible — zero tolerance.
   هـ) ابقِ المخارج والطفايات متاحة — تسامح صفري.
   ABSOLUTE RULES: Emergency exits MUST NOT be blocked, locked from inside, propped open, or obstructed — at any time, for any reason. Exit signage must be lit. Extinguishers must be visible, accessible, and in their designated location. CLEAR ZONE: 1 metre around each extinguisher. CONSEQUENCE: Blocked exit = people trapped = deaths. This is a criminal offence under UAE Civil Defence law. If you see a blocked exit — report immediately to supervisor.
   قواعد مطلقة: مخارج الطوارئ لا تُحجب/تُقفل/تُثبت مفتوحة أبداً. منطقة 1 متر خالية حول كل طفاية. خروج محجوب = أشخاص محاصرون = وفيات. هذه جريمة جنائية.
F) Electrical safety and fire prevention.
   و) سلامة الكهرباء ومنع الحريق.
   RULES: Report immediately: Sparks, burning smell, flickering lights, buzzing from panels. Never overload sockets — one plug per socket unless specifically rated for extension. Never use damaged cables/equipment. Switch off and unplug equipment not in use overnight. Keep combustibles away from electrical panels. Never operate electrical equipment with wet hands. Only authorised electricians do electrical work.
   القواعد: أبلغ فوراً: شرر، رائحة احتراق، وميض. لا تفرط في تحميل المآخذ. لا أسلاك/معدات تالفة. أوقف تشغيل المعدات غير المستخدمة ليلاً. لا مواد قابلة للاشتعال بالقرب من اللوحات الكهربائية.
G) Oil and fat fire prevention (if applicable).
   ز) منع حرائق الزيوت والشحوم (إن انطبق).
   PREVENTION: Never leave fryer/oil unattended when heated. Do not overfill fryer. Ensure thermostat is working. Keep oil clean (high TPM oil has lower flash point — see TESTO OIL module). IF OIL FIRE STARTS: NEVER use water (causes explosion of steam and oil). Use foam extinguisher or Class F if available, or CO2. Cover with damp cloth/pan lid to smother. Call emergency if it spreads.
   الوقاية: لا تترك المقلاة/الزيت بدون رقابة. لا تفرط في الملء. إذا اشتعل الزيت: لا ماء أبداً. استخدم طفاية رغوة أو CO2. غطِّ بقماش رطب.
H) Emergency contact numbers — know them by heart.
   ح) أرقام الطوارئ — احفظها عن ظهر قلب.
   UAE EMERGENCY NUMBERS: 998 — Police/Emergency (general). 997 — Civil Defence (fire). 998 — Ambulance (same as police in UAE). Internal: Site emergency number (posted at every alarm point — know it). Your supervisor's number. Assembly point: [as per site diagram]. Action: If you cannot safely call — shout "FIRE" and get yourself and others out first.
   أرقام الطوارئ في الإمارات: 998 — شرطة/طوارئ. 997 — الدفاع المدني. الرقم الداخلي للموقع (مكتوب عند كل نقطة إنذار). إذا لم تستطع الاتصال بأمان — نادِ "حريق" واخرج أنت والآخرين أولاً.
I) Fire drills — your obligation to participate.
   ط) تمارين الإخلاء — التزامك بالمشاركة.
   FREQUENCY: At minimum 1 drill every 6 months (Dubai Municipality requirement). DURING DRILLS: Treat as real — do not delay, finish task, or act casually. Bring nothing except yourself. Help colleagues who need assistance. Follow warden instructions. AFTER DRILL: Warden reviews timing and compliance. All issues raised are corrective actions. Drill outcomes reported to management.
   التكرار: مرة على الأقل كل 6 أشهر (متطلب بلدية دبي). خلال التمارين: تعامل باعتبارها حقيقية. بعد التمرين: مراجعة من قبل المشرف، كل مشكلة ملاحظة تصبح إجراءً تصحيحياً.
J) First response — what YOU do if you discover a fire.
   ي) الاستجابة الأولى — ماذا تفعل إذا اكتشفت حريقاً.
   THE RACE PROTOCOL: R — Rescue: Remove anyone in immediate danger (only if safe to do so). A — Alarm: Activate nearest fire alarm call point. Call emergency (997/998). C — Contain: Close doors to contain spread — do NOT lock. E — Extinguish (only if small, safe, trained, and exit clear behind you). IF IN DOUBT — GET OUT. Your life is more important than property.
   بروتوكول RACE: R — إنقاذ (إذا آمن). A — إنذار: فعّل نقطة الإنذار. اتصل 997/998. C — احتواء: أغلق الأبواب. E — إطفاء (فقط إذا صغير وآمن ومدرّب). إذا شككت — اخرج. حياتك أهم من الممتلكات.
K) Post-incident reporting and investigation.
   ك) التقرير والتحقيق بعد الحادث.
   AFTER ANY FIRE OR NEAR-MISS: Incident report completed same day. Photographs of scene (before any cleanup). List of persons present. Timeline of events. Root cause investigation (what caused it, what could have prevented it). Corrective and preventive actions. If Civil Defence was involved → formal investigation by authorities. Management review of findings within 48 hours.
   بعد أي حريق أو near-miss: تقرير حادث في نفس اليوم. صور المكان. قائمة الأشخاص. جدول زمني للأحداث. تحقيق في السبب الجذري. مراجعة الإدارة خلال 48 ساعة.
L) Documentation and audit requirements.
   ل) التوثيق ومتطلبات التدقيق.
   REQUIRED: Fire drill records (date, participation, timing, findings, corrective actions). Extinguisher inspection log (monthly check + annual service). Fire alarm test log. Emergency exit inspection log. Fire safety training records. Fire risk assessment (annual review). Incident reports. Dubai Municipality fire inspectors review all of the above — ensure current.
   المطلوب: سجلات تمارين الإخلاء. سجل فحص الطفايات (شهري + صيانة سنوية). سجل اختبار إنذار الحريق. سجل تفتيش مخارج الطوارئ. سجلات تدريب. تقييم مخاطر الحريق (مراجعة سنوية).
   References: UAE Civil Defence Law | Dubai Municipality Fire Safety Code | NFPA | ISO 45001:2018.`,

  "OHS: First Aid & Incident Reporting": `A) What is first aid — its purpose and limits.
   أ) ما هو الإسعاف الأولي — هدفه وحدوده.
   DEFINITION: First aid is the immediate, temporary treatment given to an injured or ill person until professional medical help arrives. PURPOSE: Preserve life. Prevent the condition from worsening. Promote recovery. LIMITS: First aid is NOT a substitute for medical treatment. Know when to call emergency services — when in doubt, call 998 IMMEDIATELY. Do NOT delay emergency call trying to treat beyond your training.
   التعريف: الإسعاف الأولي هو العلاج الفوري المؤقت حتى وصول المساعدة الطبية. الغرض: حفظ الحياة. منع تفاقم الحالة. الحدود: ليس بديلاً عن العلاج الطبي. عند الشك — اتصل 998 فوراً.
   STANDARD: UAE OHS Federal Law No. 8/1980 | Dubai Municipality H&S Code | UAE Civil Defence Regulations.
B) First aid equipment — location and contents.
   ب) معدات الإسعاف الأولي — الموقع والمحتويات.
   LOCATION: Every workplace must have a designated, clearly marked first aid box accessible to all staff. Know its location before you need it. CONTENTS (minimum per UAE/Dubai regulations): Assorted plasters (including BLUE waterproof for food areas). Sterile gauze pads and bandages. Adhesive tape. Scissors. Disposable gloves. Eye wash solution. Burn gel. Cold pack. Emergency blanket. First aid manual. FIRST AIDER: Know the name of your designated first aider per shift.
   الموقع: كل مكان عمل يجب أن يكون فيه صندوق إسعاف مُعلَّم بوضوح. المحتويات: لاصق متنوع (أزرق مقاوم للماء). شاش/ضمادات معقمة. قفازات. محلول غسيل عيون. هلام حروق. اعرف اسم المسعف المعيّن في كل شفت.
C) Cuts and lacerations — step-by-step first aid.
   ج) الجروح والتمزقات — الإسعاف الأولي خطوة بخطوة.
   1) Apply pressure with clean cloth/gauze. 2) Maintain pressure minimum 10 minutes — do not lift to check. 3) If blood soaks through — add more material on top (do not remove first layer). 4) Raise injured limb above heart level. 5) When bleeding controlled: clean wound with clean water. 6) Apply clean dressing. 7) For food handler: apply blue waterproof plaster + double glove over it before returning to food work. CALL 998 if: bleeding won't stop after 10 minutes. Deep wound (tendon/bone visible). Wound on hand/face with numbness.
   1) اضغط بقماش نظيف 10 دقائق. 2) لا ترفع للتحقق. 3) إذا نقع الدم أضف فوقه. 4) ارفع الطرف. 5) عند إيقاف النزيف: نظّف وضمّد. 6) لاصق أزرق + قفاز مزدوج. اتصل 998 إذا: لا يتوقف بعد 10 دقائق، جرح عميق.
D) Burns — correct first aid and what NOT to do.
   د) الحروق — الإسعاف الصحيح وما لا تفعله.
   STEP 1: Cool the burn IMMEDIATELY with cool running water — minimum 20 minutes. STEP 2: Remove jewellery/watch from affected area (before swelling). STEP 3: Cover loosely with sterile non-fluffy dressing. STEP 4: Seek medical attention for anything other than minor burns. DO NOT: Use ice (causes frostbite). Apply butter, toothpaste, or any home remedy. Burst blisters. Remove clothing stuck to burn. CALL 998 if: Large burn (palm size or more). Face, hands, or joints affected. Chemical or electrical burn of any size.
   1) برّد فوراً بماء بارد جارٍ — 20 دقيقة كحد أدنى. 2) أزل المجوهرات. 3) غطِّ بضمادة معقمة. لا تفعل: ثلج. زبدة/معجون أسنان. تفجير فقاعات. اتصل 998 إذا: حجم راحة اليد+. وجه/يدان/مفاصل. حروق كيميائية أو كهربائية.
E) Eye injuries — foreign body and chemical splashes.
   هـ) إصابات العين — جسم غريب وانسكاب كيميائي.
   FOREIGN BODY: Do NOT rub eye. Blink repeatedly and let tears wash it out. Gently irrigate with eye wash solution. If object still present after irrigation → COVER eye and seek medical attention immediately. CHEMICAL SPLASH: Go to nearest eye wash station IMMEDIATELY. Irrigate for MINIMUM 15 minutes — set a timer. Hold eye open — blink during irrigation. Remove contact lenses if wearing. After irrigation: cover eye loosely and go to hospital. Report and complete incident form.
   جسم غريب: لا تحكّ. رمش واغسل بمحلول العين. إذا مدمج → غطِّ واطلب رعاية فورية. انسكاب كيميائي: محطة غسيل عيون فوراً. 15 دقيقة كحد أدنى. أزل العدسات. بعد الغسل: غطِّ وتوجه للمستشفى.
F) Fainting and heat/cold stress.
   و) الإغماء والإجهاد الحراري/البرودي.
   HEAT STRESS SIGNS: Heavy sweating or no sweating (severe). Dizziness, confusion, nausea, headache. Hot red skin. Rapid weak pulse. FIRST AID: Move to cool area. Remove excess clothing. Cool with wet cloths on neck/wrists/armpits. Give sips of cool water if conscious. If unconscious → Recovery position → 998 IMMEDIATELY. COLD ROOM HYPOTHERMIA SIGNS: Shivering, confusion, pale/bluish skin. Move to warm area. Warm gradually — no hot water. Dry off. Call 998 if severe.
   إجهاد حراري: تعرق شديد/ارتباك/جلد أحمر. إسعاف: انقل للظل وبرّد. إذا فقد الوعي → وضعية الإنعاش → 998. انخفاض حرارة غرفة تبريد: ارتجاف/ارتباك/جلد شاحب. انقل لمنطقة دافئة، دفّئ تدريجياً.
G) Chemical exposure — skin and inhalation.
   ز) التعرض للكيميائيات — الجلد والاستنشاق.
   SKIN CONTACT: Remove contaminated clothing (wear gloves). Flush affected area with large amounts of water — minimum 15 minutes. Do not scrub. Seek medical attention. INHALATION: Move person to fresh air immediately. If breathing is laboured → 998 IMMEDIATELY. Loosen tight clothing. Keep warm. ALWAYS REFER TO SDS: Section 4 of the product's Safety Data Sheet has specific first aid instructions for that chemical — know where the SDS folder is.
   ملامسة جلد: أزل الملابس الملوثة. شطف 15 دقيقة. استنشاق: هواء طلق فوراً. تنفس صعب → 998 فوراً. ارجع للقسم 4 من SDS المنتج دائماً.
H) Near-miss — definition, reporting, and the culture.
   ح) near-miss — التعريف والإبلاغ والثقافة.
   DEFINITION: Any unplanned event that could have resulted in injury, illness, or damage — but didn't, by chance. WHY REPORT: For every 1 serious accident → 29 minor accidents → 300 near-misses (Heinrich's Triangle). Near-misses are advance warnings. Reporting culture = safe culture. No blame — reporting is protected. HOW: Verbal to supervisor immediately. Written near-miss form same shift. What happened, where, when, who, potential consequence.
   التعريف: حدث غير مخطط كان يمكن أن يسبب أذى لكن لم يفعل. لماذا: لكل حادث خطير 300 near-miss (مثلث هاينريش). كيف: شفهي فوري + نموذج كتابي في نفس الشفت.
I) Incident reporting — what, when, and how.
   ط) الإبلاغ عن الحوادث — ماذا ومتى وكيف.
   WHAT TO REPORT: ALL injuries (any severity — no exceptions). All near-misses. Property damage. Chemical exposures. WHEN: Immediately — same shift, not at the end of the day. HOW: Verbal to supervisor → supervisor initiates written incident report within 1 hour. WHO: The injured person + supervisor + any witnesses all contribute to the report. NEVER delay reporting — late reports suggest cover-up and invalidate insurance/legal protections.
   ماذا تُبلّغ: جميع الإصابات. near-miss. أضرار مادية. تعرض كيميائي. متى: فوراً، نفس الشفت. كيف: شفهي للمشرف → تقرير كتابي خلال ساعة. لا تأخير في الإبلاغ.
J) Incident investigation — basics and root cause.
   ي) التحقيق في الحوادث — الأساسيات والسبب الجذري.
   PURPOSE: Find root cause — not blame a person. One injury = accident. Repeated injuries in same area = SYSTEM FAILURE. BASIC INVESTIGATION: What happened. When/where. Who was involved (role, experience level). Conditions (wet floor, poor lighting, rushing). Immediate cause. Root cause (missing procedure, training gap, equipment failure, supervision failure). Prevention action. RULE: Fix the system, not just the symptom.
   الغرض: إيجاد السبب الجذري — ليس اللوم. حادث واحد = عرضي. متكرر = فشل في النظام. التحقيق: ماذا حدث. متى/أين. السبب المباشر. السبب الجذري. إجراء الوقاية. أصلح النظام لا العرض فقط.
K) Corrective and preventive actions — closing the loop.
   ك) الإجراء التصحيحي والوقائي — إغلاق الدورة.
   CORRECTIVE ACTION: Fixes the identified cause for the specific incident. PREVENTIVE ACTION: Addresses the same root cause system-wide — prevents recurrence anywhere. BOTH REQUIRE: Clear description. Named responsible person. Deadline for completion. Verification that action was implemented and effective. FOLLOW-UP: QA tracks all open actions. Closed when verified effective. Overdue actions escalated to management.
   إجراء تصحيحي: يصلح السبب المحدد. وقائي: يعالج السبب الجذري في كل مكان. كلاهما: وصف واضح + مسؤول + موعد + تحقق من الفعالية. QA تتابع جميع الإجراءات المفتوحة.
L) Documentation — required records.
   ل) التوثيق — السجلات المطلوبة.
   REQUIRED: Incident report form (all incidents — no matter how minor). Near-miss report form. First aid treatment record. Witness statements. Investigation report (root cause + corrective/preventive actions). Follow-up verification records. Medical treatment/return-to-work records. QA/HS manager reviews all weekly. Management reviews monthly. LEGAL: UAE requires serious injuries reported to Ministry of Human Resources (MOHRE) within 24 hours.
   المطلوب: نموذج تقرير حادث. نموذج near-miss. سجل العلاج الإسعافي. شهادات الشهود. تقرير التحقيق. سجلات الرعاية الطبية/العودة. متطلب قانوني: الإصابات الخطيرة تُبلَّغ لوزارة الموارد البشرية خلال 24 ساعة.
   References: UAE OHS Federal Law No. 8/1980 | Dubai Municipality H&S Code | ISO 45001:2018 | UAE MOHRE Regulations | BS 8599 (First Aid Kits).`,

  "TESTO OIL — Oil Quality Test": `A) Device overview: TESTO 270 Cook measures Total Polar Material (TPM%) in frying oil to assess quality.
   أ) نظرة عامة: جهاز TESTO 270 يقيس نسبة المواد القطبية الكلية (TPM%) في زيت القلي لتقييم جودته.
B) When to test: Before service start AND every 2–3 hours during active frying throughout the day.
   ب) متى نقيس: قبل بدء الخدمة وكل 2–3 ساعات خلال فترة القلي المكثف طوال اليوم.
C) Test procedure: 1) Ensure oil is at frying temperature. 2) Submerge probe tip 3 cm into oil. 3) Hold still and wait for stable reading/beep. 4) Read TPM% on display.
   ج) طريقة القياس: 1) تأكد أن الزيت بحرارة القلي. 2) أدخل طرف المجس 3 سم في الزيت. 3) أمسكه ثابتاً حتى تستقر القراءة/صوت التنبيه. 4) اقرأ النسبة على الشاشة.
D) Reading results: 🟢 ≤24% = Acceptable (OK to use). 🟡 24–27% = Monitor closely & test more frequently. 🔴 >27% = DISCARD immediately — do NOT use.
   د) قراءة النتائج: 🟢 ≤24% = مقبول (استخدام جيد). 🟡 24-27% = راقب وقِس بتكرار أكبر. 🔴 >27% = أعدم الزيت فوراً — ممنوع الاستخدام.
E) Critical limit: TPM >27% is a food safety violation. Oil MUST be discarded — no exceptions. Health & legal requirement.
   هـ) الحد الحرج: TPM >27% يُعدّ انتهاكاً لسلامة الغذاء. الزيت يجب إعدامه فوراً — لا استثناءات. متطلب صحي وقانوني.
F) Recording: Log every reading in the Oil Monitoring Record: Fryer ID, date/time, TPM%, oil temp, action taken, signature.
   و) التسجيل: سجّل كل قراءة في سجل مراقبة الزيت: رقم المقلاة، التاريخ/الوقت، TPM%، حرارة الزيت، الإجراء المتخذ، التوقيع.
G) Corrective action: If >27% → Stop use → Drain & discard oil → Clean fryer thoroughly → Refill with fresh oil → Re-test → Record everything → Inform QA.
   ز) الإجراء التصحيحي: إذا >27% → أوقف الاستخدام → فرّغ وأعدم الزيت → نظّف المقلاة جيداً → أعد التعبئة بزيت جديد → أعد القياس → سجّل كل شيء → أبلغ QA.
H) Device care: Wipe probe clean and dry after every use. Store in its protective case. Never submerge the full body. Replace battery when low indicator appears.
   ح) العناية بالجهاز: امسح المجس ونظّفه وجففه بعد كل استخدام. احفظه في حقيبته الواقية. لا تغمر الجهاز كاملاً. استبدل البطارية عند ظهور مؤشر ضعفها.
I) Calibration: Verify device accuracy per manufacturer's schedule. Record calibration date. Report any malfunction or inaccurate reading to QA immediately.
   ط) المعايرة: تحقق من دقة الجهاز حسب جدول الشركة المصنعة. سجّل تاريخ المعايرة. أبلغ QA فوراً عن أي عطل أو قراءة غير دقيقة.
J) Factors that degrade oil faster: High frying temperature, overloading fryer, food debris not filtered, water contamination, long intervals between changes.
   ي) عوامل تسرّع تدهور الزيت: حرارة قلي عالية، إفراط في التحميل، بقايا طعام غير مفلترة، تلوث بالماء، فترات طويلة بين عمليات التغيير.
K) Health impact: Degraded oil (high TPM) produces harmful polar compounds and acrylamide — direct health risk to consumers. Quality oil = consumer safety.
   ك) التأثير الصحي: الزيت المتدهور (TPM عالٍ) ينتج مركبات قطبية ضارة وأكريلاميد — خطر صحي مباشر على المستهلك. الزيت الجيد = سلامة المستهلك.
L) Documentation & QA review: QA reviews oil monitoring logs weekly. Repeated deviations require root cause analysis and preventive action report.
   ل) التوثيق ومراجعة QA: تراجع QA سجلات مراقبة الزيت أسبوعياً. الانحرافات المتكررة تستوجب تحليل السبب الجذري وتقرير إجراء وقائي.`,

  "Quality System Usage": `A) System overview: The QCS Quality System is the central digital platform for managing certificates, reports, returns, meat status, and receiving data across all branches.
   أ) نظرة عامة: نظام جودة QCS هو المنصة الرقمية المركزية لإدارة الشهادات والتقارير والمرتجعات وحالة اللحم وبيانات الاستلام لجميع الفروع.
B) Health certificates (الشهادات الصحية): Navigate to Health Certificates section → filter by branch/date → view, verify validity, and download PDF as needed.
   ب) الشهادات الصحية: انتقل لقسم الشهادات الصحية → فلتر حسب الفرع/التاريخ → اعرض، تحقق من الصلاحية، وحمّل PDF عند الحاجة.
C) Inspection reports (التقارير): Reports section → select report type (daily/weekly/audit) → filter period and branch → view results and export if needed.
   ج) التقارير: قسم التقارير → اختر نوع التقرير (يومي/أسبوعي/تدقيق) → فلتر الفترة والفرع → اعرض النتائج وصدّر عند الحاجة.
D) Returns & rejections (المرتجعات): Returns module → filter by date/branch/supplier → review reason codes, quantities, and corrective status. Follow up on unresolved returns.
   د) المرتجعات والمرفوضات: وحدة المرتجعات → فلتر حسب التاريخ/الفرع/المورّد → راجع رموز الأسباب والكميات وحالة التصحيح. تابع المرتجعات غير المحلولة.
E) Meat status (حالة اللحم): Live Status section → select branch → view current stock levels, hold/quarantine items, near-expiry alerts, and batch traceability data.
   هـ) حالة اللحم: قسم الحالة المباشرة → اختر الفرع → عرض مستويات المخزون الحالية، المعزول/المحجوز، تنبيهات قرب الانتهاء، وبيانات تتبع الدفعات.
F) Shipment receiving reports (تقارير استلام الشحنات): Receiving Reports → select date/branch/supplier → review temperature on arrival, product dates, packaging status, acceptance/rejection decision, and QA sign-off.
   و) تقارير استلام الشحنات: تقارير الاستلام → اختر التاريخ/الفرع/المورّد → راجع حرارة الوصول، تواريخ المنتجات، حالة التغليف، قرار القبول/الرفض، وتوقيع QA.
G) Navigation tips: Use the sidebar/top menu to switch modules. Always apply date and branch filters first before searching — speeds up results significantly.
   ز) نصائح التنقل: استخدم القائمة الجانبية/العلوية للتنقل بين الوحدات. طبّق فلاتر التاريخ والفرع أولاً قبل البحث — يسرّع النتائج بشكل كبير.
H) Alerts & notifications: 🔴 Red = Immediate action required. 🟡 Yellow = Monitor & assess. 🟢 Green = Within limits. Check alerts daily at start of shift.
   ح) التنبيهات والإشعارات: 🔴 أحمر = إجراء فوري مطلوب. 🟡 أصفر = مراقبة وتقييم. 🟢 أخضر = ضمن الحدود. تحقق من التنبيهات يومياً في بداية الشفت.
I) Data entry rules: Fill ALL required fields completely. Use the correct date format. Save before navigating away. Double-check critical values before saving.
   ط) قواعد إدخال البيانات: أكمل جميع الحقول المطلوبة. استخدم تنسيق التاريخ الصحيح. احفظ قبل مغادرة الصفحة. تحقق مزدوج من القيم الحرجة قبل الحفظ.
J) User permissions & security: Each role has specific access rights. Never share login credentials. Log out when finished. Report unauthorized access to QA/IT immediately.
   ي) الصلاحيات والأمان: كل دور له صلاحيات محددة. لا تشارك بيانات تسجيل الدخول. سجّل الخروج عند الانتهاء. أبلغ QA/IT فوراً عن أي وصول غير مصرح به.
K) Acting on system data: Use system findings to issue Non-Conformances (NCs), assign corrective actions, set follow-up deadlines, and track resolution. Data is only useful when acted upon.
   ك) التصرف بناءً على بيانات النظام: استخدم نتائج النظام لإصدار عدم مطابقة NC، تعيين إجراءات تصحيحية، تحديد مواعيد متابعة، وتتبع الحل. البيانات مفيدة فقط عندما نتصرف بناءً عليها.
L) Technical support: For system errors — take a screenshot, note what action triggered it, and contact QA/IT. Do NOT attempt to manually alter or delete system records to fix an error.
   ل) الدعم التقني: لأخطاء النظام — خذ لقطة شاشة، سجّل الإجراء الذي أثار الخطأ، وتواصل مع QA/IT. لا تحاول تعديل أو حذف سجلات النظام يدوياً لإصلاح خطأ.`,

  __DEFAULT__: DEFAULT_DETAILS_BI,
};

/* ===================== Parse A–L bilingual text ===================== */
export function parseRefSections(text) {
  if (!text) return [];
  const result = [];
  const lines = text.split('\n');
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^([A-L])\)\s*(.+)/);
    if (m) {
      if (cur) result.push(cur);
      cur = { letter: m[1], en: m[2].trim(), ar: '', body: [] };
      continue;
    }
    if (cur) {
      const tr = line.trim();
      if (!tr) continue;
      if (/^[أ-ي]\)\s/.test(tr)) {
        cur.ar = tr.replace(/^[أ-ي]\)\s*/, '').trim();
      } else {
        cur.body.push(tr);
      }
    }
  }
  if (cur) result.push(cur);
  return result;
}

/* ===================== Module Illustrations (SVG) ===================== */
export function getModuleIllustration(n) {
  n = n || '';
  const Svg = ({ children }) => (
    <svg viewBox="0 0 320 88" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width:'100%', maxWidth:360, height:'auto', display:'block', margin:'0 auto' }}>
      {children}
    </svg>
  );

  if (n.includes('Hygiene')) {
    const steps = [
      { x:28,  col:'#3b82f6', t1:'WET',   t2:'ابلل' },
      { x:83,  col:'#8b5cf6', t1:'SOAP',  t2:'صابون' },
      { x:138, col:'#ec4899', t1:'SCRUB', t2:'افرك' },
      { x:193, col:'#0ea5e9', t1:'RINSE', t2:'اشطف' },
      { x:248, col:'#10b981', t1:'DRY',   t2:'جفف' },
    ];
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">HANDWASHING PROCEDURE — طريقة غسل اليدين</text>
      {steps.map((s, i) => <g key={i}>
        <circle cx={s.x} cy={48} r={21} fill={s.col} opacity={0.15}/>
        <circle cx={s.x} cy={48} r={21} stroke={s.col} strokeWidth={1.8}/>
        <text x={s.x} y={44} textAnchor="middle" fontSize={12} fontWeight="800" fill={s.col}>{i+1}</text>
        <text x={s.x} y={55} textAnchor="middle" fontSize={7} fontWeight="700" fill={s.col}>{s.t1}</text>
        <text x={s.x} y={79} textAnchor="middle" fontSize={8} fill="#64748b">{s.t2}</text>
        {i < 4 && <text x={s.x+30} y={52} textAnchor="middle" fontSize={13} fill="#cbd5e1">›</text>}
      </g>)}
      <text x={160} y={88} textAnchor="middle" fontSize={7} fill="#94a3b8">20 seconds minimum each step | 20 ثانية على الأقل</text>
    </Svg>;
  }

  if (n.includes('GHP') || n.includes('Cleaning')) {
    const steps = [
      { col:'#0ea5e9', t:'PRE-RINSE' },
      { col:'#8b5cf6', t:'DETERGENT' },
      { col:'#f59e0b', t:'SCRUB' },
      { col:'#3b82f6', t:'RINSE' },
      { col:'#10b981', t:'SANITIZE' },
    ];
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">5-STEP CLEANING SEQUENCE — تسلسل التنظيف الخماسي</text>
      {steps.map((s, i) => {
        const x = 14 + i * 59;
        return <g key={i}>
          <rect x={x} y={19} width={54} height={52} fill={s.col} opacity={0.15} rx={8}/>
          <rect x={x} y={19} width={54} height={52} stroke={s.col} strokeWidth={1.5} fill="none" rx={8}/>
          <text x={x+27} y={38} textAnchor="middle" fontSize={15} fontWeight="900" fill={s.col}>{i+1}</text>
          <text x={x+27} y={52} textAnchor="middle" fontSize={7} fontWeight="700" fill={s.col}>{s.t}</text>
          {i < 4 && <text x={x+58} y={48} textAnchor="middle" fontSize={13} fill={s.col}>›</text>}
        </g>;
      })}
      <text x={160} y={84} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">Sanitizer on dirty surface = INEFFECTIVE — never skip a step</text>
    </Svg>;
  }

  if (n.includes('Receiving')) {
    const checks = [
      { col:'#3b82f6', t:'TEMP',  ar:'حرارة' },
      { col:'#8b5cf6', t:'DATES', ar:'تواريخ' },
      { col:'#ec4899', t:'PACK',  ar:'تغليف' },
      { col:'#f59e0b', t:'LABEL', ar:'ملصق' },
      { col:'#10b981', t:'DOCS',  ar:'وثائق' },
    ];
    return <Svg>
      <text x={150} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">RECEIVING CHECKLIST — قائمة فحص الاستلام</text>
      {checks.map((c, i) => {
        const x = 22 + i * 57;
        return <g key={i}>
          <circle cx={x} cy={46} r={21} fill={c.col} opacity={0.15}/>
          <circle cx={x} cy={46} r={21} stroke={c.col} strokeWidth={1.8}/>
          <text x={x} y={42} textAnchor="middle" fontSize={7.5} fontWeight="800" fill={c.col}>{c.t}</text>
          <text x={x} y={53} textAnchor="middle" fontSize={8.5} fill="#64748b">{c.ar}</text>
          {i < 4 && <text x={x+26} y={49} textAnchor="middle" fontSize={12} fill="#94a3b8">›</text>}
        </g>;
      })}
      <rect x={286} y={22} width={30} height={52} fill="#f8fafc" rx={6} stroke="#e2e8f0" strokeWidth={1}/>
      <text x={301} y={38} textAnchor="middle" fontSize={7} fontWeight="700" fill="#16a34a">ACC</text>
      <text x={301} y={50} textAnchor="middle" fontSize={7} fontWeight="700" fill="#f59e0b">HOLD</text>
      <text x={301} y={62} textAnchor="middle" fontSize={7} fontWeight="700" fill="#dc2626">REJ</text>
      <text x={160} y={83} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">Any single check failure = immediate action — never accept under pressure</text>
    </Svg>;
  }

  if (n.includes('Storage')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">CHILLER SEGREGATION — عزل البراد (منع التلوث بالتنقيط)</text>
      <rect x={26} y={17} width={268} height={64} fill="#f0f9ff" rx={10} stroke="#bae6fd" strokeWidth={1.5}/>
      <line x1={36} y1={37} x2={284} y2={37} stroke="#e0f2fe" strokeWidth={1}/>
      <line x1={36} y1={56} x2={284} y2={56} stroke="#e0f2fe" strokeWidth={1}/>
      <rect x={36} y={19} width={240} height={16} fill="#dcfce7" rx={4} opacity={0.8}/>
      <text x={156} y={30} textAnchor="middle" fontSize={8} fontWeight="700" fill="#15803d">TOP — RTE / COOKED — جاهز / مطبوخ</text>
      <rect x={36} y={39} width={240} height={15} fill="#fef9c3" rx={4} opacity={0.8}/>
      <text x={156} y={49} textAnchor="middle" fontSize={8} fontWeight="700" fill="#92400e">MIDDLE — PROCESSED / SEMI</text>
      <rect x={36} y={58} width={240} height={20} fill="#fee2e2" rx={4} opacity={0.8}/>
      <text x={156} y={71} textAnchor="middle" fontSize={8} fontWeight="700" fill="#dc2626">BOTTOM — RAW MEAT — لحم نيء (prevents drip)</text>
      <text x={10} y={52} textAnchor="middle" fontSize={7.5} fontWeight="800" fill="#1d4ed8">0-5°C</text>
      <text x={160} y={86} textAnchor="middle" fontSize={7} fill="#0891b2" fontWeight="600">FEFO: First Expired First Out — الأقرب للانتهاء يُستخدم أولاً</text>
    </Svg>;
  }

  if (n.includes('Temperature') || n.includes('CCP')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">TEMPERATURE CONTROL ZONES — مناطق التحكم الحراري</text>
      <rect x={4}   y={20} width={68} height={52} fill="#dbeafe" rx={9}/>
      <text x={38}  y={37} textAnchor="middle" fontSize={7} fontWeight="800" fill="#1d4ed8">FROZEN</text>
      <text x={38}  y={50} textAnchor="middle" fontSize={13} fontWeight="900" fill="#1e40af">-18°C</text>
      <text x={38}  y={64} textAnchor="middle" fontSize={8} fill="#3b82f6">مجمّد</text>
      <rect x={80}  y={20} width={68} height={52} fill="#e0f2fe" rx={9}/>
      <text x={114} y={37} textAnchor="middle" fontSize={7} fontWeight="800" fill="#0369a1">CHILLED</text>
      <text x={114} y={50} textAnchor="middle" fontSize={13} fontWeight="900" fill="#075985">≤5°C</text>
      <text x={114} y={64} textAnchor="middle" fontSize={8} fill="#0ea5e9">مبرد</text>
      <rect x={156} y={14} width={88} height={60} fill="#fee2e2" rx={9}/>
      <text x={200} y={30} textAnchor="middle" fontSize={7} fontWeight="800" fill="#991b1b">DANGER ZONE</text>
      <text x={200} y={46} textAnchor="middle" fontSize={14} fontWeight="900" fill="#dc2626">5–60°C</text>
      <text x={200} y={58} textAnchor="middle" fontSize={8} fill="#ef4444">منطقة الخطر</text>
      <text x={200} y={68} textAnchor="middle" fontSize={6.5} fill="#b91c1c">bacteria multiply fast</text>
      <rect x={252} y={20} width={64} height={52} fill="#ffedd5" rx={9}/>
      <text x={284} y={37} textAnchor="middle" fontSize={7} fontWeight="800" fill="#c2410c">HOT HOLD</text>
      <text x={284} y={50} textAnchor="middle" fontSize={13} fontWeight="900" fill="#ea580c">60°C+</text>
      <text x={284} y={64} textAnchor="middle" fontSize={8} fill="#f97316">تسخين</text>
    </Svg>;
  }

  if (n.includes('HACCP')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">HACCP CONTROL PYRAMID — هرم تحكم HACCP</text>
      <path d="M155,16 L310,82 L10,82 Z" fill="#f0fdf4" stroke="#16a34a" strokeWidth={1.5}/>
      <line x1={62} y1={62} x2={248} y2={62} stroke="#16a34a" strokeWidth={1} strokeDasharray="3,2"/>
      <line x1={103} y1={42} x2={207} y2={42} stroke="#ea580c" strokeWidth={1} strokeDasharray="3,2"/>
      <text x={155} y={77} textAnchor="middle" fontSize={8} fontWeight="700" fill="#15803d">PRP — Prerequisite Programs — البرامج الأساسية</text>
      <text x={155} y={56} textAnchor="middle" fontSize={8} fontWeight="700" fill="#c2410c">OPRP — Operational PRPs</text>
      <text x={155} y={36} textAnchor="middle" fontSize={8} fontWeight="800" fill="#dc2626">CCP — Critical Control Points</text>
    </Svg>;
  }

  if (n.includes('Allergen')) {
    const allergens = ['GLUTEN','CRUSTACEANS','EGGS','FISH','PEANUTS','SOYBEANS','MILK','TREE NUTS','CELERY','MUSTARD','SESAME','SULPHITES','LUPIN','MOLLUSCS'];
    const cols = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#84cc16','#0ea5e9','#a855f7','#f43f5e'];
    return <Svg>
      <text x={160} y={11} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">14 MAJOR ALLERGENS — 14 مسبباً رئيسياً للحساسية</text>
      {allergens.map((a, i) => {
        const col = cols[i], x = 12 + (i % 7) * 42, y = i < 7 ? 16 : 53;
        return <g key={i}>
          <rect x={x} y={y} width={38} height={18} fill={col} opacity={0.18} rx={5}/>
          <rect x={x} y={y} width={38} height={18} stroke={col} strokeWidth={1} fill="none" rx={5}/>
          <text x={x+19} y={y+12} textAnchor="middle" fontSize={5.5} fontWeight="700" fill={col}>{a}</text>
        </g>;
      })}
      <text x={160} y={84} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">Cooking does NOT destroy allergen proteins — once contaminated, always contaminated</text>
    </Svg>;
  }

  if (n.includes('Cross')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">SEPARATION RULE — قاعدة الفصل المطلق</text>
      <rect x={6}   y={18} width={130} height={56} fill="#fee2e2" rx={10}/>
      <text x={71}  y={38} textAnchor="middle" fontSize={10} fontWeight="800" fill="#dc2626">RAW MEAT</text>
      <text x={71}  y={51} textAnchor="middle" fontSize={9} fill="#ef4444">لحم نيء</text>
      <text x={71}  y={65} textAnchor="middle" fontSize={7} fill="#b91c1c">RED tools only</text>
      <rect x={141} y={14} width={38} height={60} fill="#1e293b" rx={8}/>
      <text x={160} y={39} textAnchor="middle" fontSize={7} fontWeight="800" fill="#fff">NO</text>
      <text x={160} y={50} textAnchor="middle" fontSize={7} fontWeight="800" fill="#fbbf24">MIX</text>
      <text x={160} y={61} textAnchor="middle" fontSize={7} fontWeight="800" fill="#fff">EVER</text>
      <rect x={184} y={18} width={130} height={56} fill="#dcfce7" rx={10}/>
      <text x={249} y={38} textAnchor="middle" fontSize={10} fontWeight="800" fill="#16a34a">RTE / COOKED</text>
      <text x={249} y={51} textAnchor="middle" fontSize={9} fill="#22c55e">جاهز للأكل</text>
      <text x={249} y={65} textAnchor="middle" fontSize={7} fill="#15803d">Blue/White tools</text>
      <text x={160} y={84} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">ONE TOUCH raw→RTE = contaminated — RTE has NO further kill step</text>
    </Svg>;
  }

  if (n.includes('Chemical')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">NEVER MIX CHEMICALS — لا تخلط الكيميائيات أبداً</text>
      <rect x={18}  y={20} width={42} height={55} fill="#dbeafe" rx={7}/>
      <rect x={28}  y={16} width={22} height={8}  fill="#93c5fd" rx={3}/>
      <text x={39}  y={41} textAnchor="middle" fontSize={7} fontWeight="700" fill="#1d4ed8">CHLORINE</text>
      <text x={39}  y={52} textAnchor="middle" fontSize={8} fill="#3b82f6">كلور</text>
      <text x={39}  y={65} textAnchor="middle" fontSize={13} fontWeight="900" fill="#1d4ed8">Cl</text>
      <text x={104} y={56} textAnchor="middle" fontSize={34} fontWeight="900" fill="#dc2626">+</text>
      <rect x={148} y={20} width={42} height={55} fill="#fef3c7" rx={7}/>
      <rect x={158} y={16} width={22} height={8}  fill="#fcd34d" rx={3}/>
      <text x={169} y={41} textAnchor="middle" fontSize={7} fontWeight="700" fill="#92400e">ACID</text>
      <text x={169} y={52} textAnchor="middle" fontSize={8} fill="#d97706">حامض</text>
      <text x={169} y={65} textAnchor="middle" fontSize={12} fontWeight="900" fill="#92400e">H+</text>
      <text x={215} y={54} textAnchor="middle" fontSize={20} fill="#7c3aed">→</text>
      <rect x={232} y={18} width={82} height={58} fill="#fee2e2" rx={10}/>
      <text x={273} y={38} textAnchor="middle" fontSize={18} fill="#dc2626">!</text>
      <text x={273} y={52} textAnchor="middle" fontSize={8} fontWeight="800" fill="#991b1b">TOXIC GAS</text>
      <text x={273} y={63} textAnchor="middle" fontSize={8} fontWeight="700" fill="#b91c1c">FATAL</text>
      <text x={273} y={73} textAnchor="middle" fontSize={7.5} fill="#dc2626">غاز كلور قاتل</text>
      <text x={160} y={85} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">If unsure about mixing — ASK SUPERVISOR FIRST. SDS Section 7 = incompatibilities</text>
    </Svg>;
  }

  if (n.includes('Pest')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">PEST PREVENTION TRIANGLE — مثلث الوقاية من الآفات</text>
      {[
        { x:55,  col:'#3b82f6', t1:'SEAL',   t2:'Entry Points', t3:'أغلق المداخل' },
        { x:160, col:'#8b5cf6', t1:'CLEAN',  t2:'Food/Water/Shelter', t3:'ازل الجذب الثلاثي' },
        { x:265, col:'#10b981', t1:'REPORT', t2:'Sightings same shift', t3:'أبلغ فوراً' },
      ].map((s, i) => <g key={i}>
        <circle cx={s.x} cy={47} r={27} fill={s.col} opacity={0.12}/>
        <circle cx={s.x} cy={47} r={27} stroke={s.col} strokeWidth={1.8}/>
        <text x={s.x} y={41} textAnchor="middle" fontSize={10} fontWeight="900" fill={s.col}>{s.t1}</text>
        <text x={s.x} y={52} textAnchor="middle" fontSize={7} fontWeight="600" fill={s.col}>{s.t2}</text>
        <text x={s.x} y={64} textAnchor="middle" fontSize={8} fill="#64748b">{s.t3}</text>
      </g>)}
      <text x={160} y={84} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">NEVER touch bait stations — contractor only — report any sighting same shift</text>
    </Svg>;
  }

  if (n.includes('Waste')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">WASTE STREAMS — مسارات النفايات الثلاثة</text>
      {[
        { x:56,  col:'#a16207', t1:'FOOD WASTE', t2:'نفايات غذائية', t3:'Every 2 hrs كل ساعتين' },
        { x:160, col:'#475569', t1:'GENERAL',    t2:'عامة', t3:'Daily — يومياً' },
        { x:264, col:'#dc2626', t1:'HAZARDOUS',  t2:'خطرة', t3:'Specialist disposal' },
      ].map((s, i) => {
        const bx = s.x - 40;
        return <g key={i}>
          <rect x={bx} y={18} width={80} height={58} fill={s.col} opacity={0.1} rx={10}/>
          <rect x={bx} y={18} width={80} height={58} stroke={s.col} strokeWidth={1.8} fill="none" rx={10}/>
          <text x={s.x} y={38} textAnchor="middle" fontSize={8.5} fontWeight="800" fill={s.col}>{s.t1}</text>
          <text x={s.x} y={51} textAnchor="middle" fontSize={9} fill="#475569">{s.t2}</text>
          <text x={s.x} y={63} textAnchor="middle" fontSize={7} fontWeight="600" fill={s.col}>{s.t3}</text>
        </g>;
      })}
      <text x={160} y={86} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">Overflowing bin = pest + contamination NC — empty BEFORE overflow every 2 hours</text>
    </Svg>;
  }

  if (n.includes('PPE')) {
    const rows = [
      { x:14, w:292, col:'#16a34a', t:'1  ELIMINATE the hazard — ازل الخطر' },
      { x:26, w:268, col:'#059669', t:'2  SUBSTITUTE with safer option — استبدل' },
      { x:42, w:236, col:'#d97706', t:'3  ENGINEERING CONTROLS — ضوابط هندسية' },
      { x:60, w:200, col:'#ea580c', t:'4  ADMINISTRATIVE CONTROLS — ضوابط إدارية' },
      { x:82, w:156, col:'#dc2626', t:'5  PPE — Last Resort — آخر خط دفاع' },
    ];
    return <Svg>
      <text x={160} y={11} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">HIERARCHY OF CONTROLS — التسلسل الهرمي للتحكم</text>
      {rows.map((r, i) => <g key={i}>
        <rect x={r.x} y={15 + i*13} width={r.w} height={11} fill={r.col} opacity={0.2} rx={4}/>
        <text x={160} y={24 + i*13} textAnchor="middle" fontSize={7.5} fontWeight="700" fill={r.col}>{r.t}</text>
      </g>)}
      <text x={160} y={84} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">PPE is the LAST line of defence — it reduces exposure, does NOT eliminate hazard</text>
    </Svg>;
  }

  if (n.includes('Knife')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">KNIFE SAFETY — CORRECT vs WRONG — صح وغلط</text>
      <rect x={6}   y={18} width={145} height={56} fill="#dcfce7" rx={10}/>
      <text x={78}  y={34} textAnchor="middle" fontSize={9} fontWeight="800" fill="#16a34a">BEAR CLAW GRIP</text>
      <text x={78}  y={46} textAnchor="middle" fontSize={8} fill="#15803d">Fingertips CURLED back</text>
      <text x={78}  y={57} textAnchor="middle" fontSize={8} fill="#15803d">Knuckles GUIDE blade</text>
      <text x={78}  y={68} textAnchor="middle" fontSize={8} fill="#16a34a">مخلب الدب — مفاصل مرشدة</text>
      <rect x={165} y={18} width={149} height={56} fill="#fee2e2" rx={10}/>
      <text x={239} y={34} textAnchor="middle" fontSize={9} fontWeight="800" fill="#dc2626">NEVER DO</text>
      <text x={239} y={46} textAnchor="middle" fontSize={8} fill="#b91c1c">Fingers extended toward blade</text>
      <text x={239} y={57} textAnchor="middle" fontSize={8} fill="#b91c1c">Forcing through hard material</text>
      <text x={239} y={68} textAnchor="middle" fontSize={8} fill="#dc2626">أصابع نحو الشفرة — إجبار</text>
      <text x={160} y={84} textAnchor="middle" fontSize={7} fill="#1d4ed8" fontWeight="600">Dull knife = more force needed = higher slip risk — report dull knives immediately</text>
    </Svg>;
  }

  if (n.includes('Manual')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">CORRECT LIFTING — الرفع الصحيح</text>
      <rect x={6}   y={18} width={148} height={56} fill="#dcfce7" rx={10}/>
      <text x={80}  y={33} textAnchor="middle" fontSize={9} fontWeight="800" fill="#16a34a">CORRECT</text>
      {['Bend KNEES (not waist)', 'Load CLOSE to body', 'Back stays STRAIGHT', 'Pivot FEET to turn'].map((t, i) =>
        <text key={i} x={80} y={46 + i*10} textAnchor="middle" fontSize={7.5} fill="#15803d">{t}</text>
      )}
      <rect x={165} y={18} width={149} height={56} fill="#fee2e2" rx={10}/>
      <text x={239} y={33} textAnchor="middle" fontSize={9} fontWeight="800" fill="#dc2626">AVOID</text>
      {['Bending from the WAIST', 'Holding load FAR away', 'TWISTING spine under load', 'Jerking movements'].map((t, i) =>
        <text key={i} x={239} y={46 + i*10} textAnchor="middle" fontSize={7.5} fill="#b91c1c">{t}</text>
      )}
      <text x={160} y={84} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">Back injuries = 40% of occupational injuries — most preventable with correct technique</text>
    </Svg>;
  }

  if (n.includes('Fire')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">FIRE TRIANGLE + RACE PROTOCOL — مثلث الحريق + بروتوكول RACE</text>
      <path d="M80,78 L30,78 L55,34 Z" fill="#fee2e2" stroke="#dc2626" strokeWidth={1.5}/>
      <text x={52}  y={63} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#991b1b">FUEL</text>
      <text x={52}  y={73} textAnchor="middle" fontSize={8}   fill="#dc2626">وقود</text>
      <path d="M80,78 L130,78 L105,34 Z" fill="#ffedd5" stroke="#ea580c" strokeWidth={1.5}/>
      <text x={108} y={63} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#c2410c">OXYGEN</text>
      <text x={108} y={73} textAnchor="middle" fontSize={8}   fill="#ea580c">أكسجين</text>
      <text x={80}  y={55} textAnchor="middle" fontSize={7}   fontWeight="700" fill="#7f1d1d">HEAT</text>
      <text x={80}  y={65} textAnchor="middle" fontSize={8}   fill="#991b1b">حرارة</text>
      <path d="M62,32 Q65,22 60,16 Q68,24 70,32 Q73,20 67,12 Q78,28 73,36 Q67,23 62,32 Z" fill="#f97316" opacity={0.9}/>
      <rect x={150} y={16} width={164} height={62} fill="#fafafa" rx={10} stroke="#e2e8f0" strokeWidth={1}/>
      {[
        { col:'#dc2626', l:'R', t:'RESCUE — إنقاذ' },
        { col:'#f97316', l:'A', t:'ALARM 997/998 — إنذار' },
        { col:'#3b82f6', l:'C', t:'CONTAIN (close doors) — احتواء' },
        { col:'#10b981', l:'E', t:'EXTINGUISH (small fire only)' },
      ].map((row, i) => <g key={i}>
        <circle cx={165} cy={28 + i*14} r={7} fill={row.col}/>
        <text x={165}  y={32 + i*14} textAnchor="middle" fontSize={8}   fontWeight="800" fill="#fff">{row.l}</text>
        <text x={178}  y={32 + i*14} textAnchor="start"  fontSize={7.5} fontWeight="600" fill="#1e293b">{row.t}</text>
      </g>)}
      <text x={160} y={86} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">If in doubt — GET OUT. UAE Emergency: 997 Civil Defence / 998 Ambulance</text>
    </Svg>;
  }

  if (n.includes('First Aid')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">FIRST AID KEY ACTIONS — إجراءات الإسعاف الرئيسية</text>
      {[
        { x:45,  col:'#dc2626', t1:'CUTS',     t2:'Press 10 min',    t3:'اضغط 10 دقائق' },
        { x:120, col:'#f97316', t1:'BURNS',    t2:'Cool 20 min',     t3:'برّد 20 دقيقة' },
        { x:197, col:'#eab308', t1:'EYE',      t2:'Eyewash 15 min',  t3:'محطة 15 دقيقة' },
        { x:272, col:'#8b5cf6', t1:'CHEMICAL', t2:'Flush + SDS §4',  t3:'شطف + SDS' },
      ].map((s, i) => <g key={i}>
        <circle cx={s.x} cy={47} r={26} fill={s.col} opacity={0.13}/>
        <circle cx={s.x} cy={47} r={26} stroke={s.col} strokeWidth={1.8}/>
        <text x={s.x} y={38} textAnchor="middle" fontSize={9}   fontWeight="800" fill={s.col}>{s.t1}</text>
        <text x={s.x} y={50} textAnchor="middle" fontSize={7.5} fontWeight="600" fill={s.col}>{s.t2}</text>
        <text x={s.x} y={63} textAnchor="middle" fontSize={8}   fill="#64748b">{s.t3}</text>
      </g>)}
      <text x={160} y={84} textAnchor="middle" fontSize={7.5} fill="#dc2626" fontWeight="700">EMERGENCY: 998 — ALL incidents reported same shift — no exceptions</text>
    </Svg>;
  }

  if (n.includes('TESTO') || n.includes('Oil Quality')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">TPM% OIL QUALITY METER — مقياس جودة الزيت TPM%</text>
      <path d="M52,75 A72,72 0 0 1 160,3"   stroke="#22c55e" strokeWidth={20} fill="none" strokeLinecap="round"/>
      <path d="M160,3 A72,72 0 0 1 205,18"  stroke="#eab308" strokeWidth={20} fill="none" strokeLinecap="round"/>
      <path d="M205,18 A72,72 0 0 1 268,75" stroke="#ef4444" strokeWidth={20} fill="none" strokeLinecap="round"/>
      <text x={72}  y={72} textAnchor="middle" fontSize={8}   fontWeight="700" fill="#16a34a">0–24%</text>
      <text x={72}  y={83} textAnchor="middle" fontSize={7.5} fontWeight="600" fill="#16a34a">ACCEPT</text>
      <text x={160} y={28} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#ca8a04">24–27%</text>
      <text x={160} y={38} textAnchor="middle" fontSize={7}   fill="#ca8a04">MONITOR</text>
      <text x={248} y={72} textAnchor="middle" fontSize={8}   fontWeight="700" fill="#dc2626">&gt;27%</text>
      <text x={248} y={83} textAnchor="middle" fontSize={7.5} fontWeight="600" fill="#dc2626">DISCARD</text>
      <text x={160} y={60} textAnchor="middle" fontSize={10}  fontWeight="800" fill="#1e293b">TPM%</text>
      <text x={160} y={72} textAnchor="middle" fontSize={8}   fill="#475569">نسبة المواد القطبية</text>
    </Svg>;
  }

  if (n.includes('Quality System')) {
    const mods = [
      { col:'#3b82f6', t1:'CERTS',    t2:'شهادات' },
      { col:'#8b5cf6', t1:'REPORTS',  t2:'تقارير' },
      { col:'#ec4899', t1:'RETURNS',  t2:'مرتجعات' },
      { col:'#f59e0b', t1:'MEAT',     t2:'حالة اللحم' },
      { col:'#10b981', t1:'RECEIVING',t2:'الاستلام' },
    ];
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">QCS SYSTEM MODULES — وحدات نظام جودة QCS</text>
      {mods.map((m, i) => {
        const x = 16 + i * 59;
        return <g key={i}>
          <rect x={x} y={19} width={54} height={54} fill={m.col} opacity={0.13} rx={9}/>
          <rect x={x} y={19} width={54} height={54} stroke={m.col} strokeWidth={1.5} fill="none" rx={9}/>
          <text x={x+27} y={42} textAnchor="middle" fontSize={8}   fontWeight="800" fill={m.col}>{m.t1}</text>
          <text x={x+27} y={56} textAnchor="middle" fontSize={8.5} fill="#64748b">{m.t2}</text>
        </g>;
      })}
      <text x={160} y={83} textAnchor="middle" fontSize={7} fill="#0369a1" fontWeight="600">Filter by Date + Branch FIRST — data is only useful when acted upon</text>
    </Svg>;
  }

  return null;
}

/* ===================== Training Reference Modal ===================== */
export default function TrainingReferenceModal({
  open, onClose, moduleName, branch, date,
  details, objectives, conductedBy,
  quickCheckQuestions,   // optional: array of {q_en|q, q_ar, options_en|options, options_ar, correct}
}) {
  const [openIdx, setOpenIdx] = useState(0);
  const [globalLang, setGlobalLang] = useGlobalLang();
  // "both" = show EN+AR (default for unified flow); "en" / "ar" filter the body lines
  const [viewMode, setViewMode] = useState(globalLang); // synced with global lang
  // sync when global lang changes
  React.useEffect(() => { setViewMode(globalLang); }, [globalLang]);

  if (!open) return null;

  const sections     = parseRefSections(details);
  const isAr         = t => /[؀-ۿ]/.test(t);
  const isLabel      = t => /^[A-Z][A-Z\s]{1,}:/.test(t);
  const isArLabel    = t => /^[؀-ۿ].{0,8}:/.test(t);
  const isQuestion   = t => /[?؟]\s*$/.test(t.trimEnd());
  const illustration = getModuleIllustration(moduleName);
  const qqList       = Array.isArray(quickCheckQuestions) ? quickCheckQuestions : [];

  const doPrint = () => {
    const s = document.createElement('style');
    s.id = '_tref_ps_';
    s.textContent = `@media print{body>*{display:none!important}#tm-ref-print,#tm-ref-print *{visibility:visible!important}#tm-ref-print{position:fixed!important;inset:0!important;overflow:visible!important;background:#fff!important;padding:16px!important;max-width:none!important;border-radius:0!important;box-shadow:none!important}.tm-noprint{display:none!important}}`;
    document.head.appendChild(s);
    window.print();
    setTimeout(() => document.getElementById('_tref_ps_')?.remove(), 1400);
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:'fixed', inset:0, zIndex:9999,
        background:'rgba(8,12,28,0.85)', backdropFilter:'blur(10px)',
        display:'flex', alignItems:'flex-start', justifyContent:'center',
        padding:'20px 14px', overflowY:'auto',
      }}
    >
      <div id="tm-ref-print" style={{
        width:'100%', maxWidth:920,
        background:'#fff', borderRadius:24,
        boxShadow:'0 48px 130px rgba(0,0,0,.6)',
        overflow:'hidden',
        fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",
      }}>

        {/* ── Header ── */}
        <div style={{
          background:'linear-gradient(135deg,#0f172a 0%,#1e3a8a 50%,#4338ca 100%)',
          padding:'22px 28px',
        }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:18, flexWrap:'wrap' }}>
            <div style={{ background:'#fff', borderRadius:14, padding:5, boxShadow:'0 4px 20px rgba(0,0,0,.4)', flexShrink:0 }}>
              <img src="/mawashi-logo.jpg" alt="Al Mawashi" style={{ height:62, width:62, objectFit:'contain', display:'block', borderRadius:10 }} />
            </div>
            <div style={{ flex:1, minWidth:180 }}>
              <div style={{ color:'rgba(255,255,255,.45)', fontSize:9.5, fontWeight:800, letterSpacing:2.5, textTransform:'uppercase', marginBottom:5 }}>
                Al Mawashi — Training Reference Guide
              </div>
              <div style={{ color:'#fff', fontWeight:800, fontSize:22, letterSpacing:'-0.03em', lineHeight:1.2 }}>{getModuleName(moduleName, viewMode)}</div>
              <div style={{ display:'flex', gap:14, marginTop:8, flexWrap:'wrap' }}>
                {[['🏢', branch], ['📅', date], conductedBy && ['👤', conductedBy]].filter(Boolean).map(([icon, label], i) => (
                  <span key={i} style={{ color:'rgba(255,255,255,.75)', fontSize:12, fontWeight:500, display:'flex', alignItems:'center', gap:4 }}>
                    {icon} {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="tm-noprint" style={{ display:'flex', gap:8, alignSelf:'flex-start', flexShrink:0 }}>
              {/* ✅ Language toggle */}
              <div style={{ display:'flex', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:10, overflow:'hidden' }}>
                <button onClick={() => { setViewMode('en'); setGlobalLang('en'); }} style={{
                  background: viewMode === 'en' ? '#fff' : 'transparent',
                  color: viewMode === 'en' ? '#1e3a8a' : '#fff',
                  border:'none', padding:'9px 12px', fontWeight:700, fontSize:12, cursor:'pointer',
                }}>EN</button>
                <button onClick={() => { setViewMode('ar'); setGlobalLang('ar'); }} style={{
                  background: viewMode === 'ar' ? '#fff' : 'transparent',
                  color: viewMode === 'ar' ? '#1e3a8a' : '#fff',
                  border:'none', padding:'9px 12px', fontWeight:700, fontSize:12, cursor:'pointer',
                }}>عربي</button>
              </div>
              <button onClick={doPrint} style={{
                background:'#fff', color:'#1e3a8a', border:'none', borderRadius:10,
                padding:'9px 16px', fontWeight:700, fontSize:12.5, cursor:'pointer',
                boxShadow:'0 2px 10px rgba(0,0,0,.2)',
              }}>🖨️ {viewMode === 'ar' ? 'طباعة' : 'Print'}</button>
              <button onClick={onClose} style={{
                background:'rgba(255,255,255,.1)', color:'#fff',
                border:'1px solid rgba(255,255,255,.2)',
                borderRadius:10, padding:'9px 13px', fontWeight:700, fontSize:13, cursor:'pointer',
              }}>✕</button>
            </div>
          </div>
        </div>

        {/* ── Objectives ── */}
        {objectives && (
          <div style={{ background:'#f0fdf4', borderBottom:'1px solid #bbf7d0', padding:'13px 28px' }}>
            <div style={{ fontSize:9.5, fontWeight:800, color:'#16a34a', letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>
              🎯 Objectives — الأهداف ومعايير التقييم
            </div>
            <div style={{ fontSize:14, color:'#166534', lineHeight:1.85, whiteSpace:'pre-wrap' }}>{objectives}</div>
          </div>
        )}

        {/* ── Illustration ── */}
        {illustration && (
          <div style={{ padding:'18px 28px 0' }}>
            <div style={{
              background:'linear-gradient(135deg,#f8faff 0%,#eef2ff 100%)',
              borderRadius:16, padding:'16px 20px',
              border:'1px solid #e0e7ff',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {illustration}
            </div>
          </div>
        )}

        {/* ── Quick-nav letter pills ── */}
        {sections.length > 0 && (
          <div className="tm-noprint" style={{ padding:'16px 28px 4px', display:'flex', gap:5, flexWrap:'wrap' }}>
            {sections.map((sec, idx) => {
              const col = LETTER_PALETTE[idx % LETTER_PALETTE.length];
              const active = openIdx === idx;
              return (
                <button key={sec.letter} onClick={() => setOpenIdx(idx)} style={{
                  width:30, height:30, borderRadius:8, border:'none',
                  background: active ? col : '#f1f5f9',
                  color: active ? '#fff' : '#64748b',
                  fontWeight:800, fontSize:12.5, cursor:'pointer',
                  boxShadow: active ? `0 2px 8px ${col}55` : 'none',
                  transition:'background 0.15s, color 0.15s, box-shadow 0.15s',
                }}>{sec.letter}</button>
              );
            })}
          </div>
        )}

        {/* ── Accordion sections ── */}
        <div style={{ padding:'12px 28px 8px' }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#4338ca', letterSpacing:2, textTransform:'uppercase', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
            <span>📋</span><span>Training Content — محتوى التدريب</span>
          </div>

          {sections.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {sections.map((sec, idx) => {
                const col     = LETTER_PALETTE[idx % LETTER_PALETTE.length];
                const isOpen  = openIdx === idx;
                const hasBody = sec.body?.length > 0;
                return (
                  <div key={sec.letter} style={{
                    borderRadius:14, overflow:'hidden',
                    border:`1.5px solid ${isOpen ? col : '#e8ecf2'}`,
                    boxShadow: isOpen ? `0 6px 24px ${col}22` : '0 1px 3px rgba(0,0,0,.05)',
                    transition:'border-color 0.2s, box-shadow 0.2s',
                  }}>
                    {/* Section header */}
                    <div
                      onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                      style={{
                        display:'flex', alignItems:'center', gap:14, padding:'14px 18px',
                        background: isOpen ? `linear-gradient(135deg,${col}22,${col}0a)` : '#f9fafb',
                        cursor:'pointer', transition:'background 0.2s',
                      }}
                    >
                      <div style={{
                        flexShrink:0, width:36, height:36, borderRadius:11,
                        background: isOpen ? col : '#e2e8f0',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color: isOpen ? '#fff' : '#64748b',
                        fontWeight:800, fontSize:15,
                        boxShadow: isOpen ? `0 4px 12px ${col}55` : 'none',
                        transition:'background 0.2s, box-shadow 0.2s, color 0.2s',
                      }}>{sec.letter}</div>

                      <div style={{ flex:1, minWidth:0 }}>
                        {viewMode !== 'ar' && (
                          <div style={{ fontSize:15, fontWeight:700, color: isOpen ? '#0f172a' : '#374151', lineHeight:1.35 }}>{sec.en}</div>
                        )}
                        {sec.ar && viewMode !== 'en' && (
                          <div style={{ fontSize:15, fontWeight:600, color: viewMode === 'ar' ? '#0f172a' : '#475569', marginTop: viewMode === 'ar' ? 0 : 3, direction:'rtl', textAlign:'right', lineHeight:1.5 }}>{sec.ar}</div>
                        )}
                      </div>

                      {hasBody && (
                        <div style={{
                          flexShrink:0, width:28, height:28, borderRadius:8,
                          background: isOpen ? `${col}22` : '#f1f5f9',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          color: isOpen ? col : '#94a3b8',
                          fontSize:13, fontWeight:900,
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition:'transform 0.2s, background 0.2s, color 0.2s',
                        }}>▼</div>
                      )}
                    </div>

                    {/* Body */}
                    {isOpen && hasBody && (
                      <div style={{ borderTop:`1px solid ${col}30`, background:'#fff', padding:'14px 20px 18px' }}>
                        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                          {sec.body.map((line, li) => {
                            const arabic  = isAr(line);
                            // ✅ filter by chosen language
                            if (viewMode === 'ar' && !arabic) return null;
                            if (viewMode === 'en' && arabic)  return null;
                            const lbl     = isLabel(line);
                            const arLbl   = isArLabel(line);
                            const isQ     = isQuestion(line);
                            return (
                              <div key={li} style={{
                                direction:    arabic ? 'rtl' : 'ltr',
                                textAlign:    arabic ? 'right' : 'left',
                                fontSize:     arabic ? 15 : 14,
                                fontWeight:   isQ ? 700 : (lbl || arLbl) ? 700 : (arabic ? 500 : 400),
                                color:        isQ ? '#92400e' : (lbl || arLbl) ? '#0f172a' : (arabic ? '#1e293b' : '#374151'),
                                lineHeight:   1.8,
                                padding:      isQ ? '5px 10px' : '3px 0',
                                marginTop:    isQ ? 6 : 0,
                                marginBottom: isQ ? 4 : 0,
                                borderBottom: !isQ && li < sec.body.length - 1 ? '1px solid #f8fafc' : 'none',
                                paddingTop:   !isQ && (lbl || arLbl) && li > 0 ? 10 : isQ ? 5 : 3,
                                // ── Question highlight ──
                                background:   isQ ? 'linear-gradient(90deg,#fef9c3,#fefce8)' : 'transparent',
                                borderLeft:   isQ ? '4px solid #f59e0b' : 'none',
                                borderRadius: isQ ? 7 : 0,
                              }}>
                                {isQ && <span style={{ marginRight: arabic ? 0 : 6, marginLeft: arabic ? 6 : 0, fontSize:13 }}>🔶</span>}
                                {line}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:20, fontSize:14, color:'#334155', lineHeight:1.85, whiteSpace:'pre-wrap' }}>
              {details || 'No details available.'}
            </div>
          )}
        </div>

        {/* ── Quick Check / الفحص السريع ── */}
        {qqList.length > 0 && (
          <div style={{ padding:'4px 28px 12px' }}>
            <div style={{
              fontSize:10, fontWeight:800, letterSpacing:2, textTransform:'uppercase',
              marginBottom:12, display:'flex', alignItems:'center', gap:8, color:'#b45309',
            }}>
              <span>🎯</span><span>Quick Check — الفحص السريع</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {qqList.map((qq, i) => {
                const qText  = qq.q_en  || qq.q  || '';
                const qAr    = qq.q_ar  || '';
                const opts   = qq.options_en || qq.options || [];
                const optsAr = qq.options_ar || [];
                const right  = typeof qq.correct === 'number' ? qq.correct : -1;
                return (
                  <div key={i} style={{
                    borderRadius:12, overflow:'hidden',
                    border:'1.5px solid #fde68a',
                    boxShadow:'0 2px 8px rgba(245,158,11,.12)',
                  }}>
                    {/* Question — highlighted */}
                    <div style={{
                      background:'linear-gradient(90deg,#fef9c3 0%,#fefce8 100%)',
                      borderLeft:'4px solid #f59e0b',
                      padding:'10px 16px',
                    }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                        <span style={{
                          flexShrink:0, background:'#f59e0b', color:'#fff',
                          borderRadius:6, padding:'2px 7px',
                          fontSize:11, fontWeight:800,
                        }}>Q{i+1}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14.5, fontWeight:700, color:'#78350f', lineHeight:1.5 }}>{qText}</div>
                          {qAr && (
                            <div style={{ fontSize:15, fontWeight:600, color:'#92400e', direction:'rtl', textAlign:'right', lineHeight:1.6, marginTop:4 }}>{qAr}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Options */}
                    {opts.length > 0 && (
                      <div style={{ background:'#fffbeb', padding:'8px 16px 10px', display:'flex', flexDirection:'column', gap:5 }}>
                        {opts.map((opt, oi) => {
                          const isRight = oi === right;
                          return (
                            <div key={oi} style={{ display:'flex', flexDirection:'column', gap:2 }}>
                              <div style={{
                                display:'flex', alignItems:'center', gap:8,
                                fontSize:13.5, fontWeight: isRight ? 700 : 400,
                                color: isRight ? '#15803d' : '#64748b',
                                background: isRight ? '#f0fdf4' : 'transparent',
                                borderRadius: isRight ? 7 : 0,
                                padding: isRight ? '3px 8px' : '1px 0',
                                border: isRight ? '1px solid #bbf7d0' : 'none',
                              }}>
                                <span style={{ fontSize:14 }}>{isRight ? '✅' : '○'}</span>
                                <span>{opt}</span>
                              </div>
                              {optsAr[oi] && (
                                <div style={{
                                  fontSize:13, fontWeight: isRight ? 600 : 400,
                                  color: isRight ? '#166534' : '#94a3b8',
                                  direction:'rtl', textAlign:'right',
                                  paddingRight:8, lineHeight:1.5,
                                }}>{optsAr[oi]}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ margin:'16px 28px 28px', paddingTop:16, borderTop:'2px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src="/mawashi-logo.jpg" alt="" style={{ height:26, width:26, objectFit:'contain', borderRadius:6, opacity:.5 }} />
            <span style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>Al Mawashi — QA / Food Safety Training Reference</span>
          </div>
          <div style={{ fontSize:11, color:'#94a3b8', textAlign:'right', lineHeight:1.7 }}>
            <div>Doc No: FS-QM/REC/TR/1 | Rev: 0</div>
            <div>Issued: 05/02/2020 | {date}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
