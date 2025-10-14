// =====================
// MedGuide Frontend JS
// Connected to AWS Lambda via API Gateway
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
// AWS Lambda Integration
// --------------------
async function checkInteractions() {
    const analysisSection = document.getElementById('analysisSection');
    const loadingState = document.getElementById('loadingState');
    const resultsState = document.getElementById('resultsState');
    const resultsDiv = document.getElementById('interactionDetails');

    analysisSection.classList.remove('hidden');
    analysisSection.classList.add('fade-in');
    loadingState.classList.remove('hidden');
    resultsState.classList.add('hidden');
    resultsDiv.innerHTML = '';

    analysisSection.scrollIntoView({ behavior: 'smooth' });

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drugs: medications })
        });

        if (!response.ok) throw new Error(`API call failed (${response.status})`);

        const raw = await response.json();
        const data = JSON.parse(raw.body || '{}');

        loadingState.classList.add('hidden');
        resultsState.classList.remove('hidden');
        resultsState.classList.add('fade-in');

        resultsDiv.innerHTML = `
            <div class="border-2 border-gray-200 rounded-xl p-6">
                <h3 class="text-xl font-bold text-green-700 mb-3">✅ Analysis Complete</h3>
                <p class="text-gray-700 mb-2">Status: ${data.status || "unknown"}</p>
                <p class="text-gray-700 mb-2">Analyzed Drugs: ${data.analyzed_drugs?.join(', ') || "N/A"}</p>
                <p class="text-gray-700 mb-4">Report generated successfully.</p>
                <a href="${data.report_url}" target="_blank" class="text-blue-600 underline font-semibold">📄 View Full PDF Report</a><br>
                <a href="${data.verify_page}" target="_blank" class="text-blue-500 underline text-sm">🔗 Verify Report Link</a>
            </div>
        `;
    } catch (error) {
        loadingState.classList.add('hidden');
        resultsState.classList.remove('hidden');
        resultsState.innerHTML = `
            <div class="p-6 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
                <h3 class="font-bold text-lg mb-2">❌ Analysis Failed</h3>
                <p>${error.message}</p>
                <p class="text-sm text-gray-600 mt-2">Please try again or check the AWS API configuration.</p>
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
