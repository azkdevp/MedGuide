# 🧠 MedGuide AI — Autonomous Drug Interaction Intelligence

### *Built with AWS Bedrock · OpenFDA · Serverless Architecture*

**MedGuide AI** is an **autonomous, AI-powered drug interaction platform** built to prevent harmful medication combinations through advanced reasoning, verified data, and secure, QR-coded clinical reports — all in under **10 seconds**.

---

## 🚀 **Overview**

Every year, over **millions of hospital admissions** occur due to medication errors.
MedGuide AI was built to change that — by empowering doctors and patients with real-time, data-driven drug safety intelligence.

This project was developed as a **solo end-to-end build** for the **AWS AI Agent Global Hackathon**, integrating **AWS Bedrock AgentCore**, **Nova reasoning models**, and **OpenFDA APIs** within a **fully serverless architecture**.

---

## 🩺 **Key Features**

* **AI-Driven Drug Interaction Analysis** — Uses AWS Bedrock’s Nova model for reasoning over complex drug combinations.
* **OpenFDA Verified Data** — Pulls real-time clinical and pharmaceutical data from FDA sources.
* **Comprehensive Interaction Reports** — Generates structured, color-coded reports with clinical significance and recommendations.
* **QR-Based Verification System** — Each report includes a unique QR for secure mobile access and verification.
* **Serverless AWS Stack** — Lambda + API Gateway + S3 + IAM + KMS for seamless, secure scalability.
* **Modern UI/UX** — Fully responsive, minimalistic web interface built for clinicians and patients alike.

---

## 🧩 **System Architecture**

```
Patient → CloudFront → API Gateway → AWS Lambda → AWS Bedrock (Nova)
                                          ↓
                                  OpenFDA APIs (Drug Data)
                                          ↓
                              AI Reasoning & Report Generator
                                          ↓
                              Encrypted S3 (Report Storage)
                                          ↓
                               QR-Verified Clinical Report
```

* **Front-End:** React + Tailwind CSS
* **Backend:** Node.js (Express)
* **Database:** Serverless storage via AWS S3
* **AI Layer:** AWS Bedrock (Nova) + AgentCore
* **Data Source:** OpenFDA API

---

## ⚙️ **How to Run Locally**

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/medguide-ai.git
   cd medguide-ai
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Add Environment Variables**
   Create a `.env` file in the root directory:

   ```bash
   BEDROCK_API_KEY=your_aws_bedrock_key
   OPENFDA_API_KEY=your_openfda_key
   S3_BUCKET=your_s3_bucket_name
   ```

4. **Start the Development Server**

   ```bash
   npm run dev
   ```

5. **Access the App**
   Open your browser and visit:
   `http://localhost:3000`

---

## 🧠 **Built With**

* **AWS Bedrock (Nova)**
* **AWS Lambda**
* **AWS API Gateway**
* **AWS S3**
* **AWS IAM & KMS**
* **OpenFDA APIs**
* **Python**

---

## 🧍‍♂️ **Project Lead**

**👨‍💻 Developer:** Azkhan

---

## 🩶 **Vision**

> “The last revolution in patient safety was electronic health records.
> The next will be **autonomous AI agents** safeguarding every prescription.
> That’s what MedGuide AI was built to do.”
