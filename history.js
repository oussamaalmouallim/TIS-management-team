document.addEventListener('DOMContentLoaded', () => {
    const { createApp, ref, computed, onMounted } = Vue;

    createApp({
        setup() {
            const employees = ref([]);
            const allHistory = ref([]);
            const selectedEmployeeId = ref(null);
            const filterMonth = ref('all');

            // Load data from localStorage
            onMounted(() => {
                const savedEmployees = localStorage.getItem('employeeAttendance');
                if (savedEmployees) {
                    employees.value = JSON.parse(savedEmployees);
                    
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
                                    checkOut: record.checkOut
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

            return {
                employees,
                allHistory,
                selectedEmployeeId,
                filterMonth,
                filteredHistory,
                selectEmployee,
                getEmployeeName,
                getEmployeePhoto,
                getInitials,
                formatTime,
                calculateDuration
            };
        }
    }).mount('#app');
});
