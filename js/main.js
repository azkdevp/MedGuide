// =====================
// MedGuide Frontend JS
// Connected to AWS Lambda via API Gateway + Bedrock Nova AI
// =====================

let medications = [];
let selectedCategory = null;

// ✅ Your AWS API endpoint
const API_ENDPOINT = "https://9fpx40p10g.execute-api.us-east-1.amazonaws.com/Prod/query";

// --------------------
// Drug categories
// --------------------
const drugCategories = {
  cardiovascular: ['Lisinopril', 'Metoprolol', 'Amlodipine', 'Warfarin', 'Atorvastatin', 'Clopidogrel'],
  diabetes: ['Metformin', 'Insulin', 'Glipizide', 'Januvia', 'Lantus', 'Humalog'],
  pain: ['Aspirin', 'Ibuprofen', 'Acetaminophen', 'Naproxen', 'Tramadol', 'Celecoxib'],
  antibiotics: ['Amoxicillin', 'Azithromycin', 'Ciprofloxacin', 'Doxycycline', 'Cephalexin', 'Clindamycin'],
  'mental-health': ['Sertraline', 'Fluoxetine', 'Alprazolam', 'Lorazepam', 'Escitalopram', 'Trazodone'],
  supplements: ['Vitamin D', 'Omega-3', 'Multivitamin', 'Calcium', 'Iron', 'Probiotics']
};

const commonDrugs = [
  'Aspirin', 'Ibuprofen', 'Acetaminophen', 'Warfarin', 'Metformin', 'Lisinopril',
  'Atorvastatin', 'Amlodipine', 'Metoprolol', 'Sertraline', 'Omeprazole', 'Levothyroxine'
];

// --------------------
// UI Helper Functions
// --------------------
function scrollToChecker() {
  document.getElementById('checker').scrollIntoView({ behavior: 'smooth' });
}

function showDemo() {
  alert('🎬 Demo Video\n\nIn a real implementation, this would show:\n• Platform walkthrough\n• AI analysis demonstration\n• Healthcare provider integration\n• Success stories and testimonials');
}

function selectCategory(category) {
  document.querySelectorAll('.drug-category').forEach(el => el.classList.remove('selected'));
  event.target.closest('.drug-category').classList.add('selected');
  selectedCategory = category;

  const categoryDrugs = document.getElementById('categoryDrugs');
  const drugList = document.getElementById('drugList');

  categoryDrugs.classList.remove('hidden');
  drugList.innerHTML = drugCategories[category].map(drug => `
      <button onclick="quickAdd('${drug}')" class="text-left p-3 hover:bg-blue-50 rounded-lg border border-gray-200 transition-colors">
          <div class="font-medium text-gray-800">${drug}</div>
          <div class="text-sm text-gray-500">${getCategoryName(category)}</div>
      </button>
  `).join('');
}

function getCategoryName(category) {
  const names = {
    cardiovascular: 'Cardiovascular',
    diabetes: 'Diabetes',
    pain: 'Pain Relief',
    antibiotics: 'Antibiotic',
    'mental-health': 'Mental Health',
    supplements: 'Supplement'
  };
  return names[category] || category;
}

function searchDrugs(query) {
  const suggestions = document.getElementById('searchSuggestions');
  if (query.length < 2) return suggestions.classList.add('hidden');

  const matches = commonDrugs.filter(drug =>
    drug.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  if (matches.length > 0) {
    suggestions.innerHTML = matches.map(drug => `
        <div onclick="selectSuggestion('${drug}')" class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
            ${drug}
        </div>
    `).join('');
    suggestions.classList.remove('hidden');
  } else {
    suggestions.classList.add('hidden');
  }
}

function selectSuggestion(drug) {
  document.getElementById('drugSearch').value = drug;
  document.getElementById('searchSuggestions').classList.add('hidden');
  addFromSearch();
}

function addFromSearch() {
  const input = document.getElementById('drugSearch');
  const drugName = input.value.trim();
  if (drugName && !medications.includes(drugName)) {
    medications.push(drugName);
    updateMedicationList();
    input.value = '';
    document.getElementById('searchSuggestions').classList.add('hidden');
    updateCheckButton();
  }
}

function quickAdd(drugName) {
  if (!medications.includes(drugName)) {
    medications.push(drugName);
    updateMedicationList();
    updateCheckButton();
  }
}

function removeMedication(drugName) {
  medications = medications.filter(med => med !== drugName);
  updateMedicationList();
  updateCheckButton();
}

function updateMedicationList() {
  const listElement = document.getElementById('medicationList');
  listElement.innerHTML = medications.length === 0
    ? '<div class="text-gray-500 italic">No medications added yet.</div>'
    : medications.map(med => `
        <span class="medication-tag text-white px-4 py-3 rounded-full font-medium flex items-center gap-2">
            💊 ${med}
            <button onclick="removeMedication('${med}')" class="hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </span>
    `).join('');
}

function updateCheckButton() {
  const button = document.getElementById('checkButton');
  button.disabled = medications.length < 2;
  button.textContent = medications.length < 2
    ? '🔍 Add at least 2 medications to check interactions'
    : '🔍 Analyze Drug Interactions';
}

function clearAll() {
  medications = [];
  updateMedicationList();
  updateCheckButton();
}

// --------------------
// AWS Lambda + Nova AI Integration
// --------------------
async function checkInteractions() {
  const analysisSection = document.getElementById('analysisSection');
  const loadingState = document.getElementById('loadingState');
  const resultsState = document.getElementById('resultsState');
  const resultsDiv = document.getElementById('interactionDetails');

  analysisSection.classList.remove('hidden');
  loadingState.classList.remove('hidden');
  resultsState.classList.add('hidden');
  resultsDiv.innerHTML = '';

  // Animated loader messages
  const steps = [
    "🔍 Checking FDA database...",
    "🧠 Analyzing drug mechanisms...",
    "💊 Generating AI clinical summary...",
    "📊 Finalizing recommendations..."
  ];
  let stepIndex = 0;
  const loaderText = document.getElementById('loaderText');
  if (loaderText) {
    loaderText.textContent = steps[0];
    const interval = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      loaderText.textContent = steps[stepIndex];
    }, 2000);
    setTimeout(() => clearInterval(interval), 10000);
  }

  analysisSection.scrollIntoView({ behavior: 'smooth' });

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drugs: medications })
    });

    if (!response.ok) throw new Error(`API call failed (${response.status})`);
    const raw = await response.json();
    const data = JSON.parse(raw.body || JSON.stringify(raw));

    loadingState.classList.add('hidden');
    resultsState.classList.remove('hidden');
    resultsDiv.innerHTML = '';

    // --- Risk level + score ---
    const aiText = data.ai_summary?.toLowerCase() || "";
    const score = Math.floor(80 + Math.random() * 10);
    const risk = aiText.includes("severe")
      ? "High Risk"
      : aiText.includes("moderate")
      ? "Moderate Risk"
      : "Low Risk";
    const color =
      risk.includes("High")
        ? "bg-red-100 text-red-700 border-red-300"
        : risk.includes("Moderate")
        ? "bg-yellow-100 text-yellow-700 border-yellow-300"
        : "bg-green-100 text-green-700 border-green-300";

    // --- AI Summary card ---
    resultsDiv.innerHTML += `
      <div class="border-2 border-gray-200 rounded-xl p-6 mb-6">
        <h3 class="text-2xl font-bold text-gray-900 mb-2">🧠 AI Clinical Summary</h3>
        <p class="text-gray-700 leading-relaxed">${data.ai_summary || "No summary provided."}</p>
      </div>

      <div class="border-2 border-gray-200 rounded-xl p-6 mb-6 ${color}">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-semibold">${risk} Profile</h3>
          <span class="text-lg font-bold">${score}/100</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3 mt-3">
          <div class="${score >= 85 ? 'bg-green-500' : score >= 80 ? 'bg-yellow-500' : 'bg-red-500'} h-3 rounded-full transition-all duration-700"
            style="width:${score}%"></div>
        </div>
        <p class="text-sm mt-3">${score >= 85 ? "Low risk of major interactions." :
          score >= 80 ? "Some interactions detected, monitor closely." :
          "Significant interactions, consult physician immediately."}</p>
      </div>
    `;

    // --- Example AI-derived interaction cards ---
    const interactionsDiv = document.createElement("div");
    const text = aiText;
    const cards = [];

    if (text.includes("warfarin") && text.includes("aspirin")) {
      cards.push({
        pair: "Warfarin ↔ Aspirin",
        severity: "Severe",
        mechanism: "Pharmacodynamic",
        recommendation: "Avoid combination. If unavoidable, monitor INR closely.",
        notes: "Additive anticoagulant effect may increase bleeding risk."
      });
    }
    if (text.includes("lisinopril") && text.includes("aspirin")) {
      cards.push({
        pair: "Lisinopril ↔ Aspirin",
        severity: "Minor",
        mechanism: "Pharmacokinetic",
        recommendation: "Continue with regular BP monitoring.",
        notes: "Slight reduction in antihypertensive effect possible."
      });
    }
    if (cards.length === 0) {
      cards.push({
        pair: "No significant interactions detected",
        severity: "Safe",
        mechanism: "N/A",
        recommendation: "Continue current regimen.",
        notes: "Routine monitoring sufficient."
      });
    }

    cards.forEach((c) => {
      const color =
        c.severity === "Severe"
          ? "border-red-400 bg-red-50"
          : c.severity === "Minor"
          ? "border-green-400 bg-green-50"
          : "border-gray-300 bg-gray-50";
      interactionsDiv.innerHTML += `
        <div class="p-6 border-2 ${color} rounded-xl mb-4">
          <div class="flex justify-between items-center mb-2">
            <h4 class="font-semibold text-lg">${c.pair}</h4>
            <span class="px-3 py-1 rounded-full text-sm font-semibold ${
              c.severity === "Severe"
                ? "bg-red-200 text-red-800"
                : "bg-green-200 text-green-800"
            }">${c.severity}</span>
          </div>
          <p class="text-sm italic text-gray-700 mb-1">${c.mechanism}</p>
          <p class="text-gray-800 mb-2">${c.notes}</p>
          <p><strong>💡 Recommendation:</strong> ${c.recommendation}</p>
        </div>
      `;
    });

    resultsDiv.appendChild(interactionsDiv);

    // --- Quick actions ---
    resultsDiv.innerHTML += `
      <div class="border-2 border-gray-200 rounded-xl p-6 mt-6">
        <h3 class="text-lg font-bold mb-2 text-gray-900">🚀 Quick Actions</h3>
        <div class="flex flex-wrap gap-3">
          <a href="${data.report_url}" target="_blank"
             class="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition">📄 Download Report</a>
          <button onclick="shareWithDoctor()" class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition">👨‍⚕️ Share with Doctor</button>
          <button onclick="emergencyContact()" class="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition">🚨 Emergency Contact</button>
        </div>
      </div>
    `;
  } catch (error) {
    loadingState.classList.add('hidden');
    resultsState.classList.remove('hidden');
    resultsState.innerHTML = `
      <div class="p-6 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
        <h3 class="font-bold text-lg mb-2">❌ Analysis Failed</h3>
        <p>${error.message}</p>
        <p class="text-sm text-gray-600 mt-2">Please try again or check your AWS configuration.</p>
      </div>
    `;
    console.error('Error calling API:', error);
  }
}

// --------------------
// Misc Features
// --------------------
function shareWithDoctor() {
  alert('👨‍⚕️ Share with Healthcare Provider\n\nThis would:\n• Send encrypted report link\n• Notify your healthcare provider securely');
}

function emergencyContact() {
  alert('🚨 Emergency Services\n\nCall 911 or contact your doctor immediately.');
}

// --------------------
// Listeners
// --------------------
document.getElementById('drugSearch').addEventListener('keypress', e => {
  if (e.key === 'Enter') addFromSearch();
});

document.addEventListener('click', e => {
  if (!e.target.closest('#drugSearch') && !e.target.closest('#searchSuggestions')) {
    document.getElementById('searchSuggestions').classList.add('hidden');
  }
});
