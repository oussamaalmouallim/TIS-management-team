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
            const showPhotoModal = ref(false);
            const previewImage = ref(null);
            const newPhotoFile = ref(null);
            const showAddEmployeeModal = ref(false);
            const editMode = ref(false);
            const newEmployee = ref({
                id: null,
                name: '',
                position: '',
                photo: null,
                isPresent: false,
                checkInTime: null,
                checkOutTime: null,
                history: []
            });

            onMounted(() => {
                updateDateTime();
                setInterval(updateDateTime, 1000);
                
                const savedEmployees = localStorage.getItem('employeeAttendance');
                if (savedEmployees) {
                    employees.value = JSON.parse(savedEmployees);
                }
                
                const today = new Date().toLocaleDateString();
                employees.value.forEach(employee => {
                    if (employee.isPresent && employee.checkInTime) {
                        const checkInDate = new Date(employee.checkInTime).toLocaleDateString();
                        if (checkInDate !== today) {
                            employee.isPresent = false;
                            employee.checkOutTime = new Date(today + ' 00:00:00').getTime();
                            employee.checkInTime = null;
                            employee.location = null;
                        }
                    }
                });
                
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
                const baseLatitude = 48.8566;
                const baseLongitude = 2.3522;
                const randomLat = baseLatitude + (Math.random() - 0.5) * 0.05;
                const randomLng = baseLongitude + (Math.random() - 0.5) * 0.05;
                return { 
                    lat: randomLat, 
                    lng: randomLng, 
                    accuracy: Math.floor(Math.random() * 50) + 10, 
                    timestamp: Date.now(),
                    address: null
                };
            };

            const togglePresence = (employee) => {
                if (!employee.isPresent) {
                    const employeeCards = document.querySelectorAll('.employee-card');
                    employeeCards.forEach(card => {
                        if (card.textContent.includes(employee.name)) {
                            card.classList.add('animate-pulse');
                            setTimeout(() => card.classList.remove('animate-pulse'), 1000);
                        }
                    });
                    
                    employee.isPresent = true;
                    employee.checkInTime = Date.now();
                    employee.checkOutTime = null;
                    showNotificationMessage(`${employee.name} a pointé son arrivée à ${formatTime(employee.checkInTime)}`);
                    
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            (position) => {
                                employee.location = {
                                    lat: position.coords.latitude,
                                    lng: position.coords.longitude,
                                    accuracy: position.coords.accuracy,
                                    timestamp: position.timestamp,
                                    address: null 
                                };
                                
                                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=fr`)
                                    .then(response => {
                                        if (!response.ok) {
                                            throw new Error('Network response was not ok');
                                        }
                                        return response.json();
                                    })
                                    .then(data => {
                                        employee.location.address = data.display_name;
                                        
                                        const cacheKey = `${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`;
                                        let addressCache = {};
                                        const savedAddressCache = localStorage.getItem('addressCache');
                                        if (savedAddressCache) {
                                            addressCache = JSON.parse(savedAddressCache);
                                        }
                                        addressCache[cacheKey] = data.display_name;
                                        localStorage.setItem('addressCache', JSON.stringify(addressCache));
                                        
                                        if (employee.history && employee.history.length > 0) {
                                            const lastRecord = employee.history[employee.history.length - 1];
                                            if (lastRecord && lastRecord.location) {
                                                lastRecord.location.address = data.display_name;
                                            }
                                        }
                                        
                                        saveToLocalStorage();
                                    })
                                    .catch((error) => {
                                        console.error('Error fetching address:', error);
                                        saveToLocalStorage();
                                    });
                            },
                            () => {
                                employee.location = generateRandomLocation();
                                saveToLocalStorage();
                            }
                        );
                    } else {
                        employee.location = generateRandomLocation();
                        saveToLocalStorage();
                    }
                    
                    if (!employee.history) employee.history = [];
                    employee.history.push({
                        date: new Date().toLocaleDateString('fr-FR'),
                        checkIn: employee.checkInTime,
                        checkOut: null,
                        location: employee.location
                    });
                } else {
                    const employeeCards = document.querySelectorAll('.employee-card');
                    employeeCards.forEach(card => {
                        if (card.textContent.includes(employee.name)) {
                            card.classList.add('animate-pulse');
                            setTimeout(() => card.classList.remove('animate-pulse'), 1000);
                        }
                    });
                    
                    employee.isPresent = false;
                    employee.checkOutTime = Date.now();
                    showNotificationMessage(`${employee.name} a pointé son départ à ${formatTime(employee.checkOutTime)}`);
                    
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
                
                document.body.style.overflow = 'hidden';
                
                selectedEmployee.value = employee;
                
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
                const modal = document.querySelector('.history-modal');
                if (modal) {
                    modal.style.opacity = '0';
                    setTimeout(() => {
                        showHistoryModal.value = false;
                        document.body.style.overflow = '';
                        if (modal) modal.style.opacity = '1';
                    }, 300);
                } else {
                    showHistoryModal.value = false;
                    document.body.style.overflow = '';
                }
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

            const changePhoto = (employee, event) => {
                event.stopPropagation();
                selectedEmployee.value = employee;
                previewImage.value = null;
                newPhotoFile.value = null;
                showPhotoModal.value = true;
            };

            const closePhotoModal = () => {
                const modal = document.querySelector('.history-modal');
                if (modal) {
                    modal.style.opacity = '0';
                    setTimeout(() => {
                        showPhotoModal.value = false;
                        document.body.style.overflow = '';
                        if (modal) modal.style.opacity = '1';
                    }, 300);
                } else {
                    showPhotoModal.value = false;
                    document.body.style.overflow = '';
                }
                selectedEmployee.value = null;
                previewImage.value = null;
                newPhotoFile.value = null;
            };

            const handleImageUpload = (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                newPhotoFile.value = file;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImage.value = e.target.result;
                };
                reader.readAsDataURL(file);
            };

            const saveNewPhoto = () => {
                if (selectedEmployee.value && previewImage.value) {
                    selectedEmployee.value.photo = previewImage.value;
                    saveToLocalStorage();
                    showNotificationMessage(`Photo de ${selectedEmployee.value.name} mise à jour avec succès`);
                    closePhotoModal();
                }
            };

            const editEmployee = (employee, event) => {
                event.stopPropagation();
                editMode.value = true;
                selectedEmployee.value = employee;
                newEmployee.value = {
                    id: employee.id,
                    name: employee.name,
                    position: employee.position,
                    photo: employee.photo,
                    isPresent: employee.isPresent,
                    checkInTime: employee.checkInTime,
                    checkOutTime: employee.checkOutTime,
                    history: employee.history || []
                };
                showAddEmployeeModal.value = true;
            };

            const closeAddEmployeeModal = () => {
                const modal = document.querySelector('.history-modal');
                if (modal) {
                    modal.style.opacity = '0';
                    setTimeout(() => {
                        showAddEmployeeModal.value = false;
                        editMode.value = false;
                        document.body.style.overflow = '';
                        resetNewEmployeeForm();
                        if (modal) modal.style.opacity = '1';
                    }, 300);
                } else {
                    showAddEmployeeModal.value = false;
                    editMode.value = false;
                    resetNewEmployeeForm();
                    document.body.style.overflow = '';
                }
            };

            const resetNewEmployeeForm = () => {
                newEmployee.value = {
                    id: null,
                    name: '',
                    position: '',
                    photo: null,
                    isPresent: false,
                    checkInTime: null,
                    checkOutTime: null,
                    history: []
                };
                selectedEmployee.value = null;
            };

            const handleNewEmployeePhoto = (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    newEmployee.value.photo = e.target.result;
                };
                reader.readAsDataURL(file);
            };

            const saveEmployee = () => {
                if (!newEmployee.value.name || !newEmployee.value.position) {
                    showNotificationMessage('Veuillez remplir tous les champs obligatoires');
                    return;
                }

                if (editMode.value) {
                    const index = employees.value.findIndex(emp => emp.id === newEmployee.value.id);
                    if (index !== -1) {
                        const updatedEmployee = {
                            ...employees.value[index],
                            name: newEmployee.value.name,
                            position: newEmployee.value.position
                        };
                        
                        if (newEmployee.value.photo !== employees.value[index].photo) {
                            updatedEmployee.photo = newEmployee.value.photo;
                        }
                        
                        employees.value[index] = updatedEmployee;
                        showNotificationMessage(`Les informations de ${updatedEmployee.name} ont été mises à jour`);
                    }
                } else {
                    const newId = employees.value.length > 0 
                        ? Math.max(...employees.value.map(emp => emp.id)) + 1 
                        : 1;
                    
                    employees.value.push({
                        ...newEmployee.value,
                        id: newId,
                        isPresent: false,
                        checkInTime: null,
                        checkOutTime: null,
                        history: []
                    });
                    
                    showNotificationMessage(`${newEmployee.value.name} a été ajouté(e) avec succès`);
                }
                
                saveToLocalStorage();
                closeAddEmployeeModal();
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
                calculateDuration,
                changePhoto,
                showPhotoModal,
                closePhotoModal,
                handleImageUpload,
                previewImage,
                saveNewPhoto,
                showAddEmployeeModal,
                editMode,
                newEmployee,
                editEmployee,
                closeAddEmployeeModal,
                handleNewEmployeePhoto,
                saveEmployee
            };
        }
    }).mount('#app');
});