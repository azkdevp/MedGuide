# lambda_function.py
import json, os, time, re, urllib.parse, urllib.request, qrcode, boto3, traceback
from fpdf import FPDF

# ====== CONFIG ======
BUCKET = os.environ.get("BUCKET", "medguide-agent-artifacts-azkhan")
s3 = boto3.client("s3")
bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

# ====== DRUG SYNONYMS ======
DRUG_SYNONYMS = {
    "paracetamol": "acetaminophen",
    "tylenol": "acetaminophen",
    "advil": "ibuprofen",
    "panadol": "acetaminophen",
}

# ====== HELPERS ======
def http_get_json(url, timeout=10):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", errors="ignore"))

def clean_ascii(t):
    if not t:
        return ""
    t = (
        t.replace("–", "-").replace("—", "-")
        .replace("’", "'").replace("“", '"').replace("”", '"')
        .replace("\xa0", " ").replace("\u2013", "-").replace("\u2014", "-")
    )
    return t.encode("ascii", "ignore").decode("ascii")

def safe_text(t):
    """Ensure text is safe for FPDF (latin-1 only)."""
    return (t or "").encode("latin-1", "replace").decode("latin-1")

def classify_risk(txt):
    t = (txt or "").lower()
    if any(x in t for x in ["fatal", "contraindicated", "severe"]):
        return "High", (255, 102, 102)
    if any(x in t for x in ["moderate", "caution", "avoid", "monitor"]):
        return "Moderate", (255, 204, 102)
    if "warning" in t:
        return "Caution", (255, 255, 153)
    return "Low", (204, 255, 204)

def summarize_warning(w):
    if not w or w == "Not found":
        return "No FDA warning data available."
    s = w.split(".")[0][:140]
    return f"⚠ {s.strip()}."

def safe_parse_json(s):
    """Try strict JSON parse; if it fails, attempt to extract the first {...} block."""
    try:
        return json.loads(s)
    except Exception:
        # Find the first JSON object block
        m = re.search(r'\{[\s\S]*\}', s)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
    # Fallback minimal structure
    return {
        "ai_summary": s.strip(),
        "interactions": [],
        "patient_education": "General advice: take medicines exactly as prescribed and consult your provider for concerns."
    }

# ====== FDA FETCH ======
def get_drug_info(drug):
    drug = DRUG_SYNONYMS.get((drug or "").lower(), (drug or "").lower())
    try:
        q = urllib.parse.quote(f'openfda.generic_name:"{drug}"')
        url = f"https://api.fda.gov/drug/label.json?search={q}&limit=1"
        data = http_get_json(url)
        if not data.get("results"):
            q = urllib.parse.quote(f'active_ingredient:"{drug}"')
            url = f"https://api.fda.gov/drug/label.json?search={q}&limit=1"
            data = http_get_json(url)

        if not data.get("results"):
            return {
                "drug": drug,
                "purpose": "No FDA record found",
                "warnings": "Not found",
                "risk": "Unknown",
                "side_effects": "Not found",
                "fda_link": url,
                "summary": "⚠ No FDA record found — may be non-US formulation.",
            }

        r = data["results"][0]
        purpose = clean_ascii(r.get("purpose", ["No purpose info"])[0])

        warnings = "No warnings found"
        for k in ["warnings_and_cautions", "warnings", "precautions", "contraindications"]:
            v = r.get(k)
            if isinstance(v, list) and v:
                warnings = clean_ascii(v[0])
                break

        side = "Not found"
        for k in ["adverse_reactions", "adverse_reactions_table"]:
            v = r.get(k)
            if isinstance(v, list) and v:
                side = clean_ascii(v[0])
                break

        risk, _ = classify_risk(warnings)
        return {
            "drug": drug,
            "purpose": purpose,
            "warnings": warnings,
            "risk": risk,
            "side_effects": side,
            "fda_link": url,
            "summary": summarize_warning(warnings),
        }

    except Exception as e:
        print(f"❌ FDA fetch failed for {drug}: {e}")
        traceback.print_exc()
        return {
            "drug": drug,
            "purpose": "Error",
            "warnings": clean_ascii(str(e)),
            "risk": "Error",
            "side_effects": "Error",
            "fda_link": "N/A",
            "summary": "Error fetching data.",
        }

# ====== PDF GENERATOR (auto-height rows + personalized education) ======
def create_pdf(drugs_data, drugs, url, ai_summary, interactions, patient_education, safety_score):
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Header
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 10, safe_text("MedGuide AI - Comprehensive Clinical Report"), ln=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 8, safe_text(f"Generated on {time.strftime('%B %d, %Y %H:%M:%S')}"), ln=True, align="C")
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(10)

    # AI Clinical Summary (auto box)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "AI Clinical Summary", ln=True)
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 10)
    summary_text = safe_text(ai_summary or "No summary generated.")
    LINE_H = 5
    BOX_W = 190
    TEXT_W = BOX_W - 10
    lines = pdf.multi_cell(TEXT_W, LINE_H, summary_text, split_only=True)
    box_h = len(lines) * LINE_H + 6
    y0 = pdf.get_y()
    pdf.set_fill_color(245, 245, 245)
    pdf.set_draw_color(180, 200, 230)
    pdf.rect(10, y0, BOX_W, box_h, "DF")
    pdf.set_xy(12, y0 + 3)
    pdf.multi_cell(TEXT_W, LINE_H, summary_text)
    pdf.ln(6)

    # Safety Score
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(20, 60, 20)
    pdf.cell(0, 8, f"Overall Safety Score: {safety_score}/100", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(5)

    # Interactions table (from LLM)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Detected Interactions (AI)", ln=True)
    pdf.ln(2)

    HEAD_W = [75, 115]  # Pair | Details
    def draw_row(pair, details):
        nonlocal pdf
        LINE = 5
        pair_lines = pdf.multi_cell(HEAD_W[0], LINE, safe_text(pair), split_only=True)
        detail_lines = pdf.multi_cell(HEAD_W[1], LINE, safe_text(details), split_only=True)
        row_h = max(len(pair_lines), len(detail_lines)) * LINE
        if pdf.get_y() + row_h > 265:
            pdf.add_page()
        y = pdf.get_y()
        x = 10
        # Pair cell
        pdf.set_xy(x, y); pdf.multi_cell(HEAD_W[0], LINE, safe_text(pair), border=1); x += HEAD_W[0]
        # Detail cell
        pdf.set_xy(x, y); pdf.multi_cell(HEAD_W[1], LINE, safe_text(details), border=1)
        pdf.set_y(y + row_h)

    # Header row
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(220, 230, 250)
    x = 10; yh = pdf.get_y()
    pdf.set_xy(x, yh); pdf.cell(HEAD_W[0], 8, "Drugs Involved", 1, 0, "C", True); x += HEAD_W[0]
    pdf.set_xy(x, yh); pdf.cell(HEAD_W[1], 8, "Clinical Significance, Monitoring & Recommendation", 1, 1, "C", True)

    pdf.set_font("Helvetica", "", 9)
    if interactions:
        for it in interactions:
            pair = it.get("pair", "—")
            det = (
                f"⚠ Clinical Significance: {it.get('clinical_significance','')}\n"
                f"🩺 Monitoring: {it.get('monitoring','')}\n"
                f"💡 Recommendation: {it.get('recommendation','')}"
            )
            draw_row(pair, det)
    else:
        draw_row("No clinically significant interactions detected", "Routine monitoring is sufficient.")

    # Patient Education (from LLM, personalized)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 10, "Patient Education (Personalized)", ln=True)
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6, safe_text(patient_education or ""))

    # QR code
    qr = qrcode.QRCode(box_size=3, border=1)
    qr.add_data(url); qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    path_qr = "/tmp/qrcode.png"; qr_img.save(path_qr)
    if pdf.get_y() < 235:
        pdf.image(path_qr, x=175, y=250, w=25)
    else:
        pdf.add_page()
        pdf.image(path_qr, x=175, y=250, w=25)

    # Footer
    pdf.set_y(-25)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(0, 5, safe_text(
        "This report was generated by MedGuide Agent using AWS Bedrock AI and FDA OpenFDA data.\n"
        "This report is educational and not a substitute for professional medical advice."
    ), align="C")

    out_path = "/tmp/report.pdf"
    pdf.output(out_path)
    return out_path

# ====== MAIN HANDLER ======
def lambda_handler(event, context):
    try:
        print("🩺 Incoming event:", json.dumps(event)[:1000])

        body = json.loads(event.get("body") or "{}")
        drugs = [d for d in (body.get("drugs", []) or []) if d]
        age = body.get("age_group", "Adult")
        condition = body.get("condition", "")
        allergies = body.get("allergies", "")
        patient_mode = bool(body.get("patient_mode", True))  # default to patient-friendly

        if not drugs:
            return _resp(400, {"error": "No medications provided."})

        print("🩺 Drugs received:", drugs)

        # FDA facts for each drug (purpose/warnings used in PDF)
        data = [get_drug_info(d) for d in drugs]

        # ------- LLM prompt: multi-drug + personalized education, STRICT JSON -------
        tone = "Use clear everyday language a patient can understand." if patient_mode else "Write for clinicians."
        prompt = (
            "You are a clinical pharmacology reasoning model trained to analyze polypharmacy cases.\n"
            f"Patient profile: age group={age}; comorbidity/condition={condition}; allergies={allergies}.\n"
            f"Medications: {', '.join(drugs)}.\n\n"
            "Task: Analyze interactions ACROSS ALL MEDS (not only pairs). If a 3- or 4-drug combined effect matters, include it.\n"
            "Return STRICT JSON ONLY (no extra prose) with this schema:\n"
            "{\n"
            "  \"ai_summary\": string,       // 3-6 sentences, personalized overview\n"
            "  \"interactions\": [           // 0+ items\n"
            "     {\n"
            "        \"pair\": string,        // e.g., \"Aspirin ↔ Warfarin ↔ Metformin ↔ Lisinopril\"\n"
            "        \"clinical_significance\": string,\n"
            "        \"monitoring\": string,  // labs/vitals/symptoms and frequency\n"
            "        \"recommendation\": string // practical advice patient can follow\n"
            "     }\n"
            "  ],\n"
            "  \"patient_education\": string // personalized, friendly guidance: what to avoid, red flags, when to call a doctor\n"
            "}\n\n"
            f"{tone} Avoid hedging. Be specific and actionable."
        )

        ai_summary = "No summary generated."
        interactions = []
        patient_education = ""
        try:
            print("⚙️ Calling Bedrock Nova with prompt length:", len(prompt))
            ai_resp = bedrock.invoke_model(
                modelId="amazon.nova-micro-v1:0",
                accept="application/json",
                contentType="application/json",
                body=json.dumps({
                    "messages": [{"role": "user", "content": [{"text": prompt}]}],
                    "inferenceConfig": {"maxTokens": 900, "temperature": 0.4}
                })
            )
            raw = json.loads(ai_resp["body"].read())
            print("✅ Raw Bedrock response (truncated):", json.dumps(raw)[:900])

            model_text = (
                raw.get("output", {})
                   .get("message", {})
                   .get("content", [{}])[0]
                   .get("text", "")
            )
            parsed = safe_parse_json(model_text)
            ai_summary = parsed.get("ai_summary", ai_summary)
            interactions = parsed.get("interactions", []) or []
            patient_education = parsed.get("patient_education", "") or ""
        except Exception as bedrock_err:
            print("❌ Bedrock error:", str(bedrock_err))
            traceback.print_exc()
            ai_summary = f"(AI summary unavailable) {bedrock_err}"
            interactions = []
            patient_education = "General advice: take medicines exactly as prescribed and consult your provider for concerns."

        # ------- Safety score from interactions severity keywords -------
        def score_item(it):
            text = " ".join([
                it.get("clinical_significance",""),
                it.get("recommendation",""),
            ]).lower()
            if "contraindicat" in text or "severe" in text or "stop" in text or "bleeding" in text:
                return 30
            if "moderate" in text or "caution" in text or "monitor closely" in text:
                return 15
            if "minor" in text or "no significant" in text:
                return 5
            return 10
        risk_points = sum(score_item(it) for it in interactions)
        safety_score = max(0, 100 - min(90, risk_points))

        # ------- PDF + S3 -------
        rid = f"MedGuideReport_{int(time.time())}_{getattr(context, 'aws_request_id', 'local')}"
        key = f"reports/{rid}.pdf"
        pdf_path = create_pdf(
            drugs_data=data,
            drugs=drugs,
            url="https://aws.amazon.com",
            ai_summary=ai_summary,
            interactions=interactions,
            patient_education=patient_education,
            safety_score=safety_score,
        )
        s3.upload_file(pdf_path, BUCKET, key)

        presigned = s3.generate_presigned_url(
            "get_object", Params={"Bucket": BUCKET, "Key": key}, ExpiresIn=3600
        )

        return _resp(200, {
            "status": "success",
            "analyzed_drugs": drugs,
            "ai_summary": ai_summary,
            "interactions": interactions,
            "patient_education": patient_education,
            "safety_score": safety_score,
            "report_url": presigned
        })

    except Exception as e:
        print("❌ FULL ERROR TRACEBACK:")
        traceback.print_exc()
        print("❌ ERROR MESSAGE:", str(e))
        return _resp(500, {"error": str(e)})

# ====== CORS helper ======
def _resp(status, body_dict):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,POST",
        },
        "body": json.dumps(body_dict),
    }
