document.addEventListener('DOMContentLoaded', () => {
    const { createApp, ref, computed, onMounted } = Vue;

    createApp({
        setup() {
            const employees = ref([
                { 
                    id: 1, 
                    name: 'Thomas Dubois', 
                    position: 'Développeur', 
                    isPresent: false, 
                    checkInTime: null, 
                    checkOutTime: null,
                    photo: 'https://randomuser.me/api/portraits/men/32.jpg' 
                },
                { 
                    id: 2, 
                    name: 'Marie Laurent', 
                    position: 'Designer UX', 
                    isPresent: false, 
                    checkInTime: null, 
                    checkOutTime: null,
                    photo: 'https://randomuser.me/api/portraits/women/44.jpg' 
                },
                { 
                    id: 3, 
                    name: 'Jean Petit', 
                    position: 'Chef de projet', 
                    isPresent: false, 
                    checkInTime: null, 
                    checkOutTime: null,
                    photo: 'https://randomuser.me/api/portraits/men/62.jpg' 
                },
                { 
                    id: 4, 
                    name: 'Sophie Martin', 
                    position: 'Marketing', 
                    isPresent: false, 
                    checkInTime: null, 
                    checkOutTime: null,
                    photo: 'https://randomuser.me/api/portraits/women/58.jpg' 
                },
                { 
                    id: 5, 
                    name: 'Lucas Bernard', 
                    position: 'Développeur Front-end', 
                    isPresent: false, 
                    checkInTime: null, 
                    checkOutTime: null,
                    photo: 'https://randomuser.me/api/portraits/men/76.jpg' 
                },
                { 
                    id: 6, 
                    name: 'Emma Moreau', 
                    position: 'Comptable', 
                    isPresent: false, 
                    checkInTime: null, 
                    checkOutTime: null,
                    photo: 'https://randomuser.me/api/portraits/women/33.jpg' 
                },
                { 
                    id: 7, 
                    name: 'Antoine Richard', 
                    position: 'Commercial', 
                    isPresent: false, 
                    checkInTime: null, 
                    checkOutTime: null,
                    photo: 'https://randomuser.me/api/portraits/men/41.jpg' 
                },
                { 
                    id: 8, 
                    name: 'Julie Leroy', 
                    position: 'Ressources Humaines', 
                    isPresent: false, 
                    checkInTime: null, 
                    checkOutTime: null,
                    photo: 'https://randomuser.me/api/portraits/women/17.jpg' 
                },
            ]);

            const currentTime = ref('');
            const currentDate = ref('');
            const filter = ref('all');
            const showNotification = ref(false);
            const notificationMessage = ref('');
            const showHistoryModal = ref(false);
            const selectedEmployee = ref(null);
            const attendanceHistory = ref([]);

            // Update time every second
            onMounted(() => {
                updateDateTime();
                setInterval(updateDateTime, 1000);
                
                // Load data from localStorage if available
                const savedEmployees = localStorage.getItem('employeeAttendance');
                if (savedEmployees) {
                    employees.value = JSON.parse(savedEmployees);
                }
                
                // Check for employees who haven't checked out from previous day
                const today = new Date().toLocaleDateString();
                employees.value.forEach(employee => {
                    if (employee.isPresent && employee.checkInTime) {
                        const checkInDate = new Date(employee.checkInTime).toLocaleDateString();
                        if (checkInDate !== today) {
                            // Auto checkout at midnight
                            employee.isPresent = false;
                            employee.checkOutTime = new Date(today + ' 00:00:00').getTime();
                            employee.checkInTime = null;
                            employee.location = null;
                        }
                    }
                });
                
                // Save updated data
                saveToLocalStorage();
            });

            const updateDateTime = () => {
                const now = new Date();
                currentTime.value = now.toLocaleTimeString();
                currentDate.value = now.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            };

            const generateRandomLocation = () => {
                // Generate random location around Paris (for demo purposes)
                const baseLatitude = 48.8566;
                const baseLongitude = 2.3522;
                const randomLat = baseLatitude + (Math.random() - 0.5) * 0.05;
                const randomLng = baseLongitude + (Math.random() - 0.5) * 0.05;
                return { 
                    lat: randomLat, 
                    lng: randomLng, 
                    accuracy: Math.floor(Math.random() * 50) + 10, // Random accuracy between 10-60m
                    timestamp: Date.now(),
                    // Will be populated with address data
                    address: null
                };
            };

            const togglePresence = (employee) => {
                if (!employee.isPresent) {
                    // Check in
                    employee.isPresent = true;
                    employee.checkInTime = Date.now();
                    employee.checkOutTime = null;
                    showNotificationMessage(`${employee.name} a pointé son arrivée à ${formatTime(employee.checkInTime)}`);
                    
                    // Try to get actual geolocation
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            (position) => {
                                employee.location = {
                                    lat: position.coords.latitude,
                                    lng: position.coords.longitude,
                                    accuracy: position.coords.accuracy,
                                    timestamp: position.timestamp,
                                    address: null // Will be populated later
                                };
                                
                                // Try to get address using reverse geocoding
                                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`)
                                    .then(response => response.json())
                                    .then(data => {
                                        employee.location.address = data.display_name;
                                        saveToLocalStorage();
                                    })
                                    .catch(() => {
                                        // If ge!coding fails, continue without address
                                        saveToLocalStorage();
                                    });
                            },
                            () => {
                                // Fallback if geolocation fails
                                employee.location = generateRandomLocation();
                                saveToLocalStorage();
                            }
                        );
                    } else {
                        // Fallback for browsers without geolocation
                        employee.location = generateRandomLocation();
                        saveToLocalStorage();
                    }
                    
                    // Add to history
                    if (!employee.history) employee.history = [];
                    employee.history.push({
                        date: new Date().toLocaleDateString('fr-FR'),
                        checkIn: employee.checkInTime,
                        checkOut: null,
                        location: employee.location
                    });
                } else {
                    // Check out
                    employee.isPresent = false;
                    employee.checkOutTime = Date.now();
                    showNotificationMessage(`${employee.name} a pointé son départ à ${formatTime(employee.checkOutTime)}`);
                    
                    // Update history
                    if (employee.history && employee.history.length > 0) {
                        const lastRecord = employee.history[employee.history.length - 1];
                        if (lastRecord && lastRecord.checkIn && !lastRecord.checkOut) {
                            lastRecord.checkOut = employee.checkOutTime;
                        }
                    }
                    
                    employee.checkInTime = null;
                    employee.location = null;
                }
                saveToLocalStorage();
            };

            const saveToLocalStorage = () => {
                localStorage.setItem('employeeAttendance', JSON.stringify(employees.value));
            };

            const formatTime = (timestamp) => {
                if (!timestamp) return '';
                const date = new Date(timestamp);
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            };

            const showNotificationMessage = (message) => {
                notificationMessage.value = message;
                showNotification.value = true;
                setTimeout(() => {
                    showNotification.value = false;
                }, 5000);
            };

            const dismissNotification = () => {
                showNotification.value = false;
            };

            const filterEmployees = (filterType) => {
                filter.value = filterType;
            };

            const filteredEmployees = computed(() => {
                if (filter.value === 'all') return employees.value;
                if (filter.value === 'present') return employees.value.filter(emp => emp.isPresent);
                if (filter.value === 'absent') return employees.value.filter(emp => !emp.isPresent);
                return employees.value;
            });

            const presentCount = computed(() => {
                return employees.value.filter(emp => emp.isPresent).length;
            });

            const viewHistory = (employee, event) => {
                event.stopPropagation();
                selectedEmployee.value = employee;
                
                // Sort history by date (newest first)
                if (employee.history) {
                    attendanceHistory.value = [...employee.history].sort((a, b) => {
                        return new Date(b.checkIn) - new Date(a.checkIn);
                    });
                } else {
                    attendanceHistory.value = [];
                }
                
                showHistoryModal.value = true;
            };

            const closeHistoryModal = () => {
                showHistoryModal.value = false;
                selectedEmployee.value = null;
            };

            const formatDate = (timestamp) => {
                if (!timestamp) return '';
                const date = new Date(timestamp);
                return date.toLocaleDateString('fr-FR');
            };

            const calculateDuration = (checkIn, checkOut) => {
                if (!checkIn || !checkOut) return '-';
                
                const diffMs = checkOut - checkIn;
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                
                return `${diffHrs}h ${diffMins}m`;
            };

            return {
                employees,
                currentTime,
                currentDate,
                togglePresence,
                formatTime,
                filter,
                filterEmployees,
                filteredEmployees,
                presentCount,
                showNotification,
                notificationMessage,
                dismissNotification,
                viewHistory,
                showHistoryModal,
                selectedEmployee,
                attendanceHistory,
                closeHistoryModal,
                formatDate,
                calculateDuration
            };
        }
    }).mount('#app');
});
