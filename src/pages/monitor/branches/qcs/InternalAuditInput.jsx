// src/pages/monitor/branches/qcs/InternalAuditInput.jsx
import React, { useMemo, useState } from "react";

/* ===== API base ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ===== Constants ===== */
const TYPE   = "qcs_internal_audit";
const BRANCH = "QCS";

const DOC_META = {
  docTitle: "INTERNAL AUDIT – QCS",
  docNo: "FS-QA/INA-QCS-W/01",
  issueNo: "01",
  revision: "00",
  issueDate: "2025-11-01", // 01/11/2025 ثابتة
};

/* ===== UI helpers ===== */
const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
};
const table = { width: "100%", borderCollapse: "collapse" };
const th = {
  border: "1px solid #cbd5e1",
  background: "#f1f5f9",
  padding: "8px",
  textAlign: "left",
  fontWeight: 800,
};
const td = {
  border: "1px solid #cbd5e1",
  padding: "6px 8px",
  verticalAlign: "top",
};
const input = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "6px 8px",
  boxSizing: "border-box",
  background: "#fff",
};
const select = { ...input };
const textarea = { ...input, minHeight: 90, resize: "vertical" };
const btn = (bg = "#2563eb") => ({
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(0,0,0,.12)",
});

/* ===== Checklist model ===== */
const OPTS = ["Yes", "No", "NA", "OK"];

// النصوص حرفيًا كما زودتها دون اختصار
const GROUPS = [
  {
    title: "1 PERSONAL HYGIENE",
    items: [
      { code: "1.1", text: "Health cards are available for all employees" },
      { code: "1.2", text: "Employees wear clean and proper attire including Effective hair restraints." },
      { code: "1.3", text: "Staff personal habits are not a source of contamination." },
      { code: "1.4", text: "Jewellery limited to a plain ring, finger nails short, clean and no artificial, shaving etc." },
      { code: "1.5", text: "Hands washed properly, frequently and at appropriate time & the hand washing instructions properly followed." },
      { code: "1.6", text: "Disposable gloves are readily available" },
      { code: "1.7", text: "Employees do not eat, drink, chew gum, smoke or use tobacco inside the food preparation area but in designated areas away from preparation." },
      { code: "1.8", text: "Employees maintain adequate personal cleanliness and appear in good health." },
      { code: "1.9", text: "Are hand sinks unobstructed, operational, clean and as per the Dubai Municipality standards?" },
      { code: "1.10", text: "Employee restrooms are operational and clean." },
      { code: "1.11", text: "The wash basins are supplied with soap or detergents" },
      { code: "1.12", text: "Person who is affected by or is a carrier of a communicable disease (eg. Gastroenteritis, a severe cold, sore throat, cough, influenza) or infected people are working in the food packaging area" },
      { code: "1.13", text: "All cuts and wounds are covered by a waterproof blue Band-Aid containing a metalized thread. There are adequate first-aid facilities stocked with approved Band-Aids" },
    ],
  },
  {
    title: "2 RECEIVING & PREPARATION",
    items: [
      { code: "2.1", text: "All food raw materials stored & packed are from approved sources." },
      { code: "2.2", text: "Temp of the receiving material is checked" },
      { code: "2.3", text: "Receiving materials log is maintained" },
      { code: "2.4", text: "Equipment, utensils and food contact surfaces are properly washed & sanitized before every use." },
      { code: "2.5", text: "There are no wooden utensils or equipment’s present" },
      { code: "2.6", text: "Packaging is planned as per the Scheduled sale so ingredients are kept out of the temperature danger zone to the extent possible." },
      { code: "2.7", text: "Procedure is in place to prevent cross contamination." },
      { code: "2.8", text: "Food is handled with utensils, such as single use gloves or tongs." },
      { code: "2.9", text: "Raw materials is packed in small batches to limit the time it is in the danger zone" },
      { code: "2.10", text: "Others" },
    ],
  },
  {
    title: "3 AC / CHILLERS",
    items: [
      { code: "3.1", text: "Thermo- monitors available & accurate" },
      { code: "3.2", text: "Calibration of thermo- monitors, weighing machine etc preventive maintenance strictly followed." },
      { code: "3.3", text: "Inspection Per meter maintained & ingredients stored 6 inches off floor in walk in cooling equipment." },
      { code: "3.4", text: "Chiller units are clean and neat." },
      { code: "3.5", text: "No cardboard boxes found in the chiller." },
      { code: "3.6", text: "All materials is properly wrapped, labelled & dated." },
      { code: "3.7", text: "The FIFO (First in First Out) Stock rotation followed." },
      { code: "3.8", text: "Temperature of all chillers are monitored & documented at the start & end of each shift." },
      { code: "3.9", text: "Others. / Nil" },
    ],
  },
  {
    title: "4 CLEANING & SANITIZING",
    items: [
      { code: "4.1", text: "All chemicals are stored away from Raw materials" },
      { code: "4.2", text: "Documented cleaning schedule for all raw materials contact surfaces." },
      { code: "4.3", text: "Proper water supply to all hand washing sinks & sinks properly set up for washing" },
      { code: "4.4", text: "Approved & food grade cleaning chemicals used." },
      { code: "4.5", text: "Chemicals used as per manufactures recommendations & MSDS maintained." },
      { code: "4.6", text: "All Equipment’s are clean and free from grease, raw materials particles, musk etc." },
      { code: "4.7", text: "Documented cleaning schedule followed and up to date." },
      { code: "4.8", text: "Floor, walls, doors, ceilings are clean." },
      { code: "4.9", text: "Area below the working tables, behind equipment’s is clean" },
      { code: "4.10", text: "Portability of the water is tested and documented." },
      { code: "4.11", text: "Drainage tray, cover and grills are clean and free from accumulation." },
      { code: "4.12", text: "Cleaning activity monitored & documented." },
      { code: "4.13", text: "Cleaning chemicals & equipment’s are stored in separate lockable facility away from the production & washing area." },
      { code: "4.14", text: "Others / Nil" },
    ],
  },
  {
    title: "5 UTENSILS & EQUIPMENT’S",
    items: [
      { code: "5.1", text: "All equipment and utensils are of durable, non-corrosive & non-absorbent materials" },
      { code: "5.2", text: "All equipment & utensils are cleaned & sanitized Between uses as necessary" },
      { code: "5.3", text: "Work Surface and utensils are clean" },
      { code: "5.4", text: "Work surfaces are cleaned and sanitized between uses." },
      { code: "5.5", text: "All machines are calibrated on predetermined frequency and documented" },
      { code: "5.6", text: "Clean utensils are handled in a manner to prevent cross contamination." },
      { code: "5.7", text: "All utensils and equipment’s are free from strains, grease" },
      { code: "5.8", text: "All large equipment’s are cleaned & sanitized before & after every use." },
      { code: "5.9", text: "Preventive maintenance of all equipment’s and building are carried out on routine basis and documented." },
      { code: "5.10", text: "Shelves are clean." },
      { code: "5.11", text: "Other raw Materials" },
      { code: "5.12", text: "Light fittings have protective covers to prevent contamination of food with broken glass" },
      { code: "5.13", text: "There is adequate lighting in all hand washing areas, dressing and locker rooms, toilets and in all areas where chocolate and chocolate ingredients are examined, processed, or stored and where equipment’s is cleaned." },
    ],
  },
  {
    title: "6 REFUSE STORAGE AND DISPOSAL",
    items: [
      { code: "6.1", text: "Refuse bin are clean and maintained" },
      { code: "6.2", text: "Foot operating system of all refuse bins working properly." },
      { code: "6.3", text: "Refuse bins are emptied when it is 75% full" },
    ],
  },
  {
    title: "7 PEST CONTROL",
    items: [
      { code: "7.1", text: "All doors are provided with a self-closing device, electrical air curtain or plastic strip curtains." },
      { code: "7.2", text: "EFK servicing records" },
      { code: "7.3", text: "No signs of pest activity" },
      { code: "7.4", text: "All pest control records available as per DM requirements." },
      { code: "7.5", text: "Are there adequate physical control devices installed." },
      { code: "7.6", text: "Others" },
    ],
  },
  {
    title: "8 CCP RECORD REVIEW",
    items: [
      { code: "8.1", text: "CCP’s are defined appropriately?" },
      { code: "8.2", text: "Verification & Validation of CCP’s?" },
      { code: "8.3", text: "Any deviations in CCP’s?" },
    ],
  },
  {
    title: "9 GENERAL",
    items: [
      { code: "9.1", text: "Microbiological analysis result" },
      { code: "9.2", text: "Traceability Record" },
      { code: "9.3", text: "Finished products are covered/ enclosed to prevent contamination by insects, dust or foreign matter" },
      { code: "9.4", text: "Customer complaints records are available & updated." },
      { code: "9.5", text: "All people have appropriate trainings" },
      { code: "9.6", text: "Management Review Meetings" },
      { code: "9.7", text: "Updating of FSMS Manual" },
    ],
  },
  {
    title: "10 VEHICLES",
    items: [
      { code: "10.1", text: "Delivery vehicles are constructed and maintained in order to prevent food from being contaminated and to prevent the deterioration of packets." },
    ],
  },
  {
    title: "11 FOOD SAFETY RESPONSIBILITIES AND RESOURCES",
    items: [
      { code: "11.1", text: "Is there at least one person identified as accountable and responsible for development, implementation and ongoing maintenance of the Food safety systems?" },
      { code: "11.2", text: "Verify that:\n• the FSMS system (the Food safety plan) is developed, reviewed and managed by a multi-disciplinary team\n• key personnel identified as FSMS team members have adequate FSMS training and appropriate experience. Records sighted." },
    ],
  },
  {
    title: "13 FOOD SAFETY POLICY",
    items: [
      { code: "13.1", text: "Food safety policy requires that:\n• company product safety policy is defined\n• the policy shall refer to the company’s intentions to:\n• meet its obligations to produce safe and legal products\n• to comply with food safety regulations\n• meet its obligations to customers.\n• company product safety policy is clearly communicated to employees and implemented." },
      { code: "13.2", text: "Does the company have a quality policy or mission statement?" },
      { code: "13.3", text: "Is there a documented Quality system in place?\nDoes it include HACCP documentation?" },
      { code: "13.4", text: "Is the Quality system accredited and, if so, by whom?" },
      { code: "13.5", text: "Do the Hazard audit tables reflect the risks associated with the product?" },
      { code: "13.6", text: "Does the company have a documented Customer complaints handling procedure?" },
      { code: "13.7", text: "Does the company have a documented Recall procedure?" },
    ],
  },
  {
    title: "14 HACCP METHODOLOGY AND DOCUMENTATION",
    items: [
      { code: "14.1", text: "Has the Food safety plan been based on the Codex Alimentarius HACCP principles and is reference made to relevant legislation, codes of practice or guidelines?\nDoes the Food safety plan identify, monitor and manage physical, chemical or microbiological risks in products and processes?" },
    ],
  },
  {
    title: "15 PRODUCT INFORMATION / SPECIFICATIONS",
    items: [
      { code: "15.1", text: "Layouts of the production process\nCheck these are documented to ensure consideration to:\n• regulatory layout requirements\n• the possibility of cross-contamination\n• air currents in high-risk areas\n• pest control plans." },
      { code: "PRPs", text: "Prerequisite programs (PRPs)\nSupport programs are established, implemented and maintained across the entire production system and are to a level as deemed appropriate by the HACCP team. PRPs are to assist in controlling:\n• the likelihood of food safety hazards occurring\n• contamination of products including cross-contamination\n• maintaining food safety in product and process environment\nThey include but are not limited to the following:" },
    ],
  },
  {
    title: "16 SUPPLY CHAIN MANAGEMENT",
    items: [
      { code: "16.1", text: "Does the Raw material risk assessment drive the Incoming inspection and test plan?" },
      { code: "16.2", text: "Are all goods received and inspected as prescribed by the Inspection and test quality plan?" },
      { code: "16.3", text: "Is there a system for handling supplier related non-conformances? Do records show evidence of corrective actions when incidents occur?" },
      { code: "16.4", text: "Do procedures exist for approval and removal of suppliers from the Approved supplier system?\nDoes it also include approval of emergency alternative suppliers?" },
    ],
  },
  {
    title: "17 DESIGN OF PRODUCTION FACILITIES",
    items: [
      { code: "17.1", text: "Are there adequate standards maintained to safeguard the product? Consider, as needed:\n• product flow (e.g. for raw and Roasted ingredients)\n• building interior (e.g. lighting, floors, employee facilities)\n• building exterior (e.g. location, waste management)\n• utilities (e.g. water, air)." },
    ],
  },
  {
    title: "18 EMPLOYEE HYGIENE POLICY",
    items: [
      { code: "18.1", text: "Are there hygiene and security policies and procedures?\nDoes the company communicate the hygiene requirements to all employees, visitors and contractors?\nCheck that records are maintained for details of visitor’s entry and departure into process area, as appropriate." },
      { code: "18.2", text: "Are the following prohibited in processing areas?\n• watches\n• jewellery – including earrings, bracelets and rings\n• nail polish and false fingernails\n• smoking\n• eating and drinking.\nAre personal items stored outside the process areas? If not, is this justified on the basis of risk?" },
      { code: "18.3", text: "Check there are processes to manage staff:\n• washing hands policy, including the use of sanitiser and/or gloves\n• if they have an infectious disease as prescribed?" },
      { code: "18.4", text: "Is hand washing facilities located in toilets, amenities rooms and cleaning areas?\nIn areas where employees handle Products?\nSupplied with warm running water?\nAntibacterial soap, paper towel and bin supplied?" },
      { code: "18.5", text: "Are good hygiene practices observed to be followed by employees?\nAre hair covers provided and worn in processing and packaging areas?" },
      { code: "18.6", text: "Are employee uniforms supplied? Are employee uniforms laundered in house? Is consideration given to temperature of laundering water?\nIf employees supply their own clothing, is it clean and adequate for the tasks performed?" },
      { code: "18.7", text: "Are adequate, clean uniforms provided? (ie no top pockets, no buttons, uniforms not worn off site)\nAre uniforms cleaned or laundered by an external laundry service?" },
      { code: "18.8", text: "Are hands washed?" },
      { code: "18.9", text: "Are gloves provided for operators and is there a procedure for the use and changing of the item?" },
      { code: "18.10", text: "Are there injury procedures for protection of employee wounds?" },
      { code: "18.11", text: "Is personnel movement restricted from raw to processed food areas, where applicable?" },
    ],
  },
  {
    title: "19 FACTORY HYGIENE POLICY: WALK THROUGH",
    items: [
      { code: "19.1", text: "Exclusion of physical contaminant hazards in high-risk food processing areas.\nWhere they cannot be excluded, are there adequate control measures documented and implemented for:" },
      { code: "19.2", text: "• glass" },
      { code: "19.3", text: "• metal" },
      { code: "19.4", text: "• bone" },
      { code: "19.5", text: "• wood" },
      { code: "19.6", text: "• rubber" },
      { code: "19.7", text: "• plastics (soft)" },
      { code: "19.8", text: "• plastics (hard)" },
      { code: "19.9", text: "• other (e.g. insects)" },
      { code: "19.10", text: "Do customer complaint trends demonstrate that the hazards listed above are under sufficient control? If not, specify in what category it is not." },
      { code: "19.11", text: "All packaging material that comes into contact with food products is made of material that doesn’t contaminate food? Packaging material specifications sighted stating packaging material is food grade." },
      { code: "19.12", text: "During the packing process, is product protected from damage, including contamination?" },
      { code: "19.13", text: "Are packaging materials stored in appropriate conditions and clearly identified?" },
      { code: "19.14", text: "Is there in-line metal detection?\nWhat checks are performed to ensure the detector is working properly?\nHow often are checks performed?" },
      { code: "19.15", text: "Is there any scalping in the process?" },
      { code: "19.16", text: "Are checks carried out on weighing devices?\nWhat is the frequency of the calibration?" },
      { code: "19.17", text: "What other processes are carried out during the packing process?" },
      { code: "19.18", text: "Garbage is stored appropriately and bins are provided?" },
      { code: "19.19", text: "Are there devices to reduce contaminant hazards?\n• Has there been consideration to use of magnets, sieves, screens, metal detectors, X-ray machines and/or fine filters?\n• Where present, are devices positioned at appropriate locations to ensure maximum product protection?\n• How often are checks carried out?" },
      { code: "19.20", text: "Dropped product policy \nAre there controls to ensure that product that is dropped on unsanitised or contaminated surface is discarded to eliminate contamination to product?" },
      { code: "19.21", text: "Are incoming goods deliveries checked? If so, what records are taken?" },
      { code: "19.22", text: "Are raw materials stored so as to prevent contamination? Are food products arriving for repacking stored under appropriate conditions and clearly identified?" },
      { code: "19.23", text: "Is the incoming goods receipt area maintained in a clean and hygienic manner?\nAre floors, walls and ceilings maintained in good condition?" },
      { code: "19.24", text: "Is there adequate ventilation to remove fumes?" },
      { code: "19.25", text: "Vents are not located directly near exposed packaging?" },
      { code: "19.26", text: "Is there adequate lighting? (refer to AS1680 for recommendations)" },
      { code: "19.27", text: "Are premises maintained in a clean and hygienic manner?" },
      { code: "19.28", text: "Are floors in good condition and clean?" },
      { code: "19.29", text: "Are walls and ceilings sealed to prevent entry of dirt, dust and pests? Are they maintained in a clean condition?" },
      { code: "19.30", text: "Are pipes that pass through external openings sealed to prevent the entry of pests?" },
      { code: "19.31", text: "Can fittings and fixtures be easily cleaned?" },
      { code: "19.32", text: "Are packaging lines designed so as to prevent cross-contamination?" },
      { code: "19.33", text: "Wood and glass, paper and plastic off cuts minimised in manufacturing areas? No potential to contaminate packaging?" },
      { code: "19.34", text: "Is there adequate product traceability, date coding on inner and outer cartons?" },
      { code: "19.35", text: "Despatch area – is the final packed product stored and transported under appropriate conditions?" },
      { code: "19.36", text: "Is this area hygienic?" },
      { code: "19.37", text: "What end product testing is carried out?\nMicrobiological?\nChemical?" },
    ],
  },
  {
    title: "20 CHEMICAL CONTROL",
    items: [
      { code: "20.1", text: "Has the company conducted a food safety hazard assessment of the chemicals used?" },
      { code: "20.2", text: "Are food-grade lubricants used on food contact equipment?" },
      { code: "20.3", text: "Are non-food-grade chemicals stored and handled so as to minimise potential contamination? (eg paints, cleaners, detergents, diesel, battery fluids, inkjet thinners, etc?)" },
    ],
  },
  {
    title: "21 PEST CONTROL",
    items: [
      { code: "21.1", text: "Is there a program to minimise the entry of rodents, insects and birds in the manufacturing and warehousing areas?" },
      { code: "21.2", text: "Are there storage bait station maps identifying their type and location?" },
      { code: "21.3", text: "Is one of the technicians a registered pest controller? Is the contractor licensed for chemical applications where needed? Records sighted." },
      { code: "21.4", text: "Electronic pest devices to trap insects are located correctly and do not scatter dead insects onto food?" },
      { code: "21.5", text: "Are the pest control chemicals approved for use in food plants? Are they stored correctly?" },
      { code: "21.6", text: "Are there points of possible ingress of pests? For example, are doors in the processing storage area closed or are there holes in the walls? Is there any evidence of infestation?" },
      { code: "21.7", text: "Is there regular removal of waste and rubbish to prevent harbourage?" },
    ],
  },
  {
    title: "23 CLEANING AND SANITATION",
    items: [
      { code: "23.1", text: "Are cleaning and sanitation requirements established, documented and implemented? This should include: responsibility, task to be performed, chemicals and equipment used." },
      { code: "23.2", text: "Are there records to prove compliance to the Cleaning and sanitation schedule?" },
      { code: "23.3", text: "Who is responsible for cleaning?" },
      { code: "23.4", text: "Are cleaning chemicals fit for purpose and stored appropriately?" },
      { code: "23.5", text: "What types of chemicals are used?\nDetergent - \nSanitiser - \nWhat is the name of the supplier?" },
      { code: "23.6", text: "Is cleaning equipment stored in a hygienic manner?\nSeparate cleaning equipment used for amenities area?" },
      { code: "23.7", text: "Are there Material safety data sheets (MSDS) for all chemicals used on site?" },
      { code: "23.8", text: "Is there a system for verifying the effectiveness of the sanitation program? Consider, where appropriate:\n• preoperational inspections\n• environmental monitoring using rapid methods and/or microbiological swabbing\n• allergen validation, if required.\nAre records of results and corrective actions maintained?" },
      { code: "23.9", text: "Is there evidence that corrective action occurs when incomplete or inadequate sanitation has been identified?" },
      { code: "23.10", text: "No evidence of dirt or debris in production areas?" },
      { code: "23.11", text: "Are walls, floors and ceilings clean?" },
    ],
  },
  {
    title: "24 EQUIPMENT MAINTENANCE AND CALIBRATION",
    items: [
      { code: "24.1", text: "Do records show activities by maintenance personnel have added to the customer complaints? For example, has foreign matter been found in product, etc?" },
      { code: "24.2", text: "Are Food safety control points managed by breakdown maintenance? Are hygiene controls complied with when work occurs in high-risk hygiene areas?" },
      { code: "24.3", text: "Are Food safety control points managed by preventative maintenance programs? If yes, have these been done at the prescribed frequencies?" },
      { code: "24.4", text: "Are calibration procedures developed, documented and implemented to ensure that all parameters in the Food safety plan read accurately at the time of use?\nDo they refer to:\n• frequency of calibration\n• criteria for degree of accuracy\n• methods for calibration checks and reference to recognised standards\n• method of identifying equipment when it is found to be out of calibration\n• when equipment is found to be out of calibration, the progress for assessment of impact on integrity\n• records of all calibration checks, of authorised calibration personnel and corrective actions as required?" },
    ],
  },
  {
    title: "25 TRAINING",
    items: [
      { code: "25.1", text: "Have procedures been developed, documented and implemented to ensure activities, duties and functions that have an effect on the Food safety plan are undertaken by a suitably trained person?" },
      { code: "25.2", text: "Are there suitable induction processes for visitors, contractors and casuals?\nDo records exist of these occurring?" },
      { code: "25.3", text: "How is training provided? In house or third party? Are records kept?" },
    ],
  },
  {
    title: "26 TRANSPORTATION",
    items: [
      { code: "26.1", text: "Have procedures been developed and implemented to ensure activities related to storage and distribution of the food products are undertaken to a defined standard?" },
      { code: "26.2", text: "Are any parts of the transportation loops undertaken by outside contractors?\nIf yes, what controls exist to ensure standards are defined, understood and periodically verified?" },
    ],
  },
  {
    title: "27 DOCUMENT CONTROL",
    items: [
      { code: "27.1", text: "Check that procedures exist for document control which ensure that systems are developed for:\n• approval and issuing of new documents\n• identifying general changes and changes to the revision status of documents\n• accessing documents at points of use\n• identifying and controlling the distribution of documents\n• preventing the use of obsolete documents." },
    ],
  },
  {
    title: "28 RECORDS",
    items: [
      { code: "28.1", text: "The company has a record filing system to ensure easy retrieval of the obligatory records and data. These are:" },
      { code: "28.2", text: "• validation records to substantiate food safety characteristics of the product, including shelf life" },
      { code: "28.3", text: "• detailed records by the HACCP teams with respect to the Risk assessments and also the establishment of the Critical control points (CCPs)" },
      { code: "28.4", text: "• records of any subsequent HACCP reviews or introduced changes to the HACCP plans" },
      { code: "28.5", text: "• expertise and training of employees involved in the HACCP team and CCP monitoring" },
      { code: "28.6", text: "• CCP monitoring and reports (dated and signed)" },
      { code: "28.7", text: "• records of CCP deviations and corrective actions" },
      { code: "28.8", text: "• records of non-conformities and corrective actions including customer complaints, product withdrawals and recalls" },
      { code: "28.9", text: "• records of traceability for use from raw material up to and including the delivery of products" },
      { code: "28.10", text: "• audit reports and verification reports" },
      { code: "28.11", text: "• management reviews" },
      { code: "28.12", text: "• process and product evaluations and tests" },
    ],
  },
  {
    title: "29 CHANGE CONTROL",
    items: [
      { code: "29.1", text: "Is there a system for identifying changed conditions to trigger a new review of HACCP systems? For example, new final products, new ingredients, changed suppliers and/or new equipment?\nAre these changes assessed for their impact on the Food safety plan and its prerequisite programs?" },
    ],
  },
  {
    title: "30 IMPROVEMENTS POINTS INSIDE OF COMPANY",
    items: [
      { code: "30.1", text: "- There is separate room for sensitive material\n- Racking system 100% installed" },
    ],
  },
  {
    title: "31 ISO 22000:2018 REQUIREMENTS",
    items: [
      { code: "31.1", text: "Internal audits are planned; competent auditors assigned; reports issued; corrective actions followed up." },
      { code: "31.2", text: "Management review inputs, decisions, and documented outputs available for the last cycle." },
      { code: "31.3", text: "Nonconformity & corrective action process in place: containment, root cause, action, effectiveness verification, records." },
      { code: "31.4", text: "HACCP-based Food Safety Plan implemented: hazard analysis, control measures, monitoring, corrections/corrective actions, verification, records." },
      { code: "31.5", text: "Control of monitoring & measuring devices: calibration status identified; records maintained; action taken when out-of-calibration." },
      { code: "31.6", text: "External & internal communication includes customer feedback/complaints; trends are reviewed and actions recorded." },
      { code: "31.7", text: "Documented information is controlled, current at point of use, and retrievable (procedures, SOPs, records)." },
    ],
  },
  {
    title: "32 HALAL REQUIREMENTS (UAE.S 2055-1)",
    items: [
      { code: "32.1", text: "End-to-end Halal assurance across receiving, processing, packing, storage, transport, display/service (scope defined and applied)." },
      { code: "32.2", text: "Raw materials, additives, and packaging verified free from non-Halal derivatives; documentary evidence on file." },
      { code: "32.3", text: "Segregation to prevent mixing/contamination with non-Halal: dedicated areas/tools or validated cleaning in place." },
      { code: "32.4", text: "Cleaning & chemicals approved and free of prohibited animal/ethanol derivatives; MSDS and approvals maintained." },
      { code: "32.5", text: "Halal logo/claims used only after certification body approval; labels/artwork controlled; non-approved stock quarantined." },
      { code: "32.6", text: "Traceability & mass balance maintained for Halal materials/products; records demonstrate one-step up/down linkage." },
      { code: "32.7", text: "Transport/storage protect Halal status; clear identification, separation, and vehicle/container hygiene controls." },
    ],
  },
];

/* ===== Component ===== */
export default function InternalAuditInput() {
  const [meta, setMeta] = useState({
    conductedBy: "",
    verifiedBy: "",
    dateOfAudit: "",
    area: "",
    auditorName: "",
    auditorSignDate: "",
  });

  const initialChecklist = useMemo(() => {
    const obj = {};
    GROUPS.forEach(g => g.items.forEach(it => {
      obj[it.code] = { status: "", remarks: "" };
    }));
    return obj;
  }, []);
  const [checklist, setChecklist] = useState(initialChecklist);

  const [recs, setRecs] = useState([
    { finding:"", type:"", action:"", resp:"", targetDate:"", status:"" },
  ]);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function setMetaVal(k, v){ setMeta(p => ({ ...p, [k]: v })); }
  function setCell(code, field, v){
    setChecklist(p => ({ ...p, [code]: { ...(p[code]||{}), [field]: v } }));
  }
  function addRec(){ setRecs(p => [...p, { finding:"", type:"", action:"", resp:"", targetDate:"", status:"" }]); }
  function delRec(idx){ setRecs(p => p.filter((_,i)=>i!==idx)); }
  function setRec(idx, field, v){ setRecs(p => p.map((r,i)=> i===idx ? { ...r, [field]: v } : r)); }

  async function handleSave(){
    if (!meta.dateOfAudit) return alert("يرجى إدخال Date Of Audit.");
    const payload = {
      headerTop: {
        documentTitle: DOC_META.docTitle,
        documentNo: DOC_META.docNo,
        issueNo: DOC_META.issueNo,
        revisionNo: DOC_META.revision,
        issueDate: DOC_META.issueDate,
      },
      headRow: {
        conductedBy: meta.conductedBy,
        verifiedBy: meta.verifiedBy,
        dateOfAudit: meta.dateOfAudit,
        area: meta.area,
      },
      checklist: GROUPS.map(g => ({
        title: g.title,
        items: g.items.map(it => ({
          code: it.code,
          text: it.text,
          status: (checklist[it.code]?.status || ""),
          remarks: (checklist[it.code]?.remarks || ""),
        })),
      })),
      auditRecommendation: recs,
      footer: {
        auditorName: meta.auditorName,
        auditorSignDate: meta.auditorSignDate,
      },
      savedAt: Date.now(),
    };

    try{
      setSaving(true); setMsg("Saving…");
      const res = await fetch(`${API_BASE}/api/reports`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ reporter:"qcs", type: TYPE, payload }),
      });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg("✅ Saved successfully");
    }catch(e){
      console.error(e);
      setMsg("❌ Failed to save");
    }finally{
      setSaving(false);
      setTimeout(()=>setMsg(""), 3000);
    }
  }

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontWeight:900, fontSize:18 }}>INTERNAL AUDIT — Input</div>
        <div style={{ color:"#64748b", fontWeight:700 }}>
          DOC: {DOC_META.docNo} • Issue No: {DOC_META.issueNo} • Revision: {DOC_META.revision} • Issue Date: 01/11/2025
        </div>
      </div>

      {/* Meta rows */}
      <table style={{ ...table, marginBottom:12 }}>
        <tbody>
          <tr>
            <td style={{ ...th, width:160 }}>Conducted By</td>
            <td style={td}><input style={input} value={meta.conductedBy} onChange={e=>setMetaVal("conductedBy", e.target.value)} /></td>
            <td style={{ ...th, width:160 }}>Verified By</td>
            <td style={td}><input style={input} value={meta.verifiedBy} onChange={e=>setMetaVal("verifiedBy", e.target.value)} /></td>
          </tr>
          <tr>
            <td style={th}>Date Of Audit</td>
            <td style={td}>
              <input type="date" style={input} value={meta.dateOfAudit} onChange={e=>setMetaVal("dateOfAudit", e.target.value)} />
            </td>
            <td style={th}>Area</td>
            <td style={td}><input style={input} value={meta.area} onChange={e=>setMetaVal("area", e.target.value)} /></td>
          </tr>
        </tbody>
      </table>

      {/* Checklist */}
      {GROUPS.map((g, gi) => (
        <div key={gi} style={{ marginBottom: 14 }}>
          <div style={{ fontWeight:900, background:"#e5e7eb", padding:"6px 8px", border:"1px solid #cbd5e1" }}>
            {g.title}
          </div>
          <table style={table}>
            <colgroup>
              <col style={{ width:"5%" }} />
              <col style={{ width:"55%" }} />
              <col style={{ width:"12%" }} />
              <col style={{ width:"12%" }} />
              <col style={{ width:"16%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Area / Question</th>
                <th style={th}>Status</th>
                <th style={th}>Remarks</th>
                <th style={th}>—</th>
              </tr>
            </thead>
            <tbody>
              {g.items.map((it) => (
                <tr key={it.code}>
                  <td style={td}>{it.code}</td>
                  <td style={td}><div style={{ whiteSpace:"pre-wrap" }}>{it.text}</div></td>
                  <td style={td}>
                    <select
                      style={select}
                      value={checklist[it.code]?.status || ""}
                      onChange={e=>setCell(it.code, "status", e.target.value)}
                    >
                      <option value=""></option>
                      {OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    <input
                      style={input}
                      value={checklist[it.code]?.remarks || ""}
                      onChange={e=>setCell(it.code, "remarks", e.target.value)}
                      placeholder="Remarks"
                    />
                  </td>
                  <td style={td}>
                    <span style={{ color:"#94a3b8" }}>optional</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Audit Recommendation */}
      <div style={{ fontWeight:900, background:"#e5e7eb", padding:"6px 8px", border:"1px solid #cbd5e1", marginTop:16 }}>
        AUDIT RECOMMENDATION
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>S/N</th>
              <th style={th}>Audit Finding</th>
              <th style={th}>Finding Type</th>
              <th style={th}>Action to be taken</th>
              <th style={th}>Responsibility</th>
              <th style={th}>Target Date</th>
              <th style={th}>Status</th>
              <th style={th}>—</th>
            </tr>
          </thead>
          <tbody>
            {recs.map((r, i) => (
              <tr key={i}>
                <td style={td}>{i+1}</td>
                <td style={td}><textarea style={textarea} value={r.finding} onChange={e=>setRec(i,"finding",e.target.value)} /></td>
                <td style={td}><input style={input} value={r.type} onChange={e=>setRec(i,"type",e.target.value)} /></td>
                <td style={td}><textarea style={textarea} value={r.action} onChange={e=>setRec(i,"action",e.target.value)} /></td>
                <td style={td}><input style={input} value={r.resp} onChange={e=>setRec(i,"resp",e.target.value)} /></td>
                <td style={td}><input type="date" style={input} value={r.targetDate} onChange={e=>setRec(i,"targetDate",e.target.value)} /></td>
                <td style={td}>
                  <select style={select} value={r.status} onChange={e=>setRec(i,"status",e.target.value)}>
                    <option value=""></option>
                    <option>OPEN</option>
                    <option>IN PROGRESS</option>
                    <option>CLOSED</option>
                    <option>ON HOLD</option>
                  </select>
                </td>
                <td style={td}>
                  <button onClick={()=>delRec(i)} style={btn("#ef4444")}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop:8 }}>
          <button onClick={addRec} style={btn("#0b132b")}>+ Add Row</button>
        </div>
      </div>

      {/* Footer sign */}
      <table style={{ ...table, marginTop:16 }}>
        <tbody>
          <tr>
            <td style={{ ...th, width:160 }}>Auditor Name</td>
            <td style={td}><input style={input} value={meta.auditorName} onChange={e=>setMetaVal("auditorName", e.target.value)} /></td>
            <td style={{ ...th, width:160 }}>Date</td>
            <td style={td}><input type="date" style={input} value={meta.auditorSignDate} onChange={e=>setMetaVal("auditorSignDate", e.target.value)} /></td>
          </tr>
        </tbody>
      </table>

      {/* Actions */}
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:12 }}>
        <button onClick={handleSave} disabled={saving} style={btn("#2563eb")}>
          {saving ? "Saving…" : "Save"}
        </button>
        {msg && <span style={{ alignSelf:"center", fontWeight:800, color:"#334155" }}>{msg}</span>}
      </div>
    </div>
  );
}
