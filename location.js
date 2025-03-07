document.addEventListener('DOMContentLoaded', () => {
    const { createApp, ref, computed, onMounted } = Vue;

    createApp({
        setup() {
            const employees = ref([]);
            const locationData = ref([]);
            const showPopup = ref(false);
            const selectedEmployee = ref(null);
            const fullAddress = ref('');
            const addressCache = ref({}); 

            onMounted(() => {
                const savedEmployees = localStorage.getItem('employeeAttendance');
                if (savedEmployees) {
                    employees.value = JSON.parse(savedEmployees);
                    
                    const savedAddressCache = localStorage.getItem('addressCache');
                    if (savedAddressCache) {
                        addressCache.value = JSON.parse(savedAddressCache);
                    }
                    
                    employees.value.forEach(employee => {
                        if (employee.isPresent && !employee.location) {
                            if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition(
                                    (position) => {
                                        employee.location = {
                                            lat: position.coords.latitude,
                                            lng: position.coords.longitude,
                                            accuracy: position.coords.accuracy,
                                            timestamp: position.timestamp
                                        };
                                    },
                                    () => {
                                        employee.location = generateRandomLocation();
                                    }
                                );
                            } else {
                                employee.location = generateRandomLocation();
                            }
                        }
                    });
                    
                    localStorage.setItem('employeeAttendance', JSON.stringify(employees.value));
                    
                    getLocationDetails();
                }
            });

            const getLocationDetails = async () => {
                const fetchPromises = [];
                
                for (const employee of presentEmployees.value) {
                    if (employee.location) {
                        const cacheKey = `${employee.location.lat.toFixed(6)},${employee.location.lng.toFixed(6)}`;
                        
                        if (addressCache.value[cacheKey]) {
                            // Use address from cache
                            locationData.value.push({
                                id: employee.id,
                                name: employee.name,
                                photo: employee.photo,
                                checkInTime: employee.checkInTime,
                                address: addressCache.value[cacheKey],
                                coordinates: `${employee.location.lat.toFixed(6)}, ${employee.location.lng.toFixed(6)}`,
                                accuracy: employee.location.accuracy ? `${Math.round(employee.location.accuracy)}m` : 'N/A'
                            });
                            
                            // Store the address in the employee location object for history
                            if (employee.location && !employee.location.address) {
                                employee.location.address = addressCache.value[cacheKey];
                                
                                // If employee has history entries with this location, update them too
                                if (employee.history) {
                                    employee.history.forEach(record => {
                                        if (record.location && 
                                            record.location.lat === employee.location.lat && 
                                            record.location.lng === employee.location.lng &&
                                            !record.location.address) {
                                            record.location.address = addressCache.value[cacheKey];
                                        }
                                    });
                                }
                                
                                localStorage.setItem('employeeAttendance', JSON.stringify(employees.value));
                            }
                        } else {
                            fetchPromises.push(
                                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${employee.location.lat}&lon=${employee.location.lng}&accept-language=fr`)
                                .then(response => {
                                    if (!response.ok) {
                                        throw new Error('Network response was not ok');
                                    }
                                    return response.json();
                                })
                                .then(data => {
                                    const address = data.display_name || 'Adresse non disponible';
                                    
                                    // Add to cache
                                    addressCache.value[cacheKey] = address;
                                    localStorage.setItem('addressCache', JSON.stringify(addressCache.value));
                                    
                                    // Store in employee location for history
                                    if (employee.location) {
                                        employee.location.address = address;
                                        
                                        // If employee has history entries with this location, update them too
                                        if (employee.history) {
                                            employee.history.forEach(record => {
                                                if (record.location && 
                                                    record.location.lat === employee.location.lat && 
                                                    record.location.lng === employee.location.lng) {
                                                    record.location.address = address;
                                                }
                                            });
                                        }
                                        
                                        localStorage.setItem('employeeAttendance', JSON.stringify(employees.value));
                                    }
                                    
                                    locationData.value.push({
                                        id: employee.id,
                                        name: employee.name,
                                        photo: employee.photo,
                                        checkInTime: employee.checkInTime,
                                        address: address,
                                        coordinates: `${employee.location.lat.toFixed(6)}, ${employee.location.lng.toFixed(6)}`,
                                        accuracy: employee.location.accuracy ? `${Math.round(employee.location.accuracy)}m` : 'N/A'
                                    });
                                })
                                .catch((error) => {
                                    console.error('Error fetching address:', error);
                                    locationData.value.push({
                                        id: employee.id,
                                        name: employee.name,
                                        photo: employee.photo,
                                        checkInTime: employee.checkInTime,
                                        address: 'Adresse non disponible',
                                        coordinates: `${employee.location.lat.toFixed(6)}, ${employee.location.lng.toFixed(6)}`,
                                        accuracy: employee.location.accuracy ? `${Math.round(employee.location.accuracy)}m` : 'N/A'
                                    });
                                })
                            );
                        }
                    }
                }
                
                if (fetchPromises.length > 0) {
                    await Promise.allSettled(fetchPromises);
                }
            };

            const generateRandomLocation = () => {
                const baseLatitude = 48.8566;
                const baseLongitude = 2.3522;
                const randomLat = baseLatitude + (Math.random() - 0.5) * 0.05;
                const randomLng = baseLongitude + (Math.random() - 0.5) * 0.05;
                return { 
                    lat: randomLat, 
                    lng: randomLng,
                    accuracy: Math.floor(Math.random() * 50) + 10, 
                    timestamp: Date.now()
                };
            };

            const presentEmployees = computed(() => {
                return employees.value.filter(emp => emp.isPresent);
            });

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

            const formatDate = (timestamp) => {
                if (!timestamp) return '';
                const date = new Date(timestamp);
                return date.toLocaleDateString('fr-FR');
            };

            const showAddressPopup = (employee) => {
                selectedEmployee.value = employee;
                if (employee.location && employee.location.address) {
                    fullAddress.value = employee.location.address;
                } else {
                    const locationInfo = locationData.value.find(l => l.id === employee.id);
                    fullAddress.value = locationInfo ? locationInfo.address : 'Adresse non disponible';
                }
                showPopup.value = true;
                
                // Add animation for popup
                setTimeout(() => {
                    const popupContent = document.querySelector('.bg-white.rounded-lg');
                    if (popupContent) {
                        popupContent.style.animation = 'zoomIn 0.3s ease-out forwards';
                    }
                }, 10);
            };

            const closePopup = () => {
                // Add closing animation
                const popupContent = document.querySelector('.bg-white.rounded-lg');
                if (popupContent) {
                    popupContent.style.animation = 'zoomOut 0.3s ease-in forwards';
                    setTimeout(() => {
                        showPopup.value = false;
                        selectedEmployee.value = null;
                    }, 300);
                } else {
                    showPopup.value = false;
                    selectedEmployee.value = null;
                }
            };

            return {
                employees,
                presentEmployees,
                locationData,
                getInitials,
                formatTime,
                formatDate,
                showPopup,
                selectedEmployee,
                fullAddress,
                showAddressPopup,
                closePopup
            };
        }
    }).mount('#app');
});