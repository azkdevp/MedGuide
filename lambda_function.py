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
    return f"Warning: {s.strip()}."

def safe_parse_json(s):
    """Try strict JSON parse; if it fails, attempt to extract the first {...} block."""
    try:
        return json.loads(s)
    except Exception:
        m = re.search(r'\{[\s\S]*\}', s)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
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
                "summary": "Warning: No FDA record found — may be non-US formulation.",
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

# ====== REASONING AGENT LAYER ======
def decide_agent_intent(drugs, condition, allergies, gender="Unspecified"):
    """
    Uses AWS Bedrock to autonomously decide what the AI agent should focus on.
    Possible outcomes: 'interaction_analysis', 'education_focus', 'doctor_followup'
    """
    try:
        prompt = (
            "You are a clinical reasoning AI agent. "
            "Given a patient's medications and conditions, decide what the system should focus on. "
            "Choose only one of these intents:\n"
            "- interaction_analysis: analyze drug interactions in depth\n"
            "- education_focus: simplify and explain medications for patient understanding\n"
            "- doctor_followup: warn the patient and recommend seeing a doctor soon\n\n"
            f"Medications: {', '.join(drugs)}\n"
            f"Condition: {condition}\n"
            f"Gender: {gender}\n"
            f"Allergies: {allergies}\n"
            "Return only the intent label string, nothing else."
        )
        resp = bedrock.invoke_model(
            modelId="amazon.nova-micro-v1:0",
            accept="application/json",
            contentType="application/json",
            body=json.dumps({
                "messages": [{"role": "user", "content": [{"text": prompt}]}],
                "inferenceConfig": {"maxTokens": 50, "temperature": 0.1}
            })
        )
        data = json.loads(resp["body"].read())
        label = (
            data.get("output", {})
                .get("message", {})
                .get("content", [{}])[0]
                .get("text", "")
                .strip()
                .lower()
        )
        if "doctor" in label or "follow" in label:
            return "doctor_followup"
        if "education" in label:
            return "education_focus"
        return "interaction_analysis"
    except Exception as e:
        print("⚠️ Reasoning layer failed:", e)
        return "interaction_analysis"

# ====== PDF GENERATOR ======
def create_pdf(drugs_data, drugs, url, ai_summary, interactions, patient_education, safety_score, age, gender, condition, allergies):
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, safe_text("MedGuide AI - Comprehensive Clinical Report"), ln=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 8, safe_text(f"Generated on {time.strftime('%B %d, %Y %H:%M:%S')}"), ln=True, align="C")
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(10)

    pdf.set_font("Helvetica", "I", 9)
    pdf.cell(0, 8, safe_text(f"Patient Profile=  Age: {age} | Gender: {gender} | Condition: {condition or 'N/A'} | Allergies: {allergies or 'None'}"), ln=True)
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "AI Clinical Summary", ln=True)
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 10)
    summary_text = safe_text(ai_summary or "No summary generated.")
    lines = pdf.multi_cell(180, 5, summary_text, split_only=True)
    box_h = len(lines) * 5 + 6
    y0 = pdf.get_y()
    pdf.set_fill_color(245, 245, 245)
    pdf.set_draw_color(180, 200, 230)
    pdf.rect(10, y0, 190, box_h, "DF")
    pdf.set_xy(12, y0 + 3)
    pdf.multi_cell(180, 5, summary_text)
    pdf.ln(6)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, f"Overall Safety Score: {safety_score}/100", ln=True)
    pdf.ln(5)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Detected Interactions (AI)", ln=True)
    pdf.ln(2)

    HEAD_W = [75, 115]
    def draw_row(pair, details):
        nonlocal pdf
        pair_lines = pdf.multi_cell(HEAD_W[0], 5, safe_text(pair), split_only=True)
        detail_lines = pdf.multi_cell(HEAD_W[1], 5, safe_text(details), split_only=True)
        row_h = max(len(pair_lines), len(detail_lines)) * 5
        if pdf.get_y() + row_h > 265:
            pdf.add_page()
        y = pdf.get_y()
        x = 10
        pdf.set_xy(x, y); pdf.multi_cell(HEAD_W[0], 5, safe_text(pair), border=1); x += HEAD_W[0]
        pdf.set_xy(x, y); pdf.multi_cell(HEAD_W[1], 5, safe_text(details), border=1)
        pdf.set_y(y + row_h)

    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(220, 230, 250)
    pdf.cell(HEAD_W[0], 8, "Drugs Involved", 1, 0, "C", True)
    pdf.cell(HEAD_W[1], 8, "Clinical Significance, Monitoring & Recommendation", 1, 1, "C", True)
    pdf.set_font("Helvetica", "", 9)

    if interactions:
        for it in interactions:
            pair = it.get("pair", "—")
            det = (
                f"Clinical Significance: {it.get('clinical_significance','')}\n"
                f"Monitoring: {it.get('monitoring','')}\n"
                f"Recommendation: {it.get('recommendation','')}"
            )
            draw_row(pair, det)
    else:
        draw_row("No clinically significant interactions detected", "Routine monitoring is sufficient.")

    pdf.add_page()
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 10, "Patient Education (Personalized)", ln=True)
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6, safe_text(patient_education or ""))

    qr = qrcode.QRCode(box_size=3, border=1)
    qr.add_data(url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    path_qr = "/tmp/qrcode.png"
    qr_img.save(path_qr)
    pdf.image(path_qr, x=175, y=250, w=25)

    pdf.set_y(-25)
    pdf.set_font("Helvetica", "I", 8)
    pdf.multi_cell(0, 5, safe_text(
        "Generated by MedGuide Agent using AWS Bedrock AI and FDA OpenFDA data.\n"
        "Educational only - not a substitute for professional medical advice."
    ), align="C")

    out_path = "/tmp/report.pdf"
    pdf.output(out_path)
    return out_path

# ====== MAIN HANDLER ======
def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
        drugs = [d for d in (body.get("drugs", []) or []) if d]
        age = body.get("age_group", "Adult")
        gender = body.get("gender", "Unspecified")
        condition = body.get("condition", "")
        allergies = body.get("allergies", "")
        patient_mode = bool(body.get("patient_mode", True))

        if not drugs:
            return _resp(400, {"error": "No medications provided."})

        agent_intent = decide_agent_intent(drugs, condition, allergies, gender)
        data = [get_drug_info(d) for d in drugs]

        tone = "Use clear everyday language." if patient_mode else "Write for clinicians."
        intent_msg = {
            "interaction_analysis": "Analyze drug interactions comprehensively.",
            "education_focus": "Focus on simple, educational summaries.",
            "doctor_followup": "Highlight urgent risks and recommend follow-up.",
        }[agent_intent]

        prompt = (
            f"Intent: {agent_intent} → {intent_msg}\n"
            f"Patient: {age}, {gender}, {condition}, {allergies}\n"
            f"Drugs: {', '.join(drugs)}\n\n"
            "Return JSON only: { 'ai_summary': str, 'interactions': [ { 'pair': str, 'clinical_significance': str, 'monitoring': str, 'recommendation': str } ], 'patient_education': str }"
        )

        ai_summary, interactions, patient_education = "No summary", [], ""
        try:
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
            text = raw.get("output", {}).get("message", {}).get("content", [{}])[0].get("text", "")
            parsed = safe_parse_json(text)
            ai_summary = parsed.get("ai_summary", "")
            interactions = parsed.get("interactions", [])
            patient_education = parsed.get("patient_education", "")
        except Exception:
            traceback.print_exc()

        def score(it):
            text = f"{it.get('clinical_significance','')} {it.get('recommendation','')}".lower()
            if any(w in text for w in ["contraindicat", "severe", "stop", "bleeding"]): return 30
            if any(w in text for w in ["moderate", "caution", "monitor"]): return 15
            if any(w in text for w in ["minor", "no significant"]): return 5
            return 10

        safety_score = max(0, 100 - min(90, sum(score(i) for i in interactions)))

        rid = f"MedGuideReport_{int(time.time())}_{getattr(context, 'aws_request_id', 'local')}"
        pdf_key = f"reports/{rid}.pdf"
        verify_key = f"verify/{rid}.html"

        # --- Generate PDF (QR points to verification page)
        verify_url = f"https://{BUCKET}.s3.amazonaws.com/{verify_key}"
        pdf_path = create_pdf(data, drugs, verify_url, ai_summary, interactions, patient_education, safety_score, age, gender, condition, allergies)
        s3.upload_file(pdf_path, BUCKET, pdf_key)

        # --- Create verification HTML ---
        html = f"""
        <html>
        <head>
            <title>MedGuide Verification</title>
            <meta charset='UTF-8'>
            <style>
                body {{
                    font-family: 'Arial', sans-serif;
                    background-color: #f4f7fb;
                    margin: 0;
                    padding: 0;
                    color: #333;
                }}
                .container {{
                    max-width: 700px;
                    margin: 60px auto;
                    background: #fff;
                    padding: 40px 50px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                }}
                .header {{
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }}
                .logo {{
                    font-size: 22px;
                    font-weight: bold;
                    color: #007bff;
                }}
                .badge {{
                    background-color: #28a745;
                    color: white;
                    font-weight: bold;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 14px;
                }}
                h2 {{
                    margin-top: 10px;
                    color: #222;
                }}
                p {{
                    font-size: 15px;
                    line-height: 1.6;
                }}
                .section {{
                    background: #f8faff;
                    border-left: 4px solid #007bff;
                    padding: 15px 20px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }}
                .btn {{
                    display: inline-block;
                    padding: 10px 18px;
                    background: #007bff;
                    color: #fff;
                    text-decoration: none;
                    border-radius: 8px;
                    margin-top: 15px;
                    font-weight: bold;
                    transition: background 0.2s ease;
                }}
                .btn:hover {{
                    background: #0056b3;
                }}
                .footer {{
                    text-align: center;
                    font-size: 12px;
                    color: #888;
                    margin-top: 30px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🧠 MedGuide AI</div>
                    <div class="badge">✅ Verified Report</div>
                </div>

                <h2>Comprehensive Clinical Report</h2>
                <div class="section">
                    <p><b>Patient:</b> {age}, {gender}, {condition or 'N/A'}</p>
                    <p><b>Drugs Analyzed:</b> {', '.join(drugs)}</p>
                    <p><b>Safety Score:</b> <span style='font-weight:bold;color:#28a745;'>{safety_score}/100</span></p>
                </div>

                <p>This report was generated using <b>MedGuide Agent</b> on AWS Bedrock, combining OpenFDA data and AI reasoning to assess potential drug interactions.</p>

                <a class="btn" href="https://{BUCKET}.s3.amazonaws.com/{pdf_key}" target="_blank">📄 View Full Clinical Report (PDF)</a>

                <div class="footer">
                    MedGuide AI © 2025 | Educational use only. Not a substitute for medical advice.
                </div>
            </div>
        </body>
        </html>
        """

        html_path = f"/tmp/{rid}.html"
        with open(html_path, "w") as f:
            f.write(html)
        s3.upload_file(html_path, BUCKET, verify_key, ExtraArgs={"ContentType": "text/html"})

        presigned = s3.generate_presigned_url("get_object", Params={"Bucket": BUCKET, "Key": pdf_key}, ExpiresIn=3600)

        return _resp(200, {
            "status": "success",
            "intent": agent_intent,
            "analyzed_drugs": drugs,
            "ai_summary": ai_summary,
            "interactions": interactions,
            "patient_education": patient_education,
            "safety_score": safety_score,
            "report_url": presigned,
            "verify_page": verify_url
        })

    except Exception as e:
        traceback.print_exc()
        return _resp(500, {"error": str(e)})

# ====== CORS ======
def _resp(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,POST",
        },
        "body": json.dumps(body),
    }
