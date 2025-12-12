# { "Depends": "py-genlayer:latest" }
from genlayer import *

class CryptoPredictionMarket(gl.Contract):
    market_id: str
    token_symbol: str
    token_name: str
    resolved_price: u256
    resolution_url: str
    resolved_at: str

    def __init__(self, market_id: str, token_symbol: str, token_name: str):
        if not market_id or not token_symbol or not token_name:
            raise gl.vm.UserError("Market ID, token symbol, and token name are required")

        self.market_id = market_id
        self.token_symbol = token_symbol.upper()
        self.token_name = token_name

        # Build URL from token name
        url = f"https://coinmarketcap.com/currencies/{token_name.lower()}/"
        self.resolution_url = url
        self.resolved_at = gl.message_raw['datetime']

        # Resolve price at deployment time
        def fetch_price_task():
            content = gl.nondet.web.render(url, mode="text")

            # Use local variables, not self.* to avoid storage access in nondet context
            prompt = f"""
            Extract the current price of {token_name} ({token_symbol.upper()}) in USD from this content:
            {content[:2000]}

            Return only the numeric price value (e.g., 65000.50).
            """
            return gl.nondet.exec_prompt(prompt)

        # All validators must agree on the exact price
        price_str = gl.eq_principle.strict_eq(fetch_price_task)

        # Convert to integer (cents) to avoid decimal issues
        price_float = float(price_str.replace(',', '').replace('$', ''))
        self.resolved_price = u256(int(price_float * 100))  # Store in cents

    @gl.public.view
    def get_resolved_price(self) -> u256:
        """Returns the resolved price in cents (multiply by 100)"""
        return self.resolved_price

    @gl.public.view
    def get_price_dollars(self) -> str:
        """Returns the price formatted as dollars"""
        dollars = self.resolved_price / 100
        return f"${dollars:.2f}"

    @gl.public.view
    def get_token_symbol(self) -> str:
        return self.token_symbol

    @gl.public.view
    def get_token_name(self) -> str:
        return self.token_name

    @gl.public.view
    def get_market_id(self) -> str:
        return self.market_id

    @gl.public.view
    def get_resolution_details(self) -> dict:
        return {
            "market_id": self.market_id,
            "token_symbol": self.token_symbol,
            "token_name": self.token_name,
            "resolved_price_cents": int(self.resolved_price),
            "resolution_url": self.resolution_url,
            "resolved_at": self.resolved_at
        }