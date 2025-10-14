// =====================
// MedGuide v2 Frontend Integration
// =====================

async function analyzeDrugInteractions() {
  const analyzeBtn = document.getElementById("analyzeBtn");
  const resultsSection = document.getElementById("resultsSection");
  const interactionDetails = document.getElementById("interactionDetails");

  analyzeBtn.disabled = true;
  analyzeBtn.innerText = "Analyzing...";

  // ---- 1️⃣ Collect patient data ----
  const patient = {
    age_group: document.getElementById("ageGroup").value || "N/A",
    conditions: document.getElementById("medicalConditions").value || "N/A",
    allergies: document.getElementById("allergies").value || "None"
  };

  // ---- 2️⃣ Collect medications ----
  const meds = Array.from(document.querySelectorAll(".current-med"))
    .map(el => el.innerText.trim())
    .filter(Boolean);

  if (!meds.length) {
    alert("Please add at least one medication to analyze.");
    analyzeBtn.disabled = false;
    analyzeBtn.innerText = "Analyze Drug Interactions";
    return;
  }

  const payload = {
    patient: patient,
    drugs: meds
  };

  // ---- 3️⃣ Call AWS API Gateway endpoint ----
  try {
    const response = await fetch("https://9fpx40p10g.execute-api.us-east-1.amazonaws.com/Prod/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("Lambda Response:", data);

    if (data.status !== "success") throw new Error(data.error || "Analysis failed");

    const ai = data.ai_result;

    // ---- 4️⃣ Render dynamic AI output ----
    resultsSection.style.display = "block";
    interactionDetails.innerHTML = `
      <div class="bg-white shadow-lg rounded-2xl p-6 border border-gray-100">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-2xl font-bold text-blue-800">Comprehensive Interaction Report</h3>
          <span class="px-4 py-2 rounded-full text-sm font-semibold ${
            ai.risk_level === "Low" ? "bg-green-100 text-green-700" :
            ai.risk_level === "Moderate" ? "bg-yellow-100 text-yellow-700" :
            "bg-red-100 text-red-700"
          }">${ai.risk_level} Risk</span>
        </div>

        <div class="text-gray-700 mb-6">
          <p class="font-semibold mb-2">Overall Safety Score:</p>
          <div class="w-full bg-gray-200 rounded-full h-3">
            <div class="bg-green-500 h-3 rounded-full" style="width: ${ai.safety_score}%"></div>
          </div>
          <p class="text-sm mt-1 text-gray-600">${ai.safety_score}/100</p>
        </div>

        <div class="mb-4">
          <h4 class="font-semibold text-green-700 text-lg mb-1">💡 Recommendations</h4>
          <ul class="list-disc pl-6">
            ${ai.recommendations.map(r => `<li>${r}</li>`).join("")}
          </ul>
        </div>

        <div class="mb-4">
          <h4 class="font-semibold text-yellow-700 text-lg mb-1">⚠️ Monitoring Advice</h4>
          <ul class="list-disc pl-6">
            ${ai.monitoring.map(m => `<li>${m}</li>`).join("")}
          </ul>
        </div>

        <div class="mt-6 p-4 bg-gray-50 rounded-lg border">
          <p class="text-gray-600">${ai.summary}</p>
        </div>

        <div class="flex flex-wrap gap-3 mt-6">
          <a href="${data.report_url}" target="_blank"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">📄 Download Report</a>
          <a href="${data.verify_page}" target="_blank"
            class="bg-gray-100 hover:bg-gray-200 text-blue-700 px-4 py-2 rounded-lg font-medium">🔗 Verify Report</a>
          <button onclick="alert('Share feature coming soon!')"
            class="bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg font-medium">🤝 Share with Doctor</button>
        </div>
      </div>
    `;

    analyzeBtn.disabled = false;
    analyzeBtn.innerText = "Analyze Again";

  } catch (err) {
    console.error(err);
    alert("Something went wrong: " + err.message);
    analyzeBtn.disabled = false;
    analyzeBtn.innerText = "Analyze Drug Interactions";
  }
}
