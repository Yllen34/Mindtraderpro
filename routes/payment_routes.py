import os
import stripe
from flask import Blueprint, request, jsonify

# Récupération de la clé Stripe depuis une variable d’environnement
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

payment_routes = Blueprint('payment_routes', __name__)

@payment_routes.route('/create-payment-intent', methods=['POST'])
def create_payment():
    try:
        data = request.get_json()
        amount = data['amount']

        # Création de l'intention de paiement Stripe
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='eur',
            automatic_payment_methods={
                'enabled': True,
            },
        )
        return jsonify({'clientSecret': intent['client_secret']})

    except Exception as e:
        return jsonify(error=str(e)), 403