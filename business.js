/**
 * Aone Gandaki Fresh House - Butchery & Poultry Suite
 * Complete Business Platform: Stock Inventory, Purchases, Sales, Expenses & P&L Statement
 * Kapil Tiwari Business Management Suite
 */

const STORAGE_KEY = 'ag_inventory_v4';
const PURCHASES_KEY = 'ag_purchases_v4';
const SALES_KEY = 'ag_sales_v4';
const EXPENSES_KEY = 'ag_expenses_v4';
const THEME_KEY = 'meat_shop_theme';

// Seed initial empty inventory data (User will add their own real store items)
const DEFAULT_INVENTORY = [];

// Seed initial empty purchases
const DEFAULT_PURCHASES = [];

// Seed initial empty sales
const DEFAULT_SALES = [];

// Seed initial empty expenses
const DEFAULT_EXPENSES = [];

// App State
let inventory = [];
let purchases = [];
let sales = [];
let expenses = [];

let currentCategory = 'all';
let currentSearch = '';
let currentStatusFilter = 'all';
let currentSort = 'name-asc';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadAllData();
    setupEventListeners();
    renderAllPanes();

    // Default dates for modals
    const today = new Date().toISOString().split('T')[0];
    const elPurDate = document.getElementById('purchase-date');
    if (elPurDate) elPurDate.value = today;
    const elExpDate = document.getElementById('expense-date');
    if (elExpDate) elExpDate.value = today;
});

// Switch Active Section Tabs
function switchSection(sectionId) {
    document.querySelectorAll('.section-nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.business-section-pane').forEach(pane => pane.classList.remove('active'));

    const tabBtn = document.querySelector(`.tab-${sectionId}`);
    const pane = document.getElementById(`pane-${sectionId}`);

    if (tabBtn) tabBtn.classList.add('active');
    if (pane) pane.classList.add('active');

    // Refresh pane content
    if (sectionId === 'inventory') renderInventoryPane();
    if (sectionId === 'purchases') renderPurchasesPane();
    if (sectionId === 'sales') renderSalesPane();
    if (sectionId === 'expenses') renderExpensesPane();
    if (sectionId === 'pnl') renderPnlPane();
}

// Theme Management (Light / Dark Mode)
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    const icon = document.getElementById('theme-icon');
    const btn = document.getElementById('theme-toggle-btn');
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        if (icon) icon.className = 'fas fa-moon';
        if (btn) btn.setAttribute('title', 'Switch to Dark Mode');
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (icon) icon.className = 'fas fa-sun';
        if (btn) btn.setAttribute('title', 'Switch to Light Mode');
    }
    localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    applyTheme(isLight ? 'dark' : 'light');
    showToast(`Switched to ${isLight ? 'Dark' : 'Light'} Mode`, 'info');
}

// Data Storage Management
function loadAllData() {
    try {
        inventory = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [...DEFAULT_INVENTORY];
    } catch(e) { inventory = [...DEFAULT_INVENTORY]; }

    try {
        purchases = JSON.parse(localStorage.getItem(PURCHASES_KEY)) || [...DEFAULT_PURCHASES];
    } catch(e) { purchases = [...DEFAULT_PURCHASES]; }

    try {
        sales = JSON.parse(localStorage.getItem(SALES_KEY)) || [...DEFAULT_SALES];
    } catch(e) { sales = [...DEFAULT_SALES]; }

    try {
        expenses = JSON.parse(localStorage.getItem(EXPENSES_KEY)) || [...DEFAULT_EXPENSES];
    } catch(e) { expenses = [...DEFAULT_EXPENSES]; }

    saveAllData();
}

function saveAllData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

function renderAllPanes() {
    renderInventoryPane();
    renderPurchasesPane();
    renderSalesPane();
    renderExpensesPane();
    renderPnlPane();
}

// Setup Event Listeners
function setupEventListeners() {
    // Inventory category tabs
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentCategory = e.currentTarget.dataset.category;
            renderInventoryTable();
        });
    });

    // Inventory search & filters
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.toLowerCase().trim();
            renderInventoryTable();
        });
    }

    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            currentStatusFilter = e.target.value;
            renderInventoryTable();
        });
    }

    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) {
        sortFilter.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderInventoryTable();
        });
    }

    // Purchases search
    const searchPurchase = document.getElementById('search-purchase-input');
    if (searchPurchase) {
        searchPurchase.addEventListener('input', () => renderPurchasesTable());
    }

    // Sales search
    const searchSales = document.getElementById('search-sales-input');
    if (searchSales) {
        searchSales.addEventListener('input', () => renderSalesTable());
    }

    // Expenses search
    const searchExpense = document.getElementById('search-expense-input');
    if (searchExpense) {
        searchExpense.addEventListener('input', () => renderExpensesTable());
    }

    // Forms
    const meatForm = document.getElementById('meat-stock-form');
    if (meatForm) meatForm.addEventListener('submit', handleAddEditSubmit);

    const purchaseForm = document.getElementById('purchase-form');
    if (purchaseForm) purchaseForm.addEventListener('submit', handlePurchaseSubmit);

    const saleForm = document.getElementById('record-sale-form');
    if (saleForm) saleForm.addEventListener('submit', handleSaleSubmit);

    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) expenseForm.addEventListener('submit', handleExpenseSubmit);
}


/* ===================================================
   1. INVENTORY SECTION LOGIC
   =================================================== */

function renderInventoryPane() {
    renderInventoryKPIs();
    renderInventoryTable();
}

function renderInventoryKPIs() {
    let totalStockKg = 0;
    let totalUnitsCount = 0;
    let totalCostVal = 0;   // Sum of Qty * CP
    let totalRetailVal = 0; // Sum of Qty * SP
    let lowStockCount = 0;

    inventory.forEach(item => {
        const qty = parseFloat(item.quantity) || 0;
        const cp = parseFloat(item.costPrice) || 0;
        const sp = parseFloat(item.unitPrice) || 0;
        const minThresh = parseFloat(item.minThreshold) || 0;

        if (item.unit === 'kg') {
            totalStockKg += qty;
        } else {
            totalUnitsCount += qty;
        }

        totalCostVal += qty * cp;
        totalRetailVal += qty * sp;

        if (qty <= minThresh) {
            lowStockCount++;
        }
    });

    const netProfit = totalRetailVal - totalCostVal;
    const overallMargin = totalRetailVal > 0 ? ((netProfit / totalRetailVal) * 100).toFixed(1) : '0.0';

    const stockText = totalUnitsCount > 0 
        ? `${totalStockKg.toFixed(1)} kg + ${totalUnitsCount} units`
        : `${totalStockKg.toFixed(1)} kg`;

    const elStock = document.getElementById('kpi-total-stock');
    if (elStock) elStock.innerText = stockText;

    const elCost = document.getElementById('kpi-total-cost');
    if (elCost) elCost.innerText = `Rs. ${Math.round(totalCostVal).toLocaleString()}`;

    const elVal = document.getElementById('kpi-total-val');
    if (elVal) elVal.innerText = `Rs. ${Math.round(totalRetailVal).toLocaleString()}`;

    const elProfit = document.getElementById('kpi-total-profit');
    if (elProfit) {
        const prefix = netProfit >= 0 ? '+Rs. ' : '-Rs. ';
        elProfit.innerText = `${prefix}${Math.abs(Math.round(netProfit)).toLocaleString()}`;
        elProfit.style.color = netProfit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    }

    const elMarginTrend = document.getElementById('kpi-margin-trend');
    if (elMarginTrend) {
        elMarginTrend.innerHTML = `<i class="fas fa-percentage"></i> ${overallMargin}% Margin`;
        elMarginTrend.style.color = netProfit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    }

    const elProfitStatus = document.getElementById('kpi-profit-status');
    if (elProfitStatus) {
        elProfitStatus.innerText = netProfit >= 0 ? 'Profitable' : 'Loss Warning';
    }

    const elLow = document.getElementById('kpi-low-stock');
    if (elLow) elLow.innerText = lowStockCount;

    const elItems = document.getElementById('kpi-total-items');
    if (elItems) elItems.innerText = `${inventory.length} Meat Products`;
}

function getFilteredInventory() {
    return inventory.filter(item => {
        if (currentCategory !== 'all' && item.category !== currentCategory) return false;

        if (currentSearch) {
            const matchesName = item.name.toLowerCase().includes(currentSearch);
            const matchesCut = (item.cutType || '').toLowerCase().includes(currentSearch);
            const matchesSupplier = (item.supplier || '').toLowerCase().includes(currentSearch);
            if (!matchesName && !matchesCut && !matchesSupplier) return false;
        }

        const qty = parseFloat(item.quantity) || 0;
        const min = parseFloat(item.minThreshold) || 0;

        if (currentStatusFilter === 'in_stock' && qty <= 0) return false;
        if (currentStatusFilter === 'low_stock' && (qty <= 0 || qty > min)) return false;
        if (currentStatusFilter === 'out_stock' && qty > 0) return false;

        return true;
    }).sort((a, b) => {
        const cpA = parseFloat(a.costPrice) || 0;
        const spA = parseFloat(a.unitPrice) || 0;
        const cpB = parseFloat(b.costPrice) || 0;
        const spB = parseFloat(b.unitPrice) || 0;

        const profitA = spA - cpA;
        const profitB = spB - cpB;
        const marginA = spA > 0 ? (profitA / spA) : 0;
        const marginB = spB > 0 ? (profitB / spB) : 0;

        if (currentSort === 'name-asc') return a.name.localeCompare(b.name);
        if (currentSort === 'profit-desc') return marginB - marginA;
        if (currentSort === 'profit-asc') return marginA - marginB;
        if (currentSort === 'qty-desc') return (parseFloat(b.quantity) || 0) - (parseFloat(a.quantity) || 0);
        if (currentSort === 'qty-asc') return (parseFloat(a.quantity) || 0) - (parseFloat(b.quantity) || 0);
        if (currentSort === 'price-desc') return spB - spA;
        return 0;
    });
}

function renderInventoryTable() {
    const items = getFilteredInventory();
    const tbody = document.getElementById('meat-table-body');
    const emptyState = document.getElementById('empty-state');
    const tableWrap = document.getElementById('table-view-wrapper');

    if (!tbody) return;

    if (items.length === 0) {
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (tableWrap) tableWrap.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    let sumStockKg = 0;
    let sumUnits = 0;
    let sumCost = 0;
    let sumRetail = 0;

    tbody.innerHTML = items.map(item => {
        const qty = parseFloat(item.quantity) || 0;
        const cp = parseFloat(item.costPrice) || 0;
        const sp = parseFloat(item.unitPrice) || 0;
        const minThresh = parseFloat(item.minThreshold) || 1;

        const totalCost = qty * cp;
        const totalRetail = qty * sp;
        const unitProfit = sp - cp;
        const totalProfit = qty * unitProfit;
        const marginPct = sp > 0 ? ((unitProfit / sp) * 100).toFixed(1) : '0.0';

        if (item.unit === 'kg') sumStockKg += qty;
        else sumUnits += qty;

        sumCost += totalCost;
        sumRetail += totalRetail;

        // Stock status badge & bar
        let stockBadge = '<span class="badge-tag badge-instock"><i class="fas fa-check-circle"></i> In Stock</span>';
        let barClass = 'good';
        const percent = Math.min(100, Math.round((qty / (minThresh * 2.5)) * 100));

        if (qty <= 0) {
            stockBadge = '<span class="badge-tag badge-outstock"><i class="fas fa-times-circle"></i> Out of Stock</span>';
            barClass = 'danger';
        } else if (qty <= minThresh) {
            stockBadge = '<span class="badge-tag badge-lowstock"><i class="fas fa-exclamation-triangle"></i> Low Stock</span>';
            barClass = 'warning';
        }

        // Profit styling
        let profitBadgeClass = 'positive';
        let profitSign = '+';
        if (unitProfit < 0) {
            profitBadgeClass = 'negative';
            profitSign = '';
        } else if (unitProfit === 0) {
            profitBadgeClass = 'neutral';
            profitSign = '';
        }

        const categoryClass = item.category || 'chicken';
        const iconChar = getCategoryIcon(item.category);
        const categoryLabel = getCategoryLabel(item.category);

        return `
            <tr>
                <td>
                    <div class="meat-item-cell">
                        <div class="item-avatar ${categoryClass}">
                            <i class="${iconChar}"></i>
                        </div>
                        <div class="item-meta">
                            <div class="item-name">${escapeHTML(item.name)}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="category-pill ${categoryClass}">
                        <i class="${iconChar}"></i> ${categoryLabel}
                    </span>
                </td>
                <td>
                    <div><strong>${qty} ${item.unit}</strong></div>
                    <div class="stock-meter">
                        <div class="stock-bar ${barClass}" style="width: ${percent}%;"></div>
                    </div>
                </td>
                <td>
                    <div class="price-cp-text">Rs. ${cp.toLocaleString()} <span style="font-size: 12px; color: var(--text-dim); font-weight: normal;">/ ${item.unit}</span></div>
                </td>
                <td>
                    <div class="price-sp-text">Rs. ${sp.toLocaleString()} <span style="font-size: 12px; color: var(--text-dim); font-weight: normal;">/ ${item.unit}</span></div>
                </td>
                <td>
                    ${stockBadge}
                </td>
                <td style="text-align: center;">
                    <div class="table-actions" style="justify-content: center;">
                        <button class="btn-secondary btn-icon" title="Quick Adjust Stock (+/-)" onclick="openQuickAdjust('${item.id}')">
                            <i class="fas fa-plus-minus" style="font-size: 12px; color: var(--accent-blue);"></i>
                        </button>
                        <button class="btn-secondary btn-icon" title="Edit Details & Pricing" onclick="openEditModal('${item.id}')">
                            <i class="fas fa-edit" style="font-size: 12px; color: var(--primary);"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Bottom Summary
    const netSumProfit = sumRetail - sumCost;
    const netSumMargin = sumRetail > 0 ? ((netSumProfit / sumRetail) * 100).toFixed(1) : '0.0';

    const stockSumString = sumUnits > 0
        ? `${sumStockKg.toFixed(1)} kg + ${sumUnits} units`
        : `${sumStockKg.toFixed(1)} kg`;

    const elSumCount = document.getElementById('sum-items-count');
    if (elSumCount) elSumCount.innerText = `${items.length} items`;

    const elSumStock = document.getElementById('sum-stock-total');
    if (elSumStock) elSumStock.innerText = stockSumString;

    const elSumCost = document.getElementById('sum-cost-total');
    if (elSumCost) elSumCost.innerText = `Rs. ${Math.round(sumCost).toLocaleString()}`;

    const elSumRetail = document.getElementById('sum-retail-total');
    if (elSumRetail) elSumRetail.innerText = `Rs. ${Math.round(sumRetail).toLocaleString()}`;

    const elSumProfit = document.getElementById('sum-profit-total');
    if (elSumProfit) {
        const sign = netSumProfit >= 0 ? '+Rs. ' : '-Rs. ';
        elSumProfit.innerText = `${sign}${Math.abs(Math.round(netSumProfit)).toLocaleString()} (${sign}${netSumMargin}%)`;
        elSumProfit.style.color = netSumProfit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    }
}

function updateModalProfitCalc() {
    const qty = parseFloat(document.getElementById('form-quantity').value) || 0;
    const cp = parseFloat(document.getElementById('form-cp').value) || 0;
    const sp = parseFloat(document.getElementById('form-price').value) || 0;
    const unit = document.getElementById('form-unit').value || 'unit';

    const unitProfit = sp - cp;
    const marginPct = sp > 0 ? ((unitProfit / sp) * 100).toFixed(1) : '0.0';
    const totalProfit = qty * unitProfit;

    const elUnitProfit = document.getElementById('modal-calc-unit-profit');
    const elMargin = document.getElementById('modal-calc-margin');
    const elTotalProfit = document.getElementById('modal-calc-total-profit');

    const sign = unitProfit >= 0 ? '+Rs. ' : '-Rs. ';

    if (elUnitProfit) {
        elUnitProfit.innerText = `${sign}${Math.abs(unitProfit).toFixed(2)} / ${unit}`;
        elUnitProfit.className = `p-val ${unitProfit < 0 ? 'negative' : ''}`;
    }

    if (elMargin) {
        elMargin.innerText = `${unitProfit >= 0 ? '+' : ''}${marginPct}%`;
        elMargin.className = `p-val ${unitProfit < 0 ? 'negative' : ''}`;
    }

    if (elTotalProfit) {
        elTotalProfit.innerText = `${sign}${Math.abs(totalProfit).toFixed(2)}`;
        elTotalProfit.className = `p-val ${unitProfit < 0 ? 'negative' : ''}`;
    }
}

function openAddModal() {
    const form = document.getElementById('meat-stock-form');
    if (form) form.reset();

    const dlNames = document.getElementById('dl-inventory-names');
    if (dlNames) {
        dlNames.innerHTML = inventory.map(i => `<option value="${escapeHTML(i.name)}"></option>`).join('');
    }
    const dlSuppliers = document.getElementById('dl-suppliers');
    if (dlSuppliers) {
        const uniqueSuppliers = [...new Set(inventory.map(i => i.supplier).filter(Boolean))];
        dlSuppliers.innerHTML = uniqueSuppliers.map(s => `<option value="${escapeHTML(s)}"></option>`).join('');
    }

    document.getElementById('modal-stock-title').innerHTML = '<i class="fas fa-drumstick-bite" style="color:var(--primary);"></i> Add Meat / Poultry Product';
    document.getElementById('form-item-id').value = '';
    updateModalProfitCalc();
    openModal('meat-modal');
}

function openEditModal(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    document.getElementById('modal-stock-title').innerHTML = '<i class="fas fa-edit" style="color:var(--primary);"></i> Edit Item Details & Pricing';
    document.getElementById('form-item-id').value = item.id;
    document.getElementById('form-name').value = item.name;
    document.getElementById('form-category').value = item.category;
    document.getElementById('form-cut').value = item.cutType || '';
    document.getElementById('form-quantity').value = item.quantity;
    document.getElementById('form-unit').value = item.unit || 'kg';
    document.getElementById('form-cp').value = item.costPrice || 0;
    document.getElementById('form-price').value = item.unitPrice || 0;
    document.getElementById('form-threshold').value = item.minThreshold || 5;
    document.getElementById('form-supplier').value = item.supplier || '';

    updateModalProfitCalc();
    openModal('meat-modal');
}

function handleAddEditSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('form-item-id').value;
    const name = document.getElementById('form-name').value.trim();
    const category = document.getElementById('form-category').value;
    const cutType = document.getElementById('form-cut').value.trim();
    const quantity = parseFloat(document.getElementById('form-quantity').value) || 0;
    const unit = document.getElementById('form-unit').value;
    const costPrice = parseFloat(document.getElementById('form-cp').value) || 0;
    const unitPrice = parseFloat(document.getElementById('form-price').value) || 0;
    const minThreshold = parseFloat(document.getElementById('form-threshold').value) || 5;
    const supplier = document.getElementById('form-supplier').value.trim() || 'Aone Gandaki Fresh House';

    if (!name) {
        showToast('Please enter an item name', 'error');
        return;
    }

    if (id) {
        const index = inventory.findIndex(i => i.id === id);
        if (index !== -1) {
            inventory[index] = { ...inventory[index], name, category, cutType, quantity, unit, costPrice, unitPrice, minThreshold, supplier };
            showToast(`Updated "${name}" successfully`, 'success');
        }
    } else {
        const newId = 'AG-' + category.toUpperCase().substring(0, 3) + '-' + (inventory.length + 10);
        inventory.unshift({ id: newId, name, category, cutType, quantity, unit, costPrice, unitPrice, minThreshold, supplier });
        showToast(`Added "${name}" to stock catalog`, 'success');
    }

    saveAllData();
    renderInventoryPane();
    renderPnlPane();
    closeModal('meat-modal');
}

function openQuickAdjust(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const adjustment = prompt(`Quick Stock Adjustment for ${item.name} (${item.unit}):\nEnter change amount (e.g. +10 or -5):`, "+5");
    if (adjustment === null) return;

    const val = parseFloat(adjustment);
    if (isNaN(val)) {
        showToast('Invalid quantity entered', 'error');
        return;
    }

    const newQty = Math.max(0, parseFloat((item.quantity + val).toFixed(2)));
    item.quantity = newQty;

    saveAllData();
    renderInventoryPane();
    showToast(`Stock updated for ${item.name} (Now: ${newQty} ${item.unit})`, 'success');
}


/* ===================================================
   2. PURCHASES & RESTOCK SECTION LOGIC
   =================================================== */

function renderPurchasesPane() {
    renderPurchasesKPIs();
    renderPurchasesTable();
}

function renderPurchasesKPIs() {
    let totalPurchasesAmt = 0;
    let purchasesTodayAmt = 0;
    let totalVolumeKg = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    purchases.forEach(p => {
        const cost = parseFloat(p.totalCost) || 0;
        totalPurchasesAmt += cost;

        if (p.date === todayStr) {
            purchasesTodayAmt += cost;
        }

        if (p.unit === 'kg') {
            totalVolumeKg += parseFloat(p.quantity) || 0;
        }
    });

    const elTotal = document.getElementById('kpi-purchases-total');
    if (elTotal) elTotal.innerText = `Rs. ${Math.round(totalPurchasesAmt).toLocaleString()}`;

    const elCount = document.getElementById('kpi-purchases-count');
    if (elCount) elCount.innerText = `${purchases.length} Invoices`;

    const elToday = document.getElementById('kpi-purchases-today');
    if (elToday) elToday.innerText = `Rs. ${Math.round(purchasesTodayAmt).toLocaleString()}`;

    const elVol = document.getElementById('kpi-purchases-volume');
    if (elVol) elVol.innerText = `${totalVolumeKg.toFixed(1)} kg`;
}

function renderPurchasesTable() {
    const tbody = document.getElementById('purchases-table-body');
    const searchVal = (document.getElementById('search-purchase-input')?.value || '').toLowerCase().trim();
    if (!tbody) return;

    const filtered = purchases.filter(p => {
        if (!searchVal) return true;
        return (p.itemName || '').toLowerCase().includes(searchVal) ||
               (p.supplier || '').toLowerCase().includes(searchVal) ||
               (p.billNo || '').toLowerCase().includes(searchVal);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-dim);">No purchase records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const iconChar = getCategoryIcon(p.category);
        const catLabel = getCategoryLabel(p.category);
        const catClass = p.category || 'chicken';

        return `
            <tr>
                <td><strong>${p.date || 'N/A'}</strong></td>
                <td>
                    <div style="font-weight:600; color:var(--text-main);">${escapeHTML(p.itemName)}</div>
                </td>
                <td>
                    <span class="category-pill ${catClass}">
                        <i class="${iconChar}"></i> ${catLabel}
                    </span>
                </td>
                <td><strong>${p.quantity} ${p.unit}</strong></td>
                <td><span class="price-cp-text">Rs. ${parseFloat(p.costPrice).toLocaleString()}</span></td>
                <td><strong style="color:var(--accent-blue);">Rs. ${Math.round(p.totalCost).toLocaleString()}</strong></td>
                <td>${escapeHTML(p.supplier || 'Local Supplier')}</td>
            </tr>
        `;
    }).join('');
}

function openPurchaseModal() {
    const dl = document.getElementById('dl-purchase-items');
    if (dl) {
        dl.innerHTML = inventory.map(item => `
            <option value="${escapeHTML(item.name)}">Stock: ${item.quantity} ${item.unit} | CP: Rs. ${item.costPrice}/${item.unit}</option>
        `).join('');
    }

    const searchInput = document.getElementById('purchase-item-search');
    if (searchInput) searchInput.value = '';
    const idInput = document.getElementById('purchase-item-id');
    if (idInput) idInput.value = '';

    document.getElementById('purchase-unit').value = 'kg';
    document.getElementById('purchase-cp').value = '';
    document.getElementById('purchase-qty').value = 10;
    document.getElementById('purchase-supplier').value = '';
    document.getElementById('purchase-date').value = new Date().toISOString().split('T')[0];
    const previewEl = document.getElementById('purchase-total-preview');
    if (previewEl) previewEl.innerText = 'Rs. 0';

    openModal('purchase-modal');
}

function handlePurchaseSearchInput() {
    const searchVal = (document.getElementById('purchase-item-search')?.value || '').trim().toLowerCase();
    if (!searchVal) return;

    const item = inventory.find(i => 
        i.name.toLowerCase() === searchVal ||
        searchVal.includes(i.name.toLowerCase()) ||
        i.name.toLowerCase().includes(searchVal)
    );

    if (item) {
        document.getElementById('purchase-item-id').value = item.id;
        document.getElementById('purchase-unit').value = item.unit;
        document.getElementById('purchase-cp').value = item.costPrice;
        
        const supplierField = document.getElementById('purchase-supplier');
        if (supplierField) {
            const lastPurchase = purchases.find(p => p.itemId === item.id);
            supplierField.value = (lastPurchase && lastPurchase.supplier) ? lastPurchase.supplier : (item.supplier || '');
        }
        calculatePurchaseTotal();
    }
}

function calculatePurchaseTotal() {
    const qty = parseFloat(document.getElementById('purchase-qty').value) || 0;
    const cp = parseFloat(document.getElementById('purchase-cp').value) || 0;
    const total = qty * cp;

    const el = document.getElementById('purchase-total-preview');
    if (el) el.innerText = `Rs. ${Math.round(total).toLocaleString()}`;
}

function handlePurchaseSubmit(e) {
    e.preventDefault();
    const searchVal = (document.getElementById('purchase-item-search').value || '').trim();
    const itemId = document.getElementById('purchase-item-id').value;
    let invItem = inventory.find(i => i.id === itemId) || inventory.find(i => i.name.toLowerCase() === searchVal.toLowerCase() || searchVal.toLowerCase().includes(i.name.toLowerCase()));

    const qty = parseFloat(document.getElementById('purchase-qty').value) || 0;
    const cp = parseFloat(document.getElementById('purchase-cp').value) || 0;
    const supplier = document.getElementById('purchase-supplier').value.trim() || 'Local Farm';
    const date = document.getElementById('purchase-date').value || new Date().toISOString().split('T')[0];

    if (!searchVal) {
        showToast('Please type or search a product item', 'error');
        return;
    }

    const totalCost = qty * cp;
    let targetItemId = itemId;
    let itemName = searchVal;
    let category = 'chicken';
    let unit = document.getElementById('purchase-unit').value || 'kg';

    if (invItem) {
        targetItemId = invItem.id;
        itemName = invItem.name;
        category = invItem.category;
        unit = invItem.unit;

        invItem.quantity = parseFloat((invItem.quantity + qty).toFixed(2));
        invItem.costPrice = cp;
        if (supplier) invItem.supplier = supplier;
    } else {
        targetItemId = 'AG-NEW-' + Date.now();
        category = 'chicken';
        inventory.unshift({
            id: targetItemId,
            name: itemName,
            category: 'chicken',
            cutType: 'Standard Cut',
            quantity: qty,
            unit: unit,
            costPrice: cp,
            unitPrice: Math.round(cp * 1.3),
            minThreshold: 5,
            supplier: supplier
        });
    }

    const newPurchase = {
        id: 'PUR-' + Date.now(),
        itemId: targetItemId,
        itemName,
        category,
        quantity: qty,
        unit,
        costPrice: cp,
        totalCost,
        supplier,
        date
    };

    purchases.unshift(newPurchase);

    saveAllData();
    renderPurchasesPane();
    renderInventoryPane();
    renderPnlPane();
    closeModal('purchase-modal');
    showToast(`Recorded inward purchase of ${qty} ${unit} for ${itemName}`, 'success');
}


/* ===================================================
   3. SALES & BILLING SECTION LOGIC
   =================================================== */

function renderSalesPane() {
    renderSalesKPIs();
    renderSalesTable();
}

function renderSalesKPIs() {
    let totalSalesRev = 0;
    let totalSalesProfit = 0;
    let salesTodayRev = 0;

    const todayDate = new Date().toLocaleDateString();

    sales.forEach(s => {
        const rev = parseFloat(s.totalBill) || 0;
        const profit = parseFloat(s.realizedProfit) || 0;
        totalSalesRev += rev;
        totalSalesProfit += profit;

        if ((s.date || '').includes(todayDate) || (s.date || '').includes('Today')) {
            salesTodayRev += rev;
        }
    });

    const marginPct = totalSalesRev > 0 ? ((totalSalesProfit / totalSalesRev) * 100).toFixed(1) : '0.0';

    const elRev = document.getElementById('kpi-sales-revenue');
    if (elRev) elRev.innerText = `Rs. ${Math.round(totalSalesRev).toLocaleString()}`;

    const elCount = document.getElementById('kpi-sales-count');
    if (elCount) elCount.innerText = `${sales.length} Bills`;

    const elProfit = document.getElementById('kpi-sales-profit');
    if (elProfit) elProfit.innerText = `Rs. ${Math.round(totalSalesProfit).toLocaleString()}`;

    const elMargin = document.getElementById('kpi-sales-margin');
    if (elMargin) elMargin.innerText = `${marginPct}% Profit Margin`;

    const elToday = document.getElementById('kpi-sales-today');
    if (elToday) elToday.innerText = `Rs. ${Math.round(salesTodayRev).toLocaleString()}`;
}

function renderSalesTable() {
    const tbody = document.getElementById('sales-table-body');
    const searchVal = (document.getElementById('search-sales-input')?.value || '').toLowerCase().trim();
    if (!tbody) return;

    const filtered = sales.filter(s => {
        if (!searchVal) return true;
        return (s.itemName || '').toLowerCase().includes(searchVal) ||
               (s.customer || '').toLowerCase().includes(searchVal) ||
               (s.invoiceNo || '').toLowerCase().includes(searchVal);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-dim);">No customer sales recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(s => {
        const profit = parseFloat(s.realizedProfit) || 0;
        const sign = profit >= 0 ? '+' : '';
        const profitColor = profit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';

        return `
            <tr>
                <td><small>${escapeHTML(s.date || '')}</small></td>
                <td><div style="font-weight:600;">${escapeHTML(s.itemName)}</div></td>
                <td><strong>${s.quantity} ${s.unit}</strong></td>
                <td>Rs. ${parseFloat(s.sellingPrice).toLocaleString()}</td>
                <td><strong style="color:var(--text-main);">Rs. ${Math.round(s.totalBill).toLocaleString()}</strong></td>
                <td><span class="profit-badge ${profit >= 0 ? 'positive' : 'negative'}">${sign}Rs. ${Math.round(profit).toLocaleString()}</span></td>
                <td>${escapeHTML(s.customer || 'Walk-in')}</td>
            </tr>
        `;
    }).join('');
}

function openSaleModal(preSelectedId = null) {
    const dl = document.getElementById('dl-sale-items');
    if (dl) {
        dl.innerHTML = inventory.map(item => `
            <option value="${escapeHTML(item.name)}">Avail: ${item.quantity} ${item.unit} | Price: Rs. ${item.unitPrice}/${item.unit}</option>
        `).join('');
    }

    const searchInput = document.getElementById('sale-item-search');
    if (searchInput) searchInput.value = '';
    const idInput = document.getElementById('sale-item-id');
    if (idInput) idInput.value = '';

    if (preSelectedId) {
        const item = inventory.find(i => i.id === preSelectedId);
        if (item && searchInput) {
            searchInput.value = item.name;
        }
    }

    handleSaleSearchInput();
    openModal('sale-modal');
}

function handleSaleSearchInput() {
    const searchVal = (document.getElementById('sale-item-search')?.value || '').trim().toLowerCase();
    if (!searchVal) {
        document.getElementById('sale-stock-avail').innerText = '0 kg';
        document.getElementById('sale-cp-display').innerText = 'Rs. 0 / kg';
        document.getElementById('sale-rate').value = '';
        calculateSaleTotal();
        return;
    }

    const item = inventory.find(i => 
        i.name.toLowerCase() === searchVal ||
        searchVal.includes(i.name.toLowerCase()) ||
        i.name.toLowerCase().includes(searchVal)
    );

    if (item) {
        document.getElementById('sale-item-id').value = item.id;
        document.getElementById('sale-stock-avail').innerText = `${item.quantity} ${item.unit}`;
        document.getElementById('sale-cp-display').innerText = `Rs. ${item.costPrice.toLocaleString()} / ${item.unit}`;
        document.getElementById('sale-rate').value = item.unitPrice;
        if (!document.getElementById('sale-amount').value) {
            document.getElementById('sale-amount').value = 1;
        }
        calculateSaleTotal();
    }
}

function calculateSaleTotal() {
    const searchVal = (document.getElementById('sale-item-search')?.value || '').trim().toLowerCase();
    const itemId = document.getElementById('sale-item-id')?.value;
    const invItem = inventory.find(i => i.id === itemId) || inventory.find(i => i.name.toLowerCase() === searchVal || searchVal.includes(i.name.toLowerCase()));

    const cp = invItem ? (parseFloat(invItem.costPrice) || 0) : 0;
    const amount = parseFloat(document.getElementById('sale-amount').value) || 0;
    const rate = parseFloat(document.getElementById('sale-rate').value) || 0;

    const totalBill = amount * rate;
    const profit = amount * (rate - cp);
    const marginPct = rate > 0 ? (((rate - cp) / rate) * 100).toFixed(1) : '0.0';

    const elTotal = document.getElementById('sale-total-calc');
    if (elTotal) elTotal.innerText = `Rs. ${Math.round(totalBill).toLocaleString()}`;
    
    const elProfit = document.getElementById('sale-profit-calc');
    if (elProfit) {
        const sign = profit >= 0 ? '+Rs. ' : '-Rs. ';
        elProfit.innerText = `${sign}${Math.abs(Math.round(profit)).toLocaleString()}`;
        elProfit.style.color = profit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    }

    const elMargin = document.getElementById('sale-margin-calc');
    if (elMargin) {
        elMargin.innerText = `${profit >= 0 ? '+' : ''}${marginPct}%`;
        elMargin.style.color = profit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    }
}

function handleSaleSubmit(e) {
    e.preventDefault();
    const searchVal = (document.getElementById('sale-item-search').value || '').trim().toLowerCase();
    const itemId = document.getElementById('sale-item-id').value;
    let invItem = inventory.find(i => i.id === itemId) || inventory.find(i => i.name.toLowerCase() === searchVal || searchVal.includes(i.name.toLowerCase()) || i.name.toLowerCase().includes(searchVal));

    if (!invItem) {
        showToast('Please select or type a valid product item from inventory', 'error');
        return;
    }

    const amount = parseFloat(document.getElementById('sale-amount').value) || 0;
    const sp = parseFloat(document.getElementById('sale-rate').value) || 0;
    const customer = document.getElementById('sale-customer').value.trim() || 'Walk-in Customer';

    if (amount <= 0) {
        showToast('Please enter quantity to sell', 'error');
        return;
    }

    if (amount > invItem.quantity) {
        if (!confirm(`Warning: Sold quantity (${amount} ${invItem.unit}) exceeds stock on hand (${invItem.quantity} ${invItem.unit}). Proceed?`)) {
            return;
        }
    }

    invItem.quantity = Math.max(0, parseFloat((invItem.quantity - amount).toFixed(2)));

    const totalBill = amount * sp;
    const realizedProfit = amount * (sp - invItem.costPrice);
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const newSale = {
        id: 'SALE-' + Date.now(),
        itemId: invItem.id,
        itemName: invItem.name,
        category: invItem.category,
        quantity: amount,
        unit: invItem.unit,
        costPrice: invItem.costPrice,
        sellingPrice: sp,
        totalBill,
        realizedProfit,
        customer,
        date: dateStr
    };

    sales.unshift(newSale);

    saveAllData();
    renderSalesPane();
    renderInventoryPane();
    renderPnlPane();
    closeModal('sale-modal');
    showInvoicePreview(newSale);
    showToast(`Recorded sale of ${amount} ${invItem.unit} for ${invItem.name}`, 'success');
}

function viewSaleInvoice(saleId) {
    const s = sales.find(item => item.id === saleId);
    if (!s) return;
    showInvoicePreview(s);
}

function showInvoicePreview(saleItem) {
    const html = `
        <div class="receipt-box" id="printable-receipt">
            <div class="receipt-header">
                <h2>AONE GANDAKI FRESH HOUSE</h2>
                <p style="font-size:12px; font-weight:600; margin-bottom:2px;">Specialist Butchery, Poultry & Egg Craft</p>
                <p style="font-size:11px; color:#555;">Kathmandu / Pokhara, Nepal &bull; Ph: +977-9806588941</p>
                <p style="font-size:11px; margin-top:6px;"><strong>Bill #:</strong> ${saleItem.invoiceNo} &bull; <strong>Date:</strong> ${saleItem.date}</p>
                <p style="font-size:11px;"><strong>Customer:</strong> ${escapeHTML(saleItem.customer)}</p>
                <p style="font-size:11px;"><strong>Payment:</strong> ${escapeHTML(saleItem.payment)}</p>
            </div>
            <table class="receipt-table">
                <thead>
                    <tr style="border-bottom:1px dashed #777;">
                        <th>Item & Category</th>
                        <th class="num">Qty</th>
                        <th class="num">Rate</th>
                        <th class="num">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${escapeHTML(saleItem.itemName)}<br><small style="color:#666;">${getCategoryLabel(saleItem.category)}</small></td>
                        <td class="num">${saleItem.quantity} ${saleItem.unit}</td>
                        <td class="num">Rs. ${saleItem.sellingPrice}</td>
                        <td class="num">Rs. ${Math.round(saleItem.totalBill).toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>
            <div class="receipt-total">
                <span>NET TOTAL PAID:</span>
                <span>Rs. ${Math.round(saleItem.totalBill).toLocaleString()}</span>
            </div>
            <p style="text-align:center; font-size:11px; margin-top:14px; color:#555;">
                Keep refrigerated between 0°C to 4°C.<br>Thank you for choosing Aone Gandaki Fresh House!
            </p>
        </div>
    `;

    document.getElementById('receipt-preview-content').innerHTML = html;
    openModal('receipt-modal');
}

function printReceipt() {
    window.print();
}


/* ===================================================
   4. EXPENSES SECTION LOGIC
   =================================================== */

function renderExpensesPane() {
    renderExpensesKPIs();
    renderExpensesTable();
}

function renderExpensesKPIs() {
    let totalExpensesAmt = 0;
    let monthExpensesAmt = 0;
    const categoryTotals = {};

    const currentMonth = new Date().toISOString().substring(0, 7); // '2026-08'

    expenses.forEach(e => {
        const amt = parseFloat(e.amount) || 0;
        totalExpensesAmt += amt;

        if ((e.date || '').startsWith(currentMonth)) {
            monthExpensesAmt += amt;
        }

        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + amt;
    });

    let topCategory = 'Rent & Power';
    let topCatAmt = 0;
    for (const [cat, amt] of Object.entries(categoryTotals)) {
        if (amt > topCatAmt) {
            topCatAmt = amt;
            topCategory = cat;
        }
    }

    const elTotal = document.getElementById('kpi-expenses-total');
    if (elTotal) elTotal.innerText = `Rs. ${Math.round(totalExpensesAmt).toLocaleString()}`;

    const elCount = document.getElementById('kpi-expenses-count');
    if (elCount) elCount.innerText = `${expenses.length} Vouchers`;

    const elMonth = document.getElementById('kpi-expenses-month');
    if (elMonth) elMonth.innerText = `Rs. ${Math.round(monthExpensesAmt).toLocaleString()}`;

    const elTop = document.getElementById('kpi-top-expense');
    if (elTop) elTop.innerText = topCategory;
}

function renderExpensesTable() {
    const tbody = document.getElementById('expenses-table-body');
    const searchVal = (document.getElementById('search-expense-input')?.value || '').toLowerCase().trim();
    if (!tbody) return;

    const filtered = expenses.filter(e => {
        if (!searchVal) return true;
        return (e.category || '').toLowerCase().includes(searchVal) ||
               (e.vendor || '').toLowerCase().includes(searchVal) ||
               (e.notes || '').toLowerCase().includes(searchVal);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-dim);">No expense vouchers recorded.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(e => `
        <tr>
            <td><strong>${e.date || 'N/A'}</strong></td>
            <td><span class="category-pill" style="background:rgba(245,158,11,0.15); color:var(--accent-amber);">${escapeHTML(e.category)}</span></td>
            <td>${escapeHTML(e.notes || 'Operating expense')}</td>
            <td>${escapeHTML(e.vendor || 'Vendor')}</td>
            <td style="text-align:right; font-weight:700; color:var(--accent-rose);">Rs. ${parseFloat(e.amount).toLocaleString()}</td>
        </tr>
    `).join('');
}

function openExpenseModal() {
    const form = document.getElementById('expense-form');
    if (form) form.reset();

    const dlVendor = document.getElementById('dl-expense-vendors');
    if (dlVendor) {
        const uniqueVendors = [...new Set(expenses.map(e => e.vendor).filter(Boolean))];
        dlVendor.innerHTML = uniqueVendors.map(v => `<option value="${escapeHTML(v)}"></option>`).join('');
    }

    const dlCat = document.getElementById('dl-expense-categories');
    if (dlCat) {
        const defaultCats = ['Shop Rent', 'Electricity & Freezers', 'Staff Salaries & Wages', 'Ice & Packaging', 'Vehicle & Delivery Fuel', 'Maintenance & Cleaning', 'Miscellaneous'];
        const existingCats = [...new Set([...defaultCats, ...expenses.map(e => e.category).filter(Boolean)])];
        dlCat.innerHTML = existingCats.map(c => `<option value="${escapeHTML(c)}"></option>`).join('');
    }

    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    openModal('expense-modal');
}

function handleExpenseSubmit(e) {
    e.preventDefault();
    const category = document.getElementById('expense-category').value;
    const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
    const vendor = document.getElementById('expense-vendor').value.trim();
    const date = document.getElementById('expense-date').value;
    const notes = document.getElementById('expense-notes').value.trim();

    if (amount <= 0) {
        showToast('Please enter a valid expense amount', 'error');
        return;
    }

    const newExpense = {
        id: 'EXP-' + Date.now(),
        category,
        amount,
        vendor,
        date,
        notes
    };

    expenses.unshift(newExpense);

    saveAllData();
    renderExpensesPane();
    renderPnlPane();
    closeModal('expense-modal');
    showToast(`Recorded expense voucher of Rs. ${amount.toLocaleString()}`, 'success');
}


/* ===================================================
   5. PROFIT & LOSS (P&L) STATEMENT LOGIC
   =================================================== */

function renderPnlPane() {
    let salesTotal = 0;
    let cogsTotal = 0;

    const catSales = { chicken: 0, mutton: 0, egg: 0, sausage: 0 };
    const catCogs = { chicken: 0, mutton: 0, egg: 0, sausage: 0 };

    sales.forEach(s => {
        const bill = parseFloat(s.totalBill) || 0;
        const cost = (parseFloat(s.quantity) || 0) * (parseFloat(s.costPrice) || 0);
        salesTotal += bill;
        cogsTotal += cost;

        const cat = s.category || 'chicken';
        if (catSales[cat] !== undefined) {
            catSales[cat] += bill;
            catCogs[cat] += cost;
        }
    });

    const grossProfit = salesTotal - cogsTotal;
    const grossMarginPct = salesTotal > 0 ? ((grossProfit / salesTotal) * 100).toFixed(1) : '0.0';

    let totalExpenses = 0;
    const expBreakdown = {};

    expenses.forEach(e => {
        const amt = parseFloat(e.amount) || 0;
        totalExpenses += amt;
        expBreakdown[e.category] = (expBreakdown[e.category] || 0) + amt;
    });

    const netProfit = grossProfit - totalExpenses;
    const netMarginPct = salesTotal > 0 ? ((netProfit / salesTotal) * 100).toFixed(1) : '0.0';

    // Update KPI Header Cards
    const elKpiSales = document.getElementById('pnl-kpi-sales');
    if (elKpiSales) elKpiSales.innerText = `Rs. ${Math.round(salesTotal).toLocaleString()}`;

    const elKpiCogs = document.getElementById('pnl-kpi-cogs');
    if (elKpiCogs) elKpiCogs.innerText = `Rs. ${Math.round(cogsTotal).toLocaleString()}`;

    const elKpiGross = document.getElementById('pnl-kpi-gross-profit');
    if (elKpiGross) {
        elKpiGross.innerText = `Rs. ${Math.round(grossProfit).toLocaleString()}`;
        elKpiGross.style.color = grossProfit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    }

    const elKpiGrossMargin = document.getElementById('pnl-kpi-gross-margin');
    if (elKpiGrossMargin) elKpiGrossMargin.innerText = `${grossMarginPct}% Gross Margin`;

    const elKpiExp = document.getElementById('pnl-kpi-expenses');
    if (elKpiExp) elKpiExp.innerText = `Rs. ${Math.round(totalExpenses).toLocaleString()}`;

    const elKpiNet = document.getElementById('pnl-kpi-net-profit');
    if (elKpiNet) {
        const prefix = netProfit >= 0 ? '+Rs. ' : '-Rs. ';
        elKpiNet.innerText = `${prefix}${Math.abs(Math.round(netProfit)).toLocaleString()}`;
        elKpiNet.style.color = netProfit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    }

    const elKpiNetMargin = document.getElementById('pnl-kpi-net-margin');
    if (elKpiNetMargin) {
        elKpiNetMargin.innerText = `${netMarginPct}% Net Margin`;
        elKpiNetMargin.style.color = netProfit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    }

    // Update Statement Sheet Rows
    const elSalesChk = document.getElementById('pnl-sales-chicken');
    if (elSalesChk) elSalesChk.innerText = `Rs. ${Math.round(catSales.chicken).toLocaleString()}`;
    const elSalesMut = document.getElementById('pnl-sales-mutton');
    if (elSalesMut) elSalesMut.innerText = `Rs. ${Math.round(catSales.mutton).toLocaleString()}`;
    const elSalesEgg = document.getElementById('pnl-sales-egg');
    if (elSalesEgg) elSalesEgg.innerText = `Rs. ${Math.round(catSales.egg).toLocaleString()}`;
    const elSalesSau = document.getElementById('pnl-sales-sausage');
    if (elSalesSau) elSalesSau.innerText = `Rs. ${Math.round(catSales.sausage).toLocaleString()}`;

    const elTotRev = document.getElementById('pnl-total-revenue');
    if (elTotRev) elTotRev.innerText = `Rs. ${Math.round(salesTotal).toLocaleString()}`;

    const elCogsChk = document.getElementById('pnl-cogs-chicken');
    if (elCogsChk) elCogsChk.innerText = `Rs. ${Math.round(catCogs.chicken).toLocaleString()}`;
    const elCogsMut = document.getElementById('pnl-cogs-mutton');
    if (elCogsMut) elCogsMut.innerText = `Rs. ${Math.round(catCogs.mutton).toLocaleString()}`;
    const elCogsEgg = document.getElementById('pnl-cogs-egg');
    if (elCogsEgg) elCogsEgg.innerText = `Rs. ${Math.round(catCogs.egg).toLocaleString()}`;
    const elCogsSau = document.getElementById('pnl-cogs-sausage');
    if (elCogsSau) elCogsSau.innerText = `Rs. ${Math.round(catCogs.sausage).toLocaleString()}`;

    const elTotCogs = document.getElementById('pnl-total-cogs');
    if (elTotCogs) elTotCogs.innerText = `Rs. ${Math.round(cogsTotal).toLocaleString()}`;

    const elGrossProfit = document.getElementById('pnl-statement-gross-profit');
    if (elGrossProfit) {
        const sign = grossProfit >= 0 ? '+' : '';
        elGrossProfit.innerText = `${sign}Rs. ${Math.round(grossProfit).toLocaleString()} (${grossMarginPct}%)`;
        elGrossProfit.style.color = grossProfit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    }

    // Expenses Breakdown list
    const expList = document.getElementById('pnl-expenses-breakdown-list');
    if (expList) {
        const entries = Object.entries(expBreakdown);
        if (entries.length === 0) {
            expList.innerHTML = `<div class="pnl-row sub-row"><span>No operating expenses recorded</span><span>Rs. 0</span></div>`;
        } else {
            expList.innerHTML = entries.map(([cat, amt]) => `
                <div class="pnl-row sub-row">
                    <span>${escapeHTML(cat)}</span>
                    <span style="color:var(--accent-rose);">Rs. ${Math.round(amt).toLocaleString()}</span>
                </div>
            `).join('');
        }
    }

    const elTotExp = document.getElementById('pnl-total-expenses');
    if (elTotExp) elTotExp.innerText = `Rs. ${Math.round(totalExpenses).toLocaleString()}`;

    // Final Net Row
    const elFinalRow = document.getElementById('pnl-statement-final-row');
    const elFinalNet = document.getElementById('pnl-statement-net-profit');
    if (elFinalNet && elFinalRow) {
        const sign = netProfit >= 0 ? '+Rs. ' : '-Rs. ';
        elFinalNet.innerText = `${sign}${Math.abs(Math.round(netProfit)).toLocaleString()} (${sign}${netMarginPct}%)`;
        if (netProfit >= 0) {
            elFinalRow.classList.remove('loss');
        } else {
            elFinalRow.classList.add('loss');
        }
    }

    // Render Charts after DOM update
    setTimeout(() => renderPnlCharts({ salesTotal, cogsTotal, grossProfit, totalExpenses, netProfit, catSales, expBreakdown }), 50);
}

// Chart instances (destroyed on re-render to prevent memory leak)
let _chartRevBar = null, _chartCatDonut = null, _chartExpDonut = null, _chartProfitLine = null;

function getChartThemeColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
        gridColor: isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)',
        textColor: isLight ? '#475569' : '#9ca3af',
        tooltipBg: isLight ? '#ffffff' : '#1c1c22',
        tooltipText: isLight ? '#0f172a' : '#f3f4f6',
    };
}

function renderPnlCharts({ salesTotal, cogsTotal, grossProfit, totalExpenses, netProfit, catSales, expBreakdown }) {
    const c = getChartThemeColors();

    // Chart 1: Revenue vs COGS vs Gross Profit vs Expenses vs Net (horizontal bar)
    const ctxBar = document.getElementById('chart-revenue-bar');
    if (ctxBar) {
        if (_chartRevBar) { _chartRevBar.destroy(); _chartRevBar = null; }
        _chartRevBar = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Revenue (Sales)', 'Cost of Goods', 'Gross Profit', 'Store Expenses', 'Net Profit / Loss'],
                datasets: [{
                    label: 'NPR',
                    data: [salesTotal, cogsTotal, grossProfit, totalExpenses, netProfit],
                    backgroundColor: [
                        'rgba(16,185,129,0.78)',
                        'rgba(59,130,246,0.78)',
                        'rgba(245,158,11,0.78)',
                        'rgba(239,68,68,0.78)',
                        netProfit >= 0 ? 'rgba(139,92,246,0.88)' : 'rgba(239,68,68,0.88)'
                    ],
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: c.tooltipBg,
                        titleColor: c.tooltipText,
                        bodyColor: c.tooltipText,
                        callbacks: { label: ctx => ` Rs. ${Math.round(ctx.raw).toLocaleString()}` }
                    }
                },
                scales: {
                    x: { grid: { color: c.gridColor }, ticks: { color: c.textColor, callback: v => 'Rs.' + Math.round(v / 1000) + 'k' } },
                    y: { grid: { display: false }, ticks: { color: c.textColor } }
                }
            }
        });
    }

    // Chart 2: Sales by Category Donut
    const ctxCatDonut = document.getElementById('chart-category-donut');
    if (ctxCatDonut) {
        if (_chartCatDonut) { _chartCatDonut.destroy(); _chartCatDonut = null; }
        const catLabels = ['Chicken', 'Mutton', 'Eggs', 'Sausage'];
        const catValues = [Math.round(catSales.chicken||0), Math.round(catSales.mutton||0), Math.round(catSales.egg||0), Math.round(catSales.sausage||0)];
        _chartCatDonut = new Chart(ctxCatDonut, {
            type: 'doughnut',
            data: {
                labels: catLabels,
                datasets: [{
                    data: catValues,
                    backgroundColor: ['rgba(249,115,22,0.85)','rgba(225,29,72,0.85)','rgba(234,179,8,0.85)','rgba(6,182,212,0.85)'],
                    borderColor: ['#f97316','#e11d48','#eab308','#06b6d4'],
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                cutout: '62%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: c.textColor, padding: 14, font: { size: 12 } } },
                    tooltip: {
                        backgroundColor: c.tooltipBg, titleColor: c.tooltipText, bodyColor: c.tooltipText,
                        callbacks: { label: ctx => ` Rs. ${ctx.raw.toLocaleString()} (${ctx.label})` }
                    }
                }
            }
        });
    }

    // Chart 3: Expenses Breakdown Donut
    const ctxExpDonut = document.getElementById('chart-expenses-donut');
    if (ctxExpDonut) {
        if (_chartExpDonut) { _chartExpDonut.destroy(); _chartExpDonut = null; }
        const expLabels = Object.keys(expBreakdown);
        const expValues = expLabels.map(k => Math.round(expBreakdown[k]));
        const expPalette = ['rgba(239,68,68,0.8)','rgba(245,158,11,0.8)','rgba(139,92,246,0.8)','rgba(59,130,246,0.8)','rgba(16,185,129,0.8)','rgba(6,182,212,0.8)','rgba(244,63,94,0.8)'];
        _chartExpDonut = new Chart(ctxExpDonut, {
            type: 'doughnut',
            data: {
                labels: expLabels.length > 0 ? expLabels : ['No expenses recorded'],
                datasets: [{
                    data: expValues.length > 0 ? expValues : [1],
                    backgroundColor: expLabels.length > 0 ? expPalette.slice(0, expLabels.length) : ['rgba(107,114,128,0.3)'],
                    borderWidth: 2, hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                cutout: '62%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: c.textColor, padding: 12, font: { size: 11 } } },
                    tooltip: {
                        backgroundColor: c.tooltipBg, titleColor: c.tooltipText, bodyColor: c.tooltipText,
                        callbacks: { label: ctx => ` Rs. ${ctx.raw.toLocaleString()}` }
                    }
                }
            }
        });
    }

    // Chart 4: Gross vs Net Profit grouped bar
    const ctxProfit = document.getElementById('chart-profit-line');
    if (ctxProfit) {
        if (_chartProfitLine) { _chartProfitLine.destroy(); _chartProfitLine = null; }
        _chartProfitLine = new Chart(ctxProfit, {
            type: 'bar',
            data: {
                labels: ['Total Revenue', 'Gross Profit', 'Total Expenses', 'Net Profit'],
                datasets: [{
                    label: 'NPR',
                    data: [salesTotal, grossProfit, totalExpenses, netProfit],
                    backgroundColor: [
                        'rgba(16,185,129,0.72)',
                        'rgba(245,158,11,0.72)',
                        'rgba(239,68,68,0.72)',
                        netProfit >= 0 ? 'rgba(139,92,246,0.88)' : 'rgba(239,68,68,0.88)'
                    ],
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: c.tooltipBg, titleColor: c.tooltipText, bodyColor: c.tooltipText,
                        callbacks: { label: ctx => ` Rs. ${Math.round(ctx.raw).toLocaleString()}` }
                    }
                },
                scales: {
                    y: { grid: { color: c.gridColor }, ticks: { color: c.textColor, callback: v => 'Rs.' + Math.round(v / 1000) + 'k' } },
                    x: { grid: { display: false }, ticks: { color: c.textColor } }
                }
            }
        });
    }
}


/* ===================================================
   UTILITIES & EXPORTS
   =================================================== */

function exportToCSV() {
    if (inventory.length === 0) {
        showToast('No inventory records to export', 'warning');
        return;
    }

    const headers = ['ID', 'Cut Name', 'Category', 'Cut Specification', 'Quantity', 'Unit', 'Cost Price (CP)', 'Selling Price (SP)', 'Unit Profit', 'Margin %', 'Total Cost Value', 'Total Retail Value', 'Total Expected Profit', 'Min Alert Threshold', 'Supplier'];
    const rows = inventory.map(item => {
        const qty = parseFloat(item.quantity) || 0;
        const cp = parseFloat(item.costPrice) || 0;
        const sp = parseFloat(item.unitPrice) || 0;
        const unitProfit = sp - cp;
        const marginPct = sp > 0 ? ((unitProfit / sp) * 100).toFixed(1) : 0;
        const totalCost = qty * cp;
        const totalRetail = qty * sp;
        const totalProfit = qty * unitProfit;

        return [
            item.id,
            `"${item.name.replace(/"/g, '""')}"`,
            item.category,
            `"${(item.cutType || '').replace(/"/g, '""')}"`,
            qty,
            item.unit,
            cp,
            sp,
            unitProfit,
            `${marginPct}%`,
            totalCost,
            totalRetail,
            totalProfit,
            item.minThreshold || 0,
            `"${(item.supplier || '').replace(/"/g, '""')}"`
        ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aone_gandaki_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Inventory exported to CSV successfully', 'success');
}

function getCategoryIcon(cat) {
    switch (cat) {
        case 'chicken': return 'fas fa-drumstick-bite';
        case 'mutton': return 'fas fa-bone';
        case 'egg': return 'fas fa-egg';
        case 'sausage': return 'fas fa-hotdog';
        default: return 'fas fa-drumstick-bite';
    }
}

function getCategoryLabel(cat) {
    switch (cat) {
        case 'chicken': return 'Chicken';
        case 'mutton': return 'Mutton';
        case 'egg': return 'Eggs';
        case 'sausage': return 'Sausage';
        default: return 'Poultry';
    }
}

function openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add('open');
}

function closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('open');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function openmenu() {
    const sidemenu = document.getElementById('sidemenu');
    if (sidemenu) sidemenu.classList.add('open');
}

function closemenu() {
    const sidemenu = document.getElementById('sidemenu');
    if (sidemenu) sidemenu.classList.remove('open');
}

function escapeHTML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
