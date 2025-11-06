const STORAGE_KEYS = {
    SHIPMENTS: 'shipments',
    CONTAINERS: 'containers',
    INVENTORY: 'inventory',
    FINANCIALS: 'financials',
    FLEET: 'fleet'
};

const CONTAINER_TYPES = {
    Small: {
        capacity: 2000,
        pricePerKm: 25 
    },
    Medium: {
        capacity: 5000,
        pricePerKm: 40
    },
    Large: {
        capacity: 10000,
        pricePerKm: 65    
    }
};

const FLEET_DATA = {
    ships: [
        {
            id: 'S001',
            name: 'BlueSea',
            capacity: 100000,
            fuelCostPerKm: 180,
            crewCost: 450000,
            maintenance: 250000,
            totalExpense: 880000
        },
        {
            id: 'S002',
            name: 'OceanStar',
            capacity: 120000,
            fuelCostPerKm: 220,
            crewCost: 550000,
            maintenance: 300000,
            totalExpense: 1070000
        },
        {
            id: 'S003',
            name: 'AegeanWind',
            capacity: 90000,
            fuelCostPerKm: 150,
            crewCost: 400000,
            maintenance: 200000,
            totalExpense: 750000
        }
    ],
    trucks: [
        {
            id: 'T001',
            name: 'RoadKing',
            capacity: 10000,
            fuelCostPerKm: 45,
            driverCost: 85000,
            maintenance: 35000,
            totalExpense: 120000
        },
        {
            id: 'T002',
            name: 'FastMove',
            capacity: 12000,
            fuelCostPerKm: 50,
            driverCost: 90000,
            maintenance: 40000,
            totalExpense: 130000
        },
        {
            id: 'T003',
            name: 'CargoPro',
            capacity: 9000,
            fuelCostPerKm: 40,
            driverCost: 80000,
            maintenance: 30000,
            totalExpense: 110000
        },
        {
            id: 'T004',
            name: 'HeavyLoad',
            capacity: 15000,
            fuelCostPerKm: 60,
            driverCost: 95000,
            maintenance: 45000,
            totalExpense: 140000
        }
    ]
};

const INITIAL_INVENTORY = {
};

const DISTANCES = {
    'Istanbul': 650,
    'Ankara': 570,
    'Izmir': 150,
    'Antalya': 280,
    'Bursa': 500,
    
    'Berlin': 3000,
    'Paris': 3200,
    'London': 3500,
    'Rome': 2100,
    'Madrid': 3800,
    'Vienna': 2300,
    'Amsterdam': 3300,
    'Brussels': 3250,
    'Athens': 750,
    'Sofia': 800,
    
    'Dubai': 3500,
    'Abu Dhabi': 3600,
    'Riyadh': 2800,
    'Kuwait': 2500,
    'Doha': 3200,
    
    'Tokyo': 11000,
    'Beijing': 9000,
    'Shanghai': 9500,
    'Hong Kong': 9800,
    'Singapore': 9200,
    'Bangkok': 8500,
    
    'New York': 9500,
    'Los Angeles': 12000,
    'Chicago': 10000,
    'Miami': 10500,
    'Toronto': 9800,
    
    'Sydney': 15000,
    'Melbourne': 15200,
    'Mumbai': 6500,
    'Cairo': 1800
};


function saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function loadFromStorage(key, defaultValue = null) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
}

function initializeSystem() {
    if (!loadFromStorage(STORAGE_KEYS.SHIPMENTS)) {
        saveToStorage(STORAGE_KEYS.SHIPMENTS, []);
    }
    
    if (!loadFromStorage(STORAGE_KEYS.CONTAINERS)) {
        saveToStorage(STORAGE_KEYS.CONTAINERS, [
            { id: 1, type: 'Small', capacity: 2000, currentLoad: 0, status: 'Available', shipments: [] },
            { id: 2, type: 'Small', capacity: 2000, currentLoad: 0, status: 'Available', shipments: [] },
            { id: 3, type: 'Medium', capacity: 5000, currentLoad: 0, status: 'Available', shipments: [] },
            { id: 4, type: 'Medium', capacity: 5000, currentLoad: 0, status: 'Available', shipments: [] },
            { id: 5, type: 'Large', capacity: 10000, currentLoad: 0, status: 'Available', shipments: [] },
            { id: 6, type: 'Large', capacity: 10000, currentLoad: 0, status: 'Available', shipments: [] }
        ]);
    }
    
    if (!loadFromStorage(STORAGE_KEYS.INVENTORY)) {
        saveToStorage(STORAGE_KEYS.INVENTORY, {});
    }
    
    if (!loadFromStorage(STORAGE_KEYS.FLEET)) {
        saveToStorage(STORAGE_KEYS.FLEET, FLEET_DATA);
    }
    
    if (!loadFromStorage(STORAGE_KEYS.FINANCIALS)) {
        saveToStorage(STORAGE_KEYS.FINANCIALS, {
            totalRevenue: 0,
            totalExpenses: 0,
            netIncome: 0,
            tax: 0,
            profitAfterTax: 0
        });
    }
}

function calculateDistance(country, shipmentType) {
    let distances;
    
    if (shipmentType === 'road') {
        distances = window.ROAD_DISTANCES || {};
    } else if (shipmentType === 'sea') {
        distances = window.SEA_DISTANCES || {};
    } else {
        return 2500;
    }

    if (distances[country]) {
        return distances[country];
    }
    
    if (DISTANCES[country]) {
        return DISTANCES[country];
    }
    
    return 2500; 
}


function calculatePrice(weight, distance, containerType) {
    const containerInfo = CONTAINER_TYPES[containerType];
    
    if (!containerInfo) {
        throw new Error('Geçersiz konteyner tipi');
    }
    
    if (weight > containerInfo.capacity) {
        return {
            error: true,
            message: `Ağırlık ${containerType} konteyner kapasitesini (${containerInfo.capacity} kg) aşıyor!`
        };
    }
    
    const totalPrice = distance * containerInfo.pricePerKm;
    
    const estimatedDays = Math.ceil(distance / 500);
    
    return {
        error: false,
        totalPrice: totalPrice,
        distance: distance,
        estimatedDays: estimatedDays,
        pricePerKm: containerInfo.pricePerKm
    };
}

function updateInventory(productName, category, quantity, operation = 'subtract') {
    const inventory = loadFromStorage(STORAGE_KEYS.INVENTORY) || {};
    
    const inventoryKey = `${productName}_${category}`;
    
    if (!inventory[inventoryKey]) {
        inventory[inventoryKey] = {
            productName: productName,
            category: category,
            quantity: 50000,
            minStock: 2000,
            status: 'OK'
        };
    }
    
    if (operation === 'subtract') {
        if (inventory[inventoryKey].quantity < quantity) {
            return { 
                error: true, 
                message: `${productName} (${category}) için yeterli stok yok! Mevcut: ${inventory[inventoryKey].quantity} kg` 
            };
        }
        inventory[inventoryKey].quantity -= quantity;
    } else if (operation === 'add') {
        inventory[inventoryKey].quantity += quantity;
    }
    
    if (inventory[inventoryKey].quantity < inventory[inventoryKey].minStock) {
        inventory[inventoryKey].status = 'Low';
    } else {
        inventory[inventoryKey].status = 'OK';
    }
    
    saveToStorage(STORAGE_KEYS.INVENTORY, inventory);
    return { error: false, inventory: inventory[inventoryKey] };
}


function addInventoryProduct(productName, category, initialQuantity = 10000, minStock = 2000) {
    const inventory = loadFromStorage(STORAGE_KEYS.INVENTORY) || {};
    const inventoryKey = `${productName}_${category}`;
    
    if (inventory[inventoryKey]) {
        return { 
            error: true, 
            message: `${productName} (${category}) zaten envanterde mevcut!` 
        };
    }
    
    inventory[inventoryKey] = {
        productName: productName,
        category: category,
        quantity: initialQuantity,
        minStock: minStock,
        status: initialQuantity >= minStock ? 'OK' : 'Low'
    };
    
    saveToStorage(STORAGE_KEYS.INVENTORY, inventory);
    return { error: false, product: inventory[inventoryKey] };
}


function restockInventory(productName, category, quantity) {
    return updateInventory(productName, category, quantity, 'add');
}

document.addEventListener('DOMContentLoaded', function() {
    initializeSystem();
});