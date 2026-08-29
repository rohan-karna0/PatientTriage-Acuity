export type DoorLang = "en" | "hi";

export const DOOR_COMPLAINTS = [
  {
    id: "chest_pain",
    complaint: "chest pain",
    icon: "⚡",
    label: { en: "Chest pain", hi: "सीने में दर्द" },
  },
  {
    id: "breathing",
    complaint: "difficulty breathing",
    icon: "〰",
    label: { en: "Breathing difficulty", hi: "सांस लेने में तकलीफ" },
  },
  {
    id: "bleeding",
    complaint: "bleeding",
    icon: "💧",
    label: { en: "Bleeding", hi: "खून बहना" },
  },
  {
    id: "fever",
    complaint: "fever",
    icon: "🌡",
    label: { en: "Fever", hi: "बुखार" },
  },
  {
    id: "injury",
    complaint: "injury after fall",
    icon: "🦴",
    label: { en: "Injury / fall", hi: "चोट / गिरना" },
  },
  {
    id: "other",
    complaint: "",
    icon: "⋯",
    label: { en: "Other", hi: "अन्य" },
  },
] as const;

export type DoorComplaintId = (typeof DOOR_COMPLAINTS)[number]["id"];

const STRINGS = {
  en: {
    doorTitle: "01 DOOR — Intake Kiosk",
    doorSubtitle: "Tap the problem · Enter vitals · Nurse decides",
    close: "Close",
    vitalsLabel: "Vitals (enter what's available)",
    ageLabel: "Age (years)",
    nameLabel: "Patient name (optional)",
    namePlaceholder: "e.g. Rajesh K. or walk-in label",
    recommendation: "Acuity recommendation",
    selected: "Selected problem",
    confidence: "Confidence",
    confidenceSparse:
      "Missing data increases uncertainty — fail-safe may escalate",
    confidenceOk: "Sufficient signals at intake",
    accept: "Accept",
    override: "Override",
    otherPlaceholder: "Describe the problem…",
    consent:
      "Data used only for triage decision support (DPDP purpose limitation). Clinician access is logged. Synthetic demo — no real patient data.",
    vitalsAtIntake: "Vitals at intake",
    vitalsNone: "No vitals entered — sparse intake (not treated as normal)",
    esi: "ESI",
    updated: "Recommendation updated",
    hr: "HR",
    bp: "BP",
    spo2: "SpO₂",
    temp: "TEMP",
    bpm: "bpm",
    mmHg: "mmHg",
  },
  hi: {
    doorTitle: "01 DOOR — प्रवेश कियोस्क",
    doorSubtitle: "समस्या चुनें · जो वाइटल उपलब्ध हों भरें · नर्स निर्णय लेंगी",
    close: "बंद करें",
    vitalsLabel: "वाइटल साइन (जो उपलब्ध हों वही भरें)",
    ageLabel: "आयु (वर्ष)",
    nameLabel: "रोगी का नाम (वैकल्पिक)",
    namePlaceholder: "जैसे राजेश के. या वॉक-इन",
    recommendation: "एक्यूटी सिफारिश",
    selected: "चयनित समस्या",
    confidence: "विश्वास स्तर",
    confidenceSparse:
      "अधूरा डेटा अनिश्चितता बढ़ाता है — सुरक्षा के लिए एक्सट्रा प्राथमिकता हो सकती है",
    confidenceOk: "प्रवेश पर पर्याप्त संकेत मिले",
    accept: "स्वीकार करें",
    override: "ओवरराइड",
    otherPlaceholder: "समस्या लिखें…",
    consent:
      "डेटा केवल ट्राइएज निर्णय सहायता के लिए (DPDP)। क्लिनिशियन एक्सेस लॉग होता है। डेमो — वास्तविक रोगी डेटा नहीं।",
    esi: "ESI",
    vitalsAtIntake: "प्रवेश पर वाइटल",
    vitalsNone: "कोई वाइटल नहीं — अधूरा डेटा (सामान्य नहीं माना जाता)",
    updated: "सिफारिश अपडेट हुई",
    hr: "HR",
    bp: "BP",
    spo2: "SpO₂",
    temp: "ताप",
    bpm: "bpm",
    mmHg: "mmHg",
  },
} as const;

export function doorT(lang: DoorLang) {
  return STRINGS[lang];
}

export function complaintLabel(id: DoorComplaintId, lang: DoorLang): string {
  const c = DOOR_COMPLAINTS.find((x) => x.id === id);
  return c ? c.label[lang] : id;
}
