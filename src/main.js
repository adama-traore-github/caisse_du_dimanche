import {
  generateSundaysList,
  formatMoney,
  formatMonthName,
  formatISODate
} from './utils/dates.js';

import {
  fetchTransactions,
  saveTransaction,
  deleteTransaction,
  getActiveStorageProvider,
  isNeonConfigured,
  isSupabaseConfigured
} from './lib/database.js';

// --- State de l'application ---
const appState = {
  transactionsMap: new Map(), // key: isoDate (YYYY-MM-DD), value: transaction object
  sundaysList: [],
  selectedSundayIso: '',
  selectedMonthKey: '',
  pendingTransactionToSave: null,
  pinCode: localStorage.getItem('caisse_pin_code') || '1234'
};

// --- Sélecteurs DOM ---
const storageStatusBadge = document.getElementById('storageStatusBadge');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

const tabSaisieBtn = document.getElementById('tabSaisieBtn');
const tabSyntheseBtn = document.getElementById('tabSyntheseBtn');
const tabBilanBtn = document.getElementById('tabBilanBtn');

const syntheseView = document.getElementById('syntheseView');
const saisieView = document.getElementById('saisieView');
const bilanView = document.getElementById('bilanView');

const statTotalCollecte = document.getElementById('statTotalCollecte');
const statTotalRemis = document.getElementById('statTotalRemis');
const statResteCaisse = document.getElementById('statResteCaisse');
const cardEcart = document.getElementById('cardEcart');

const syntheseLastSundayLabel = document.getElementById('syntheseLastSundayLabel');
const syntheseLastSundayContent = document.getElementById('syntheseLastSundayContent');
const btnSyntheseGoToSaisie = document.getElementById('btnSyntheseGoToSaisie');

const sundaysListContainer = document.getElementById('sundaysListContainer');
const formCurrentDateTitle = document.getElementById('formCurrentDateTitle');
const transactionForm = document.getElementById('transactionForm');
const inputDateDimanche = document.getElementById('inputDateDimanche');
const inputCollecte = document.getElementById('inputCollecte');
const inputRemis = document.getElementById('inputRemis');
const inputRemisA = document.getElementById('inputRemisA');
const calcEcartPreview = document.getElementById('calcEcartPreview');
const inputNote = document.getElementById('inputNote');
const btnResetForm = document.getElementById('btnResetForm');
const btnSaveTransaction = document.getElementById('btnSaveTransaction');

const selectMonthFilter = document.getElementById('selectMonthFilter');
const monthlyTableBody = document.getElementById('monthlyTableBody');
const monthlyTableFooter = document.getElementById('monthlyTableFooter');
const btnExportCSV = document.getElementById('btnExportCSV');
const btnPrintPDF = document.getElementById('btnPrintPDF');

const pinModal = document.getElementById('pinModal');
const inputPin = document.getElementById('inputPin');
const btnCancelPin = document.getElementById('btnCancelPin');
const btnConfirmPin = document.getElementById('btnConfirmPin');
const toastNotification = document.getElementById('toastNotification');

// --- Initialisation ---
document.addEventListener('DOMContentLoaded', async () => {
  initStorageBadge();
  setupEventListeners();
  
  // Générer la liste des dimanches à partir de septembre de l'année en cours
  appState.sundaysList = generateSundaysList(new Date().getFullYear());
  
  // Charger les transactions depuis la base de données active
  await reloadTransactions();

  // Définir le dimanche par défaut
  const defaultSunday = getInitialSundayIso(appState.sundaysList);
  selectSunday(defaultSunday);

  // Initialiser les filtres de mois
  populateMonthFilter();
  renderMonthlyTable();
  renderSyntheseQuickView();
});

function initStorageBadge() {
  const provider = getActiveStorageProvider();
  if (isNeonConfigured || isSupabaseConfigured) {
    statusDot.classList.add('connected');
    statusText.textContent = provider;
    storageStatusBadge.title = `Connecté à ${provider}`;
  } else {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Mode Local Storage';
    storageStatusBadge.title = 'Stockage local (Ajoutez VITE_NEON_DATABASE_URL ou VITE_SUPABASE_URL)';
  }
}

function getInitialSundayIso(sundays) {
  const todayIso = formatISODate(new Date());
  const exactMatch = sundays.find(s => s.isoDate === todayIso);
  if (exactMatch) return exactMatch.isoDate;
  
  const pastSundays = sundays.filter(s => s.isoDate <= todayIso);
  if (pastSundays.length > 0) {
    return pastSundays[pastSundays.length - 1].isoDate;
  }
  return sundays[0].isoDate;
}

async function reloadTransactions() {
  try {
    const list = await fetchTransactions();
    appState.transactionsMap.clear();
    list.forEach(t => {
      appState.transactionsMap.set(t.date_dimanche, t);
    });
    updateGlobalStats();
    renderSundaysSidebar();
    renderMonthlyTable();
    renderSyntheseQuickView();
  } catch (err) {
    showToast(err.message || 'Erreur lors du chargement des transactions', 'error');
  }
}

// --- Calculs et Rendu des Statistiques ---
function updateGlobalStats() {
  let totalCollecte = 0;
  let totalRemis = 0;

  for (const t of appState.transactionsMap.values()) {
    totalCollecte += Number(t.argent_collecte) || 0;
    totalRemis += Number(t.argent_remis) || 0;
  }

  const resteCaisse = totalCollecte - totalRemis;

  statTotalCollecte.textContent = formatMoney(totalCollecte);
  statTotalRemis.textContent = formatMoney(totalRemis);
  statResteCaisse.textContent = formatMoney(resteCaisse);

  if (resteCaisse < 0) {
    cardEcart.className = 'stat-card rose';
  } else if (resteCaisse > 0) {
    cardEcart.className = 'stat-card emerald';
  } else {
    cardEcart.className = 'stat-card';
  }
}

function renderSyntheseQuickView() {
  const latestIso = appState.selectedSundayIso || getInitialSundayIso(appState.sundaysList);
  const sundayObj = appState.sundaysList.find(s => s.isoDate === latestIso);
  const t = appState.transactionsMap.get(latestIso);

  syntheseLastSundayLabel.textContent = sundayObj ? sundayObj.label : `Dimanche ${latestIso}`;

  if (!t || (t.argent_collecte === 0 && t.argent_remis === 0)) {
    syntheseLastSundayContent.innerHTML = `
      <div style="color: var(--text-muted); font-size: 0.9rem; padding: 0.5rem 0;">
        Aucune donnée renseignée pour cette date. Cliquez sur "Saisir un dimanche" pour enregistrer la collecte.
      </div>
    `;
    return;
  }

  const ecart = (t.argent_collecte || 0) - (t.argent_remis || 0);
  syntheseLastSundayContent.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
      <div style="background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: var(--radius-md);">
        <div style="font-size: 0.78rem; color: var(--text-muted);">Collecté</div>
        <div style="font-size: 1.1rem; font-weight: 700; color: var(--emerald);">${formatMoney(t.argent_collecte)}</div>
      </div>
      <div style="background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: var(--radius-md);">
        <div style="font-size: 0.78rem; color: var(--text-muted);">Remis à (${t.remis_a || 'Non spécifié'})</div>
        <div style="font-size: 1.1rem; font-weight: 700; color: var(--amber);">${formatMoney(t.argent_remis)}</div>
      </div>
      <div style="background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: var(--radius-md);">
        <div style="font-size: 0.78rem; color: var(--text-muted);">Écart du jour</div>
        <div style="font-size: 1.1rem; font-weight: 700;">${formatMoney(ecart)}</div>
      </div>
    </div>
  `;
}

// --- Sidebar des Dimanches ---
function renderSundaysSidebar() {
  sundaysListContainer.innerHTML = '';

  appState.sundaysList.forEach(sunday => {
    const transaction = appState.transactionsMap.get(sunday.isoDate);
    const isCompleted = Boolean(transaction && (transaction.argent_collecte > 0 || transaction.argent_remis > 0));

    const btn = document.createElement('button');
    btn.className = `sunday-item-btn ${sunday.isoDate === appState.selectedSundayIso ? 'active' : ''}`;
    btn.type = 'button';
    
    btn.innerHTML = `
      <div>
        <div class="sunday-date-label">${sunday.formattedShort}</div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
          ${transaction ? formatMoney(transaction.argent_collecte) : 'Non renseigné'}
        </div>
      </div>
      <span class="sunday-badge ${isCompleted ? 'completed' : 'pending'}">
        ${isCompleted ? 'Saisi' : 'En attente'}
      </span>
    `;

    btn.addEventListener('click', () => selectSunday(sunday.isoDate));
    sundaysListContainer.appendChild(btn);
  });
}

function selectSunday(isoDate) {
  appState.selectedSundayIso = isoDate;
  const sundayObj = appState.sundaysList.find(s => s.isoDate === isoDate);
  
  if (sundayObj) {
    formCurrentDateTitle.textContent = sundayObj.label;
  } else {
    formCurrentDateTitle.textContent = `Dimanche ${isoDate}`;
  }

  inputDateDimanche.value = isoDate;

  const existing = appState.transactionsMap.get(isoDate);
  if (existing) {
    inputCollecte.value = existing.argent_collecte ?? '';
    inputRemis.value = existing.argent_remis ?? '';
    inputRemisA.value = existing.remis_a ?? '';
    inputNote.value = existing.note ?? '';
  } else {
    inputCollecte.value = '';
    inputRemis.value = '';
    inputRemisA.value = '';
    inputNote.value = '';
  }

  updateLiveEcartPreview();
  renderSundaysSidebar();
  renderSyntheseQuickView();
}

function updateLiveEcartPreview() {
  const collecte = parseFloat(inputCollecte.value) || 0;
  const remis = parseFloat(inputRemis.value) || 0;
  const diff = collecte - remis;

  calcEcartPreview.textContent = formatMoney(diff);
  if (diff > 0) {
    calcEcartPreview.style.color = 'var(--emerald)';
  } else if (diff < 0) {
    calcEcartPreview.style.color = 'var(--rose)';
  } else {
    calcEcartPreview.style.color = 'var(--text-main)';
  }
}

// --- Événements Navigation et Formulaires ---
function setupEventListeners() {
  tabSaisieBtn.addEventListener('click', () => switchTab('saisieView'));
  tabSyntheseBtn.addEventListener('click', () => switchTab('syntheseView'));
  tabBilanBtn.addEventListener('click', () => switchTab('bilanView'));
  btnSyntheseGoToSaisie.addEventListener('click', () => switchTab('saisieView'));

  inputCollecte.addEventListener('input', updateLiveEcartPreview);
  inputRemis.addEventListener('input', updateLiveEcartPreview);

  btnResetForm.addEventListener('click', () => {
    selectSunday(appState.selectedSundayIso);
  });

  transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const collecte = parseFloat(inputCollecte.value);
    const remis = parseFloat(inputRemis.value);
    const remisA = inputRemisA.value.trim();

    if (isNaN(collecte) || collecte < 0) {
      showToast('Veuillez entrer un montant collecté valide (>= 0).', 'error');
      return;
    }
    if (isNaN(remis) || remis < 0) {
      showToast('Veuillez entrer un montant remis valide (>= 0).', 'error');
      return;
    }
    if (!remisA) {
      showToast('Veuillez indiquer à qui l\'argent a été remis.', 'error');
      return;
    }

    appState.pendingTransactionToSave = {
      date_dimanche: inputDateDimanche.value,
      argent_collecte: collecte,
      argent_remis: remis,
      remis_a: remisA,
      note: inputNote.value
    };

    openPinModal();
  });

  btnCancelPin.addEventListener('click', closePinModal);
  btnConfirmPin.addEventListener('click', confirmPinAndSave);
  inputPin.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') confirmPinAndSave();
  });

  selectMonthFilter.addEventListener('change', (e) => {
    appState.selectedMonthKey = e.target.value;
    renderMonthlyTable();
  });

  btnExportCSV.addEventListener('click', exportMonthlyCSV);
  btnPrintPDF.addEventListener('click', () => window.print());
}

function switchTab(viewId) {
  tabSaisieBtn.classList.toggle('active', viewId === 'saisieView');
  tabSyntheseBtn.classList.toggle('active', viewId === 'syntheseView');
  tabBilanBtn.classList.toggle('active', viewId === 'bilanView');

  saisieView.classList.toggle('active', viewId === 'saisieView');
  syntheseView.classList.toggle('active', viewId === 'syntheseView');
  bilanView.classList.toggle('active', viewId === 'bilanView');
}

// --- Gestion Sécurité PIN ---
function openPinModal() {
  inputPin.value = '';
  pinModal.classList.add('open');
  inputPin.focus();
}

function closePinModal() {
  pinModal.classList.remove('open');
  appState.pendingTransactionToSave = null;
}

async function confirmPinAndSave() {
  const pinEntered = inputPin.value.trim();
  if (pinEntered !== appState.pinCode) {
    showToast('Code PIN incorrect.', 'error');
    inputPin.value = '';
    inputPin.focus();
    return;
  }

  if (!appState.pendingTransactionToSave) {
    closePinModal();
    return;
  }

  try {
    btnConfirmPin.disabled = true;
    btnConfirmPin.textContent = 'Enregistrement...';

    await saveTransaction(appState.pendingTransactionToSave);
    showToast('Transaction enregistrée avec succès !', 'success');
    closePinModal();
    await reloadTransactions();
  } catch (err) {
    showToast(err.message || 'Échec de la sauvegarde.', 'error');
  } finally {
    btnConfirmPin.disabled = false;
    btnConfirmPin.textContent = 'Valider';
  }
}

// --- Vue Bilan Mensuel ---
function populateMonthFilter() {
  const monthMap = new Map();
  appState.sundaysList.forEach(s => {
    if (!monthMap.has(s.monthKey)) {
      monthMap.set(s.monthKey, formatMonthName(s.monthKey));
    }
  });

  selectMonthFilter.innerHTML = '';
  let firstMonthKey = '';

  for (const [key, label] of monthMap.entries()) {
    if (!firstMonthKey) firstMonthKey = key;
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = label;
    selectMonthFilter.appendChild(opt);
  }

  appState.selectedMonthKey = firstMonthKey;
}

function renderMonthlyTable() {
  const monthKey = appState.selectedMonthKey;
  if (!monthKey) return;

  const sundaysInMonth = appState.sundaysList.filter(s => s.monthKey === monthKey);
  
  monthlyTableBody.innerHTML = '';
  
  let monthTotalCollecte = 0;
  let monthTotalRemis = 0;

  sundaysInMonth.forEach(sunday => {
    const t = appState.transactionsMap.get(sunday.isoDate);
    const collecte = t ? (Number(t.argent_collecte) || 0) : 0;
    const remis = t ? (Number(t.argent_remis) || 0) : 0;
    const diff = collecte - remis;
    
    monthTotalCollecte += collecte;
    monthTotalRemis += remis;

    let diffClass = 'zero';
    if (diff > 0) diffClass = 'positive';
    if (diff < 0) diffClass = 'negative';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 600;">${sunday.formattedShort}</td>
      <td class="amount-collected">${formatMoney(collecte)}</td>
      <td class="amount-remis">${formatMoney(remis)}</td>
      <td class="amount-diff ${diffClass}">${formatMoney(diff)}</td>
      <td>${t ? (t.remis_a || '-') : '<span style="color:var(--text-dim);">-</span>'}</td>
      <td>${t ? (t.note || '-') : '<span style="color:var(--text-dim);">-</span>'}</td>
      <td style="text-align: right;">
        <button type="button" class="btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" data-date="${sunday.isoDate}">
          ✏️ Saisir
        </button>
      </td>
    `;

    tr.querySelector('button').addEventListener('click', () => {
      switchTab('saisieView');
      selectSunday(sunday.isoDate);
    });

    monthlyTableBody.appendChild(tr);
  });

  const monthEcart = monthTotalCollecte - monthTotalRemis;
  let monthEcartClass = 'zero';
  if (monthEcart > 0) monthEcartClass = 'positive';
  if (monthEcart < 0) monthEcartClass = 'negative';

  monthlyTableFooter.innerHTML = `
    <tr style="font-weight: 700; background: rgba(255,255,255,0.04); font-size: 0.95rem;">
      <td style="padding: 1rem;">TOTAL ${formatMonthName(monthKey).toUpperCase()}</td>
      <td class="amount-collected" style="padding: 1rem;">${formatMoney(monthTotalCollecte)}</td>
      <td class="amount-remis" style="padding: 1rem;">${formatMoney(monthTotalRemis)}</td>
      <td class="amount-diff ${monthEcartClass}" style="padding: 1rem;">${formatMoney(monthEcart)}</td>
      <td colspan="3"></td>
    </tr>
  `;
}

// --- Exportation CSV ---
function exportMonthlyCSV() {
  const monthKey = appState.selectedMonthKey;
  const sundaysInMonth = appState.sundaysList.filter(s => s.monthKey === monthKey);

  let csvContent = "Date;Collecte (FCFA);Remis (FCFA);Ecart (FCFA);Remis A;Observations\n";

  sundaysInMonth.forEach(sunday => {
    const t = appState.transactionsMap.get(sunday.isoDate);
    const collecte = t ? (t.argent_collecte || 0) : 0;
    const remis = t ? (t.argent_remis || 0) : 0;
    const ecart = collecte - remis;
    const remisA = t ? (t.remis_a || '') : '';
    const note = t ? (t.note || '') : '';

    csvContent += `"${sunday.isoDate}";"${collecte}";"${remis}";"${ecart}";"${remisA.replace(/"/g, '""')}";"${note.replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Bilan_Caisse_${monthKey}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Export CSV téléchargé avec succès !', 'success');
}

// --- Notifications Toast ---
function showToast(message, type = 'success') {
  toastNotification.textContent = message;
  toastNotification.className = `toast ${type} show`;
  setTimeout(() => {
    toastNotification.classList.remove('show');
  }, 4000);
}
