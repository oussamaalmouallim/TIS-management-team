document.addEventListener('DOMContentLoaded', () => {
    const { createApp, ref, computed, onMounted } = Vue;

    createApp({
        setup() {
            const employees = ref([]);
            const recentActivity = ref([]);
            const weeklyData = ref({});
            const employeeHoursData = ref({});
            
            // Load data from localStorage
            onMounted(() => {
                const savedEmployees = localStorage.getItem('employeeAttendance');
                if (savedEmployees) {
                    employees.value = JSON.parse(savedEmployees);
                    generateRecentActivity();
                    renderWeeklyChart();
                    renderEmployeeHoursChart();
                }
            });
            
            const generateRecentActivity = () => {
                const activity = [];
                
                // Generate recent activity from employee history
                employees.value.forEach(employee => {
                    if (employee.history && employee.history.length > 0) {
                        employee.history.forEach(record => {
                            // Check-in records
                            if (record.checkIn) {
                                activity.push({
                                    id: `in-${employee.id}-${record.checkIn}`,
                                    name: employee.name,
                                    photo: employee.photo,
                                    type: 'in',
                                    time: formatTime(record.checkIn),
                                    date: formatDate(record.checkIn),
                                    timestamp: record.checkIn
                                });
                            }
                            
                            // Check-out records
                            if (record.checkOut) {
                                activity.push({
                                    id: `out-${employee.id}-${record.checkOut}`,
                                    name: employee.name,
                                    photo: employee.photo,
                                    type: 'out',
                                    time: formatTime(record.checkOut),
                                    date: formatDate(record.checkOut),
                                    timestamp: record.checkOut
                                });
                            }
                        });
                    }
                });
                
                // Sort by timestamp (newest first) and limit to 10
                activity.sort((a, b) => b.timestamp - a.timestamp);
                recentActivity.value = activity.slice(0, 10);
            };
            
            const renderWeeklyChart = () => {
                // Get the last 7 days
                const days = [];
                const counts = { present: [], absent: [] };
                
                for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'short' });
                    days.push(dateStr);
                    
                    // Count employees present for each day
                    const formattedDate = date.toLocaleDateString('fr-FR');
                    let presentCount = 0;
                    
                    employees.value.forEach(employee => {
                        if (employee.history) {
                            const wasPresent = employee.history.some(record => 
                                record.date === formattedDate && record.checkIn);
                            if (wasPresent) presentCount++;
                        }
                    });
                    
                    counts.present.push(presentCount);
                    counts.absent.push(employees.value.length - presentCount);
                }
                
                // Create chart with animation
                const ctx = document.getElementById('weeklyChart').getContext('2d');
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: days,
                        datasets: [
                            {
                                label: 'Présents',
                                data: counts.present,
                                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                                borderColor: 'rgba(16, 185, 129, 1)',
                                borderWidth: 1
                            },
                            {
                                label: 'Absents',
                                data: counts.absent,
                                backgroundColor: 'rgba(239, 68, 68, 0.6)',
                                borderColor: 'rgba(239, 68, 68, 1)',
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        animation: {
                            duration: 1500,
                            easing: 'easeOutQuart'
                        },
                        scales: {
                            x: {
                                stacked: true,
                            },
                            y: {
                                stacked: true,
                                beginAtZero: true,
                                ticks: {
                                    precision: 0
                                }
                            }
                        }
                    }
                });
            };
            
            const renderEmployeeHoursChart = () => {
                // Calculate total hours for each employee
                const employeeHours = {};
                
                employees.value.forEach(employee => {
                    if (employee.history) {
                        let totalMinutes = 0;
                        
                        employee.history.forEach(record => {
                            if (record.checkIn && record.checkOut) {
                                const diffMs = record.checkOut - record.checkIn;
                                const diffMins = diffMs / (1000 * 60);
                                totalMinutes += diffMins;
                            }
                        });
                        
                        // Convert to hours
                        employeeHours[employee.name] = Math.round(totalMinutes / 60 * 10) / 10;
                    }
                });
                
                // Sort by hours
                const sortedEmployees = Object.keys(employeeHours)
                    .sort((a, b) => employeeHours[b] - employeeHours[a])
                    .slice(0, 5); // Top 5
                
                // Create chart with animation
                const ctx = document.getElementById('employeeHoursChart').getContext('2d');
                new Chart(ctx, {
                    type: 'horizontalBar',
                    data: {
                        labels: sortedEmployees,
                        datasets: [{
                            label: 'Heures Travaillées',
                            data: sortedEmployees.map(name => employeeHours[name]),
                            backgroundColor: 'rgba(79, 70, 229, 0.6)',
                            borderColor: 'rgba(79, 70, 229, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        animation: {
                            duration: 1500,
                            easing: 'easeOutQuart'
                        },
                        scales: {
                            x: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            };
            
            const presentCount = computed(() => {
                return employees.value.filter(emp => emp.isPresent).length;
            });
            
            const absentCount = computed(() => {
                return employees.value.length - presentCount.value;
            });
            
            const presentPercentage = computed(() => {
                if (employees.value.length === 0) return 0;
                return Math.round((presentCount.value / employees.value.length) * 100);
            });
            
            const averageWorktime = computed(() => {
                let totalMinutes = 0;
                let recordCount = 0;
                
                employees.value.forEach(employee => {
                    if (employee.history) {
                        employee.history.forEach(record => {
                            if (record.checkIn && record.checkOut) {
                                const diffMs = record.checkOut - record.checkIn;
                                const diffMins = diffMs / (1000 * 60);
                                totalMinutes += diffMins;
                                recordCount++;
                            }
                        });
                    }
                });
                
                if (recordCount === 0) return '0h 0m';
                
                const avgMinutes = Math.round(totalMinutes / recordCount);
                const hours = Math.floor(avgMinutes / 60);
                const minutes = avgMinutes % 60;
                
                return `${hours}h ${minutes}m`;
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
            
            return {
                employees,
                recentActivity,
                presentCount,
                absentCount,
                presentPercentage,
                averageWorktime,
                getInitials,
                formatTime
            };
        }
    }).mount('#app');
});