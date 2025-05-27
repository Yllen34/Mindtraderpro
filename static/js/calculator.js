/**
 * Trading Calculator Pro - JS sécurisé & optimisé
 */

async fetchLivePrice() {
    const symbol = document.getElementById('symbol').value;
    try {
        const res = await fetch('/price', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol })
        });

        const data = await res.json();
        const display = document.getElementById('priceDisplay');

        if (data.success) {
            display.innerHTML = `<strong>Prix Actuel:</strong> ${data.price}`;
        } else {
            display.innerHTML = 'Erreur de prix';
        }
    } catch (err) {
        document.getElementById('priceDisplay').innerHTML = 'Erreur API';
    }
}

class TradingCalculator {
    constructor() {
        this.form = document.getElementById('calculatorForm');
        this.resultsDiv = document.getElementById('calculatorResults');
        this.historyTable = document.getElementById('historyTableBody');
        this.calculateBtn = document.getElementById('calculateBtn');
        this.tpInput = document.getElementById('take_profit');
        this.slInput = document.getElementById('stop_loss');
        this.entryInput = document.getElementById('entry_price');
        this.directionInput = document.getElementById('direction');

        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        const inputs = this.form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.debounceCalculate());
        });

        this.directionInput.addEventListener('change', () => this.validateDirectionLogic());

        document.getElementById('clearHistory')?.addEventListener('click', () => this.clearHistory());

        this.loadHistory();
    }

    debounceCalculate() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            if (this.isFormValid()) {
                this.calculatePosition();
            }
        }, 500);
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (this.isFormValid()) {
            await this.calculatePosition();
        }
    }

    isFormValid() {
        let valid = true;
        const fields = ['capital', 'risk_percent', 'entry_price', 'stop_loss'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            el.classList.remove('is-invalid');
            if (!el.value || isNaN(el.value)) {
                el.classList.add('is-invalid');
                valid = false;
            }
        });

        if (!this.validateDirectionLogic()) {
            valid = false;
        }

        return valid;
    }

    validateDirectionLogic() {
        const direction = this.directionInput.value;
        const entry = parseFloat(this.entryInput.value);
        const sl = parseFloat(this.slInput.value);
        const tp = parseFloat(this.tpInput.value);
        let valid = true;

        this.slInput.classList.remove('is-invalid');
        this.tpInput.classList.remove('is-invalid');

        if (!isNaN(entry) && !isNaN(sl)) {
            if (direction === 'buy' && sl >= entry) {
                this.slInput.classList.add('is-invalid');
                valid = false;
            }
            if (direction === 'sell' && sl <= entry) {
                this.slInput.classList.add('is-invalid');
                valid = false;
            }
        }

        if (!isNaN(entry) && !isNaN(tp)) {
            if (direction === 'buy' && tp <= entry) {
                this.tpInput.classList.add('is-invalid');
                valid = false;
            }
            if (direction === 'sell' && tp >= entry) {
                this.tpInput.classList.add('is-invalid');
                valid = false;
            }
        }

        return valid;
    }

    async calculatePosition() {
        this.showLoading();

        try {
            const formData = new FormData(this.form);
            const data = Object.fromEntries(formData.entries());

            const response = await fetch('/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.displayResults(result);
                this.saveToHistory(data, result);
                this.updateHistory();
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            this.showError('Erreur de calcul: ' + error.message);
        }
    }

    showLoading() {
        this.calculateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Calcul...';
        this.calculateBtn.disabled = true;
    }

    displayResults(result) {
        const direction = this.directionInput.value;
        const symbol = document.getElementById('symbol').value;
        const capital = parseFloat(document.getElementById('capital').value);
        const riskPercent = parseFloat(document.getElementById('risk_percent').value);
        const entryPrice = parseFloat(this.entryInput.value);
        const stopLoss = parseFloat(this.slInput.value);
        const takeProfit = parseFloat(this.tpInput.value);
        const color = direction === 'buy' ? 'success' : 'danger';

        const risk = Math.abs(entryPrice - stopLoss);
        const reward = takeProfit ? Math.abs(takeProfit - entryPrice) : null;
        const rrRatio = reward ? `1:${(reward / risk).toFixed(2)}` : 'N/A';

        const html = `
            <div class="calculator-result">
                <h4 class="mb-3 text-${color}">
                    <i class="fas fa-${direction === 'buy' ? 'arrow-up' : 'arrow-down'} me-2"></i>
                    ${symbol} - ${direction.toUpperCase()}
                </h4>
                <div class="row text-center">
                    <div class="col-6">
                        <h3 class="text-warning">${result.lot_size}</h3>
                        <small>Taille de Position</small>
                    </div>
                    <div class="col-6">
                        <h3 class="text-info">€${result.risk_amount}</h3>
                        <small>Risque (${riskPercent}%)</small>
                    </div>
                </div>
                <hr>
                <div class="row small text-start">
                    <div class="col-6"><strong>Pip Value:</strong> €${result.pip_value}</div>
                    <div class="col-6"><strong>Distance SL:</strong> ${result.pip_difference} pips</div>
                    <div class="col-6"><strong>Capital:</strong> €${capital.toLocaleString()}</div>
                    <div class="col-6"><strong>R/R Ratio:</strong> ${rrRatio}</div>
                </div>
            </div>
        `;

        this.resultsDiv.innerHTML = html;
        this.resultsDiv.classList.add('fade-in');

        this.calculateBtn.innerHTML = '<i class="fas fa-calculator me-2"></i>Calculer la Position';
        this.calculateBtn.disabled = false;

        this.showAIAdvice(result);
    }

    showAIAdvice(result) {
        const riskPercent = parseFloat(document.getElementById('risk_percent').value);
        const lotSize = result.lot_size;
        const adviceDiv = document.getElementById('aiAdvice');

        let advice = {
            type: 'primary',
            message: 'Position correcte. Continue à respecter ton plan.'
        };

        if (riskPercent > 2) {
            advice = {
                type: 'warning',
                message: 'Risque élevé ! Pense à baisser ton exposition.'
            };
        } else if (lotSize < 0.01) {
            advice = {
                type: 'info',
                message: 'Taille très petite. Tu peux augmenter un peu selon ton profil.'
            };
        } else if (riskPercent <= 1) {
            advice = {
                type: 'success',
                message: 'Excellente gestion du risque !'
            };
        }

        adviceDiv.innerHTML = `
            <div class="alert alert-${advice.type}">
                <i class="fas fa-robot me-2"></i>
                <strong>Conseil IA:</strong> ${advice.message}
            </div>
        `;
    }

    showError(message) {
        this.resultsDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i> ${message}
            </div>
        `;
        this.calculateBtn.innerHTML = '<i class="fas fa-calculator me-2"></i>Calculer la Position';
        this.calculateBtn.disabled = false;
    }

    saveToHistory(data, result) {
        const history = JSON.parse(localStorage.getItem('calculatorHistory') || '[]');
        const timestamp = new Date().toISOString();
        const entry = {
            timestamp,
            ...data,
            lot_size: result.lot_size,
            risk_amount: result.risk_amount
        };
        history.unshift(entry);
        if (history.length > 20) history.splice(20);
        localStorage.setItem('calculatorHistory', JSON.stringify(history));
    }

    loadHistory() {
        this.updateHistory();
    }

    updateHistory() {
        const history = JSON.parse(localStorage.getItem('calculatorHistory') || '[]');
        this.historyTable.innerHTML = history.length === 0
            ? `<tr><td colspan="7" class="text-center text-muted py-4"><i class="fas fa-inbox me-2"></i> Aucun calcul effectué</td></tr>`
            : history.map(entry => {
                const time = new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                const directionIcon = entry.direction === 'buy' ? '📈' : '📉';
                const directionClass = entry.direction === 'buy' ? 'text-success' : 'text-danger';
                let rrRatio = 'N/A';
                if (entry.take_profit) {
                    const r = Math.abs(entry.entry_price - entry.stop_loss);
                    const rw = Math.abs(entry.take_profit - entry.entry_price);
                    rrRatio = `1:${(rw / r).toFixed(2)}`;
                }
                return `
                    <tr>
                        <td>${time}</td>
                        <td><strong>${entry.symbol}</strong></td>
                        <td class="${directionClass}">${directionIcon} ${entry.direction.toUpperCase()}</td>
                        <td><span class="badge bg-primary">${entry.lot_size}</span></td>
                        <td>€${parseFloat(entry.risk_amount).toFixed(2)}</td>
                        <td>${rrRatio}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-info" onclick="calculator.reuseCalculation('${entry.timestamp}')">
                                <i class="fas fa-redo fa-xs"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
    }

    reuseCalculation(timestamp) {
        const history = JSON.parse(localStorage.getItem('calculatorHistory') || '[]');
        const entry = history.find(h => h.timestamp === timestamp);
        if (!entry) return;
        Object.keys(entry).forEach(key => {
            if (document.getElementById(key)) {
                document.getElementById(key).value = entry[key];
            }
        });
        this.calculatePosition();
    }

    clearHistory() {
        if (confirm('Effacer l’historique ?')) {
            localStorage.removeItem('calculatorHistory');
            this.updateHistory();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.calculator = new TradingCalculator();
});