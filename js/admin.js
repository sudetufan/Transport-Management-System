document.addEventListener('DOMContentLoaded', function () {
    loadShipments();
    loadFleet();
    loadInventory();
});

function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');

    switch (tabName) {
        case 'shipments':
            loadShipments();
            break;
        case 'containers':
            loadContainers();
            break;
        case 'fleet':
            loadFleet();
            break;
        case 'financials':
            calculateFinancials();
            break;
        case 'inventory':
            loadInventory();
            break;
        case 'reports':
            break;
    }
}


function loadShipments() {
    const shipments = loadFromStorage(STORAGE_KEYS.SHIPMENTS) || [];

    const pending = shipments.filter(s => s.status === 'Pending').length;
    const completed = shipments.filter(s => s.status === 'Completed').length;

    document.getElementById('total-shipments').textContent = shipments.length;
    document.getElementById('pending-shipments').textContent = pending;
    document.getElementById('completed-shipments').textContent = completed;

    const tbody = document.getElementById('shipments-tbody');
    tbody.innerHTML = '';

    if (shipments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Henüz sevkiyat yok</td></tr>';
        return;
    }

    shipments.forEach(shipment => {
        const row = document.createElement('tr');

        let statusClass = 'status-pending';
        let statusText = 'Beklemede';

        if (shipment.status === 'Ready') {
            statusClass = 'status-ready';
            statusText = 'Hazır';
        } else if (shipment.status === 'In Transit') {
            statusClass = 'status-in-transit';
            statusText = 'Yolda';
        } else if (shipment.status === 'Completed') {
            statusClass = 'status-completed';
            statusText = 'Tamamlandı';
        }
        
        const destination = shipment.destinationCountry || shipment.destinationCity || shipment.destination || 'Bilinmiyor';
        
        row.innerHTML = `
            <td>${shipment.id}</td>
            <td>${shipment.customerName}</td>
            <td>${shipment.productName}</td>
            <td>${shipment.weight}</td>
            <td>Muğla → ${destination}</td>
            <td>₺${shipment.totalPrice.toLocaleString('tr-TR')}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <select onchange="updateShipmentStatus('${shipment.id}', this.value)">
                    <option value="Pending" ${shipment.status === 'Pending' ? 'selected' : ''}>Beklemede</option>
                    <option value="Ready" ${shipment.status === 'Ready' ? 'selected' : ''}>Hazır</option>
                    <option value="In Transit" ${shipment.status === 'In Transit' ? 'selected' : ''}>Yolda</option>
                    <option value="Completed" ${shipment.status === 'Completed' ? 'selected' : ''}>Tamamlandı</option>
                </select>
            </td>
        `;

        tbody.appendChild(row);
    });
}

function updateShipmentStatus(shipmentId, newStatus) {
    const shipments = loadFromStorage(STORAGE_KEYS.SHIPMENTS) || [];
    const shipment = shipments.find(s => s.id === shipmentId);

    if (shipment) {
        shipment.status = newStatus;
        saveToStorage(STORAGE_KEYS.SHIPMENTS, shipments);
        loadShipments();
        alert(`Sevkiyat durumu "${newStatus}" olarak güncellendi.`);
    }
}


function loadContainers() {
    const containers = loadFromStorage(STORAGE_KEYS.CONTAINERS) || [];
    const containerGrid = document.getElementById('container-grid');
    containerGrid.innerHTML = '';

    containers.forEach(container => {
        const utilization = (container.currentLoad / container.capacity * 100).toFixed(1);

        const card = document.createElement('div');
        card.className = 'container-card';
        card.innerHTML = `
            <h4>${container.type} Container #${container.id}</h4>
            <p><strong>Kapasite:</strong> ${container.capacity} kg</p>
            <p><strong>Mevcut Yük:</strong> ${container.currentLoad} kg</p>
            <p><strong>Doluluk:</strong> ${utilization}%</p>
            <div class="capacity-bar">
                <div class="capacity-fill" style="width: ${utilization}%"></div>
            </div>
            <p><strong>Durum:</strong> <span class="status-badge ${container.status === 'Available' ? 'status-pending' : 'status-ready'}">${container.status}</span></p>
            <p><strong>Sevkiyat Sayısı:</strong> ${container.shipments.length}</p>
        `;

        containerGrid.appendChild(card);
    });
}

function optimizeContainers() {
    const shipments = loadFromStorage(STORAGE_KEYS.SHIPMENTS) || [];
    const containers = loadFromStorage(STORAGE_KEYS.CONTAINERS) || [];

    const pendingShipments = shipments.filter(s => s.status === 'Pending');

    if (pendingShipments.length === 0) {
        alert('Optimize edilecek bekleyen sevkiyat yok!');
        return;
    }

    containers.forEach(c => {
        c.currentLoad = 0;
        c.status = 'Available';
        c.shipments = [];
    });

    pendingShipments.sort((a, b) => b.weight - a.weight);

    let optimizedCount = 0;
    let failedShipments = [];

    pendingShipments.forEach(shipment => {
        const containerType = shipment.containerType;

        const suitableContainer = containers.find(c =>
            c.type === containerType &&
            (c.capacity - c.currentLoad) >= shipment.weight
        );

        if (suitableContainer) {
            suitableContainer.shipments.push(shipment.id);
            suitableContainer.currentLoad += shipment.weight;

            if (suitableContainer.currentLoad >= suitableContainer.capacity * 0.9) {
                suitableContainer.status = 'Ready for Transport';
            }

            shipment.containerId = suitableContainer.id;
            shipment.status = 'Ready';
            optimizedCount++;
        } else {
            failedShipments.push(shipment);
        }
    });

    saveToStorage(STORAGE_KEYS.CONTAINERS, containers);
    saveToStorage(STORAGE_KEYS.SHIPMENTS, shipments);

    document.getElementById('optimization-result').innerHTML = `
        <div class="alert ${failedShipments.length > 0 ? 'alert-warning' : 'alert-success'}">
            <h4>Optimizasyon Sonuçları</h4>
            <p><strong>Toplam İşlenen:</strong> ${pendingShipments.length}</p>
            <p><strong>Başarılı:</strong> ${optimizedCount}</p>
            <p><strong>Başarısız:</strong> ${failedShipments.length}</p>
            ${failedShipments.length > 0 ? '<p style="color: #856404;">⚠️ Bazı sevkiyatlar için yeterli konteyner kapasitesi yok!</p>' : ''}
        </div>
    `;

    loadContainers();
    loadShipments();
}

function loadFleet() {
    const fleet = loadFromStorage(STORAGE_KEYS.FLEET) || FLEET_DATA;

    const shipsTable = document.getElementById('ships-tbody');
    shipsTable.innerHTML = '';

    fleet.ships.forEach(ship => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${ship.name}</td>
            <td>${ship.capacity.toLocaleString('tr-TR')}</td>
            <td>₺${ship.fuelCostPerKm}</td>
            <td>₺${ship.crewCost.toLocaleString('tr-TR')}</td>
            <td>₺${ship.maintenance.toLocaleString('tr-TR')}</td>
            <td><strong>₺${ship.totalExpense.toLocaleString('tr-TR')}</strong></td>
        `;
        shipsTable.appendChild(row);
    });

    const trucksTable = document.getElementById('trucks-tbody');
    trucksTable.innerHTML = '';

    fleet.trucks.forEach(truck => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${truck.name}</td>
            <td>${truck.capacity.toLocaleString('tr-TR')}</td>
            <td>₺${truck.fuelCostPerKm}</td>
            <td>₺${truck.driverCost.toLocaleString('tr-TR')}</td>
            <td>₺${truck.maintenance.toLocaleString('tr-TR')}</td>
            <td><strong>₺${truck.totalExpense.toLocaleString('tr-TR')}</strong></td>
        `;
        trucksTable.appendChild(row);
    });
}


function calculateFinancials() {
    const shipments = loadFromStorage(STORAGE_KEYS.SHIPMENTS) || [];
    const fleet = loadFromStorage(STORAGE_KEYS.FLEET) || FLEET_DATA;

    const totalRevenue = shipments
        .filter(s => s.status === 'Completed')
        .reduce((sum, s) => sum + s.totalPrice, 0);

    let totalFleetExpense = 0;
    let otherExpenses = 0;
    
    if (shipments.length > 0) {
        totalFleetExpense =
            fleet.ships.reduce((sum, s) => sum + s.totalExpense, 0) +
            fleet.trucks.reduce((sum, t) => sum + t.totalExpense, 0);
        otherExpenses = 80000;
    }

    const totalExpenses = totalFleetExpense + otherExpenses;
    const netIncome = totalRevenue - totalExpenses;
    const tax = netIncome > 0 ? netIncome * 0.20 : 0;
    const profitAfterTax = netIncome - tax;

    const financials = {
        totalRevenue,
        totalExpenses,
        netIncome,
        tax,
        profitAfterTax,
        totalFleetExpense,
        otherExpenses
    };

    saveToStorage(STORAGE_KEYS.FINANCIALS, financials);

    document.getElementById('total-revenue').textContent = `₺${totalRevenue.toLocaleString('tr-TR')}`;
    document.getElementById('total-expenses').textContent = `₺${totalExpenses.toLocaleString('tr-TR')}`;
    document.getElementById('net-income').textContent = `₺${netIncome.toLocaleString('tr-TR')}`;
    document.getElementById('tax-amount').textContent = `₺${tax.toLocaleString('tr-TR')}`;
    document.getElementById('profit-after-tax').textContent = `₺${profitAfterTax.toLocaleString('tr-TR')}`;
}

function loadInventory() {
    const inventory = loadFromStorage(STORAGE_KEYS.INVENTORY) || {};
    const inventoryGrid = document.getElementById('inventory-grid');
    const alerts = document.getElementById('inventory-alerts');

    inventoryGrid.innerHTML = '';
    alerts.innerHTML = '';

    const inventoryItems = Object.values(inventory);

    if (inventoryItems.length === 0) {
        inventoryGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #f8f9fa; border-radius: 10px;">
                <h3 style="color: #667eea; margin-bottom: 10px;">📦 Envanter Boş</h3>
                <p style="color: #6c757d;">Henüz hiç ürün eklenmemiş. İlk sevkiyatınızı oluşturduğunuzda ürünler otomatik olarak envantere eklenecektir.</p>
            </div>
        `;
        return;
    }

    let lowStockCount = 0;
    let lowStockProducts = [];

    inventoryItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'inventory-card';

        if (item.status === 'Low') {
            card.classList.add('low-stock');
            lowStockCount++;
            lowStockProducts.push(item);
        }

        const percentage = (item.quantity / (item.minStock * 2) * 100).toFixed(1);

        card.innerHTML = `
            <h4>${item.productName}</h4>
            <p style="color: #667eea; font-size: 0.9em; margin-bottom: 10px;"><strong>Kategori:</strong> ${item.category}</p>
            <div class="inventory-stat">
                <span>Mevcut Stok:</span>
                <strong>${item.quantity.toLocaleString('tr-TR')} kg</strong>
            </div>
            <div class="inventory-stat">
                <span>Minimum Stok:</span>
                <strong>${item.minStock.toLocaleString('tr-TR')} kg</strong>
            </div>
            <div class="capacity-bar">
                <div class="capacity-fill" style="width: ${Math.min(percentage, 100)}%; background: ${item.status === 'Low' ? '#dc3545' : '#28a745'}"></div>
            </div>
            <p style="margin-top: 10px;"><strong>Durum:</strong> <span class="status-badge ${item.status === 'Low' ? 'status-pending' : 'status-completed'}">${item.status === 'Low' ? 'Düşük' : 'Normal'}</span></p>
            <div style="margin-top: 15px; display: flex; gap: 10px;">
                <button class="btn-secondary" onclick="restockProduct('${item.productName}', '${item.category}')" style="flex: 1; padding: 8px; font-size: 0.9em;">
                    Stok Ekle (+1000 kg)
                </button>
            </div>
        `;

        inventoryGrid.appendChild(card);
    });

    if (lowStockCount > 0) {
        const productList = lowStockProducts.map(p => `• ${p.productName} (${p.category}): ${p.quantity} kg`).join('<br>');
        alerts.innerHTML = `
            <div class="alert alert-warning">
                <h4>⚠️ Stok Uyarısı</h4>
                <p><strong>${lowStockCount} üründe stok seviyesi minimumun altında!</strong></p>
                <div style="margin-top: 10px; font-size: 0.95em;">
                    ${productList}
                </div>
                <p style="margin-top: 10px;">Lütfen yeniden stok sağlayın.</p>
            </div>
        `;
    } else {
        alerts.innerHTML = `
            <div class="alert alert-success">
                <h4>✅ Stok Durumu Normal</h4>
                <p>Tüm ürünlerde yeterli stok bulunmaktadır.</p>
                <p style="margin-top: 5px; font-size: 0.9em;"><strong>Toplam ${inventoryItems.length} farklı ürün envanterde</strong></p>
            </div>
        `;
    }
}

function restockProduct(productName, category) {
    const result = restockInventory(productName, category, 1000);
    
    if (result.error) {
        alert(`❌ Hata: ${result.message}`);
    } else {
        alert(`✅ Başarılı!\n\n${productName} (${category})\n1000 kg stok eklendi.\n\nYeni Stok: ${result.inventory.quantity} kg`);
        loadInventory();
    }
}

function showAddProductForm() {
    const productName = prompt('Ürün Adı:');
    if (!productName) return;
    
    const category = prompt('Kategori (Fresh/Frozen/Organic):');
    if (!category) return;
    
    const initialQuantity = parseInt(prompt('Başlangıç Stoğu (kg):', '10000'));
    if (isNaN(initialQuantity) || initialQuantity <= 0) {
        alert('Geçersiz miktar!');
        return;
    }
    
    const minStock = parseInt(prompt('Minimum Stok Seviyesi (kg):', '2000'));
    if (isNaN(minStock) || minStock <= 0) {
        alert('Geçersiz minimum stok!');
        return;
    }
    
    const result = addInventoryProduct(productName, category, initialQuantity, minStock);
    
    if (result.error) {
        alert(`❌ Hata: ${result.message}`);
    } else {
        alert(`✅ Başarılı!\n\n${productName} (${category})\nEnvantere eklendi.\n\nBaşlangıç Stoğu: ${initialQuantity} kg\nMinimum Stok: ${minStock} kg`);
        loadInventory();
    }
}


function generateReport() {
    const shipments = loadFromStorage(STORAGE_KEYS.SHIPMENTS) || [];
    const containers = loadFromStorage(STORAGE_KEYS.CONTAINERS) || [];
    const inventory = loadFromStorage(STORAGE_KEYS.INVENTORY);
    const financials = loadFromStorage(STORAGE_KEYS.FINANCIALS);

    const completedShipments = shipments.filter(s => s.status === 'Completed');
    const totalDistance = shipments.reduce((sum, s) => sum + (s.distance || 0), 0);

    const totalCapacity = containers.reduce((sum, c) => sum + c.capacity, 0);
    const totalLoad = containers.reduce((sum, c) => sum + c.currentLoad, 0);
    const utilizationRate = totalCapacity > 0 ? (totalLoad / totalCapacity * 100).toFixed(1) : 0;

    const routeCount = {};
    shipments.forEach(s => {
        const destination = s.destinationCountry || s.destinationCity || 'Bilinmiyor';
        const route = `Muğla → ${destination}`;
        routeCount[route] = (routeCount[route] || 0) + 1;
    });

    const mostPopularRoute = Object.keys(routeCount).length > 0
        ? Object.keys(routeCount).reduce((a, b) =>
            routeCount[a] > routeCount[b] ? a : b
        )
        : 'Henüz veri yok';

    const categoryStats = {};
    completedShipments.forEach(s => {
        if (!categoryStats[s.category]) {
            categoryStats[s.category] = { count: 0, weight: 0 };
        }
        categoryStats[s.category].count++;
        categoryStats[s.category].weight += s.weight;
    });

    const reportContent = document.getElementById('report-content');

    reportContent.innerHTML = `
        <div class="report-section">
            <h3>📊 FİNANSAL ÖZET</h3>
            <table style="width: 100%; margin-top: 1rem;">
                <tr>
                    <td><strong>Toplam Gelir:</strong></td>
                    <td style="text-align: right;">₺${(financials.totalRevenue || 0).toLocaleString('tr-TR')}</td>
                </tr>
                <tr>
                    <td><strong>Filo Giderleri:</strong></td>
                    <td style="text-align: right;">₺${(financials.totalFleetExpense || 0).toLocaleString('tr-TR')}</td>
                </tr>
                <tr>
                    <td><strong>Diğer Giderler:</strong></td>
                    <td style="text-align: right;">₺${(financials.otherExpenses || 0).toLocaleString('tr-TR')}</td>
                </tr>
                <tr>
                    <td><strong>Toplam Giderler:</strong></td>
                    <td style="text-align: right;">₺${(financials.totalExpenses || 0).toLocaleString('tr-TR')}</td>
                </tr>
                <tr style="border-top: 2px solid #667eea;">
                    <td><strong>Net Gelir:</strong></td>
                    <td style="text-align: right;"><strong>₺${(financials.netIncome || 0).toLocaleString('tr-TR')}</strong></td>
                </tr>
                <tr>
                    <td><strong>Vergi (20%):</strong></td>
                    <td style="text-align: right;">₺${(financials.tax || 0).toLocaleString('tr-TR')}</td>
                </tr>
                <tr style="background: #d4edda;">
                    <td><strong>Vergi Sonrası Kar:</strong></td>
                    <td style="text-align: right;"><strong>₺${(financials.profitAfterTax || 0).toLocaleString('tr-TR')}</strong></td>
                </tr>
            </table>
        </div>
        
        <div class="report-section">
            <h3>📦 SEVKİYAT İSTATİSTİKLERİ</h3>
            <p><strong>Toplam Sevkiyat:</strong> ${shipments.length}</p>
            <p><strong>Tamamlanan:</strong> ${completedShipments.length}</p>
            <p><strong>Bekleyen:</strong> ${shipments.filter(s => s.status === 'Pending').length}</p>
            <p><strong>Toplam Mesafe:</strong> ${totalDistance.toLocaleString('tr-TR')} km</p>
            <p><strong>En Popüler Rota:</strong> ${mostPopularRoute}</p>
        </div>
        
        <div class="report-section">
            <h3>📦 KONTEYNER KULLANIMI</h3>
            <p><strong>Toplam Konteyner:</strong> ${containers.length}</p>
            <p><strong>Ortalama Kullanım Oranı:</strong> ${utilizationRate}%</p>
            <p><strong>Hazır Konteyner:</strong> ${containers.filter(c => c.status === 'Ready for Transport').length}</p>
        </div>
        
        <div class="report-section">
            <h3>🫐 KATEGORİ BAZLI SATIŞLAR</h3>
            <table style="width: 100%; margin-top: 1rem;">
                <thead>
                    <tr style="background: #667eea; color: white;">
                        <th style="padding: 10px; text-align: left;">Kategori</th>
                        <th style="padding: 10px; text-align: right;">Sipariş Sayısı</th>
                        <th style="padding: 10px; text-align: right;">Toplam Ağırlık</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(categoryStats).map(cat => `
                        <tr>
                            <td style="padding: 10px;">${cat}</td>
                            <td style="padding: 10px; text-align: right;">${categoryStats[cat].count}</td>
                            <td style="padding: 10px; text-align: right;">${categoryStats[cat].weight.toLocaleString('tr-TR')} kg</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="report-section">
            <h3>📊 MEVCUT ENVANTER</h3>
            <table style="width: 100%; margin-top: 1rem;">
                <thead>
                    <tr style="background: #667eea; color: white;">
                        <th style="padding: 10px; text-align: left;">Ürün</th>
                        <th style="padding: 10px; text-align: left;">Kategori</th>
                        <th style="padding: 10px; text-align: right;">Mevcut Stok</th>
                        <th style="padding: 10px; text-align: right;">Minimum Stok</th>
                        <th style="padding: 10px; text-align: center;">Durum</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.values(inventory).map(item => `
                        <tr>
                            <td style="padding: 10px;">${item.productName}</td>
                            <td style="padding: 10px;">${item.category}</td>
                            <td style="padding: 10px; text-align: right;">${item.quantity.toLocaleString('tr-TR')} kg</td>
                            <td style="padding: 10px; text-align: right;">${item.minStock.toLocaleString('tr-TR')} kg</td>
                            <td style="padding: 10px; text-align: center;">
                                <span class="status-badge ${item.status === 'Low' ? 'status-pending' : 'status-completed'}">
                                    ${item.status === 'Low' ? 'Düşük' : 'Normal'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div style="text-align: center; margin-top: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 5px;">
            <p style="color: #666; font-size: 0.9rem;">Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')} - ${new Date().toLocaleTimeString('tr-TR')}</p>
        </div>
    `;
}