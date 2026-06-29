n# تقرير فحص فجوات ISO 22000:2018 مقابل نظام Al Mawashi Inspection

تاريخ الفحص: 2026-06-24  
مرجع المواصفة المستخدم: ISO 22000:2018(E), Second edition 2018-06، ملف `C:\Users\moham\Downloads\ISO_22000_2018.pdf`  
نطاق الفحص: مراجعة كود النظام والمستندات/الوحدات الظاهرة داخل `D:\inspection-react-full`، وليس تدقيق سجلات الإنتاج الفعلية على السيرفر.

## الخلاصة التنفيذية

النظام يغطي جزءاً كبيراً من متطلبات ISO 22000:2018، خصوصاً:

- دليل FSMS كامل ومربوط ببنود 4 إلى 10.
- سياسة سلامة الغذاء.
- سجل مخاطر وفرص وتغيير.
- سجل مستندات.
- SOP/sSOP وبرامج PRP كثيرة.
- سجلات CCP، traceability، mock recall، real recall.
- تدريب، كفاءة، تدقيق داخلي، MRM، شكاوى، معايرة، موردين، سجلات تشغيلية للفروع والإنتاج.

لكن من منظور مدقق خارجي صارم، توجد فجوات يجب إغلاقها قبل الاعتماد أو Surveillance Audit:

1. لا توجد وحدة مستقلة واضحة لـ Emergency Preparedness شاملة لكل سيناريوهات 8.4، الموجود غالباً داخل الدليل وSOP انحراف الحرارة وHSE.
2. لا توجد وحدة Communication Matrix مستقلة تثبت متطلبات 7.4: ماذا/متى/مع من/كيف/من المسؤول، مع سجل بلاغات داخلية وخارجية.
3. OPRP غير مفصول عملياً عن CCP في السجلات، مع أن المواصفة تتطلب monitoring/action criteria للـ OPRP بشكل واضح.
4. Validation للأعمال الحرجة موجود في الدليل، لكنه يحتاج أدلة مرفقة: دراسات، مراجع علمية، نتائج challenge/thermal/sanitizer/allergen validation، واعتماد قبل التطبيق.
5. Control of potentially unsafe product موجود نصاً، لكن يحتاج سجل Hold/Release/Disposition مستقل يربط المنتج المتأثر بالقرار، المسؤول، السبب، والأدلة.
6. برنامج Verification شامل لـ PRP/HACCP يحتاج schedule ونتائج وتحليل اتجاهات مستقل، لا يكفي وجود سجلات متفرقة.
7. بعض الفروع POS24/POS26 يظهر بها تبويبات placeholder لبعض السجلات اليومية، وهذا سيظهر كعدم اكتمال عند تعميم النطاق على كل الفروع.

## مصفوفة المطابقة

| بند ISO | الحكم | الموجود في النظام | الفجوة / المطلوب |
|---|---:|---|---|
| 4.1 سياق المنظمة | جيد | FSMS Manual يحتوي سياق داخلي/خارجي وسجل مخاطر. | يحتاج مراجعة سنوية موقعة أو record يثبت أن السياق تم تحديثه عند التغيير. |
| 4.2 الأطراف المعنية | جيد | FSMS Manual يحتوي جدول Interested Parties، ويوجد Supplier Evaluation وLegal Register. | أضف سجل مراجعة للأطراف المعنية مع تاريخ ومالك ومتطلبات محدثة. |
| 4.3 نطاق FSMS | جيد | الدليل يذكر المواقع والعمليات والمنتجات. | تأكد أن النطاق يطابق الواقع: كل الفروع، المنتجات الجديدة، outsourced processes. |
| 4.4 نظام FSMS | جيد | HaccpIsoMenu يجمع وحدات النظام الأساسية. | يحتاج process interaction map أو خريطة عمليات تربط الوحدات ببعضها. |
| 5.1 القيادة والالتزام | مقبول | FSMS Manual فيه اعتماد وتواقيع إلكترونية؛ يوجد MRM. | المدقق قد يطلب evidence حي: محاضر اجتماعات، قرارات موارد، إغلاق NCs. |
| 5.2 السياسة | جيد | Food Safety Policy موجودة كوحدة مستقلة. | أضف سجل إقرار/توعية الموظفين، وصور/دليل نشر السياسة في المواقع. |
| 5.3 الأدوار والمسؤوليات | مقبول | الدليل يذكر الأدوار، ويوجد صلاحيات عامة. | مطلوب Organization Chart + Job Descriptions/FSMS Responsibility Matrix مع توقيع/اعتماد. |
| 6.1 المخاطر والفرص | جيد | Risk Register وOpportunity Register موجودان. | أضف evidence أن الإجراءات الناتجة من المخاطر مغلقة ومراجعة الفعالية. |
| 6.2 أهداف FSMS | جيد | Objectives module موجود. | يجب ربط كل هدف بقياس فعلي، مالك، موعد، حالة، وتحليل عند عدم تحقيق الهدف. |
| 6.3 تخطيط التغييرات | جيد | Change Management Log موجود. | ممتاز كبنية، لكن يحتاج إلزام workflow لكل تغيير قبل التطبيق وليس بعده. |
| 7.1 الموارد | مقبول | تدريب، معايرة، صيانة، HSE، تراخيص. | لا توجد Resource Adequacy Review مستقلة ضمن MRM: عمالة، معدات، IT، بنية، بيئة عمل. |
| 7.2 الكفاءة | جيد | Training module، annual plan، certificates، gap analysis. | أضف competency matrix للأدوار الحرجة: QA, CCP monitor, verifier, recall team, internal auditor. |
| 7.3 الوعي | مقبول | تدريب وسياسة، quiz، reference material. | يلزم evidence أن الموظف يفهم سياسة FSMS، المخاطر، أثر عدم المطابقة، وليس فقط حضور تدريب. |
| 7.4 التواصل | ناقص مهم | مذكور في FSMS Manual وشكاوى العملاء. | مطلوب Communication Matrix + Communication Log مستقل داخلي/خارجي، يشمل السلطات، الموردين، العملاء، فريق سلامة الغذاء. |
| 7.5 المعلومات الموثقة | جيد | Document Register، FSMS Manual، SOP/sSOP، metadata، retention. | أضف سجل Obsolete Documents وDocument Change Request/Approval كامل إن لم يكن مخزناً كسجلات فعلية. |
| 8.1 التخطيط والتحكم التشغيلي | جيد | سجلات تشغيل للفروع، production، receiving، cleaning، temperature، etc. | يلزم التأكد أن كل مواقع النطاق لديها نفس الحد الأدنى من السجلات، وليس فقط POS10/11/15/19 والإنتاج. |
| 8.2 PRPs | جيد | SOP/sSOP كثيرة: hygiene, cleaning, pest, maintenance, chemical, waste, allergen, glass. | المطلوب: PRP verification schedule موحد ونتائج شهرية، وليس فقط وجود SOPs وسجلات متفرقة. |
| 8.3 Traceability | جيد | Traceability logs، Mock Recall، receiving/production records. | أضف KPI إلزامي: خلال كم ساعة تم تتبع خطوة للأمام/الخلف ونسبة الاسترجاع. |
| 8.4 Emergency preparedness | ناقص متوسط/عال | موجود في FSMS Manual، SOP انحراف حرارة، HSE emergency contacts/SOPs. | مطلوب وحدة FSMS Emergency Drill/Incident Log تشمل power failure, chiller breakdown, contamination, pest, transport failure, supplier NC, flood, communication failure. |
| 8.5.1 Preliminary steps | جيد | Product descriptions، process flows، intended use، flow verification. | تحقق أن كل منتج جديد له مواصفة محدثة قبل البيع. |
| 8.5.2 Hazard analysis | مقبول | Hazard analysis مفصل في fsmsHaccp.js. | يحتاج مراجعة علمية أقوى لبعض التصنيفات: لماذا PRP/CCP/OPRP؟ وما هي acceptable levels لكل خطر. |
| 8.5.3 Validation | ناقص متوسط | قسم validation موجود في الدليل. | مطلوب مرفقات أدلة validation: مراجع، نتائج تجارب، تقارير swabs/ATP/allergen، اعتماد QA قبل implementation. |
| 8.5.4 HACCP/OPRP plan | ناقص متوسط | CCP monitoring موجود، وHACCP plan داخل الدليل. | OPRP غير مفصول كسجل مستقل مع action criteria. أنشئ OPRP Monitoring Log أو عدل CCP module ليدعم النوعين بوضوح. |
| 8.6 تحديث PRP/HACCP | مقبول | Change Management وMRM وmanual amendment. | مطلوب سجل يثبت: عند تغير منتج/مورد/معدات/شكوى، هل تم تحديث hazard analysis وPRPs أم لا. |
| 8.7 التحكم بالمراقبة والقياس | جيد | Calibration وInternal Calibration موجودان. | أضف تقييم أثر عند جهاز خارج المعايرة: ما السجلات المتأثرة؟ هل المنتج تأثر؟ |
| 8.8 Verification PRP/HACCP | ناقص متوسط | تدقيق داخلي، dashboard، سجلات تشغيلية. | مطلوب Verification Programme جامع: activity, frequency, responsible, method, result, trend analysis, corrective action. |
| 8.9 عدم مطابقة المنتج/العملية | ناقص متوسط | NCR/CAR موجودة في QCS، Real Recall، SOP rejection. | مطلوب Hold/Release/Disposition Log مستقل للمنتج المحتمل عدم سلامته، مع قرار release أو disposal أو rework. |
| 9.1 التحليل والتقييم | مقبول | Dashboards، complaints analysis، KPIs. | أضف monthly FSMS performance report موحد يجمع CCP deviations, PRP failures, complaints, supplier NC, recalls, audits, objectives. |
| 9.2 التدقيق الداخلي | جيد | Internal Audit module + reports. | يلزم audit programme سنوي مبني على المخاطر، كفاءة المدققين، واستقلالية المدقق. |
| 9.3 مراجعة الإدارة | جيد | MRM module. | تأكد أن كل inputs/outputs المطلوبة محفوظة كمحضر مع actions، owners، due dates، follow-up. |
| 10.1 NC & corrective action | مقبول | CAR, complaints CAPA, NCR, continual improvement. | أضف CAPA master tracker موحد يربط كل مصدر: audit, complaint, CCP deviation, supplier, PRP, recall. |
| 10.2 Continual improvement | جيد | Continual Improvement Log. | يحتاج evidence فعالية التحسين بعد التنفيذ. |
| 10.3 تحديث FSMS | مقبول | Manual revision, change log, MRM. | مطلوب سجل FSMS Update Decision يربط كل trigger بمراجعة HACCP/PRP/manual. |

## المستندات/الوحدات المطلوب إضافتها أو تقويتها

### أولوية عالية

1. FSMS Communication Matrix and Log
   - يغطي: internal communication، external communication، authorities، suppliers، customers، contractors، food safety team.
   - الحقول: topic، trigger، receiver، method، responsible، frequency، evidence، date، follow-up.

2. Emergency Preparedness and Response Register
   - سيناريوهات إلزامية: power failure، chiller/freezer breakdown، transport cold-chain failure، product contamination، pest infestation، flood/heavy rain، supplier nonconforming product، communication failure، recall crisis.
   - الحقول: scenario، drill date، participants، result، product affected، decision، CAPA، verification.

3. Potentially Unsafe Product Hold/Release/Disposition Log
   - الحقول: product/batch، source، reason، quantity، hold location، QA evaluation، lab/result evidence، decision، disposal/rework/release، approval.

4. OPRP Monitoring Log
   - إذا بقيت كل النقاط CCP فقط، سيستغرب المدقق لماذا لا توجد OPRPs رغم أن النظام يذكرها. الأفضل فصل OPRP عن CCP أو دعم الاثنين في نفس الوحدة بوضوح.

### أولوية متوسطة

5. Validation Evidence Register
   - مرفقات ومراجع لكل control measure: cold storage limits، receiving limits، sanitizer concentration، allergen cleaning validation، cooking/drying where applicable.

6. Verification Programme
   - جدول تحقق موحد: PRP verification، HACCP review، CCP record review، swabs، calibration review، internal audit، mock recall، complaint trend.

7. Competency Matrix
   - للأدوار الحرجة: CCP monitor، verifier، internal auditor، recall coordinator، QA release authority، pest contractor contact، maintenance technician.

8. CAPA Master Tracker
   - يجمع corrective actions من كل المصادر بدل تشتتها بين complaints/audit/NCR/CCP.

### أولوية منخفضة لكن مهمة للتدقيق

9. Obsolete Documents Register
10. Master List of External Documents
11. FSMS Process Interaction Map
12. Resource Adequacy Review داخل MRM
13. Supplier NC/Performance Trend Report
14. Food Defense/Food Fraud review evidence سنوي

## ملاحظات على النظام الحالي

- بنية HACCP/ISO قوية وموجودة في `src/pages/haccp and iso/HaccpIsoMenu.jsx`.
- FSMS Manual يحتوي محتوى واسع في `src/pages/haccp and iso/FSMSManual/fsmsContent.js`.
- HACCP product descriptions, flow diagrams, hazard analysis, validation, CCP/HACCP plan موجودة في `src/pages/haccp and iso/FSMSManual/fsmsHaccp.js`.
- SOP/sSOP list قوية جداً في `src/pages/haccp and iso/SOP/sopData.js`.
- Document Register يسحب SOP/sSOP/policy/manual ويضيف metadata في `src/pages/haccp and iso/DocumentRegister/documentSources.js`.
- توجد routes كثيرة فعلياً في `src/App.jsx` لـ ISO/HACCP، training، calibration، recall، supplier، MRM، audit.

## حكم المدقق

الحكم العام: النظام قريب من الجاهزية، لكن ليس جاهزاً كـ ISO 22000 audit package كامل بدون إغلاق الفجوات أعلاه.

لو كنت مدققاً خارجياً، غالباً أسجل:

- Minor NC على 7.4 إذا لا يوجد Communication Matrix/Log.
- Minor أو Major حسب السجلات على 8.4 إذا لا توجد تدريبات/اختبارات طوارئ FSMS موثقة.
- Minor على 8.5.3 إذا validation مجرد نص في manual بدون evidence.
- Minor على 8.8 إذا لا يوجد verification programme وتحليل نتائج.
- Minor على 8.9.4 إذا لا يوجد Hold/Release/Disposition سجل واضح للمنتجات المحتمل عدم سلامتها.

أسرع خطة إغلاق: إنشاء 5 وحدات/نماذج فقط: Communication Log، Emergency Drill Log، Hold/Release Log، Validation Register، Verification Programme. هذه ستغلق معظم مخاطر التدقيق.

## ملحق تحديث بعد مراجعة HSE

بعد فحص قسم HSE، يجب تعديل الحكم قليلاً: بعض الفجوات التي ظهرت أولاً ليست مفقودة تماماً، لكنها موجودة داخل HSE وليست مربوطة كأدلة مباشرة داخل FSMS/HACCP. هذا مهم جداً في التدقيق، لأن المدقق إذا دخل من ISO/HACCP فقط قد لا يرى أدلة HSE إلا إذا تم ربطها أو عرضها له في Document Register / FSMS Dashboard.

### ما يغطيه HSE فعلاً

| HSE record / module | التقييم | علاقة ذلك بـ ISO 22000 |
|---|---:|---|
| F-01 Incident / Near-Miss Report | قوي | يغطي الحوادث، food contamination، التحقيق، 5 Whys، CAPA، الإبلاغ للجهات، effectiveness verification. يدعم 8.4 و8.9 و10.1. |
| F-26 NCR | قوي | يحتوي تصنيف ISO 22000/HACCP، وصف عدم المطابقة، requirement/clause، evidence، containment، corrective/preventive action، effectiveness. يدعم 8.9 و10.1. |
| F-20 CAPA Tracker | موجود وقوي | يغيّر الحكم السابق: CAPA Master Tracker موجود داخل HSE. المطلوب هو الربط مع مصادر FSMS مثل complaints, audit, CCP deviation, supplier NC, PRP failure. |
| F-16 Mock / Fire Drill | موجود | يغطي الإخلاء وتجارب الطوارئ، لكنه لا يكفي وحده لطوارئ سلامة الغذاء مثل تلوث منتج، انقطاع تبريد، أو failure في سلسلة التبريد. |
| Emergency Contacts | موجود | داعم للطوارئ، لكنه ليس emergency response register كامل. |
| HSE Policies | قوي | يوجد food safety, cold chain, incident reporting, emergency, training, chemical, waste, pest, contractors, MOC, work permits. |
| HSE SOPs | قوي جزئياً | يوجد SOP-FS-01 إلى SOP-FS-09: receiving, temperature monitoring, temperature deviation, cleaning, swabs, recall, traceability, halal segregation, expiry. |
| Microbiological Swabs Log | قوي | يدعم PRP verification وvalidation للتنظيف، خاصة إذا رُبط ببرنامج verification. |
| Waste / Pest / Cleaning / Maintenance / Work Permit | جيد | يدعم PRPs ويقوي بند 8.2. |
| Monthly Safety Report / KPI | جيد لكن يحتاج ضبط | يدعم 9.1، لكن يوجد mismatch محتمل في أسماء بعض السجلات داخل HSE KPI. |

### تعديل الحكم على الفجوات

- بند 8.4 Emergency preparedness: ليس ناقصاً بالكامل. هو موجود جزئياً في HSE، لكن المطلوب سجل FSMS-specific للطوارئ: product contamination, cold-chain failure, supplier nonconforming product, transport failure, pest infestation, communication failure.
- بند 8.8 Verification: HSE يوفر swabs, cleaning, pest, maintenance records. الفجوة ليست عدم وجود أدلة، بل عدم وجود Verification Programme واحد يربط الأدلة ويحلل نتائجها.
- بند 8.9 Control of nonconforming / potentially unsafe product: HSE SOP-FS-03 يذكر Hold / Release / Destroy، وNCR قوي. لكن ما زال مطلوب Hold/Release/Disposition Log للمنتج والدفعة والكمية والقرار.
- بند 10.1 CAPA: CAPA Tracker موجود. لا تنشئ واحداً جديداً؛ اربطه مع FSMS sources.

### ملاحظة تقنية مهمة في HSE KPI

في `src/pages/hse/HSEKPIs.jsx` توجد أسماء سجلات مستدعاة لا تطابق أسماء النماذج الفعلية:

- Forklift form يستخدم `forklift_inspections`، بينما KPI يستدعي `forklift_inspection`.
- Fire Equipment form يستخدم `fire_equipment_inspections`، بينما KPI يستدعي `fire_equipment`.
- CAPA Tracker يستخدم `capa_tracker`، بينما KPI يستدعي `capa_actions`.

هذا قد يجعل لوحة KPI تظهر أرقام ناقصة رغم وجود السجلات. تدقيقياً يؤثر على ISO 22000 بند 9.1 لأن التحليل والتقييم يجب أن يعكس كل البيانات الفعلية.

### الحكم بعد HSE

النظام أقوى مما ظهر في الفحص الأول. HSE يغلق جزءاً كبيراً من CAPA/NCR/incident/emergency/PRP evidence. لكن شرط الجاهزية للتدقيق هو الربط: اجعل HSE records تظهر كأدلة داعمة داخل ISO/HACCP، خصوصاً في Document Register وFSMS Dashboard وMRM.

أسرع خطة إغلاق محدثة:

1. إنشاء Communication Matrix / Log.
2. إنشاء FSMS Emergency Drill Log مخصص لطوارئ سلامة الغذاء، مع ربطه بـ HSE F-16 وF-01.
3. إنشاء Hold / Release / Disposition Log للمنتجات والدفعات.
4. إنشاء Validation Evidence Register يربط swabs/ATP/lab reports بالـ control measures.
5. إنشاء Verification Programme يوحّد HSE + HACCP evidence.
6. تعديل HSE KPI record type names حتى لا تضيع البيانات.
