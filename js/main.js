// =====================
// MedGuide Frontend JS - FIXED VERSION
// =====================

let medications = [];
let selectedCategory = null;

// ✅ AWS API endpoint
const API_ENDPOINT = "https://9fpx40p10g.execute-api.us-east-1.amazonaws.com/Prod/query";

// Drug categories
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

// UI Helper Functions
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

// ✅ FIXED: AWS Lambda Integration with Patient Profile
async function checkInteractions() {
    const analysisSection = document.getElementById('analysisSection');
    const loadingState = document.getElementById('loadingState');
    const resultsState = document.getElementById('resultsState');
    const resultsDiv = document.getElementById('interactionDetails');

    // ✅ Get patient profile data
    const ageGroup = document.getElementById('ageGroup').value || 'Not specified';
    const conditions = document.getElementById('conditions').value || 'Not specified';
    const allergies = document.getElementById('allergies').value || 'None';

    analysisSection.classList.remove('hidden');
    analysisSection.classList.add('fade-in');
    loadingState.classList.remove('hidden');
    resultsState.classList.add('hidden');
    resultsDiv.innerHTML = '';

    analysisSection.scrollIntoView({ behavior: 'smooth' });

    try {
        // ✅ Send patient profile + medications to Lambda
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                drugs: medications,
                patient_profile: {
                    age_group: ageGroup,
                    conditions: conditions,
                    allergies: allergies
                }
            })
        });

        if (!response.ok) throw new Error(`API call failed (${response.status})`);

        const data = await response.json();
        
        // ✅ Handle both direct response and body-wrapped response
        const reportData = data.body ? JSON.parse(data.body) : data;

        loadingState.classList.add('hidden');
        resultsState.classList.remove('hidden');
        resultsState.classList.add('fade-in');

        // ✅ Display results with proper URL handling
        resultsDiv.innerHTML = `
            <div class="border-2 border-green-200 bg-green-50 rounded-xl p-6">
                <h3 class="text-xl font-bold text-green-700 mb-3">✅ Analysis Complete</h3>
                <div class="space-y-2 mb-4">
                    <p class="text-gray-700"><strong>Status:</strong> ${reportData.status || "success"}</p>
                    <p class="text-gray-700"><strong>Analyzed Drugs:</strong> ${reportData.analyzed_drugs?.join(', ') || medications.join(', ')}</p>
                    <p class="text-gray-700"><strong>Age Group:</strong> ${ageGroup}</p>
                    <p class="text-gray-700"><strong>Medical Conditions:</strong> ${conditions}</p>
                    <p class="text-gray-700"><strong>Allergies:</strong> ${allergies}</p>
                </div>
                ${reportData.report_url ? `
                    <a href="${reportData.report_url}" target="_blank" class="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold mb-3 transition-colors">
                        📄 Download PDF Report
                    </a>
                ` : '<p class="text-red-600 font-semibold">⚠️ PDF generation in progress...</p>'}
                ${reportData.verify_page ? `
                    <br><a href="${reportData.verify_page}" target="_blank" class="text-blue-600 underline text-sm">
                        🔗 Verify Report Authenticity
                    </a>
                ` : ''}
            </div>
        `;

        // ✅ Update safety score display
        updateSafetyScore(reportData);

    } catch (error) {
        loadingState.classList.add('hidden');
        resultsState.classList.remove('hidden');
        resultsDiv.innerHTML = `
            <div class="p-6 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
                <h3 class="font-bold text-lg mb-2">❌ Analysis Failed</h3>
                <p class="mb-2">${error.message}</p>
                <p class="text-sm text-gray-600">Please try again or check your internet connection.</p>
                <details class="mt-3">
                    <summary class="cursor-pointer text-sm font-semibold">Technical Details</summary>
                    <pre class="text-xs mt-2 bg-white p-2 rounded">${error.stack || error.toString()}</pre>
                </details>
            </div>
        `;
        console.error('Error calling API:', error);
    }
}

// ✅ Update safety score based on response
function updateSafetyScore(data) {
    const safetyScore = document.getElementById('safetyScore');
    const safetyBar = document.getElementById('safetyBar');
    
    // Calculate score based on risk level or use default
    let score = 85; // default
    if (data.risk_level === 'high') score = 45;
    else if (data.risk_level === 'moderate') score = 70;
    
    safetyScore.textContent = score;
    safetyBar.style.width = score + '%';
    safetyBar.className = score > 70 ? 'bg-green-500 h-3 rounded-full' : 
                         score > 50 ? 'bg-yellow-500 h-3 rounded-full' : 
                         'bg-red-500 h-3 rounded-full';
}

// ✅ FIXED: Download PDF directly from response
function downloadPDF() {
    const reportUrl = document.querySelector('a[href*="amazonaws.com"]')?.href;
    if (reportUrl) {
        window.open(reportUrl, '_blank');
    } else {
        alert('⚠️ Please run the analysis first to generate a PDF report.');
    }
}

// Misc Features
function shareWithDoctor() {
    alert('👨‍⚕️ Share with Healthcare Provider\n\nThis would:\n• Send encrypted report link\n• Notify your healthcare provider securely\n• Schedule follow-up consultation');
}

function setReminders() {
    alert('⏰ Medication Reminders\n\nThis feature would:\n• Set up daily medication reminders\n• Track medication adherence\n• Send refill notifications');
}

function notifyProvider() {
    alert('📧 Healthcare Provider Notification\n\nReport has been prepared for secure transmission to your healthcare provider.');
}

function scheduleConsultation() {
    alert('📅 Schedule Consultation\n\nThis feature would:\n• Connect with your healthcare provider\n• Schedule telehealth or in-person visit');
}

function emergencyContact() {
    if (confirm('🚨 Emergency Services\n\nThis will dial emergency services. Continue?')) {
        window.location.href = 'tel:911';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const drugSearch = document.getElementById('drugSearch');
    if (drugSearch) {
        drugSearch.addEventListener('keypress', e => {
            if (e.key === 'Enter') addFromSearch();
        });
    }

    document.addEventListener('click', e => {
        if (!e.target.closest('#drugSearch') && !e.target.closest('#searchSuggestions')) {
            const suggestions = document.getElementById('searchSuggestions');
            if (suggestions) suggestions.classList.add('hidden');
        }
    });
});
