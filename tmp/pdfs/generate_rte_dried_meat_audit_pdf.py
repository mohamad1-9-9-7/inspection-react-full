from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
)


OUTPUT = "output/pdf/RTE_Dried_Meat_HACCP_ISO22000_Required_Additions.pdf"


def style_sheet():
    styles = getSampleStyleSheet()
    base = ParagraphStyle(
        "Base",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#1f2937"),
        spaceAfter=5,
    )
    title = ParagraphStyle(
        "Title",
        parent=base,
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=28,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=10,
    )
    subtitle = ParagraphStyle(
        "Subtitle",
        parent=base,
        fontSize=11,
        leading=15,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#475569"),
        spaceAfter=14,
    )
    h1 = ParagraphStyle(
        "H1",
        parent=base,
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=10,
        spaceAfter=7,
    )
    h2 = ParagraphStyle(
        "H2",
        parent=base,
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=15,
        textColor=colors.HexColor("#0f766e"),
        spaceBefore=6,
        spaceAfter=5,
    )
    small = ParagraphStyle(
        "Small",
        parent=base,
        fontSize=8.3,
        leading=11,
        textColor=colors.HexColor("#64748b"),
    )
    callout = ParagraphStyle(
        "Callout",
        parent=base,
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        backColor=colors.HexColor("#ecfeff"),
        borderColor=colors.HexColor("#0891b2"),
        borderWidth=0.7,
        borderPadding=8,
        textColor=colors.HexColor("#164e63"),
        spaceAfter=9,
    )
    bullet = ParagraphStyle(
        "Bullet",
        parent=base,
        leftIndent=13,
        firstLineIndent=-8,
        spaceAfter=3,
    )
    cell = ParagraphStyle(
        "Cell",
        parent=base,
        fontSize=8.2,
        leading=10.4,
        spaceAfter=0,
    )
    head = ParagraphStyle(
        "Head",
        parent=cell,
        fontName="Helvetica-Bold",
        textColor=colors.white,
        alignment=TA_LEFT,
    )
    return {
        "base": base,
        "title": title,
        "subtitle": subtitle,
        "h1": h1,
        "h2": h2,
        "small": small,
        "callout": callout,
        "bullet": bullet,
        "cell": cell,
        "head": head,
    }


def p(text, style):
    return Paragraph(text, style)


def bullets(items, styles):
    return [p("- " + item, styles["bullet"]) for item in items]


def section(title, body, styles):
    return KeepTogether([p(title, styles["h1"])] + body)


def table(headers, rows, styles, widths=None):
    data = [[p(h, styles["head"]) for h in headers]]
    for row in rows:
        data.append([p(str(c), styles["cell"]) for c in row])
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ]
        )
    )
    return t


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(colors.HexColor("#0f172a"))
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(18 * mm, height - 12 * mm, "RTE Dried Meat - HACCP / ISO 22000 Required Additions")
    canvas.setStrokeColor(colors.HexColor("#14b8a6"))
    canvas.setLineWidth(0.6)
    canvas.line(18 * mm, height - 15 * mm, width - 18 * mm, height - 15 * mm)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(18 * mm, 10 * mm, "Prepared for internal review before implementation")
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build():
    styles = style_sheet()
    doc = BaseDocTemplate(
        OUTPUT,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=18 * mm,
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=header_footer)])

    story = []
    story.append(Spacer(1, 22))
    story.append(p("Ready-to-Eat Dried Meat", styles["title"]))
    story.append(p("Required HACCP / ISO 22000 Additions for Manual, Records, Validation, and System Forms", styles["subtitle"]))
    story.append(
        p(
            "Review document only. No system or manual changes are implemented yet. "
            "This document assumes the dried meat is manufactured internally and consumed without cooking after drying.",
            styles["callout"],
        )
    )

    story.append(
        section(
            "1. Auditor Conclusion",
            [
                p(
                    "Because the product is Ready-to-Eat (RTE), drying and seasoning cannot be treated only as a quality process. "
                    "The FSMS must prove that hazards are controlled before product release, especially where no later cooking step exists.",
                    styles["base"],
                ),
                *bullets(
                    [
                        "Current dried meat record is a strong starting point, but it needs formal QA release, validation, and post-drying contamination controls.",
                        "The HACCP manual should include a dedicated RTE Dried Meat product description, process flow, hazard analysis, and HACCP/OPRP plan.",
                        "Product release should be blocked unless required limits, calibration checks, lab references, label checks, and QA approval are complete.",
                    ],
                    styles,
                ),
            ],
            styles,
        )
    )

    story.append(
        section(
            "2. Critical Decision Points Before Implementation",
            [
                table(
                    ["Decision", "What TELT Must Confirm", "Why It Matters"],
                    [
                        ["Product classification", "Confirm final classification as Ready-to-Eat Dried Meat.", "Defines stronger hygiene, release, testing, and label controls."],
                        ["Lethality step", "Confirm whether drying has validated pathogen reduction, or only reduces water activity.", "If there is no validated kill step, raw material and post-process controls become critical."],
                        ["Storage condition", "Confirm shelf-stable, chilled, or frozen storage based on validated aw, pH, moisture, packaging, and shelf-life.", "Incorrect storage statement creates legal and safety risk."],
                        ["Critical limits", "Approve target limits for aw, pH, moisture, salt, nitrite/nitrate, time, temperature, and humidity.", "Limits must be validated and legally compliant, not only convenient values in the form."],
                        ["Testing plan", "Approve frequency for microbiology, environmental swabs, retained samples, and shelf-life verification.", "Provides evidence that RTE product remains safe through shelf life."],
                    ],
                    styles,
                    [38 * mm, 63 * mm, 64 * mm],
                )
            ],
            styles,
        )
    )

    story.append(PageBreak())

    story.append(
        section(
            "3. Required HACCP Manual Amendments",
            [
                p("Add or update the following sections in the FSMS / HACCP manual.", styles["base"]),
                table(
                    ["Manual Section", "Required Addition"],
                    [
                        ["Scope", "State that the FSMS covers in-house manufacturing of Ready-to-Eat Dried Meat, not only chilled/frozen meat handling."],
                        ["Product Description", "Add product name, raw meat type, ingredients, spices, additives, allergens, packaging, intended use, consumer group, storage condition, shelf life, and distribution method."],
                        ["Process Flow", "Create a dedicated flow: receiving, storage, thawing if applicable, trimming/slicing, weighing/formulation, curing, drying, cooling, testing, packaging, labeling, storage, dispatch."],
                        ["Onsite Flow Verification", "Add RTE Dried Meat to the verified flow list with date, team members, deviations found, and approval."],
                        ["Hazard Analysis", "Analyze each step for biological, chemical, physical, and allergen hazards. Include Salmonella, Listeria, E. coli, Staph aureus toxin risk, molds, nitrite/nitrate, cleaning chemicals, bone, metal, and packaging fragments."],
                        ["Control Measure Categorization", "Categorize drying endpoint, curing formulation, chilled curing hold, packaging hygiene, label verification, and storage as PRP, OPRP, or CCP based on decision tree."],
                        ["HACCP / OPRP Plan", "Define limits, monitoring method, frequency, responsible person, correction, corrective action, verification, and record for each significant control measure."],
                        ["Validation", "Add evidence for aw/pH/moisture limits, drying time-temperature profile, shelf-life study, microbiology testing, and packaging/storage conditions."],
                        ["Potentially Unsafe Product", "State that any batch missing release tests, exceeding limits, or exposed to post-drying contamination is held until evaluated by QA."],
                        ["Legal Register Link", "Reference applicable UAE/GSO/municipality rules for dried meat, additives, labeling, shelf-life, microbiological criteria, and storage declarations."],
                    ],
                    styles,
                    [42 * mm, 123 * mm],
                )
            ],
            styles,
        )
    )

    story.append(
        section(
            "4. Product Specification Additions",
            [
                table(
                    ["Specification Field", "Required Content"],
                    [
                        ["Product identity", "Ready-to-Eat Dried Meat, product variant, recipe/version number."],
                        ["Raw material", "Species, supplier, lot/SIF, halal status, receiving temperature, acceptance criteria."],
                        ["Ingredients/additives", "Spices, salt, nitrite/nitrate if used, allergens, ingredient lots, approved limits."],
                        ["Food safety limits", "aw target and maximum, pH target, moisture target, salt content, nitrite/nitrate legal limit if applicable."],
                        ["Packaging", "Vacuum/MAP/regular pack, food-contact approval, seal requirements, pack size."],
                        ["Label", "RTE statement if used, storage condition, production/expiry, allergens, preservatives, country/origin requirements, lot/batch code."],
                        ["Shelf life", "Approved shelf life with validation reference and storage condition."],
                        ["Release criteria", "No release until QA approval, required tests complete, and deviations closed."],
                    ],
                    styles,
                    [45 * mm, 120 * mm],
                )
            ],
            styles,
        )
    )

    story.append(PageBreak())

    story.append(
        section(
            "5. Required Records and Reports",
            [
                table(
                    ["Record / Report", "Purpose", "Minimum Fields"],
                    [
                        ["Raw Material Receiving Record", "Prove approved and acceptable raw meat.", "Supplier, lot/SIF, halal, temperature, production/expiry, COA, acceptance/rejection."],
                        ["Defrosting Record", "Required if frozen raw meat is used.", "Batch, start/end time, room/product temperature, responsible person, disposition."],
                        ["Pre-Operation Sanitation Record", "Prevent RTE contamination from equipment and environment.", "Area/equipment, chemical, concentration, visual check, ATP/swab if used, QA verification."],
                        ["Cutting / Slicing Check", "Control physical hazards and hygiene before curing.", "Blade/knife condition, bone/foreign matter check, area temperature, operator."],
                        ["Recipe / Formula Weighing Record", "Control salt, curing agents, spices, and allergens.", "Recipe version, ingredient lot, target weight, actual weight, second-person verification."],
                        ["Curing Time/Temperature Record", "Control growth before drying.", "Start/end, curing temp, product temp, duration, deviations, corrective action."],
                        ["Dried Meat Process Record", "Main batch manufacturing record.", "Drying log, temperature, humidity, time, position, weight loss, aw, pH, moisture, salt, sensory, packaging."],
                        ["Water Activity Meter Verification", "Prove aw result reliability.", "Meter ID, standard used, expected value, actual value, pass/fail, performed by."],
                        ["pH Meter Calibration Record", "Prove pH result reliability.", "Meter ID, buffers used, readings, slope if applicable, pass/fail, performed by."],
                        ["Final Product Release Record", "Prevent unsafe product from sale.", "Batch, test results, label check, retained sample, QA decision, release/hold/reject reason."],
                        ["Microbiology Test Report Log", "Verify RTE safety.", "Sample ID, batch, lab, Salmonella, Listeria, E. coli/Staph if applicable, result, action."],
                        ["Environmental Monitoring / Swab Log", "Detect contamination risk in drying/packing area.", "Zone, surface, organism/indicator, result, trend, corrective action."],
                        ["Packaging and Label Verification", "Prevent legal and allergen errors.", "Label version, lot/date, allergens, preservatives, storage, expiry, barcode, checked by."],
                        ["Retained Sample Log", "Support complaints, shelf-life verification, and investigations.", "Batch, sample count, storage condition, retention until, disposal date."],
                        ["Traceability and Mass Balance", "Prove raw-to-finished link.", "Raw lots, input weight, final weight, yield, pack count, destination."],
                        ["Nonconformance / CAPA", "Control deviations.", "Deviation, affected batch, hold status, root cause, correction, preventive action, closure."],
                        ["Shelf-Life Verification Log", "Confirm product remains safe and acceptable.", "Batch, storage condition, test date, sensory, aw/pH/micro results, decision."],
                        ["Training Record", "Prove operator competence.", "RTE hygiene, curing formula, aw/pH testing, allergen/label controls, cleaning."],
                    ],
                    styles,
                    [38 * mm, 47 * mm, 80 * mm],
                )
            ],
            styles,
        )
    )

    story.append(PageBreak())

    story.append(
        section(
            "6. Required System/Form Additions",
            [
                p("Add these fields to the existing Dried Meat Process module or create linked sub-records.", styles["base"]),
                table(
                    ["Area", "Fields to Add"],
                    [
                        ["Batch Control", "Recipe Version, Product Specification ID, Production Line/Room, Operator, QA Reviewer."],
                        ["Formula Control", "Salt Target/Actual, Nitrite/Nitrate Target/Actual, Spice Lot Numbers, Allergen Review, Formula Checked By."],
                        ["Critical Limits", "Approved aw Limit, Approved pH Limit, Moisture Limit, Salt Limit, Drying Temperature Limit, Curing Temperature Limit."],
                        ["Equipment Verification", "aw Meter ID, aw Meter Verification Result, pH Meter ID, pH Calibration Result, Thermometer ID."],
                        ["Microbiology", "Lab Sample Ref, Lab Name, Test Panel, Result Status, Date Sent, Date Received."],
                        ["Environmental Monitoring", "Swab Ref, Surface/Zone, Result, Corrective Action Required."],
                        ["Packaging/Label", "Packaging Lot, Seal Check, Label Version, Storage Statement Checked, Allergen/Preservative Checked, Label Checked By."],
                        ["Release", "QA Release Decision: Released / Hold / Rejected, Hold Reason, Corrective Action, QA Release By, Release Date."],
                        ["Retention", "Retained Sample ID, Quantity, Storage Condition, Retention Until."],
                    ],
                    styles,
                    [43 * mm, 122 * mm],
                )
            ],
            styles,
        )
    )

    story.append(
        section(
            "7. Suggested Release Logic",
            [
                table(
                    ["Condition", "System Action"],
                    [
                        ["aw result missing", "Block release. Batch remains Hold."],
                        ["aw above approved limit", "Block release. Require QA evaluation and CAPA."],
                        ["pH or moisture missing where required by specification", "Block release until completed."],
                        ["Calibration not verified", "Block release or require QA override with documented justification."],
                        ["Micro result pending for high-risk/validation batches", "Hold until result is acceptable."],
                        ["Label check incomplete", "Block release."],
                        ["Any post-drying contamination event", "Hold affected batch and require investigation."],
                        ["All limits acceptable and QA signs", "Allow Released status and lock release record."],
                    ],
                    styles,
                    [63 * mm, 102 * mm],
                )
            ],
            styles,
        )
    )

    story.append(PageBreak())

    story.append(
        section(
            "8. Validation and Verification Requirements",
            [
                table(
                    ["Activity", "Minimum Expectation", "Frequency"],
                    [
                        ["Initial process validation", "Prove selected drying time/temperature/humidity and aw/pH/moisture produce safe RTE dried meat.", "Before full approval and after major changes."],
                        ["Shelf-life validation", "Support expiry date under actual storage and packaging.", "Before label approval; repeat after formulation/process/package change."],
                        ["Microbiology verification", "Finished product testing for relevant RTE pathogens/indicators.", "Risk-based; increase during validation and after deviations."],
                        ["Environmental monitoring", "Swabs in drying, cooling, slicing, and packaging areas.", "Routine schedule, trend monthly."],
                        ["Calibration/verification", "aw meter, pH meter, thermometer, weighing scales.", "Before use or as defined by calibration plan."],
                        ["Internal audit check", "Review completed batch records, release decisions, CAPA, and traceability.", "At least annually, preferably quarterly for new RTE process."],
                        ["Mock recall", "Include RTE dried meat batch in traceability drill.", "At least annually or per company recall program."],
                    ],
                    styles,
                    [43 * mm, 82 * mm, 40 * mm],
                )
            ],
            styles,
        )
    )

    story.append(
        section(
            "9. Implementation Priority",
            [
                p("Recommended order before adding everything into the system:", styles["base"]),
                *bullets(
                    [
                        "Priority 1: Add QA release decision, hold/reject logic, calibration checks, and label verification to the existing dried meat form.",
                        "Priority 2: Add manual amendments: product description, flow, hazard analysis, HACCP/OPRP plan, and validation statement.",
                        "Priority 3: Add linked records for aw meter, pH meter, environmental swabs, microbiology, retained samples, and shelf-life verification.",
                        "Priority 4: Add dashboard indicators for batches on Hold, released batches, failed limits, pending lab results, and overdue verification.",
                    ],
                    styles,
                ),
            ],
            styles,
        )
    )

    story.append(
        section(
            "10. References for Review",
            [
                *bullets(
                    [
                        "Codex CXC 1-1969: General Principles of Food Hygiene, including HACCP principles.",
                        "Codex CXC 75-2015: Code of Hygienic Practice for Low-Moisture Foods.",
                        "FDA Food Code 2022: reference model for food safety definitions and controls.",
                        "Applicable UAE, GSO, Dubai Municipality, Abu Dhabi, and MoCCAE requirements must be confirmed in the Legal Register before final limits are approved.",
                    ],
                    styles,
                )
            ],
            styles,
        )
    )

    doc.build(story)


if __name__ == "__main__":
    build()
