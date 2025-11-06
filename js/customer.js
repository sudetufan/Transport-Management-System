let currentShipmentData = null;

function showShipmentForm() {
    document.getElementById('shipment-form').style.display = 'block';
    document.getElementById('price-result').style.display = 'none';
    document.getElementById('shipment-form').scrollIntoView({ behavior: 'smooth' });
}

function hideShipmentForm() {
    document.getElementById('shipment-form').style.display = 'none';
}

function createShipment(event) {
    event.preventDefault();

    const customerName = document.getElementById('customerName').value.trim();
    const productName = document.getElementById('productName').value.trim();
    const category = document.getElementById('category').value;
    const weight = parseFloat(document.getElementById('weight').value);
    const containerType = document.getElementById('containerType').value;
    const shipmentType = document.getElementById('shipmentType').value;
    const destinationCountry = document.getElementById('destinationCountry').value;

    if (!customerName || !productName || !weight || weight <= 0 || !shipmentType || !destinationCountry) {
        alert('Lütfen tüm gerekli alanları doldurun!');
        return;
    }

    const compatibilityCheck = checkShipmentCompatibility(shipmentType, destinationCountry);
    if (!compatibilityCheck.compatible) {
        alert(`⚠️ Uyarı: ${compatibilityCheck.message}`);
        return;
    }

    const containerInfo = CONTAINER_TYPES[containerType];
    if (weight > containerInfo.capacity) {
        alert(`⚠️ Uyarı: Ağırlık (${weight} kg), ${containerType} konteyner kapasitesini (${containerInfo.capacity} kg) aşıyor!\n\nLütfen daha büyük bir konteyner seçin veya ağırlığı azaltın.`);
        return;
    }

    const inventoryCheck = checkInventoryAvailability(productName, category, weight);
    if (!inventoryCheck.available) {
        console.log(`${productName} (${category}) envantere eklendi.`);
    }

    const distance = calculateDistance(destinationCountry, shipmentType);

    const priceResult = calculatePrice(weight, distance, containerType);

    if (priceResult.error) {
        alert(priceResult.message);
        return;
    }

    currentShipmentData = {
        id: generateShipmentId(),
        customerName: customerName,
        productName: productName,
        category: category,
        weight: weight,
        containerType: containerType,
        shipmentType: shipmentType,
        destination: `Muğla → ${destinationCountry}`,
        destinationCountry: destinationCountry,
        destinationCity: destinationCountry,
        distance: priceResult.distance,
        totalPrice: priceResult.totalPrice,
        estimatedDays: priceResult.estimatedDays,
        pricePerKm: priceResult.pricePerKm,
        status: 'Pending',
        containerId: null,
        createdAt: new Date().toISOString()
    };

    displayPriceResult(currentShipmentData);
}

function displayPriceResult(shipmentData) {
    const resultContent = document.getElementById('resultContent');

    const shipmentTypeText = shipmentData.shipmentType === 'road' ? 'Kara Yolu 🚚' : 'Deniz Yolu 🚢';

    resultContent.innerHTML = `
        <div class="result-item">
            <span class="result-label">Sipariş ID:</span>
            <span class="result-value">${shipmentData.id}</span>
        </div>
        <div class="result-item">
            <span class="result-label">Müşteri:</span>
            <span class="result-value">${shipmentData.customerName}</span>
        </div>
        <div class="result-item">
            <span class="result-label">Ürün:</span>
            <span class="result-value">${shipmentData.productName} (${shipmentData.category})</span>
        </div>
        <div class="result-item">
            <span class="result-label">Ağırlık:</span>
            <span class="result-value">${shipmentData.weight} kg</span>
        </div>
        <div class="result-item">
            <span class="result-label">Konteyner Tipi:</span>
            <span class="result-value">${shipmentData.containerType}</span>
        </div>
        <div class="result-item">
            <span class="result-label">Sevkiyat Türü:</span>
            <span class="result-value">${shipmentTypeText}</span>
        </div>
        <div class="result-item">
            <span class="result-label">Hedef:</span>
            <span class="result-value">${shipmentData.destinationCountry}</span>
        </div>
        <div class="result-item">
            <span class="result-label">Mesafe:</span>
            <span class="result-value">${shipmentData.distance} km</span>
        </div>
        <div class="result-item">
            <span class="result-label">Km Başı Fiyat:</span>
            <span class="result-value">₺${shipmentData.pricePerKm}/km</span>
        </div>
        <div class="result-item">
            <span class="result-label">Tahmini Teslimat:</span>
            <span class="result-value">${shipmentData.estimatedDays} gün</span>
        </div>
        <div class="result-item" style="border-top: 2px solid var(--primary-color); padding-top: 1rem; margin-top: 1rem;">
            <span class="result-label" style="font-size: 1.2rem;">TOPLAM FİYAT:</span>
            <span class="result-value price">₺${shipmentData.totalPrice.toLocaleString('tr-TR')}</span>
        </div>
    `;

    document.getElementById('price-result').style.display = 'block';
    document.getElementById('price-result').scrollIntoView({ behavior: 'smooth' });
}


function generateShipmentId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `SHP${timestamp}${random}`;
}

function checkInventoryAvailability(productName, category, quantity) {
    const inventory = loadFromStorage(STORAGE_KEYS.INVENTORY) || {};
    const inventoryKey = `${productName}_${category}`;

    if (!inventory[inventoryKey]) {
        return { 
            available: true, 
            currentStock: 0,
            autoCreated: true 
        };
    }

    return {
        available: inventory[inventoryKey].quantity >= quantity,
        currentStock: inventory[inventoryKey].quantity,
        autoCreated: false
    };
}

function confirmShipment() {
    if (!currentShipmentData) {
        alert('Sevkiyat verisi bulunamadı!');
        return;
    }

    const inventoryUpdate = updateInventory(
        currentShipmentData.productName,
        currentShipmentData.category,
        currentShipmentData.weight,
        'subtract'
    );

    if (inventoryUpdate.error) {
        alert(inventoryUpdate.message);
        return;
    }

    const shipments = loadFromStorage(STORAGE_KEYS.SHIPMENTS) || [];
    shipments.push(currentShipmentData);
    saveToStorage(STORAGE_KEYS.SHIPMENTS, shipments);

    alert(`✅ Sevkiyat başarıyla oluşturuldu!\n\nSipariş ID: ${currentShipmentData.id}\nÜrün: ${currentShipmentData.productName} (${currentShipmentData.category})\nSevkiyat türü: ${currentShipmentData.shipmentType === 'road' ? 'Kara Yolu' : 'Deniz Yolu'}`);

    resetForm();
}

function resetForm() {
    document.getElementById('createShipmentForm').reset();
    document.getElementById('shipment-form').style.display = 'none';
    document.getElementById('price-result').style.display = 'none';
    currentShipmentData = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function trackShipment() {
    const trackingId = document.getElementById('trackingId').value.trim();

    if (!trackingId) {
        alert('Lütfen bir sipariş ID girin!');
        return;
    }

    const shipments = loadFromStorage(STORAGE_KEYS.SHIPMENTS) || [];
    const shipment = shipments.find(s => s.id === trackingId);

    if (!shipment) {
        document.getElementById('tracking-result').innerHTML = `
            <div class="alert alert-danger">
                ❌ Sipariş bulunamadı! Lütfen ID'nizi kontrol edin.
            </div>
        `;
        return;
    }

    let containerInfo = 'Henüz atanmadı';
    if (shipment.containerId) {
        const containers = loadFromStorage(STORAGE_KEYS.CONTAINERS) || [];
        const container = containers.find(c => c.id === shipment.containerId);
        if (container) {
            containerInfo = `${container.type} Container #${container.id}`;
        }
    }

    let statusClass = 'status-pending';
    let statusText = 'Beklemede';

    const statusMap = {
        'Ready': { class: 'status-ready', text: 'Taşımaya Hazır' },
        'In Transit': { class: 'status-in-transit', text: 'Yolda' },
        'Completed': { class: 'status-completed', text: 'Teslim Edildi' }
    };

    if (statusMap[shipment.status]) {
        statusClass = statusMap[shipment.status].class;
        statusText = statusMap[shipment.status].text;
    }

    const destination = shipment.destinationCountry || shipment.destinationCity || shipment.destination || 'Bilinmiyor';
    const formattedDestination = destination.includes('→') ? destination : `Muğla → ${destination}`;

    const shipmentTypeText = shipment.shipmentType === 'road' ? 'Kara Yolu 🚚' : 'Deniz Yolu 🚢';

    document.getElementById('tracking-result').innerHTML = `
        <div class="tracking-card">
            <h3>📦 Sevkiyat Detayları</h3>
            <div class="result-item">
                <span class="result-label">Sipariş ID:</span>
                <span class="result-value">${shipment.id}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Müşteri:</span>
                <span class="result-value">${shipment.customerName}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Ürün:</span>
                <span class="result-value">${shipment.productName} (${shipment.category}) - ${shipment.weight} kg</span>
            </div>
            <div class="result-item">
                <span class="result-label">Sevkiyat Türü:</span>
                <span class="result-value">${shipmentTypeText}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Hedef:</span>
                <span class="result-value">${formattedDestination}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Konteyner:</span>
                <span class="result-value">${containerInfo}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Durum:</span>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Tahmini Teslimat:</span>
                <span class="result-value">${shipment.estimatedDays} gün</span>
            </div>
            <div class="result-item">
                <span class="result-label">Ödenen Tutar:</span>
                <span class="result-value price">₺${shipment.totalPrice.toLocaleString('tr-TR')}</span>
            </div>
        </div>
    `;
}

window.updateCountryOptions = function () {
    const shipmentType = document.getElementById('shipmentType').value;
    const countrySelect = document.getElementById('destinationCountry');

    countrySelect.innerHTML = '<option value="">Hedef ülke seçin</option>';

    if (!shipmentType) {
        countrySelect.innerHTML = '<option value="">Önce sevkiyat türünü seçin</option>';
        return;
    }

    let countries = [];

    if (shipmentType === 'road') {
        countries = Object.keys(window.ROAD_DISTANCES || {});
    } else if (shipmentType === 'sea') {
        countries = Object.keys(window.SEA_DISTANCES || {});
    }

    countries.sort();

    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
    });
};

window.checkShipmentCompatibility = function (shipmentType, destinationCountry) {
    if (shipmentType === 'road') {
        const roadDistances = window.ROAD_DISTANCES || {};
        if (!roadDistances[destinationCountry]) {
            return {
                compatible: false,
                message: `Muğla'dan ${destinationCountry}'ye kara yolu ile sevkiyat mümkün değildir. Lütfen deniz yolu seçin.`
            };
        }
    } else if (shipmentType === 'sea') {
        const seaDistances = window.SEA_DISTANCES || {};
        if (!seaDistances[destinationCountry]) {
            return {
                compatible: false,
                message: `Muğla'dan ${destinationCountry}'ye deniz yolu ile sevkiyat mümkün değildir. Lütfen kara yolu seçin.`
            };
        }
    }

    return { compatible: true };
};