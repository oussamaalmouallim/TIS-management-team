document.addEventListener('DOMContentLoaded', () => {
    const { createApp, ref, computed, onMounted } = Vue;

    createApp({
        setup() {
            const employees = ref([]);
            const locationData = ref([]);
            const showPopup = ref(false);
            const selectedEmployee = ref(null);
            const fullAddress = ref('');

            onMounted(() => {
                const savedEmployees = localStorage.getItem('employeeAttendance');
                if (savedEmployees) {
                    employees.value = JSON.parse(savedEmployees);
                    
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
                for (const employee of presentEmployees.value) {
                    if (employee.location) {
                        try {
                            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${employee.location.lat}&lon=${employee.location.lng}`);
                            const data = await response.json();
                            
                            locationData.value.push({
                                id: employee.id,
                                name: employee.name,
                                photo: employee.photo,
                                checkInTime: employee.checkInTime,
                                address: data.display_name || 'Adresse non disponible',
                                coordinates: `${employee.location.lat.toFixed(6)}, ${employee.location.lng.toFixed(6)}`,
                                accuracy: employee.location.accuracy ? `${Math.round(employee.location.accuracy)}m` : 'N/A'
                            });
                        } catch (error) {
                            locationData.value.push({
                                id: employee.id,
                                name: employee.name,
                                photo: employee.photo,
                                checkInTime: employee.checkInTime,
                                address: 'Adresse non disponible',
                                coordinates: `${employee.location.lat.toFixed(6)}, ${employee.location.lng.toFixed(6)}`,
                                accuracy: employee.location.accuracy ? `${Math.round(employee.location.accuracy)}m` : 'N/A'
                            });
                        }
                    }
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
            };

            const closePopup = () => {
                showPopup.value = false;
                selectedEmployee.value = null;
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
