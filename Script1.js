// --- Import Firebase SDKs ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-analytics.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyCsbIKFvr7UKpFZbJpij8pXQ8WpXGT2l6M",
    authDomain: "kitchen-dashboard-d808a.firebaseapp.com",
    databaseURL: "https://kitchen-dashboard-d808a-default-rtdb.firebaseio.com",
    projectId: "kitchen-dashboard-d808a",
    storageBucket: "kitchen-dashboard-d808a.firebasestorage.app",
    messagingSenderId: "846662260040",
    appId: "1:846662260040:web:142989e4d762fd01bbcf7d",
    measurementId: "G-WNKB89ZCRZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const auth = getAuth(app);

const dbRef = ref(db, 'storeData/dashboardState');

// --- Authentication Logic ---
const loginModal = document.getElementById('loginModal');
const loginUser = document.getElementById('loginUser');
const loginPass = document.getElementById('loginPass');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

loginBtn.addEventListener('click', function () {
    let u = loginUser.value.trim();
    const p = loginPass.value.trim();

    if (!u || !p) {
        loginError.textContent = 'Please enter username and password.';
        return;
    }

    // Automatically format username to email if typed as 'tuckman'
    if (!u.includes('@')) {
        u += '@store.com';
    }

    signInWithEmailAndPassword(auth, u, p)
        .then(() => {
            loginError.textContent = '';
            loginModal.style.display = 'none';
        })
        .catch((error) => {
            loginError.textContent = 'Invalid username or password.';
            console.error("Auth error: ", error);
        });
});

loginPass.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') loginBtn.click();
});

// Monitor Auth State
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginModal.style.display = 'none';
        initCloudSync();
    } else {
        loginModal.style.display = 'flex';
    }
});

// --- State Variables ---
let totalAmount = 0;
let daysLog = [];
let inventory = [
    { id: 1, name: 'Kinder Bueno', stock: 12, cost: 0.80 },
    { id: 2, name: 'Bottled Water', stock: 25, cost: 0.75 }
];
let currentOrder = [];

const totalDisplay = document.getElementById('total');
const amountInput = document.getElementById('amountInput');
const reasonInput = document.getElementById('reasonInput');
const addBtn = document.getElementById('addBtn');
const subtractBtn = document.getElementById('subtractBtn');

const cashLogContainer = document.getElementById('cashLogContainer');
const totalInflowDisplay = document.getElementById('totalInflow');
const totalOutflowDisplay = document.getElementById('totalOutflow');

const startDayBtn = document.getElementById('startDayBtn');
const endDayBtn = document.getElementById('endDayBtn');
const resetCashBtn = document.getElementById('resetCashBtn');

const inventoryContainer = document.getElementById('inventoryContainer');
const newItemInput = document.getElementById('newItemInput');
const newItemCost = document.getElementById('newItemCost');
const addItemBtn = document.getElementById('addItemBtn');

const orderContainer = document.getElementById('orderContainer');
const orderTotalDisplay = document.getElementById('orderTotal');
const sellBtn = document.getElementById('sellBtn');

async function saveData() {
    try {
        await set(dbRef, {
            totalAmount: totalAmount,
            daysLog: daysLog,
            inventory: inventory,
            currentOrder: currentOrder
        });
    } catch (error) {
        console.error("Error saving data to cloud: ", error);
    }
}

function initCloudSync() {
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            totalAmount = data.totalAmount ?? 0;
            daysLog = data.daysLog ?? [];
            inventory = data.inventory ?? inventory;
            currentOrder = data.currentOrder ?? [];

            updateCashDisplay();
            renderInventory();
            renderOrder();
            renderCashLog();
            checkActiveDayState();
        } else {
            saveData();
        }
    }, (error) => {
        console.error("Error getting live data: ", error);
    });
}

function updateCashDisplay() {
    totalDisplay.textContent = `£${totalAmount.toFixed(2)}`;
}

function checkActiveDayState() {
    const activeDay = daysLog.find(d => d.isActive);
    if (activeDay) {
        startDayBtn.disabled = true;
        endDayBtn.disabled = false;
    } else {
        startDayBtn.disabled = false;
        endDayBtn.disabled = true;
    }
}

startDayBtn.addEventListener('click', function () {
    const today = new Date().toLocaleDateString(undefined, { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });

    const activeDay = daysLog.find(d => d.isActive);
    if (activeDay) {
        alert('You must end the current day before starting a new one.');
        return;
    }

    daysLog.unshift({
        id: Date.now(),
        dateStr: today,
        isActive: true,
        logs: []
    });

    saveData();
});

endDayBtn.addEventListener('click', function () {
    const activeDay = daysLog.find(d => d.isActive);
    if (activeDay) {
        activeDay.isActive = false;
    }

    saveData();
});

// Reset is protected by Firebase security rules (signed-in approved users only).
// No client-side passwords: never store credentials in frontend code.
resetCashBtn.addEventListener('click', function () {
    const confirmDelete = confirm("Are you sure you want to delete all cash data?");
    if (confirmDelete) {
        daysLog = [];
        totalAmount = 0;
        saveData();
    }
});

function addCashLog(type, amount, detailText) {
    let activeDay = daysLog.find(d => d.isActive);
    
    if (!activeDay) {
        const today = new Date().toLocaleDateString(undefined, { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        activeDay = {
            id: Date.now(),
            dateStr: today,
            isActive: true,
            logs: []
        };
        daysLog.unshift(activeDay);
    }

    activeDay.logs.unshift({
        id: Date.now(),
        type: type,
        amount: amount,
        details: detailText
    });
    
    saveData();
}

function renderCashLog() {
    cashLogContainer.innerHTML = '';

    let sumIn = 0;
    let sumOut = 0;

    if (daysLog.length === 0) {
        cashLogContainer.innerHTML = '<p class="empty-msg">Click "Start Day" to begin logging</p>';
    } else {
        daysLog.forEach(day => {
            const dayBox = document.createElement('div');
            dayBox.className = 'day-box';

            // Build with textContent so stored values can never inject HTML/scripts
            const dateSpan = document.createElement('span');
            dateSpan.textContent = `📅 ${day.dateStr}`;
            const header = document.createElement('div');
            header.className = 'day-box-header';
            header.appendChild(dateSpan);
            if (day.isActive) {
                const activeSpan = document.createElement('span');
                activeSpan.textContent = '(Active)';
                activeSpan.style.color = '#16a34a';
                activeSpan.style.fontSize = '0.75rem';
                header.appendChild(activeSpan);
            }
            dayBox.appendChild(header);

            const content = document.createElement('div');
            content.className = 'day-box-content';

            if (day.logs.length === 0) {
                const emptyMsg = document.createElement('p');
                emptyMsg.className = 'empty-msg';
                emptyMsg.style.fontSize = '0.8rem';
                emptyMsg.style.margin = '0.2rem 0';
                emptyMsg.textContent = 'No entries for this day';
                content.appendChild(emptyMsg);
            } else {
                day.logs.forEach(log => {
                    if (log.type === 'inflow') sumIn += log.amount;
                    if (log.type === 'outflow') sumOut += log.amount;

                    const entry = document.createElement('div');
                    entry.className = `log-entry ${log.type}`;

                    const sign = log.type === 'inflow' ? '+' : '-';
                    const amountSpan = document.createElement('span');
                    amountSpan.className = 'log-amount';
                    amountSpan.textContent = `${sign}£${Number(log.amount).toFixed(2)}`;
                    const detailsSpan = document.createElement('span');
                    detailsSpan.className = 'log-details';
                    detailsSpan.textContent = log.details;
                    entry.appendChild(amountSpan);
                    entry.appendChild(detailsSpan);
                    content.appendChild(entry);
                });
            }

            dayBox.appendChild(content);
            cashLogContainer.appendChild(dayBox);
        });
    }

    totalInflowDisplay.textContent = `£${sumIn.toFixed(2)}`;
    totalOutflowDisplay.textContent = `£${sumOut.toFixed(2)}`;
}

addBtn.addEventListener('click', function () {
    const value = parseFloat(amountInput.value);
    const reason = reasonInput.value.trim();

    if (isNaN(value) || value <= 0) {
        alert('Please enter a valid amount.');
        return;
    }
    if (reason === '') {
        alert('Please enter a reason for adding cash.');
        return;
    }

    totalAmount += value;
    addCashLog('inflow', value, reason);
    
    amountInput.value = '';
    reasonInput.value = '';
});

subtractBtn.addEventListener('click', function () {
    const value = parseFloat(amountInput.value);
    const reason = reasonInput.value.trim();

    if (isNaN(value) || value <= 0) {
        alert('Please enter a valid amount.');
        return;
    }
    if (reason === '') {
        alert('Please enter a reason for subtracting cash.');
        return;
    }

    totalAmount -= value;
    addCashLog('outflow', value, reason);
    
    amountInput.value = '';
    reasonInput.value = '';
});

function renderInventory() {
    inventoryContainer.innerHTML = '';

    inventory.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';

        const itemInfo = document.createElement('div');
        itemInfo.className = 'item-info';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = item.name;
        const stockSpan = document.createElement('span');
        stockSpan.className = 'item-stock';
        const stockLabel = document.createElement('strong');
        stockLabel.textContent = item.stock;
        stockSpan.append('Stock: ', stockLabel, ` | Cost: £${Number(item.cost).toFixed(2)}`);
        itemInfo.appendChild(nameSpan);
        itemInfo.appendChild(stockSpan);

        const controls = document.createElement('div');
        controls.className = 'item-controls';

        const makeBtn = (text, className, handler) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.className = className;
            btn.addEventListener('click', () => handler(item.id));
            return btn;
        };

        controls.appendChild(makeBtn('+ Order', 'btn-order', window.addToOrder));
        controls.appendChild(makeBtn('+', 'btn-add', (id) => window.updateStock(id, 1)));
        controls.appendChild(makeBtn('-', 'btn-sub', (id) => window.updateStock(id, -1)));
        controls.appendChild(makeBtn('×', 'btn-del', window.removeItem));

        itemCard.appendChild(itemInfo);
        itemCard.appendChild(controls);
        inventoryContainer.appendChild(itemCard);
    });
}

function renderOrder() {
    orderContainer.innerHTML = '';
    let totalCost = 0;

    if (currentOrder.length === 0) {
        orderContainer.innerHTML = '<p class="empty-msg">No items in current order</p>';
    } else {
        currentOrder.forEach(orderItem => {
            const itemTotal = orderItem.quantity * orderItem.cost;
            totalCost += itemTotal;

            const orderCard = document.createElement('div');
            orderCard.className = 'item-card';

            const itemInfo = document.createElement('div');
            itemInfo.className = 'item-info';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'item-name';
            nameSpan.textContent = `${orderItem.name} (x${orderItem.quantity})`;
            const subtotalSpan = document.createElement('span');
            subtotalSpan.className = 'item-stock';
            subtotalSpan.textContent = `Subtotal: £${itemTotal.toFixed(2)}`;
            itemInfo.appendChild(nameSpan);
            itemInfo.appendChild(subtotalSpan);

            const controls = document.createElement('div');
            controls.className = 'item-controls';
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.className = 'btn-del';
            removeBtn.addEventListener('click', () => window.removeFromOrder(orderItem.itemId));
            controls.appendChild(removeBtn);

            orderCard.appendChild(itemInfo);
            orderCard.appendChild(controls);
            orderContainer.appendChild(orderCard);
        });
    }

    orderTotalDisplay.textContent = `£${totalCost.toFixed(2)}`;
}

window.addToOrder = function (itemId) {
    const stockItem = inventory.find(i => i.id === itemId);
    if (!stockItem) return;

    const existingOrderItem = currentOrder.find(o => o.itemId === itemId);
    const currentQtyInOrder = existingOrderItem ? existingOrderItem.quantity : 0;

    if (currentQtyInOrder + 1 > stockItem.stock) {
        alert(`Cannot add more ${stockItem.name}. Not enough stock!`);
        return;
    }

    if (existingOrderItem) {
        existingOrderItem.quantity += 1;
    } else {
        currentOrder.push({
            itemId: stockItem.id,
            name: stockItem.name,
            quantity: 1,
            cost: stockItem.cost
        });
    }

    saveData();
};

window.removeFromOrder = function (itemId) {
    currentOrder = currentOrder.filter(o => o.itemId !== itemId);
    saveData();
};

window.updateStock = function (id, change) {
    const item = inventory.find(i => i.id === id);
    if (item) {
        item.stock += change;
        if (item.stock < 0) item.stock = 0;
        saveData();
    }
};

window.removeItem = function (id) {
    inventory = inventory.filter(i => i.id !== id);
    currentOrder = currentOrder.filter(o => o.itemId !== id);
    saveData();
};

addItemBtn.addEventListener('click', function () {
    const name = newItemInput.value.trim();
    const cost = parseFloat(newItemCost.value);

    if (name !== '') {
        const newItem = {
            id: Date.now(),
            name: name,
            stock: 0,
            cost: !isNaN(cost) && cost >= 0 ? cost : 0
        };
        inventory.push(newItem);
        newItemInput.value = '';
        newItemCost.value = '';
        saveData();
    }
});

sellBtn.addEventListener('click', function () {
    if (currentOrder.length === 0) return;

    let orderTotalCost = 0;

    currentOrder.forEach(orderItem => {
        const stockItem = inventory.find(i => i.id === orderItem.itemId);
        if (stockItem) {
            stockItem.stock -= orderItem.quantity;
            if (stockItem.stock < 0) stockItem.stock = 0;
        }

        const itemTotal = orderItem.quantity * orderItem.cost;
        orderTotalCost += itemTotal;

        const formattedName = orderItem.name.toLowerCase().replace(/\s+/g, '');
        
        let activeDay = daysLog.find(d => d.isActive);
        if (!activeDay) {
            const today = new Date().toLocaleDateString(undefined, { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            activeDay = {
                id: Date.now(),
                dateStr: today,
                isActive: true,
                logs: []
            };
            daysLog.unshift(activeDay);
        }

        activeDay.logs.unshift({
            id: Date.now(),
            type: 'inflow',
            amount: itemTotal,
            details: `${orderItem.quantity}x ${formattedName}`
        });
    });

    totalAmount += orderTotalCost;
    currentOrder = [];

    saveData();
});
