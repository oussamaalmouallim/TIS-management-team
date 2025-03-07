document.addEventListener('DOMContentLoaded', () => {
    const { createApp, ref, computed, onMounted } = Vue;

    createApp({
        setup() {
            const employees = ref([]);
            const allHistory = ref([]);
            const selectedEmployeeId = ref(null);
            const filterMonth = ref('all');
            const filterDay = ref('all');
            const addressCache = ref({});

            // Load data from localStorage
            onMounted(() => {
                const savedEmployees = localStorage.getItem('employeeAttendance');
                if (savedEmployees) {
                    employees.value = JSON.parse(savedEmployees);
                    
                    // Load address cache
                    const savedAddressCache = localStorage.getItem('addressCache');
                    if (savedAddressCache) {
                        addressCache.value = JSON.parse(savedAddressCache);
                    }
                    
                    // Extract all history records
                    const history = [];
                    let idCounter = 1;
                    
                    employees.value.forEach(employee => {
                        if (employee.history && employee.history.length > 0) {
                            employee.history.forEach(record => {
                                history.push({
                                    id: idCounter++,
                                    employeeId: employee.id,
                                    date: record.date,
                                    checkIn: record.checkIn,
                                    checkOut: record.checkOut,
                                    location: record.location
                                });
                            });
                        }
                    });
                    
                    allHistory.value = history;
                }
            });

            const filteredHistory = computed(() => {
                let result = [...allHistory.value];
                
                // Filter by employee if selected
                if (selectedEmployeeId.value) {
                    result = result.filter(record => record.employeeId === selectedEmployeeId.value);
                }
                
                // Filter by month if selected
                if (filterMonth.value !== 'all') {
                    const monthNumber = parseInt(filterMonth.value);
                    result = result.filter(record => {
                        const recordDate = new Date(record.checkIn);
                        return recordDate.getMonth() + 1 === monthNumber;
                    });
                }
                
                // Filter by day if selected
                if (filterDay.value !== 'all') {
                    const dayNumber = parseInt(filterDay.value);
                    result = result.filter(record => {
                        const recordDate = new Date(record.checkIn);
                        return recordDate.getDate() === dayNumber;
                    });
                }
                
                // Sort by date (newest first)
                return result.sort((a, b) => {
                    return new Date(b.checkIn) - new Date(a.checkIn);
                });
            });

            const selectEmployee = (employeeId) => {
                if (selectedEmployeeId.value === employeeId) {
                    selectedEmployeeId.value = null; // Deselect if already selected
                } else {
                    selectedEmployeeId.value = employeeId;
                }
            };

            const getEmployeeName = (employeeId) => {
                const employee = employees.value.find(emp => emp.id === employeeId);
                return employee ? employee.name : 'Inconnu';
            };

            const getEmployeePhoto = (employeeId) => {
                const employee = employees.value.find(emp => emp.id === employeeId);
                return employee ? employee.photo : null;
            };

            const getInitials = (name) => {
                if (!name) return '';
                return name.split(' ')
                    .map(word => word.charAt(0))
                    .join('')
                    .toUpperCase();
            };

            const formatTime = (timestamp) => {
                if (!timestamp) return '';
                const date = new Date(timestamp);
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            };

            const calculateDuration = (checkIn, checkOut) => {
                if (!checkIn || !checkOut) return '-';
                
                const diffMs = checkOut - checkIn;
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                
                return `${diffHrs}h ${diffMins}m`;
            };

            const deleteRecord = (recordId) => {
                if (confirm('Êtes-vous sûr de vouloir supprimer cet enregistrement ?')) {
                    // Remove from allHistory
                    const record = allHistory.value.find(rec => rec.id === recordId);
                    if (!record) return;
                    
                    allHistory.value = allHistory.value.filter(rec => rec.id !== recordId);
                    
                    // Remove from employee history
                    const employee = employees.value.find(emp => emp.id === record.employeeId);
                    if (employee && employee.history) {
                        employee.history = employee.history.filter(rec => 
                            !(rec.date === record.date && rec.checkIn === record.checkIn)
                        );
                        
                        // Save updated data
                        localStorage.setItem('employeeAttendance', JSON.stringify(employees.value));
                    }
                }
            };

            const deleteAllHistory = () => {
                if (confirm('Êtes-vous sûr de vouloir supprimer tout l\'historique ? Cette action est irréversible.')) {
                    allHistory.value = [];
                    
                    // Clear history for all employees
                    employees.value.forEach(employee => {
                        employee.history = [];
                    });
                    
                    // Save updated data
                    localStorage.setItem('employeeAttendance', JSON.stringify(employees.value));
                }
            };

            const getAddressFromLocation = (location) => {
                if (!location) return 'Adresse non disponible';
                
                if (location.address) {
                    return location.address;
                }
                
                // Try to get from address cache
                if (location.lat && location.lng) {
                    const cacheKey = `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
                    const savedAddressCache = localStorage.getItem('addressCache');
                    if (savedAddressCache) {
                        try {
                            const addressCache = JSON.parse(savedAddressCache);
                            if (addressCache[cacheKey]) {
                                // Update the location object with the address from cache for future use
                                location.address = addressCache[cacheKey];
                                
                                // Find the employee and update their history record with the address
                                const employee = employees.value.find(emp => {
                                    return emp.history && emp.history.some(h => 
                                        h.location && h.location.lat === location.lat && h.location.lng === location.lng);
                                });
                                
                                if (employee) {
                                    // Update the matching history record with the address
                                    employee.history.forEach(record => {
                                        if (record.location && 
                                            record.location.lat === location.lat && 
                                            record.location.lng === location.lng) {
                                            record.location.address = addressCache[cacheKey];
                                        }
                                    });
                                    
                                    // Save the updated employee data
                                    localStorage.setItem('employeeAttendance', JSON.stringify(employees.value));
                                }
                                
                                return addressCache[cacheKey];
                            }
                        } catch (e) {
                            console.error('Error parsing address cache:', e);
                        }
                    }
                    
                    // If we don't have an address in cache, return coordinates as fallback
                    return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
                }
                
                return 'Adresse non disponible';
            };

            const showAddressPopup = (location) => {
                if (!location) return;
                
                // Create and animate custom popup
                const popup = document.createElement('div');
                popup.className = 'fixed inset-0 flex items-center justify-center z-50';
                popup.style.backgroundColor = 'rgba(0, 0, 0, 0)';
                popup.style.transition = 'background-color 0.3s ease';
                
                let address = 'Adresse non disponible';
                
                if (location.address) {
                    address = location.address;
                } else if (location.lat && location.lng) {
                    // Try to get from address cache
                    const cacheKey = `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
                    
                    if (addressCache.value[cacheKey]) {
                        address = addressCache.value[cacheKey];
                        
                        // Update the location object with the address from cache
                        location.address = address;
                        
                        // Update all history records with this location
                        updateHistoryWithAddress(location, address);
                    } else {
                        // Fetch address if not in cache
                        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&accept-language=fr`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error('Network response was not ok');
                                }
                                return response.json();
                            })
                            .then(data => {
                                const newAddress = data.display_name || 'Adresse non disponible';
                                
                                // Update cache
                                addressCache.value[cacheKey] = newAddress;
                                localStorage.setItem('addressCache', JSON.stringify(addressCache.value));
                                
                                // Update location and all history with this location
                                location.address = newAddress;
                                updateHistoryWithAddress(location, newAddress);
                                
                                // Show the fetched address
                                alert(newAddress);
                            })
                            .catch(error => {
                                console.error('Error fetching address:', error);
                                alert(address);
                            });
                        return; // Return early as we'll show the address after fetching
                    }
                }
                
                popup.innerHTML = `
                    <div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl transform scale-0 transition-transform duration-300">
                        <h3 class="text-lg font-semibold mb-4">Adresse</h3>
                        <p>${address}</p>
                        <button class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Fermer</button>
                    </div>
                `;
                
                document.body.appendChild(popup);
                
                // Add fade-in effect
                setTimeout(() => {
                    popup.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    popup.querySelector('div').style.transform = 'scale(1)';
                }, 10);
                
                // Add close functionality
                popup.addEventListener('click', () => {
                    popup.style.backgroundColor = 'rgba(0, 0, 0, 0)';
                    popup.querySelector('div').style.transform = 'scale(0)';
                    setTimeout(() => {
                        document.body.removeChild(popup);
                    }, 300);
                });
                
                popup.querySelector('button').addEventListener('click', (e) => {
                    e.stopPropagation();
                    popup.style.backgroundColor = 'rgba(0, 0, 0, 0)';
                    popup.querySelector('div').style.transform = 'scale(0)';
                    setTimeout(() => {
                        document.body.removeChild(popup);
                    }, 300);
                });
                
                popup.querySelector('div').addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            };
            
            const updateHistoryWithAddress = (location, address) => {
                if (!location || !location.lat || !location.lng) return;
                
                // Find all employees with history records at this location
                employees.value.forEach(employee => {
                    if (employee.history) {
                        let updated = false;
                        
                        employee.history.forEach(record => {
                            if (record.location && 
                                record.location.lat === location.lat && 
                                record.location.lng === location.lng) {
                                record.location.address = address;
                                updated = true;
                            }
                        });
                        
                        if (updated) {
                            // Update corresponding records in allHistory
                            allHistory.value.forEach(historyRecord => {
                                if (historyRecord.employeeId === employee.id && 
                                    historyRecord.location && 
                                    historyRecord.location.lat === location.lat && 
                                    historyRecord.location.lng === location.lng) {
                                    historyRecord.location.address = address;
                                }
                            });
                        }
                    }
                });
                
                // Save the updated employee data
                localStorage.setItem('employeeAttendance', JSON.stringify(employees.value));
            };

            return {
                employees,
                allHistory,
                selectedEmployeeId,
                filterMonth,
                filterDay,
                filteredHistory,
                selectEmployee,
                getEmployeeName,
                getEmployeePhoto,
                getInitials,
                formatTime,
                calculateDuration,
                deleteRecord,
                deleteAllHistory,
                showAddressPopup,
                updateHistoryWithAddress,
                getAddressFromLocation,
                addressCache
            };
        }
    }).mount('#app');
});