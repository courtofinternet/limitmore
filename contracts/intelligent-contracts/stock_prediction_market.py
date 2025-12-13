# { "Depends": "py-genlayer:latest" }
from genlayer import *

class StockPredictionMarket(gl.Contract):
    market_id: str
    stock_symbol: str
    company_name: str
    market_title: str
    side_a: str
    side_b: str
    resolved_price: u256
    winning_side: str
    resolution_url: str
    resolved_at: str

    def __init__(self, market_id: str, stock_symbol: str, company_name: str, market_title: str, side_a: str, side_b: str):
        if not market_id or not stock_symbol or not company_name or not market_title or not side_a or not side_b:
            raise gl.vm.UserError("All parameters are required: market_id, stock_symbol, company_name, market_title, side_a, side_b")

        self.market_id = market_id
        self.stock_symbol = stock_symbol.upper()
        self.company_name = company_name
        self.market_title = market_title
        self.side_a = side_a
        self.side_b = side_b

        # Build URL from stock symbol
        url = f"https://markets.businessinsider.com/stocks/{stock_symbol.lower()}-stock"
        self.resolution_url = url
        self.resolved_at = gl.message_raw['datetime']

        # Resolve stock price and determine winning side at deployment time
        def fetch_price_and_winner_task():
            content = gl.nondet.web.render(url, mode="text")

            # Use local variables to avoid storage access in nondet context
            prompt = f"""
            IMPORTANT: This contract is being deployed at the resolution time mentioned in the market title.
            Any future time reference in the title refers to NOW - we have reached that target date/time.

            Market: {market_title}
            Side A: {side_a}
            Side B: {side_b}

            Based on this website content about {company_name} ({stock_symbol.upper()}):
            {content[:1500]}

            Extract the current stock price in USD and determine which side won based on the market conditions described in the title.
            Remember: if the title mentions a future date/time, that time is NOW.

            Return your response as a valid JSON object with this exact structure:
            {{"price": 150.25, "winner": "{side_a}"}}

            Where price is the numeric value only and winner must be EXACTLY one of these options:
            - "{side_a}"
            - "{side_b}"

            Do not use "Side A" or "Side B" - use the exact text provided above.
            """
            return gl.nondet.exec_prompt(prompt)

        # All validators must agree on the exact result
        json_result = gl.eq_principle.strict_eq(fetch_price_and_winner_task)

        # Parse JSON response
        import json
        result_data = json.loads(json_result)

        # Extract price and winner from JSON
        price_value = result_data["price"]
        winner_value = result_data["winner"]

        # Convert price to cents and store
        self.resolved_price = u256(int(price_value * 100))
        self.winning_side = winner_value

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
    def get_stock_symbol(self) -> str:
        return self.stock_symbol

    @gl.public.view
    def get_company_name(self) -> str:
        return self.company_name

    @gl.public.view
    def get_market_id(self) -> str:
        return self.market_id

    @gl.public.view
    def get_market_title(self) -> str:
        return self.market_title

    @gl.public.view
    def get_side_a(self) -> str:
        return self.side_a

    @gl.public.view
    def get_side_b(self) -> str:
        return self.side_b

    @gl.public.view
    def get_winning_side(self) -> str:
        return self.winning_side

    @gl.public.view
    def get_resolution_details(self) -> dict:
        return {
            "market_id": self.market_id,
            "market_title": self.market_title,
            "stock_symbol": self.stock_symbol,
            "company_name": self.company_name,
            "side_a": self.side_a,
            "side_b": self.side_b,
            "resolved_price_cents": int(self.resolved_price),
            "winning_side": self.winning_side,
            "resolution_url": self.resolution_url,
            "resolved_at": self.resolved_at
        }