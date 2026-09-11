/**
 * Utilitaires pour la gestion des dimanches et des dates en français
 */

/**
 * Renvoie le premier dimanche de septembre pour une année donnée
 * @param {number} year 
 * @returns {Date}
 */
export function getFirstSundayOfSeptember(year = new Date().getFullYear()) {
    // Le mois 8 correspond à septembre (0-indexé)
    let date = new Date(year, 8, 1);
    while (date.getDay() !== 0) {
        date.setDate(date.getDate() + 1);
    }
    return date;
}

/**
 * Formate une date YYYY-MM-DD en Date Javascript ISO locale
 * @param {string} dateStr 
 * @returns {Date}
 */
export function parseISODate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Formate un objet Date en chaîne ISO YYYY-MM-DD
 * @param {Date} date 
 * @returns {string}
 */
export function formatISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Génère la liste des dimanches depuis le 1er dimanche de septembre jusqu'à 8 semaines dans le futur
 * @param {number} startYear 
 * @returns {Array<{ isoDate: string, label: string, monthKey: string, formattedShort: string }>}
 */
export function generateSundaysList(startYear = new Date().getFullYear()) {
    const firstSunday = getFirstSundayOfSeptember(startYear);
    const today = new Date();
    
    // On génère jusqu me au dernier dimanche du mois en cours + 4 dimanches à venir
    const futureLimit = new Date(today);
    futureLimit.setDate(today.getDate() + 28);

    const sundays = [];
    let current = new Date(firstSunday);

    while (current <= futureLimit || sundays.length < 5) {
        const isoDate = formatISODate(current);
        const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        
        const formattedFull = new Intl.DateTimeFormat('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(current);

        const formattedShort = new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'short'
        }).format(current);

        sundays.push({
            isoDate,
            monthKey,
            label: formattedFull.charAt(0).toUpperCase() + formattedFull.slice(1),
            formattedShort,
            dateObj: new Date(current)
        });

        // Passer au dimanche suivant (+7 jours)
        current.setDate(current.getDate() + 7);
    }

    return sundays;
}

/**
 * Formate un montant en devise (ex: FCFA ou €)
 * @param {number} amount 
 * @param {string} currencySymbol 
 * @returns {string}
 */
export function formatMoney(amount, currencySymbol = 'FCFA') {
    const numericAmount = Number(amount) || 0;
    const formatted = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(numericAmount);

    return `${formatted} ${currencySymbol}`;
}

/**
 * Formatage d'une clé de mois YYYY-MM en texte lisible (ex: "Septembre 2026")
 * @param {string} monthKey 
 * @returns {string}
 */
export function formatMonthName(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const str = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
    return str.charAt(0).toUpperCase() + str.slice(1);
}
