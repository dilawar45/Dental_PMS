"""Shared domain constants for agent tools and clinical operations."""

# Bilingual consent text snapshot and version for patient onboarding
CONSENT_VERSION = "1.0.0"
CONSENT_TEXT_SNAPSHOT = (
    "I consent to the collection, processing, and clinical record keeping of my dental "
    "and medical health information for diagnosis and treatment. / میں تشخیص اور علاج کے "
    "لیے اپنے دانتوں اور طبی صحت کی معلومات کے جمع، پراسیسنگ اور کلینیکل ریکارڈ رکھنے کی "
    "رضامندی دیتا/دیتی ہوں۔ [Version 1.0.0]"
)

# Standard operating schedule
CLINIC_TIMEZONE = "Asia/Karachi"
CLINIC_OPERATING_HOURS = "Monday through Saturday, 9:00 AM to 8:00 PM (Closed Sundays)"

# Clinic standard services and indicative pricing
CLINIC_SERVICES = [
    "Comprehensive Oral Examination & Consultation",
    "Scaling & Polishing (Dental Cleaning)",
    "Composite Tooth-Colored Fillings",
    "Root Canal Therapy (Endodontics)",
    "Crowns, Bridges & Veneers (Prosthodontics)",
    "Painless Tooth Extractions & Minor Oral Surgery",
    "Teeth Whitening & Cosmetic Smile Design",
    "Emergency Dental Pain & Trauma Care",
]

CLINIC_PRICING = {
    "Initial Consultation & Dental Examination": "PKR 1,500",
    "Ultrasonic Scaling & Polishing": "PKR 4,000",
    "Composite Resin Filling (per surface)": "from PKR 3,500",
    "Root Canal Therapy (Single Canal / Molar)": "from PKR 12,000",
    "Simple Tooth Extraction": "PKR 3,000",
    "Surgical / Impacted Wisdom Tooth Extraction": "from PKR 10,000",
    "Porcelain-Fused-to-Metal / Zirconia Crown": "from PKR 15,000",
}
