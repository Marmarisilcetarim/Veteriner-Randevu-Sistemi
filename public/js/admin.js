// API base URL
const API_URL = window.location.hostname === 'localhost' || window.location.protocol === 'file:'
    ? 'http://localhost:3000'
    : window.location.origin;

// Check if already logged in
let isAuthenticated = sessionStorage.getItem('adminAuth') === 'true';

// Initialize page
function initializePage() {
    if (isAuthenticated) {
        showAdminPanel();
        loadAppointments();
    } else {
        showLoginSection();
    }

    // Add login form listener
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Add edit form listener
    document.getElementById('editForm').addEventListener('submit', handleEditSubmit);
}

// Show login section
function showLoginSection() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
}

// Show admin panel
function showAdminPanel() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const password = document.getElementById('password').value;

    try {
        console.log('Attempting login to:', `${API_URL}/api/admin/login`);
        const response = await fetch(`${API_URL}/api/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (response.ok) {
            sessionStorage.setItem('adminAuth', 'true');
            isAuthenticated = true;
            showAdminPanel();
            loadAppointments();
        } else {
            alert(data.error || 'Hatalı parola!');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert(`Giriş yapılırken bir hata oluştu: ${error.message}. Sunucunun çalıştığından emin olun.`);
    }
}

// Logout
function logout() {
    sessionStorage.removeItem('adminAuth');
    isAuthenticated = false;
    showLoginSection();
    document.getElementById('password').value = '';
}

// Load appointments
async function loadAppointments(status = null) {
    const container = document.getElementById('appointmentsContainer');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        let url = `${API_URL}/api/admin/appointments`;
        if (status) {
            url += `?status=${status}`;
        }

        const response = await fetch(url);
        const appointments = await response.json();

        if (appointments.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Randevu bulunamadı.</p>';
            return;
        }

        displayAppointmentsTable(appointments);
    } catch (error) {
        console.error('Error loading appointments:', error);
        container.innerHTML = '<p class="text-center text-error">Randevular yüklenirken bir hata oluştu.</p>';
    }
}

// Display appointments table
function displayAppointmentsTable(appointments) {
    const container = document.getElementById('appointmentsContainer');

    let tableHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Randevu No</th>
            <th>Tip</th>
            <th>Ad Soyad</th>
            <th>Telefon</th>
            <th>Ülke</th>
            <th>Hayvan</th>
            <th>Sayı</th>
            <th>Tarih</th>
            <th>Saat</th>
            <th>Durum</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
  `;

    appointments.forEach(apt => {
        const typeText = apt.appointment_type === 'health_certificate'
            ? 'Sağlık Sertifikası'
            : 'Mikroçip';

        const statusBadge = apt.status === 'active'
            ? '<span class="badge badge-success">Aktif</span>'
            : '<span class="badge badge-danger">İptal</span>';

        tableHTML += `
      <tr>
        <td>${apt.appointment_number}</td>
        <td>${typeText}</td>
        <td>${apt.full_name}</td>
        <td>${apt.phone}</td>
        <td>${apt.country || '-'}</td>
        <td>${apt.animal_type}</td>
        <td>${apt.animal_count}</td>
        <td>${apt.appointment_date}</td>
        <td>${apt.appointment_time}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="editAppointment(${apt.id})">
            Düzenle
          </button>
          <button class="btn btn-danger" style="padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="deleteAppointment(${apt.id})">
            Sil
          </button>
        </td>
      </tr>
    `;
    });

    tableHTML += `
        </tbody>
      </table>
    </div>
  `;

    container.innerHTML = tableHTML;
}

// Filter appointments
function filterAppointments(status) {
    if (status === 'all') {
        loadAppointments();
    } else {
        loadAppointments(status);
    }
}

// Edit appointment
async function editAppointment(id) {
    try {
        // Get all appointments and find the one with this id
        const response = await fetch(`${API_URL}/api/admin/appointments`);
        const appointments = await response.json();
        const appointment = appointments.find(apt => apt.id === id);

        if (!appointment) {
            alert('Randevu bulunamadı.');
            return;
        }

        // Populate form
        document.getElementById('editId').value = appointment.id;
        document.getElementById('editFullName').value = appointment.full_name;
        document.getElementById('editPhone').value = appointment.phone;
        document.getElementById('editCountry').value = appointment.country || '';
        document.getElementById('editAnimalType').value = appointment.animal_type;
        document.getElementById('editAnimalCount').value = appointment.animal_count;
        document.getElementById('editDate').value = appointment.appointment_date;
        document.getElementById('editTime').value = appointment.appointment_time;

        // Show/hide country field based on type
        if (appointment.appointment_type === 'health_certificate') {
            document.getElementById('editCountryGroup').classList.remove('hidden');
        } else {
            document.getElementById('editCountryGroup').classList.add('hidden');
        }

        // Show modal
        document.getElementById('editModal').classList.add('active');
    } catch (error) {
        console.error('Error loading appointment:', error);
        alert('Randevu yüklenirken bir hata oluştu.');
    }
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
}

// Handle edit submit
async function handleEditSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('editId').value;
    const formData = {
        fullName: document.getElementById('editFullName').value,
        phone: document.getElementById('editPhone').value,
        country: document.getElementById('editCountry').value,
        animalType: document.getElementById('editAnimalType').value,
        animalCount: parseInt(document.getElementById('editAnimalCount').value),
        appointmentDate: document.getElementById('editDate').value,
        appointmentTime: document.getElementById('editTime').value
    };

    try {
        const response = await fetch(`${API_URL}/api/admin/appointments/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            closeEditModal();
            loadAppointments();
            alert('Randevu güncellendi.');
        } else {
            alert(data.error || 'Randevu güncellenirken bir hata oluştu.');
        }
    } catch (error) {
        console.error('Error updating appointment:', error);
        alert('Randevu güncellenirken bir hata oluştu.');
    }
}

// Delete appointment
async function deleteAppointment(id) {
    if (!confirm('Bu randevuyu silmek istediğinizden emin misiniz?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/appointments/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            loadAppointments();
            alert('Randevu silindi.');
        } else {
            alert(data.error || 'Randevu silinirken bir hata oluştu.');
        }
    } catch (error) {
        console.error('Error deleting appointment:', error);
        alert('Randevu silinirken bir hata oluştu.');
    }
}

// Initialize on load
initializePage();
