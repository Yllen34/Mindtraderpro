from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import os

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "changeme")

# Configuration base de données
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///trading.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# Modèle de base pour stocker les paires personnalisées (si besoin)
class CurrencyPair(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(10), unique=True, nullable=False)
    pip_value = db.Column(db.Float, nullable=False)

# Page d'accueil
@app.route("/")
@app.route("/home")
def home():
    return render_template("home.html")

# Page du calculateur
@app.route("/calculator")
def calculator():
    return render_template("calculator.html")

# Route pour calculer la position
@app.route("/calculate", methods=["POST"])
def calculate():
    try:
        data = request.get_json()

        # Sécurité : validation des champs
        required_fields = ["symbol", "direction", "capital", "risk_percent", "entry_price", "stop_loss"]
        for field in required_fields:
            if field not in data or not str(data[field]).strip():
                return jsonify({"success": False, "error": f"Champ requis manquant : {field}"}), 400

        symbol = data["symbol"]
        direction = data["direction"]
        capital = float(data["capital"])
        risk_percent = float(data["risk_percent"])
        entry_price = float(data["entry_price"])
        stop_loss = float(data["stop_loss"])
        take_profit = float(data.get("take_profit")) if data.get("take_profit") else None

        # Valider la logique Buy/Sell
        if direction == "buy" and stop_loss >= entry_price:
            return jsonify({"success": False, "error": "Le Stop Loss doit être inférieur au prix d'entrée pour un achat."})
        if direction == "sell" and stop_loss <= entry_price:
            return jsonify({"success": False, "error": "Le Stop Loss doit être supérieur au prix d'entrée pour une vente."})

        # Détection du pip size
        pip_size = 0.01 if "JPY" in symbol else 0.0001
        if symbol == "XAUUSD":
            pip_size = 0.1

        pip_difference = abs(entry_price - stop_loss) / pip_size
        risk_amount = capital * (risk_percent / 100)

        pip_value = 1.0  # valeur standard approximative
        if symbol == "XAUUSD":
            pip_value = 0.1
        elif symbol.endswith("JPY"):
            pip_value = 1
        else:
            pip_value = 10

        lot_size = round(risk_amount / (pip_difference * pip_value), 2)

        return jsonify({
            "success": True,
            "lot_size": lot_size,
            "risk_amount": round(risk_amount, 2),
            "pip_difference": round(pip_difference),
            "pip_value": pip_value
        })

    except Exception as e:
        return jsonify({"success": False, "error": f"Erreur serveur : {str(e)}"}), 500

# Lancer l'app uniquement si exécutée directement (pas en import)
from flask import request, jsonify
from services.metaapi_service import get_price_from_metaapi

@app.route("/price", methods=["POST"])
def get_price():
    data = request.json
    symbol = data.get("symbol")
    if not symbol:
        return jsonify({"success": False, "error": "Symbole requis."}), 400

    try:
        price = get_price_from_metaapi(symbol)
        return jsonify({"success": True, "price": price})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
if __name__ == "__main__":
    app.run(debug=False)