let medications = [];
let selectedCategory = null;

const API_ENDPOINT = "https://9fpx40p10g.execute-api.us-east-1.amazonaws.com/Prod/query";

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

function scrollToChecker() {
    document.getElementById('checker').scrollIntoView({ behavior: 'smooth' });
}

function showDemo() {
    alert('🎬 Demo: AI-Powered Drug Analysis\nThis platform uses AWS Bedrock AI to analyze drug interactions in real-time.');
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

// MAIN ANALYSIS FUNCTION
async function checkInteractions() {
    const analysisSection = document.getElementById('analysisSection');
    const loadingState = document.getElementById('loadingState');
    const resultsState = document.getElementById('resultsState');

    const ageGroup = document.getElementById('ageGroup').value || 'Not specified';
    const conditions = document.getElementById('conditions').value || 'Not specified';
    const allergies = document.getElementById('allergies').value || 'None';

    analysisSection.classList.remove('hidden');
    analysisSection.classList.add('fade-in');
    loadingState.classList.remove('hidden');
    resultsState.classList.add('hidden');

    analysisSection.scrollIntoView({ behavior: 'smooth' });

    try {
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
        const reportData = data.body ? JSON.parse(data.body) : data;
        const aiAnalysis = reportData.ai_analysis;

        loadingState.classList.add('hidden');
        resultsState.classList.remove('hidden');
        resultsState.classList.add('fade-in');

        // Display Safety Overview
        displaySafetyOverview(aiAnalysis, reportData);

        // Display Detailed Interactions
        displayInteractions(aiAnalysis);

        // Update Safety Score
        updateSafetyScore(aiAnalysis);

        // Store report URL globally
        window.currentReportUrl = reportData.report_url;
        window.currentVerifyUrl = reportData.verify_page;

    } catch (error) {
        loadingState.classList.add('hidden');
        resultsState.classList.remove('hidden');
        document.getElementById('interactionDetails').innerHTML = `
            <div class="p-6 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
                <h3 class="font-bold text-lg mb-2">❌ Analysis Failed</h3>
                <p class="mb-2">${error.message}</p>
                <p class="text-sm text-gray-600">Please check your internet connection and try again.</p>
            </div>
        `;
        console.error('Error:', error);
    }
}

function displaySafetyOverview(aiAnalysis, reportData) {
    const safetyOverview = document.getElementById('safetyOverview');
    const riskLevel = aiAnalysis.risk_level;
    const score = aiAnalysis.safety_score;

    const statusConfig = {
        high: {
            color: 'red',
            icon: '🚨',
            title: 'High Risk Interactions Detected',
            message: 'Critical drug interactions found. Immediate medical consultation required.',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            textColor: 'text-red-800'
        },
        moderate: {
            color: 'yellow',
            icon: '⚠️',
            title: 'Moderate Risk Profile',
            message: 'Some interactions detected. Monitor closely and consult your pharmacist.',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200',
            textColor: 'text-yellow-800'
        },
        low: {
            color: 'green',
            icon: '✅',
            title: 'Low Risk Profile',
            message: 'No major interactions detected. Continue with regular monitoring.',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            textColor: 'text-green-800'
        }
    };

    const status = statusConfig[riskLevel] || statusConfig.low;

    safetyOverview.innerHTML = `
        <div class="${status.bgColor} ${status.borderColor} border-2 rounded-2xl p-8">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center">
                    <span class="text-4xl mr-4">${status.icon}</span>
                    <div>
                        <h3 class="text-2xl font-bold ${status.textColor}">${status.title}</h3>
                        <p class="text-lg ${status.textColor.replace('800', '700')}">${status.message}</p>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-3xl font-bold ${status.textColor}">${score}/100</div>
                    <div class="text-sm ${status.textColor.replace('800', '600')}">Safety Score</div>
                </div>
            </div>
            <div class="grid md:grid-cols-3 gap-6 text-center">
                <div class="bg-white bg-opacity-50 rounded-lg p-4">
                    <div class="text-2xl font-bold ${status.textColor}">${reportData.analyzed_drugs.length}</div>
                    <div class="text-sm ${status.textColor.replace('800', '600')}">Medications Analyzed</div>
                </div>
                <div class="bg-white bg-opacity-50 rounded-lg p-4">
                    <div class="text-2xl font-bold ${status.textColor}">${aiAnalysis.interactions.length}</div>
                    <div class="text-sm ${status.textColor.replace('800', '600')}">Interactions Found</div>
                </div>
                <div class="bg-white bg-opacity-50 rounded-lg p-4">
                    <div class="text-2xl font-bold ${status.textColor}">${aiAnalysis.recommendations.length}</div>
                    <div class="text-sm ${status.textColor.replace('800', '600')}">Recommendations</div>
                </div>
            </div>
        </div>
    `;
}

function displayInteractions(aiAnalysis) {
    const interactionDetails = document.getElementById('interactionDetails');

    const severityColors = {
        'Minor': 'border-green-200 bg-green-50',
        'Moderate': 'border-yellow-200 bg-yellow-50',
        'Major': 'border-orange-200 bg-orange-50',
        'Severe': 'border-red-200 bg-red-50'
    };

    const severityBadges = {
        'Minor': 'bg-green-100 text-green-800',
        'Moderate': 'bg-yellow-100 text-yellow-800',
        'Major': 'bg-orange-100 text-orange-800',
        'Severe': 'bg-red-100 text-red-800'
    };

    const severityIcons = {
        'Minor': '✅',
        'Moderate': '⚠️',
        'Major': '🔶',
        'Severe': '🚨'
    };

    interactionDetails.innerHTML = aiAnalysis.interactions.map((interaction, idx) => `
        <div class="border-2 ${severityColors[interaction.severity] || 'border-gray-200'} rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                    <h4 class="text-lg font-bold text-gray-800 mb-2">${interaction.drugs}</h4>
                    <div class="flex items-center gap-3 mb-3">
                        <span class="px-3 py-1 rounded-full text-sm font-semibold ${severityBadges[interaction.severity] || 'bg-gray-100 text-gray-800'}">
                            ${interaction.severity}
                        </span>
                        <span class="text-sm text-gray-500">${interaction.mechanism}</span>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-2xl mb-1">${severityIcons[interaction.severity] || '📊'}</div>
                    <div class="text-xs text-gray-500">${interaction.confidence}% confidence</div>
                </div>
            </div>
            
            <div class="bg-white rounded-lg p-4 mb-4">
                <h5 class="font-semibold text-gray-800 mb-2">Clinical Significance:</h5>
                <p class="text-gray-700 text-sm leading-relaxed">${interaction.clinical_significance}</p>
            </div>
            
            <div class="grid md:grid-cols-2 gap-4">
                <div class="bg-blue-50 rounded-lg p-4">
                    <h5 class="font-semibold text-blue-800 mb-2">💡 Recommendation:</h5>
                    <p class="text-blue-700 text-sm">${interaction.recommendation}</p>
                </div>
                <div class="bg-orange-50 rounded-lg p-4">
                    <h5 class="font-semibold text-orange-800 mb-2">⚠️ Monitoring:</h5>
                    <p class="text-orange-700 text-sm">${interaction.monitoring}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function updateSafetyScore(aiAnalysis) {
    const safetyScore = document.getElementById('safetyScore');
    const safetyBar = document.getElementById('safetyBar');
    
    const score = aiAnalysis.safety_score;
    
    safetyScore.textContent = score;
    safetyBar.style.width = score + '%';
    safetyBar.className = score > 70 ? 'bg-green-500 h-3 rounded-full' : 
                         score > 50 ? 'bg-yellow-500 h-3 rounded-full' : 
                         'bg-red-500 h-3 rounded-full';
}

function downloadPDF() {
    if (window.currentReportUrl) {
        window.open(window.currentReportUrl, '_blank');
    } else {
        alert('⚠️ Please run the analysis first to generate a PDF report.');
    }
}

function shareWithDoctor() {
    if (window.currentReportUrl) {
        const message = `MedGuide Drug Interaction Report\n\nView Report: ${window.currentReportUrl}\nVerify: ${window.currentVerifyUrl}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'MedGuide Report',
                text: message
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(message).then(() => {
                alert('✅ Report link copied to clipboard!\n\nYou can now share it with your healthcare provider.');
            });
        }
    } else {
        alert('⚠️ Please run the analysis first.');
    }
}

function setReminders() {
    alert('⏰ Medication Reminders\n\nThis feature would:\n• Set up daily medication reminders\n• Track adherence\n• Send refill notifications');
}

function notifyProvider() {
    if (window.currentReportUrl) {
        alert('📧 Provider Notification\n\nYour report has been prepared for sharing:\n\n' + window.currentReportUrl);
    } else {
        alert('⚠️ Please run the analysis first.');
    }
}

function scheduleConsultation() {
    alert('📅 Schedule Consultation\n\nThis would connect you with:\n• Your primary care physician\n• A clinical pharmacist\n• Telehealth consultation');
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
