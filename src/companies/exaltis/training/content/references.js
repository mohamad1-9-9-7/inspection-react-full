// src/pages/sweets-training/content/references.js
// Trainer reference per module. Format read by parseRefSections():
//   "A) English section title — summary"   then English body lines,
//   "أ) Arabic section title"               then Arabic body lines.
// Standards are cited by NAME only — no clause numbers we cannot verify.
// Numbers match the sweets daily forms (see content/modules.js header).

const AR_LETTER = { E: "ه", F: "و", G: "ز" };
/** The closing "references" section, lettered after the module's last section. */
const refs = (L) => `${L}) References — standards this module follows.
   • UAE Federal Law No. 10 of 2015 on Food Safety.
   • Dubai Municipality — Food Code and food safety requirements for food establishments.
   • Codex Alimentarius CXC 1-1969 — General Principles of Food Hygiene (HACCP annex).
   • ISO 22000:2018 — Food safety management systems.
   • Company daily records: the sweets forms and their limits.
   ${AR_LETTER[L]}) المراجع — المعايير التي تتبعها هذه الوحدة.
   • القانون الاتحادي رقم 10 لسنة 2015 بشأن سلامة الغذاء.
   • بلدية دبي — قانون الأغذية ومتطلبات سلامة الغذاء للمنشآت الغذائية.
   • الدستور الغذائي CXC 1-1969 — المبادئ العامة لصحة الغذاء (ملحق الهاسب).
   • ISO 22000:2018 — أنظمة إدارة سلامة الغذاء.
   • سجلات الشركة اليومية: نماذج الحلويات وحدودها.`;

export const SWEETS_MODULE_DETAILS_BI = {
  "Personal Hygiene & Handwashing": `A) Handwashing — the single most effective control against contamination.
   WHEN: Starting work • After the toilet • After breaks, eating or smoking • After touching face, hair or phone • After handling raw eggs, nuts or waste • Between raw and ready-to-eat tasks.
   HOW: Wet with warm water → soap → scrub at least 20 seconds (palms, backs, between fingers, thumbs, nails, wrists) → rinse → dry with paper towel → turn tap off with the towel.
   Sanitizer is used AFTER washing, never instead of it.
   أ) غسل اليدين — أهم إجراء منفرد لمنع التلوث.
   متى: بداية العمل • بعد الحمام • بعد الاستراحة أو الأكل أو التدخين • بعد لمس الوجه أو الشعر أو الهاتف • بعد البيض النيء أو المكسرات أو النفايات • بين المهام النيئة والجاهزة للأكل.
   كيف: بلّل بماء دافئ ← صابون ← افرك 20 ثانية على الأقل (الكف، الظهر، بين الأصابع، الإبهام، الأظافر، المعصم) ← اشطف ← جفف بمنديل ورقي ← أغلق الصنبور بالمنديل.
   المعقم يُستعمل بعد الغسل وليس بديلاً عنه.
B) Protective clothing — cream rooms are high-risk areas.
   Clean uniform every shift; hairnet covering ALL hair; beard net where needed; mask in the cream & decoration room.
   Gloves are NOT a substitute for washing: wash first, change gloves when torn, after raw tasks, and at least every hour.
   Remove apron before the toilet or leaving production.
   ب) الملابس الواقية — غرف الكريمة مناطق عالية الخطورة.
   زي نظيف كل وردية؛ شبكة شعر تغطي الشعر كله؛ شبكة لحية عند الحاجة؛ كمامة في غرفة الكريمة والتزيين.
   القفازات ليست بديلاً عن الغسل: اغسل أولاً، وبدّل القفاز عند التمزق وبعد المهام النيئة وكل ساعة على الأقل.
   اخلع المريول قبل الحمام أو مغادرة الإنتاج.
C) Jewellery, nails & personal items.
   No rings, watches, bracelets, earrings or piercings — they hold bacteria and can fall into dough or cream.
   Nails short and clean; no nail polish, no false nails.
   Phones, keys, food and drinks stay in the locker — never on a work table.
   ج) المجوهرات والأظافر والأغراض الشخصية.
   ممنوع الخواتم والساعات والأساور والأقراط — تحمل البكتيريا وقد تسقط في العجين أو الكريمة.
   الأظافر قصيرة ونظيفة؛ ممنوع الطلاء والأظافر الصناعية.
   الهاتف والمفاتيح والأكل والشرب في الخزانة فقط — ليس على طاولة العمل.
D) Illness reporting & exclusion.
   Report BEFORE starting work: diarrhoea, vomiting, fever with sore throat, jaundice, infected skin or eye.
   Stay out of food areas until 48 hours after symptoms stop; return only with the supervisor's clearance.
   Staphylococcus aureus from skin and noses grows in cream and custard and makes a toxin that baking does not destroy.
   Every food handler holds a valid occupational health card.
   د) الإبلاغ عن المرض والاستبعاد.
   أبلغ قبل بدء العمل عن: إسهال، قيء، حمى مع التهاب حلق، يرقان، التهاب جلدي أو في العين.
   ابقَ خارج مناطق الغذاء حتى 48 ساعة بعد زوال الأعراض؛ وعد فقط بموافقة المشرف.
   المكورات العنقودية من الجلد والأنف تتكاثر في الكريمة والكاسترد وتفرز سماً لا يتلفه الخَبز.
   لكل متداول غذاء بطاقة صحة مهنية سارية.
E) Cuts and wounds.
   Clean the cut → BLUE waterproof plaster → glove on top → tell the supervisor → record it.
   Blue is used because it is easy to see if it falls into food.
   ه) الجروح.
   نظّف الجرح ← ضماد أزرق مقاوم للماء ← قفاز فوقه ← أبلغ المشرف ← سجّل الحادثة.
   اللون الأزرق لأنه يُرى بسهولة إذا سقط في الطعام.
${refs("F")}`,

  "Allergen Control": `A) What an allergen is — a small trace can kill.
   An allergic reaction can follow a trace amount; cooking and baking do NOT remove allergens.
   Major allergens (Codex list, also required on labels by GSO 9): cereals containing gluten, eggs, milk, peanuts, tree nuts, soybeans, fish, crustaceans, sulphites ≥ 10 mg/kg.
   Sesame is also treated as a major allergen in this factory.
   أ) ما هو مسبب الحساسية — أثر صغير قد يقتل.
   قد تحدث الحساسية من أثر ضئيل؛ والطبخ والخَبز لا يزيلان مسببات الحساسية.
   المسببات الرئيسية (قائمة الكودكس ويلزم ذكرها في البطاقة وفق GSO 9): الحبوب المحتوية على الغلوتين، البيض، الحليب، الفول السوداني، المكسرات، الصويا، السمك، القشريات، الكبريتيت ≥ 10 ملغ/كغ.
   ويُعامل السمسم في هذا المصنع كمسبب رئيسي أيضاً.
B) Confectionery risks — almost every product carries allergens.
   Nuts (pistachio, almond, hazelnut, walnut, cashew), milk, butter, cream, eggs, wheat flour, sesame, soy lecithin in chocolate.
   Hidden sources: praline pastes, decorations, sprinkles, glazes, flavours, re-used trays.
   ب) مخاطر الحلويات — كل منتج تقريباً يحتوي مسبب حساسية.
   المكسرات (فستق، لوز، بندق، جوز، كاجو)، الحليب، الزبدة، الكريمة، البيض، طحين القمح، السمسم، ليسيثين الصويا في الشوكولاتة.
   مصادر خفية: عجائن البرالين، الزينة، الرشّات، التلميع، النكهات، الصواني المعاد استعمالها.
C) Allergen Matrix — the single source of truth.
   Every product's allergens are listed in the Allergen Matrix; the production log reads it.
   A recipe or supplier change updates the Matrix BEFORE production starts.
   ج) مصفوفة مسببات الحساسية — المرجع الوحيد.
   مسببات الحساسية لكل منتج مسجلة في المصفوفة، وسجل الإنتاج يقرأ منها.
   أي تغيير في الوصفة أو المورد يُحدَّث في المصفوفة قبل بدء الإنتاج.
D) Preventing cross-contact.
   Store allergens sealed, labelled, on LOW shelves below non-allergen items.
   Schedule nut-free and allergen-free products FIRST; nut products last.
   Changeover: full clean of mixers, piping bags, moulds, trays and scales, then a visual check recorded on the production log.
   Use separate, colour-coded scoops and utensils for nuts.
   د) منع الانتقال العرضي.
   خزّن مسببات الحساسية مغلقة ومعنونة وعلى الرفوف السفلى تحت المواد الخالية منها.
   جدول المنتجات الخالية من المكسرات والحساسية أولاً، ومنتجات المكسرات أخيراً.
   التبديل: تنظيف كامل للخلاطات وأكياس التزيين والقوالب والصواني والموازين، ثم فحص بصري يُسجَّل في سجل الإنتاج.
   مغارف وأدوات منفصلة وملونة للمكسرات.
E) Labelling and customer questions.
   The label must declare every allergen in the product, including from decorations and fillings.
   If a customer asks and you are not sure — say you are not sure and ask the supervisor. Never guess.
   ه) البطاقة وأسئلة الزبائن.
   يجب أن تذكر البطاقة كل مسبب حساسية في المنتج، بما فيها الزينة والحشوات.
   إذا سأل زبون ولست متأكداً — قل إنك لست متأكداً واسأل المشرف. لا تخمّن أبداً.
${refs("F")}
   • Codex CXC 80-2020 — Code of Practice on Food Allergen Management for Food Business Operators.
   • GSO 9 — Labelling of prepackaged foods.`,

  "High-Risk Fillings: Cream, Custard & Cheese": `A) Why fillings are high-risk.
   Cream, custard, cheese fillings and mousses are moist, rich in protein, and often NOT cooked after assembly — bacteria grow fast in them.
   Main hazards: Staphylococcus aureus (from hands), Salmonella (eggs), Listeria (chilled dairy), Bacillus cereus.
   أ) لماذا الحشوات عالية الخطورة.
   الكريمة والكاسترد وحشوات الجبن والموس رطبة وغنية بالبروتين ولا تُطبخ غالباً بعد التجميع — فتتكاثر فيها البكتيريا بسرعة.
   المخاطر الرئيسية: المكورات العنقودية (من الأيدي)، السالمونيلا (البيض)، الليستيريا (الألبان المبردة)، العصوية الشمعية.
B) Temperature rules.
   Keep cream, dairy and filled products at 0–5 °C.
   The cream & decoration room stays ≤ 10 °C; take out only what you will use now.
   A cream product above 5 °C for more than 2 hours is DISCARDED — no exceptions.
   ب) قواعد الحرارة.
   احفظ الكريمة والألبان والمنتجات المحشوة على 0–5 °م.
   غرفة الكريمة والتزيين 10 °م أو أقل؛ أخرج فقط ما ستستعمله الآن.
   منتج الكريمة الذي بقي فوق 5 °م أكثر من ساعتين يُتلف — بلا استثناء.
C) Cooking custard and cooked fillings.
   Custard, cooked cream fillings and cheese fillings reach a core of ≥ 75 °C — probe and record.
   Then cool fast: 60 → 21 °C within 2 hours, and ≤ 5 °C within 6 hours in total (shallow trays, ice bath, blast chiller).
   ج) طبخ الكاسترد والحشوات المطبوخة.
   يصل قلب الكاسترد وحشوات الكريمة والجبن المطبوخة إلى 75 °م أو أكثر — قِس وسجّل.
   ثم برّد بسرعة: من 60 إلى 21 °م خلال ساعتين، و5 °م أو أقل خلال 6 ساعات إجمالاً (صوانٍ ضحلة، حمام ثلج، مبرد سريع).
D) Hygienic assembly.
   Wash hands and use clean gloves; use clean, sanitised piping bags (single-use preferred).
   Never top up an old batch of cream with a new one; never re-use leftover cream from display.
   Eggs: pasteurised eggs for any product that is not cooked to ≥ 75 °C.
   د) التجميع الصحي.
   اغسل يديك واستعمل قفازات نظيفة؛ أكياس تزيين نظيفة ومعقمة (يفضَّل ذات الاستعمال الواحد).
   لا تخلط دفعة كريمة قديمة بجديدة؛ لا تعد استعمال الكريمة المتبقية من العرض.
   البيض: بيض مبستر لأي منتج لا يُطبخ حتى 75 °م.
E) Labelling and use-by.
   Every filled product carries production date and use-by; chilled display is ≤ 5 °C.
   ه) البطاقة وتاريخ الاستعمال.
   كل منتج محشو يحمل تاريخ الإنتاج وتاريخ الاستعمال؛ والعرض المبرّد 5 °م أو أقل.
${refs("F")}`,

  "Baking, Cooking & Sugar Syrups": `A) Cooking kills — only when the core is hot enough.
   Custards, cooked fillings and syrups: core ≥ 75 °C, probed at the thickest point and recorded.
   Surface colour is NOT proof of cooking; only a probe thermometer is.
   أ) الطبخ يقتل الجراثيم — فقط إذا كان القلب ساخناً بما يكفي.
   الكاسترد والحشوات المطبوخة والقطر: القلب 75 °م أو أكثر، يُقاس في أسمك نقطة ويُسجَّل.
   لون السطح ليس دليلاً على النضج؛ الدليل الوحيد هو ميزان الحرارة.
B) Using the probe thermometer.
   Clean and sanitise the probe before and after every use.
   Insert into the centre, wait until the reading is steady.
   Thermometers are checked monthly in ice water (0 °C) and boiling water (100 °C); ± 1 °C is acceptable.
   ب) استعمال ميزان الحرارة.
   نظّف وعقّم المجس قبل وبعد كل استعمال.
   أدخله في المركز وانتظر حتى تستقر القراءة.
   تُفحص الموازين شهرياً في ماء مثلج (0 °م) وماء مغلي (100 °م)؛ المقبول ± 1 °م.
C) Ovens and baking records.
   Set temperature and time follow the recipe card; record set temperature, start and end.
   Under-baked product (raw centre) is re-baked or rejected — never released.
   ج) الأفران وسجلات الخَبز.
   درجة الحرارة والوقت حسب بطاقة الوصفة؛ سجّل الحرارة المضبوطة ووقت البدء والانتهاء.
   المنتج غير المكتمل (قلب نيء) يُعاد خبزه أو يُرفض — لا يُطلق أبداً.
D) Sugar syrups and frying.
   Syrup (sheera / qater) is boiled to temperature, covered, and kept clean — no spoons left inside.
   Frying oil is filtered and changed when dark, foaming or smoking; never top up old oil with fresh.
   د) القطر السكري والقلي.
   يُغلى القطر حتى الحرارة المطلوبة ويُغطّى ويُحفظ نظيفاً — لا تُترك الملاعق داخله.
   زيت القلي يُصفّى ويُبدَّل عندما يغمق أو يرغي أو يدخّن؛ لا يُضاف زيت جديد على القديم.
E) After cooking — cool fast or hold hot.
   Cool 60 → 21 °C within 2 hours and ≤ 5 °C within 6 hours in total; or hold hot at ≥ 60 °C.
   ه) بعد الطبخ — برّد بسرعة أو احفظ ساخناً.
   برّد من 60 إلى 21 °م خلال ساعتين و5 °م أو أقل خلال 6 ساعات إجمالاً؛ أو احفظه ساخناً على 60 °م أو أكثر.
${refs("F")}`,

  "Cooling, Chilled Storage & Display": `A) The danger zone is 5–60 °C.
   Bacteria multiply fastest between 5 °C and 60 °C. Food must pass through this range quickly and never rest in it.
   أ) منطقة الخطر 5–60 °م.
   تتكاثر البكتيريا أسرع ما يكون بين 5 و60 °م. يجب أن يمر الطعام بهذا المدى بسرعة ولا يبقى فيه.
B) Cooling cooked products.
   Stage 1: 60 → 21 °C within 2 hours. Stage 2: ≤ 5 °C within 6 hours in total.
   Record the start temperature, the reading at 2 h and at 6 h.
   Tips: divide into shallow trays, stir, ice bath, blast chiller; never cool large deep pots at room temperature.
   Missed stage 1 → re-heat to ≥ 75 °C once and restart, or discard.
   ب) تبريد المنتجات المطبوخة.
   المرحلة 1: من 60 إلى 21 °م خلال ساعتين. المرحلة 2: 5 °م أو أقل خلال 6 ساعات إجمالاً.
   سجّل حرارة البداية والقراءة بعد ساعتين وبعد 6 ساعات.
   نصائح: قسّم في صوانٍ ضحلة، قلّب، حمام ثلج، مبرد سريع؛ لا تبرّد القدور الكبيرة العميقة على حرارة الغرفة.
   فشل المرحلة 1 ← أعد التسخين إلى 75 °م مرة واحدة وابدأ من جديد، أو أتلف.
C) Chillers and freezers.
   Chiller 0–5 °C (critical above 5 °C); freezer ≤ −18 °C (critical above −15 °C).
   Checked every 2 hours (4 AM – 8 PM) plus at least 2 product probe checks per day.
   Cover, label and date everything; ready-to-eat ABOVE raw; nothing on the floor.
   ج) البرادات والفريزرات.
   البراد 0–5 °م (حرج فوق 5 °م)؛ الفريزر −18 °م أو أقل (حرج فوق −15 °م).
   تُفحص كل ساعتين (4 ص – 8 م) مع فحص حرارة منتجين على الأقل يومياً.
   غطِّ وعنوِن وأرّخ كل شيء؛ الجاهز للأكل فوق النيء؛ لا شيء على الأرض.
D) Chilled display.
   Display ≤ 5 °C; do not overload beyond the load line; keep doors closed.
   A product above 5 °C for more than 2 hours is discarded.
   د) العرض المبرّد.
   العرض 5 °م أو أقل؛ لا تتجاوز خط التحميل؛ أبقِ الأبواب مغلقة.
   المنتج الذي بقي فوق 5 °م أكثر من ساعتين يُتلف.
E) Breakdown response.
   Chiller above 5 °C: probe the products, move them to another chiller, call maintenance, record the action.
   ه) الاستجابة للعطل.
   البراد فوق 5 °م: قِس حرارة المنتجات، انقلها لبراد آخر، اتصل بالصيانة، سجّل الإجراء.
${refs("F")}`,

  "Thawing (Defrosting)": `A) Why thawing is controlled.
   The outside of a frozen block warms first; at room temperature the surface sits in the danger zone for hours while the centre is still frozen.
   أ) لماذا تُضبط الإذابة.
   يسخن سطح الكتلة المجمدة أولاً؛ وعلى حرارة الغرفة يبقى السطح في منطقة الخطر ساعات بينما القلب ما زال مجمداً.
B) Approved methods.
   Chiller (preferred): chiller ≤ 5 °C, item core ≤ 5 °C at the end.
   Cold running water: water ≤ 21 °C, product sealed, maximum 4 hours.
   Room temperature: low-risk items only (e.g. plain dough, fruit) — never cream, dairy, eggs or fillings.
   ب) الطرق المعتمدة.
   البراد (المفضّل): البراد 5 °م أو أقل، ولب الصنف 5 °م أو أقل عند الانتهاء.
   الماء البارد الجاري: الماء 21 °م أو أقل، المنتج مغلق، 4 ساعات كحد أقصى.
   حرارة الغرفة: للأصناف منخفضة الخطورة فقط (مثل العجين السادة والفاكهة) — ليس الكريمة أو الألبان أو البيض أو الحشوات.
C) Record every thaw.
   Pick the frozen lot from receiving; record method, start date-time-temp and end date-time-core temp.
   Thawed items get a use-by label: 24 h for dairy, egg, cheese and fillings; 72 h for butter, dough and fruit.
   ج) سجّل كل إذابة.
   اختر الدفعة المجمدة من الاستلام؛ سجّل الطريقة وتاريخ ووقت وحرارة البداية وتاريخ ووقت وحرارة اللب عند الانتهاء.
   الصنف المذاب يأخذ ملصق استعمال: 24 ساعة للألبان والبيض والجبن والحشوات؛ 72 ساعة للزبدة والعجين والفاكهة.
D) Never refreeze.
   A thawed item is never refrozen. Thaw only what you will use.
   Thaws still open from previous days show as a banner on the thawing sheet — close them.
   د) لا إعادة تجميد.
   الصنف المذاب لا يُعاد تجميده أبداً. أذب فقط ما ستستعمله.
   الإذابات المفتوحة من الأيام السابقة تظهر كتنبيه في ورقة الإذابة — أغلقها.
${refs("E")}`,

  "Receiving & Dry Store": `A) Check every delivery before it enters.
   Vehicle clean and cold; packaging intact; no pests or mould; product in date.
   Chilled (cream, milk, butter, eggs) ≤ 5 °C; frozen ≤ −18 °C with no signs of thawing — otherwise REJECT.
   Chilled items go into the chiller within 15 minutes of arrival.
   أ) افحص كل شحنة قبل دخولها.
   سيارة نظيفة ومبرّدة؛ تغليف سليم؛ لا آفات ولا عفن؛ المنتج ضمن الصلاحية.
   المبرّد (كريمة، حليب، زبدة، بيض) 5 °م أو أقل؛ المجمّد −18 °م أو أقل بلا علامات ذوبان — وإلا يُرفض.
   المبرّد يدخل البراد خلال 15 دقيقة من وصوله.
B) Nuts and dried fruit — aflatoxin risk.
   Nuts, dried fruit and spices need a certificate of analysis (COA / aflatoxin) from the supplier.
   Reject mouldy, shrivelled or insect-damaged lots.
   ب) المكسرات والفواكه المجففة — خطر الأفلاتوكسين.
   المكسرات والفواكه المجففة والتوابل تحتاج شهادة تحليل (أفلاتوكسين) من المورد.
   ارفض الدفعات المتعفنة أو الذابلة أو المصابة بالحشرات.
C) Record lot numbers.
   Every accepted lot gets recorded (supplier, material, lot, expiry, quantity). This is what makes a recall possible.
   ج) سجّل أرقام الدفعات.
   كل دفعة مقبولة تُسجَّل (المورد، المادة، رقم الدفعة، الانتهاء، الكمية). هذا ما يجعل السحب ممكناً.
D) Dry store rules.
   Cool, dry, clean; goods on shelves at least 15 cm off the floor and away from walls.
   FEFO: First Expired, First Out. Opened flour, sugar and nuts go into closed, labelled containers.
   Allergens sealed and on low shelves.
   د) قواعد مخزن المواد الجافة.
   بارد وجاف ونظيف؛ البضائع على رفوف مرتفعة 15 سم على الأقل عن الأرض وبعيدة عن الجدران.
   FEFO: الأقرب انتهاءً يخرج أولاً. الطحين والسكر والمكسرات المفتوحة في حاويات مغلقة ومعنونة.
   مسببات الحساسية مغلقة وعلى الرفوف السفلى.
${refs("E")}
   • Codex CXC 59-2005 — Code of Practice for the Prevention and Reduction of Aflatoxin Contamination in Tree Nuts.`,

  "Cleaning & Sanitation": `A) Clean first, then sanitise.
   Cleaning removes dirt, fat and sugar; sanitising kills what is left. A sanitiser cannot work on a dirty surface.
   Steps: remove debris → wash with detergent → rinse → sanitise (correct contact time) → air-dry.
   أ) التنظيف أولاً ثم التعقيم.
   التنظيف يزيل الأوساخ والدهون والسكر؛ والتعقيم يقتل ما تبقى. المعقم لا يعمل على سطح متسخ.
   الخطوات: إزالة البقايا ← غسل بالمنظف ← شطف ← تعقيم (زمن تماس صحيح) ← تجفيف هوائي.
B) Sanitiser concentrations — verify with a test strip.
   Chlorine on food surfaces 50–200 ppm; quaternary ammonium (QAC) 200–400 ppm; peracetic acid 150–300 ppm.
   Outside the range → re-mix and re-test, and record it.
   ب) تركيز المعقمات — تحقق بشريط الفحص.
   الكلور على أسطح الغذاء 50–200 جزء بالمليون؛ الأمونيوم الرباعي 200–400؛ حمض البيروكسي أسيتيك 150–300.
   خارج المدى ← أعد الخلط والفحص وسجّل ذلك.
C) Confectionery equipment.
   Mixers (bowl, beater, guard), piping nozzles and bags, moulds, sheeters, cooling racks, decorating tools.
   Dismantle what can be dismantled; sugar and cream residues in joints feed bacteria.
   ج) معدات الحلويات.
   الخلاطات (الوعاء، المضرب، الغطاء)، رؤوس وأكياس التزيين، القوالب، فرادات العجين، رفوف التبريد، أدوات التزيين.
   فكّ ما يمكن فكّه؛ بقايا السكر والكريمة في المفاصل تغذي البكتيريا.
D) Chemicals.
   Only approved food-grade chemicals, in their original labelled containers, stored away from food.
   Never mix chemicals; wear gloves and goggles; know where the SDS is.
   د) المواد الكيميائية.
   مواد معتمدة للاستخدام الغذائي فقط، في عبواتها الأصلية المعنونة، مخزنة بعيداً عن الغذاء.
   لا تخلط المواد أبداً؛ ارتدِ القفازات والنظارات؛ اعرف مكان نشرة السلامة SDS.
E) Clean as you go and record.
   Clean spills immediately; follow the cleaning schedule; the daily cleanliness sheet is signed by the person who cleaned.
   ه) نظّف أثناء العمل وسجّل.
   نظّف الانسكاب فوراً؛ اتبع جدول التنظيف؛ ورقة النظافة اليومية يوقعها من نظّف.
${refs("F")}`,

  "Foreign Body & Cross-Contamination": `A) Physical hazards in confectionery.
   Glass, hard plastic, metal (wire from whisks, staples, blades), nut shells, stones in dried fruit, hair, plasters, packaging pieces, broken decorations.
   أ) المخاطر الفيزيائية في الحلويات.
   الزجاج، البلاستيك الصلب، المعادن (أسلاك المضارب، الدبابيس، الشفرات)، قشور المكسرات، الحصى في الفواكه المجففة، الشعر، الضمادات، قطع التغليف، الزينة المكسورة.
B) Controls.
   Sieve flour, sugar and cocoa before use. Inspect nuts and dried fruit.
   Check whisks and beaters for broken wires before and after use.
   No glass in production; glass and hard plastic breakages are reported immediately and the area is quarantined.
   Remove staples, strings and packaging outside the production area.
   ب) إجراءات التحكم.
   انخل الطحين والسكر والكاكاو قبل الاستعمال. افحص المكسرات والفواكه المجففة.
   افحص المضارب قبل وبعد الاستعمال للتأكد من عدم وجود أسلاك مكسورة.
   ممنوع الزجاج في الإنتاج؛ كسر الزجاج أو البلاستيك الصلب يُبلَّغ فوراً وتُعزل المنطقة.
   أزل الدبابيس والخيوط والتغليف خارج منطقة الإنتاج.
C) Cross-contamination.
   Raw eggs and unwashed fruit are kept away from finished products.
   Colour-coded boards and utensils; separate cloths for surfaces and for equipment.
   Finished products are covered; ready-to-eat always above raw.
   ج) التلوث التبادلي.
   البيض النيء والفواكه غير المغسولة بعيداً عن المنتجات النهائية.
   ألواح وأدوات مرمّزة بالألوان؛ فوط منفصلة للأسطح وللمعدات.
   المنتجات النهائية مغطاة؛ الجاهز للأكل دائماً فوق النيء.
D) If a foreign body is found.
   Stop, keep the item and the product, tell the supervisor, hold the batch; the supervisor decides and records it (non-conformance).
   د) إذا وُجد جسم غريب.
   توقف، احتفظ بالجسم والمنتج، أبلغ المشرف، أوقف الدفعة؛ المشرف يقرر ويسجّل (عدم مطابقة).
${refs("E")}`,

  "Pest Control Awareness": `A) Pests in a sweets factory.
   Stored-product insects (flour beetles, moths) in flour, nuts, dried fruit, cocoa; ants and wasps drawn to sugar; cockroaches; rodents; birds.
   أ) الآفات في مصنع الحلويات.
   حشرات المواد المخزنة (خنافس الطحين، العث) في الطحين والمكسرات والفواكه المجففة والكاكاو؛ النمل والدبابير بسبب السكر؛ الصراصير؛ القوارض؛ الطيور.
B) Signs to report.
   Droppings, gnaw marks, webbing in flour, live or dead insects, damaged packs, grease marks along walls.
   Report immediately to the supervisor; do not use the affected material.
   ب) علامات يجب الإبلاغ عنها.
   الفضلات، آثار القضم، خيوط في الطحين، حشرات حية أو ميتة، عبوات تالفة، آثار دهنية على الجدران.
   أبلغ المشرف فوراً؛ لا تستعمل المادة المصابة.
C) Prevention.
   Doors closed, screens and strip curtains intact, no food left out, spills cleaned, waste bins closed and emptied.
   Stock rotated (FEFO) so nothing sits long enough to be infested.
   ج) الوقاية.
   الأبواب مغلقة، الشبك والستائر سليمة، لا طعام مكشوف، الانسكاب يُنظف، سلال النفايات مغلقة وتُفرّغ.
   دوران المخزون (FEFO) حتى لا يبقى شيء مدة تكفي لإصابته.
D) Don't touch the pest control devices.
   Bait stations, traps and insect-killer units are placed by the licensed contractor. Do not move them; never use your own sprays in food areas.
   د) لا تلمس أجهزة المكافحة.
   محطات الطعم والمصائد وأجهزة قتل الحشرات يضعها المقاول المرخص. لا تحركها؛ ولا تستعمل رشاشات خاصة في مناطق الغذاء.
${refs("E")}`,

  "Labelling, Shelf Life & Traceability": `A) What every label carries.
   Product name, ingredients in descending order, allergens clearly declared, net quantity, production date, expiry (use-by / best-before), storage conditions, batch/lot number, producer.
   أ) ما تحمله كل بطاقة.
   اسم المنتج، المكونات بترتيب تنازلي، مسببات الحساسية بوضوح، الكمية الصافية، تاريخ الإنتاج، تاريخ الانتهاء، شروط الحفظ، رقم الدفعة، المنتِج.
B) Use-by vs best-before.
   Use-by is about SAFETY (cream cakes, fillings) — never sold or used after it.
   Best-before is about QUALITY (biscuits, dry sweets).
   Shelf life follows the approved product list; never extended by hand.
   ب) "يُستهلك قبل" مقابل "يُفضّل قبل".
   "يُستهلك قبل" للسلامة (كيك الكريمة والحشوات) — لا يُباع ولا يُستعمل بعده.
   "يُفضّل قبل" للجودة (البسكويت والحلويات الجافة).
   مدة الصلاحية حسب قائمة المنتجات المعتمدة؛ ولا تُمدَّد يدوياً.
C) Traceability — one step back, one step forward.
   Raw lots used in each batch are recorded in the production log; each dispatch records where it went.
   With these two records a recall can find every affected product within hours.
   ج) التتبع — خطوة للخلف وخطوة للأمام.
   دفعات المواد الخام المستعملة في كل تشغيلة تُسجَّل في سجل الإنتاج؛ وكل إرسالية تُسجَّل وجهتها.
   بهذين السجلين يمكن للسحب أن يجد كل منتج متأثر خلال ساعات.
D) Relabelling is not allowed.
   Never over-label, change dates or remove labels.
   د) إعادة الوسم ممنوعة.
   لا تضع ملصقاً فوق آخر، ولا تغيّر التواريخ، ولا تزل البطاقات.
${refs("E")}
   • GSO 9 — Labelling of prepackaged foods.
   • GSO 150 — Expiration periods of food products.`,

  "HACCP Basics for Confectionery": `A) What HACCP is.
   Hazard Analysis and Critical Control Points — find the hazards, control them at the steps that matter, check the controls work, and keep records.
   Seven principles: hazard analysis → CCPs → critical limits → monitoring → corrective action → verification → records.
   أ) ما هو الهاسب.
   تحليل المخاطر ونقاط التحكم الحرجة — حدد المخاطر، وتحكم بها في الخطوات المهمة، وتأكد أن التحكم يعمل، واحفظ السجلات.
   سبعة مبادئ: تحليل المخاطر ← نقاط التحكم الحرجة ← الحدود الحرجة ← المراقبة ← الإجراء التصحيحي ← التحقق ← السجلات.
B) Hazards in confectionery.
   Biological: Salmonella (eggs), Staphylococcus aureus (hands, cream), Listeria (chilled dairy), moulds.
   Chemical: aflatoxin (nuts), cleaning chemicals, undeclared allergens.
   Physical: glass, metal, nut shells, stones.
   ب) المخاطر في الحلويات.
   حيوية: السالمونيلا (البيض)، المكورات العنقودية (الأيدي، الكريمة)، الليستيريا (الألبان المبردة)، العفن.
   كيميائية: الأفلاتوكسين (المكسرات)، مواد التنظيف، مسببات الحساسية غير المعلنة.
   فيزيائية: الزجاج، المعادن، قشور المكسرات، الحصى.
C) Typical CCPs and their limits here.
   Cooking custard, fillings, syrup: core ≥ 75 °C.
   Cooling: 60 → 21 °C within 2 h; ≤ 5 °C within 6 h total.
   Chilled storage and display: ≤ 5 °C.
   Allergen changeover: verified clean before the next product.
   ج) نقاط التحكم الحرجة المعتادة وحدودها هنا.
   طبخ الكاسترد والحشوات والقطر: القلب 75 °م أو أكثر.
   التبريد: من 60 إلى 21 °م خلال ساعتين؛ و5 °م أو أقل خلال 6 ساعات إجمالاً.
   الحفظ والعرض المبرّد: 5 °م أو أقل.
   تبديل مسببات الحساسية: تنظيف متحقق منه قبل المنتج التالي.
D) Your part.
   Monitor and record honestly at the time you check — never fill records later or in advance.
   Outside the limit: act (re-cook, move, hold, discard), tell the supervisor, record what you did.
   د) دورك.
   راقب وسجّل بصدق وقت الفحص — لا تملأ السجلات لاحقاً أو مسبقاً.
   خارج الحد: تصرّف (أعد الطبخ، انقل، أوقف، أتلف)، أبلغ المشرف، سجّل ما فعلت.
${refs("E")}`,

  "OHS: Ovens, Burns & Hot Sugar": `A) Burn hazards.
   Hot ovens and trays, steam, boiling sugar syrup and caramel (well above boiling water — sticks to skin), hot oil.
   أ) مخاطر الحروق.
   الأفران والصواني الساخنة، البخار، القطر والكراميل المغلي (أسخن بكثير من الماء المغلي — يلتصق بالجلد)، الزيت الساخن.
B) Safe working.
   Dry oven gloves (wet gloves conduct heat); open oven doors away from your face; announce "hot behind".
   Pour syrup and caramel slowly, with long sleeves; never leave pans with handles sticking out.
   Keep floors dry; clean spills of oil and syrup at once.
   ب) العمل الآمن.
   قفازات فرن جافة (الرطبة تنقل الحرارة)؛ افتح باب الفرن بعيداً عن وجهك؛ نبّه "ساخن خلفك".
   اسكب القطر والكراميل ببطء وبأكمام طويلة؛ لا تترك مقابض القدور بارزة.
   حافظ على جفاف الأرضية؛ نظّف انسكاب الزيت والقطر فوراً.
C) First aid for burns.
   Cool the burn under cool running water for at least 20 minutes; remove rings or tight items near the burn; cover with a clean non-stick dressing.
   Do NOT apply ice, butter, toothpaste or creams. Serious or large burns → medical help immediately.
   Report every burn and record it.
   ج) الإسعاف الأولي للحروق.
   برّد الحرق تحت ماء جارٍ بارد 20 دقيقة على الأقل؛ انزع الخواتم أو ما يضغط قرب الحرق؛ غطّه بضماد نظيف غير لاصق.
   لا تضع الثلج أو الزبدة أو معجون الأسنان أو الكريمات. الحروق الكبيرة أو الخطيرة ← مساعدة طبية فوراً.
   أبلغ عن كل حرق وسجّله.
D) Machinery and manual handling.
   Mixers and sheeters: guards in place, machine stopped before scraping or cleaning.
   Lift flour and sugar sacks with bent knees and a straight back; ask for help or a trolley with heavy loads.
   د) الآلات والرفع اليدوي.
   الخلاطات وفرادات العجين: الحواجز في مكانها، أوقف الآلة قبل الكشط أو التنظيف.
   ارفع أكياس الطحين والسكر بثني الركبتين وظهر مستقيم؛ اطلب المساعدة أو العربة مع الأحمال الثقيلة.
${refs("E")}`,
};
