// =====================
// MedGuide Frontend JS 
// =====================

let medications = [];
let selectedCategory = null;

// ✅ AWS API endpoint
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
  alert('🎬 Demo Video\n\nThis would show:\n• Platform walkthrough\n• AI analysis demo\n• Integration with clinicians');
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
// AWS Lambda Integration
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

  const steps = ["🔍 Checking FDA database...", "🧠 Analyzing mechanisms...", "💊 Generating AI summary...", "📊 Preparing personalized education..."];
  const loaderText = document.getElementById('loaderText');
  if (loaderText) {
    let i = 0;
    loaderText.textContent = steps[0];
    const interval = setInterval(() => {
      i = (i + 1) % steps.length;
      loaderText.textContent = steps[i];
    }, 2000);
    setTimeout(() => clearInterval(interval), 10000);
  }

  analysisSection.scrollIntoView({ behavior: 'smooth' });

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drugs: medications,
        age_group: document.getElementById('ageGroup')?.value || 'Adult',
        gender: document.getElementById('gender')?.value || 'Unspecified', // ✅ NEW FIELD
        condition: document.getElementById('condition')?.value || '',
        allergies: document.getElementById('allergies')?.value || '',
        patient_mode: true
      })
    });

    if (!response.ok) throw new Error(`API call failed (${response.status})`);
    const raw = await response.json();
    const data = JSON.parse(raw.body || JSON.stringify(raw));

    loadingState.classList.add('hidden');
    resultsState.classList.remove('hidden');

    // 🧠 Reasoning Agent Layer
    if (data.intent) {
      console.log(`🧠 Intent detected by AI Agent: ${data.intent}`);
      const intentLabels = {
        interaction_analysis: "Comprehensive Interaction Analysis 🧩",
        education_focus: "Patient Education & Guidance 📘",
        doctor_followup: "Doctor Follow-up Recommended ⚠️"
      };
      const intentText = intentLabels[data.intent] || "General Analysis Mode";
      resultsDiv.innerHTML += `
        <div class="mb-4 p-4 border-2 border-yellow-200 rounded-xl bg-yellow-50 text-yellow-800 font-semibold text-center reasoning-banner">
          🧠 <span>Reasoning Mode:</span> ${intentText}
        </div>
      `;
    }

    // --- AI Summary ---
    resultsDiv.innerHTML += `
      <div class="border-2 border-gray-200 rounded-xl p-6 mb-6 bg-white shadow-sm">
        <h3 class="text-2xl font-bold text-gray-900 mb-3">🧠 AI Clinical Summary</h3>
        <p class="text-gray-700 leading-relaxed">${data.ai_summary || "No summary generated."}</p>
      </div>
    `;

    // --- Interactions (LLM) ---
    const interactionsDiv = document.createElement("div");
    if (data.interactions && data.interactions.length > 0) {
      data.interactions.forEach((c) => {
        interactionsDiv.innerHTML += `
          <div class="p-6 border-2 border-blue-100 bg-blue-50 rounded-xl mb-4">
            <h4 class="font-semibold text-lg mb-2 text-blue-800">${c.pair}</h4>
            <div class="space-y-2 text-gray-800">
              <p><strong>⚠ Clinical Significance:</strong> ${c.clinical_significance}</p>
              <p><strong>🩺 Monitoring:</strong> ${c.monitoring}</p>
              <p><strong>💡 Recommendation:</strong> ${c.recommendation}</p>
            </div>
          </div>
        `;
      });
    } else {
      interactionsDiv.innerHTML = `<div class="p-4 text-gray-500 italic">No significant interactions detected.</div>`;
    }
    resultsDiv.appendChild(interactionsDiv);

    // --- Patient Education ---
    if (data.patient_education) {
      resultsDiv.innerHTML += `
        <div class="border-2 border-green-200 rounded-xl p-6 mb-6 bg-green-50">
          <h3 class="text-xl font-bold text-green-800 mb-3">📘 Personalized Patient Education</h3>
          <p class="text-gray-800 leading-relaxed">${data.patient_education}</p>
        </div>
      `;
    }

    // --- Quick Actions ---
    resultsDiv.innerHTML += `
      <div class="border-2 border-gray-200 rounded-xl p-6 mt-6 bg-white shadow-sm">
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
    console.error("Error calling API:", error);
  }
}

// --------------------
// Misc
// --------------------
function shareWithDoctor() {
  alert('👨‍⚕️ This would securely share your personalized AI report with your healthcare provider.');
}

function emergencyContact() {
  alert('🚨 If you experience severe symptoms, contact your doctor or emergency services immediately.');
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
