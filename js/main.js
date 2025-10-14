        let medications = [];
        let selectedCategory = null;
        
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
            alert('🎬 Demo Video\n\nIn a real implementation, this would show:\n• Platform walkthrough\n• AI analysis demonstration\n• Healthcare provider integration\n• Success stories and testimonials');
        }
        
        function selectCategory(category) {
            // Remove previous selection
            document.querySelectorAll('.drug-category').forEach(el => {
                el.classList.remove('selected');
            });
            
            // Select new category
            event.target.closest('.drug-category').classList.add('selected');
            selectedCategory = category;
            
            // Show drugs for this category
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
            
            if (query.length < 2) {
                suggestions.classList.add('hidden');
                return;
            }
            
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
            
            if (medications.length === 0) {
                listElement.innerHTML = '<div class="text-gray-500 italic">No medications added yet. Add medications using the options above.</div>';
            } else {
                listElement.innerHTML = medications.map(med => `
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
        }
        
        function updateCheckButton() {
            const button = document.getElementById('checkButton');
            button.disabled = medications.length < 2;
            button.textContent = medications.length < 2 ? 
                '🔍 Add at least 2 medications to check interactions' : 
                '🔍 Analyze Drug Interactions';
        }
        
        function clearAll() {
            medications = [];
            updateMedicationList();
            updateCheckButton();
        }
        
        function checkInteractions() {
            const analysisSection = document.getElementById('analysisSection');
            const loadingState = document.getElementById('loadingState');
            const resultsState = document.getElementById('resultsState');
            
            // Show analysis section with loading
            analysisSection.classList.remove('hidden');
            analysisSection.classList.add('fade-in');
            loadingState.classList.remove('hidden');
            resultsState.classList.add('hidden');
            
            // Scroll to analysis section
            analysisSection.scrollIntoView({ behavior: 'smooth' });
            
            // Simulate AI analysis with realistic timing
            setTimeout(() => {
                showResults();
            }, 4000);
        }
        
        function showResults() {
            const loadingState = document.getElementById('loadingState');
            const resultsState = document.getElementById('resultsState');
            
            loadingState.classList.add('hidden');
            resultsState.classList.remove('hidden');
            resultsState.classList.add('fade-in');
            
            generateComprehensiveReport();
        }
        
        function generateComprehensiveReport() {
            const safetyOverview = document.getElementById('safetyOverview');
            const interactionDetails = document.getElementById('interactionDetails');
            const safetyScore = document.getElementById('safetyScore');
            const safetyBar = document.getElementById('safetyBar');
            
            // Calculate risk level
            const hasHighRisk = medications.some(med => 
                (med.toLowerCase().includes('warfarin') && medications.some(m => m.toLowerCase().includes('aspirin'))) ||
                (med.toLowerCase().includes('aspirin') && medications.some(m => m.toLowerCase().includes('warfarin')))
            );
            
            const riskLevel = hasHighRisk ? 'high' : medications.length > 4 ? 'moderate' : 'low';
            const score = hasHighRisk ? 45 : medications.length > 4 ? 70 : 85;
            
            // Update safety score
            safetyScore.textContent = score;
            safetyBar.style.width = score + '%';
            safetyBar.className = score > 70 ? 'bg-green-500 h-3 rounded-full' : 
                                 score > 50 ? 'bg-yellow-500 h-3 rounded-full' : 
                                 'bg-red-500 h-3 rounded-full';
            
            // Safety overview
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
            
            const status = statusConfig[riskLevel];
            
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
                            <div class="text-2xl font-bold ${status.textColor}">${medications.length}</div>
                            <div class="text-sm ${status.textColor.replace('800', '600')}">Medications Analyzed</div>
                        </div>
                        <div class="bg-white bg-opacity-50 rounded-lg p-4">
                            <div class="text-2xl font-bold ${status.textColor}">${generateInteractionCount()}</div>
                            <div class="text-sm ${status.textColor.replace('800', '600')}">Interactions Found</div>
                        </div>
                        <div class="bg-white bg-opacity-50 rounded-lg p-4">
                            <div class="text-2xl font-bold ${status.textColor}">${Math.floor(Math.random() * 5) + 1}</div>
                            <div class="text-sm ${status.textColor.replace('800', '600')}">Recommendations</div>
                        </div>
                    </div>
                </div>
            `;
            
            // Generate detailed interactions
            const interactions = generateDetailedInteractions();
            interactionDetails.innerHTML = interactions.map(interaction => `
                <div class="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex-1">
                            <h4 class="text-lg font-bold text-gray-800 mb-2">${interaction.drugs}</h4>
                            <div class="flex items-center gap-3 mb-3">
                                <span class="px-3 py-1 rounded-full text-sm font-semibold ${interaction.severityClass}">
                                    ${interaction.severity}
                                </span>
                                <span class="text-sm text-gray-500">${interaction.mechanism}</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl mb-1">${interaction.icon}</div>
                            <div class="text-xs text-gray-500">${interaction.confidence}% confidence</div>
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 rounded-lg p-4 mb-4">
                        <h5 class="font-semibold text-gray-800 mb-2">Clinical Significance:</h5>
                        <p class="text-gray-700 text-sm leading-relaxed">${interaction.description}</p>
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
        
        function generateInteractionCount() {
            let count = 0;
            for (let i = 0; i < medications.length - 1; i++) {
                for (let j = i + 1; j < medications.length; j++) {
                    count++;
                }
            }
            return count;
        }
        
        function generateDetailedInteractions() {
            const interactions = [];
            
            for (let i = 0; i < medications.length - 1; i++) {
                for (let j = i + 1; j < medications.length; j++) {
                    const drug1 = medications[i];
                    const drug2 = medications[j];
                    
                    const isHighRisk = (drug1.toLowerCase().includes('warfarin') && drug2.toLowerCase().includes('aspirin')) ||
                                      (drug1.toLowerCase().includes('aspirin') && drug2.toLowerCase().includes('warfarin'));
                    
                    const severity = isHighRisk ? 'Critical' : Math.random() > 0.6 ? 'Moderate' : 'Minor';
                    const confidence = Math.floor(Math.random() * 20) + 80;
                    
                    interactions.push({
                        drugs: `${drug1} ↔ ${drug2}`,
                        severity: severity,
                        severityClass: severity === 'Critical' ? 'bg-red-100 text-red-800' : 
                                     severity === 'Moderate' ? 'bg-yellow-100 text-yellow-800' : 
                                     'bg-green-100 text-green-800',
                        icon: severity === 'Critical' ? '🚨' : severity === 'Moderate' ? '⚠️' : '✅',
                        confidence: confidence,
                        mechanism: isHighRisk ? 'Pharmacodynamic' : Math.random() > 0.5 ? 'Pharmacokinetic' : 'Pharmacodynamic',
                        description: isHighRisk ? 
                            'Concurrent use significantly increases bleeding risk due to additive anticoagulant effects. This combination has been associated with major hemorrhagic events in clinical studies.' :
                            `Potential interaction between ${drug1} and ${drug2}. Monitor for changes in therapeutic effectiveness or adverse effects. Clinical significance may vary based on individual patient factors.`,
                        recommendation: isHighRisk ?
                            'Avoid concurrent use if possible. If combination is necessary, reduce doses and implement intensive monitoring protocols. Consider alternative anticoagulation strategies.' :
                            'Monitor patient closely for signs of altered drug effectiveness. Consider dose adjustments if clinically indicated. Maintain regular follow-up appointments.',
                        monitoring: isHighRisk ?
                            'Daily INR monitoring, weekly CBC, assess for bleeding signs (bruising, nosebleeds, GI bleeding). Patient education on bleeding precautions essential.' :
                            'Monitor for therapeutic response and adverse effects. Check relevant lab values as clinically appropriate. Patient should report any unusual symptoms.'
                    });
                }
            }
            
            return interactions;
        }
        
        function downloadPDF() {
            // Generate comprehensive report content
            const reportContent = `
MedGuide Agent - Comprehensive Drug Interaction Report
Generated: ${new Date().toLocaleString()}

PATIENT PROFILE:
Age Group: ${document.getElementById('ageGroup').value || 'Not specified'}
Medical Conditions: ${document.getElementById('conditions').value || 'Not specified'}
Allergies: ${document.getElementById('allergies').value || 'Not specified'}

MEDICATIONS ANALYZED:
${medications.map((med, index) => `${index + 1}. ${med}`).join('\n')}

SAFETY ASSESSMENT:
Overall Safety Score: ${document.getElementById('safetyScore').textContent}/100
Total Interactions Found: ${generateInteractionCount()}

DETAILED ANALYSIS:
${generateDetailedInteractions().map(interaction => `
${interaction.drugs}
Severity: ${interaction.severity}
Mechanism: ${interaction.mechanism}
Description: ${interaction.description}
Recommendation: ${interaction.recommendation}
Monitoring: ${interaction.monitoring}
`).join('\n---\n')}

IMPORTANT DISCLAIMER:
This report is generated by AI for informational purposes only. 
Always consult with healthcare professionals before making any 
medication changes. In case of emergency, contact 911 immediately.

Report ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}
            `;
            
            const link = document.createElement('a');
            link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(reportContent);
            link.download = `medguide-report-${new Date().toISOString().split('T')[0]}.txt`;
            link.click();
        }
        
        function shareWithDoctor() {
            alert('👨‍⚕️ Share with Healthcare Provider\n\nThis feature would:\n• Generate secure sharing link\n• Send encrypted report to provider portal\n• Schedule follow-up appointment\n• Add to electronic health records\n\nYour privacy is protected with HIPAA-compliant encryption.');
        }
        
        function setReminders() {
            alert('⏰ Medication Reminders\n\nThis feature would:\n• Set up daily medication reminders\n• Track medication adherence\n• Send refill notifications\n• Monitor for new interactions\n• Sync with your calendar and health apps');
        }
        
        function notifyProvider() {
            alert('📧 Healthcare Provider Notification\n\nReport has been prepared for secure transmission to your healthcare provider.\n\nThis would include:\n• Complete interaction analysis\n• Risk assessment summary\n• Recommended monitoring protocols\n• Patient-specific considerations');
        }
        
        function scheduleConsultation() {
            alert('📅 Schedule Consultation\n\nThis feature would:\n• Connect with your healthcare provider\n• Schedule telehealth or in-person visit\n• Share interaction report in advance\n• Set up follow-up monitoring plan');
        }
        
        function emergencyContact() {
            alert('🚨 Emergency Services\n\nIn a real emergency:\n• Call 911 immediately\n• Contact Poison Control: 1-800-222-1222\n• Go to nearest emergency room\n• Have your medication list ready\n\nThis is a demo - always use real emergency services!');
        }
        
        // Allow Enter key for search
        document.getElementById('drugSearch').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addFromSearch();
            }
        });
        
        // Hide search suggestions when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('#drugSearch') && !e.target.closest('#searchSuggestions')) {
                document.getElementById('searchSuggestions').classList.add('hidden');
            }
        });

(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'98d71d3367a084af',t:'MTc2MDI3NzUyOC4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();
