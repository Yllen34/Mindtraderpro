import os
import requests

class MetaAPIService:
    def __init__(self):
        self.token = os.getenv("METAAPI_TOKEN")
        self.account_id = os.getenv("METAAPI_ACCOUNT_ID")
        self.base_url = "https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai"
        self.headers = {
            "auth-token": self.token,
            "Content-Type": "application/json"
        }

    def get_price(self, symbol):
        try:
            url = f"{self.base_url}/users/current/accounts/{self.account_id}/symbols/{symbol}/price"
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            data = response.json()
            return {
                "success": True,
                "price": (data.get("bid") + data.get("ask")) / 2,
                "bid": data.get("bid"),
                "ask": data.get("ask")
            }
        except Exception as e:
            print(f"[MetaAPI] Erreur lors de la récupération du prix : {e}")
            return {
                "success": False,
                "error": str(e)
            }