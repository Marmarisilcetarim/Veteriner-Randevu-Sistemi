// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode'); // 'book' or 'search'
let currentLang = urlParams.get('lang') || getCurrentLanguage();
let selectedAppointmentType = null;
let currentAppointmentNumber = null;

// API base URL
const API_URL = window.location.hostname === 'localhost' || window.location.protocol === 'file:'
    ? 'http://localhost:3000'
    : window.location.origin;

// Initialize page
function initializePage() {
    setCurrentLanguage(currentLang);
    updateLanguage();
    setActiveLanguageButton();

    if (mode === 'book') {
        const type = urlParams.get('type');
        if (type) {
            selectAppointmentType(type);
        } else {
            showAppointmentTypeSection();
        }
    } else if (mode === 'search') {
        showSearchSection();
    }

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('appointmentDate').setAttribute('min', today);

    // Add date change listener
    document.getElementById('appointmentDate').addEventListener('change', handleDateChange);

    // Add form submit listener
    document.getElementById('appointmentForm').addEventListener('submit', handleFormSubmit);
}

// Update all text based on current language
function updateLanguage() {
    document.getElementById('mainTitle').textContent = t('mainTitle', currentLang);
    document.getElementById('mainSubtitle').textContent = t('mainSubtitle', currentLang);
    document.getElementById('backBtn').textContent = t('back', currentLang);
    document.getElementById('selectTypeTitle').textContent = t('selectAppointmentType', currentLang);
    document.getElementById('healthCertBtn').textContent = t('healthCertificate', currentLang);
    document.getElementById('microchipBtn').textContent = t('microchip', currentLang);

    // Form labels
    document.getElementById('fullNameLabel').textContent = t('fullName', currentLang);
    document.getElementById('phoneLabel').textContent = t('phone', currentLang);
    document.getElementById('countryLabel').textContent = t('country', currentLang);
    document.getElementById('animalTypeLabel').textContent = t('animalType', currentLang);
    document.getElementById('animalCountLabel').textContent = t('animalCount', currentLang);
    document.getElementById('appointmentDateLabel').textContent = t('appointmentDate', currentLang);
    document.getElementById('appointmentTimeLabel').textContent = t('appointmentTime', currentLang);

    // Animal type options
    document.getElementById('dogOption').textContent = t('dog', currentLang);
    document.getElementById('catOption').textContent = t('cat', currentLang);
    document.getElementById('birdOption').textContent = t('bird', currentLang);
    document.getElementById('otherOption').textContent = t('other', currentLang);

    // Buttons
    document.getElementById('submitBtn').textContent = t('createAppointment', currentLang);
    document.getElementById('searchTitle').textContent = t('searchAppointment', currentLang);
    document.getElementById('enterNumberLabel').textContent = t('enterAppointmentNumber', currentLang);
    document.getElementById('searchBtn').textContent = t('search', currentLang);

    // Warning
    document.getElementById('warningText').textContent = t('healthCertWarning', currentLang);
    document.getElementById('warningNote').textContent = t('healthCertNote', currentLang);

    // Modal texts
    document.getElementById('closeBtn').textContent = t('close', currentLang);
    document.getElementById('cancelBackBtn').textContent = t('back', currentLang);
    document.getElementById('confirmCancelBtn').textContent = t('cancel', currentLang);
    document.getElementById('confirmPhoneLabel').textContent = t('enterPhoneToConfirm', currentLang);

    document.title = t('mainTitle', currentLang);
}

// Set active language button
function setActiveLanguageButton() {
    document.querySelectorAll('.language-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.lang === currentLang) {
            btn.classList.add('active');
        }
    });
}

// Language button click handlers
document.querySelectorAll('.language-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentLang = btn.dataset.lang;
        setCurrentLanguage(currentLang);
        updateLanguage();
        setActiveLanguageButton();
    });
});

// Navigation
function goBack() {
    window.location.href = `index.html`;
}

// Show appointment type selection
function showAppointmentTypeSection() {
    document.getElementById('appointmentTypeSection').classList.remove('hidden');
    document.getElementById('appointmentFormSection').classList.add('hidden');
    document.getElementById('searchSection').classList.add('hidden');
}

// Show appointment form
function showAppointmentFormSection() {
    document.getElementById('appointmentTypeSection').classList.add('hidden');
    document.getElementById('appointmentFormSection').classList.remove('hidden');
    document.getElementById('searchSection').classList.add('hidden');
}

// Show search section
function showSearchSection() {
    document.getElementById('appointmentTypeSection').classList.add('hidden');
    document.getElementById('appointmentFormSection').classList.add('hidden');
    document.getElementById('searchSection').classList.remove('hidden');
}

// Select appointment type
function selectAppointmentType(type) {
    selectedAppointmentType = type;

    if (type === 'health_certificate') {
        document.getElementById('formTitle').textContent = t('healthCertificate', currentLang);
        document.getElementById('countryGroup').classList.remove('hidden');
        document.getElementById('healthWarning').classList.remove('hidden');
        document.getElementById('country').required = true;
    } else {
        document.getElementById('formTitle').textContent = t('microchip', currentLang);
        document.getElementById('countryGroup').classList.add('hidden');
        document.getElementById('healthWarning').classList.add('hidden');
        document.getElementById('country').required = false;
    }

    showAppointmentFormSection();
}

// Handle date change
async function handleDateChange() {
    const dateInput = document.getElementById('appointmentDate');
    const timeSelect = document.getElementById('appointmentTime');
    const selectedDate = dateInput.value;

    if (!selectedDate) return;

    // Check if date is valid (not weekend or holiday)
    try {
        const response = await fetch(`${API_URL}/api/check-date?date=${selectedDate}`);
        const data = await response.json();

        if (!data.available) {
            let message = '';
            if (data.reason === 'weekend') {
                message = t('weekendNotAllowed', currentLang);
            } else if (data.reason === 'holiday') {
                message = t('holidayNotAllowed', currentLang) + (data.holidayName ? ` (${data.holidayName})` : '');
            }

            alert(message);
            dateInput.value = '';
            timeSelect.innerHTML = `<option value="">${t('appointmentTime', currentLang)}</option>`;
            return;
        }

        // Get available time slots
        const slotsResponse = await fetch(`${API_URL}/api/available-slots?date=${selectedDate}`);
        const slotsData = await slotsResponse.json();

        // Populate time select
        timeSelect.innerHTML = '';

        // Morning slots
        const morningSlots = ['10:00', '10:30', '11:00', '11:30', '12:00'];
        const afternoonSlots = ['14:00', '14:30', '15:00', '15:30', '16:00'];

        // Add morning group
        const morningGroup = document.createElement('optgroup');
        morningGroup.label = t('morning', currentLang);
        morningSlots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot;
            option.textContent = slot;
            if (!slotsData.availableSlots.includes(slot)) {
                option.disabled = true;
                option.textContent += ` (${t('slotBooked', currentLang).split('.')[0]})`;
            }
            morningGroup.appendChild(option);
        });
        timeSelect.appendChild(morningGroup);

        // Add afternoon group
        const afternoonGroup = document.createElement('optgroup');
        afternoonGroup.label = t('afternoon', currentLang);
        afternoonSlots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot;
            option.textContent = slot;
            if (!slotsData.availableSlots.includes(slot)) {
                option.disabled = true;
                option.textContent += ` (${t('slotBooked', currentLang).split('.')[0]})`;
            }
            afternoonGroup.appendChild(option);
        });
        timeSelect.appendChild(afternoonGroup);

    } catch (error) {
        console.error('Error checking date:', error);
        alert(`Tarih kontrolü sırasında bir hata oluştu: ${error.message}. Sunucunun çalıştığından emin olun.`);
    }
}

// Handle form submit
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        appointmentType: selectedAppointmentType,
        fullName: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value,
        country: document.getElementById('country').value,
        animalType: document.getElementById('animalType').value,
        animalCount: parseInt(document.getElementById('animalCount').value),
        appointmentDate: document.getElementById('appointmentDate').value,
        appointmentTime: document.getElementById('appointmentTime').value
    };

    // Validate
    if (!formData.appointmentType || !formData.fullName || !formData.phone ||
        !formData.animalType || !formData.animalCount || !formData.appointmentDate || !formData.appointmentTime) {
        alert(t('fillAllFields', currentLang));
        return;
    }

    if (selectedAppointmentType === 'health_certificate' && !formData.country) {
        alert(t('fillAllFields', currentLang));
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showSuccessModal(data.appointmentNumber);
        } else {
            alert(data.error || 'Randevu oluşturulurken bir hata oluştu.');
        }
    } catch (error) {
        console.error('Error creating appointment:', error);
        alert('Randevu oluşturulurken bir hata oluştu.');
    }
}

// Show success modal
function showSuccessModal(appointmentNumber) {
    document.getElementById('successMessage').textContent = t('appointmentCreated', currentLang);
    document.getElementById('appointmentNumberDisplay').textContent = appointmentNumber;
    document.getElementById('successNote').textContent = t('pleaseNote', currentLang);
    document.getElementById('successModal').classList.add('active');
}

// Close success modal
function closeSuccessModal() {
    document.getElementById('successModal').classList.remove('active');
    window.location.href = 'index.html';
}

// Search appointment
async function searchAppointment() {
    const appointmentNumber = document.getElementById('searchNumber').value.trim();

    if (!appointmentNumber) {
        alert(t('enterAppointmentNumber', currentLang));
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/appointments/${appointmentNumber}`);
        const data = await response.json();

        if (response.ok) {
            displayAppointmentDetails(data);
        } else {
            document.getElementById('searchResult').innerHTML = `
        <div class="alert alert-error">
          ${t('appointmentNotFound', currentLang)}
        </div>
      `;
            document.getElementById('searchResult').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error searching appointment:', error);
        alert('Randevu sorgulanırken bir hata oluştu.');
    }
}

// Display appointment details
function displayAppointmentDetails(appointment) {
    currentAppointmentNumber = appointment.appointment_number;

    const typeText = appointment.appointment_type === 'health_certificate'
        ? t('healthCertificate', currentLang)
        : t('microchip', currentLang);

    let detailsHTML = `
    <div class="card">
      <h3 class="mb-2">${t('appointmentDetails', currentLang)}</h3>
      <p><strong>${t('appointmentNumber', currentLang)}:</strong> ${appointment.appointment_number}</p>
      <p><strong>${t('type', currentLang)}:</strong> ${typeText}</p>
      <p><strong>${t('fullName', currentLang)}:</strong> ${appointment.full_name}</p>
      <p><strong>${t('phone', currentLang)}:</strong> ${appointment.phone}</p>
  `;

    if (appointment.country) {
        detailsHTML += `<p><strong>${t('country', currentLang)}:</strong> ${appointment.country}</p>`;
    }

    detailsHTML += `
      <p><strong>${t('animalType', currentLang)}:</strong> ${appointment.animal_type}</p>
      <p><strong>${t('animalCount', currentLang)}:</strong> ${appointment.animal_count}</p>
      <p><strong>${t('date', currentLang)}:</strong> ${appointment.appointment_date}</p>
      <p><strong>${t('time', currentLang)}:</strong> ${appointment.appointment_time}</p>
      <button class="btn btn-danger btn-block mt-2" onclick="showCancelModal()">
        ${t('cancel', currentLang)}
      </button>
    </div>
  `;

    document.getElementById('searchResult').innerHTML = detailsHTML;
    document.getElementById('searchResult').classList.remove('hidden');
}

// Show cancel modal
function showCancelModal() {
    document.getElementById('cancelConfirmText').textContent = t('confirmCancel', currentLang);
    document.getElementById('cancelModal').classList.add('active');
}

// Close cancel modal
function closeCancelModal() {
    document.getElementById('cancelModal').classList.remove('active');
    document.getElementById('confirmPhone').value = '';
}

// Confirm cancel
async function confirmCancel() {
    const phone = document.getElementById('confirmPhone').value.trim();

    if (!phone) {
        alert(t('enterPhoneToConfirm', currentLang));
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/appointments/${currentAppointmentNumber}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone })
        });

        const data = await response.json();

        if (response.ok) {
            closeCancelModal();
            alert(t('appointmentCancelled', currentLang));
            document.getElementById('searchResult').innerHTML = '';
            document.getElementById('searchNumber').value = '';
        } else {
            alert(data.error || t('invalidPhone', currentLang));
        }
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        alert('Randevu iptal edilirken bir hata oluştu.');
    }
}

// Initialize on load
initializePage();
