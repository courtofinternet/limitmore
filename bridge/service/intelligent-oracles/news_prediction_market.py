# { "Depends": "py-genlayer:latest" }
from genlayer import *
from datetime import datetime

genvm_eth = gl.evm

class NewsPredictionMarket(gl.Contract):
    market_id: str
    region: str
    market_title: str
    side_a: str
    side_b: str
    announcement_found: bool
    resolved_price: u256
    winning_side: str
    resolution_url: str
    resolved_at: str
    # Bridge config
    bridge_sender: Address
    target_chain_eid: u256
    target_contract: str

    def __init__(self, market_id: str, region: str, market_title: str, side_a: str, side_b: str,
                 bridge_sender: str, target_chain_eid: int, target_contract: str):
        if not market_id or not region or not market_title or not side_a or not side_b:
            raise gl.vm.UserError("All parameters are required: market_id, region, market_title, side_a, side_b")
        if not bridge_sender or not target_contract:
            raise gl.vm.UserError("Bridge config required: bridge_sender, target_chain_eid, target_contract")

        # Store bridge config
        self.bridge_sender = Address(bridge_sender)
        self.target_chain_eid = u256(target_chain_eid)
        self.target_contract = target_contract

        # Validate and map region to BBC URL
        region_urls = {
            "NA": "https://www.bbc.com/news/us-canada",
            "EU": "https://www.bbc.com/news/world/europe",
            "AF": "https://www.bbc.com/news/world/africa",
            "AS": "https://www.bbc.com/news/world/asia",
            "SA": "https://www.bbc.com/news/world/latin_america"
        }

        if region not in region_urls:
            raise gl.vm.UserError("Invalid region. Must be one of: NA, EU, AF, AS, SA")

        self.market_id = market_id
        self.region = region
        self.market_title = market_title
        self.side_a = side_a
        self.side_b = side_b

        # Get BBC regional news URL
        url = region_urls[region]
        self.resolution_url = url
        self.resolved_at = gl.message_raw['datetime']

        # Resolve news announcement and determine winning side at deployment time
        def fetch_news_and_winner_task():
            screenshot = gl.nondet.web.render(url, mode="screenshot")

            # Use local variables to avoid storage access in nondet context
            prompt = f"""
            IMPORTANT: This contract is being deployed at the resolution time mentioned in the market title.
            Any future time reference in the title refers to NOW - we have reached that target date/time.

            Market: "{market_title}"
            Side A: "{side_a}"
            Side B: "{side_b}"

            ANALYSIS TASK:
            Carefully examine this screenshot of the BBC {region} news page. Look for any headlines, articles, or news content that would confirm or deny the prediction described in the market title.

            SEARCH CRITERIA:
            - Scan all visible headlines and article titles
            - Look for news stories related to the market prediction topic
            - Consider recent announcements, events, or developments
            - Remember: if the title mentions a future date/time, that time is NOW

            DECISION PROCESS:
            1. Did you find any relevant news that confirms the prediction? (true/false)
            2. Based on what you found (or didn't find), which side wins?
            3. Winner must be EXACTLY one of: "{side_a}" OR "{side_b}"

            Return your analysis as a JSON object:
            {{
                "announcement_found": [true or false],
                "winner": "[exact side text]",
                "reasoning": "[brief explanation of your findings]"
            }}

            CRITICAL: Winner must be "{side_a}" or "{side_b}" - use exact text, no variations.
            """
            return gl.nondet.exec_prompt(prompt, images=[screenshot])

        # Define principle for comparative equivalence
        principle = f"""
        Compare the two news analysis results for semantic agreement on:
        1. Whether relevant announcements were found (announcement_found: true/false)
        2. Which prediction side won (winner must be exactly "{side_a}" or "{side_b}")
        3. Overall conclusion about the market outcome

        Results should be considered equivalent if they:
        - Agree on announcement_found (both true or both false)
        - Agree on the winning side (same exact text: "{side_a}" or "{side_b}")
        - Reach the same market resolution conclusion

        Minor differences in reasoning text or JSON formatting are acceptable as long as
        the core findings (announcement_found and winner) are semantically identical.
        """

        # Use prompt comparative for semantic agreement
        raw_result = gl.eq_principle.prompt_comparative(fetch_news_and_winner_task, principle)

        # Robust JSON parsing with error handling
        def parse_json_robustly(text):
            import json
            import re

            # First try direct parsing
            try:
                return json.loads(text)
            except:
                pass

            # Try to extract JSON from text if wrapped in other content
            json_match = re.search(r'\{[^}]+\}', text, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group(0))
                except:
                    pass

            # Try to fix common JSON issues
            try:
                # Fix single quotes to double quotes
                fixed_text = text.replace("'", '"')
                # Remove trailing commas
                fixed_text = re.sub(r',(\s*[}\]])', r'\1', fixed_text)
                return json.loads(fixed_text)
            except:
                pass

            # Fallback: parse manually
            announcement_match = re.search(r'"?announcement_found"?\s*:\s*(true|false)', text, re.IGNORECASE)
            winner_match = re.search(rf'"?winner"?\s*:\s*"({re.escape(side_a)}|{re.escape(side_b)})"', text, re.IGNORECASE)

            if announcement_match and winner_match:
                return {
                    "announcement_found": announcement_match.group(1).lower() == "true",
                    "winner": winner_match.group(1)
                }

            # Final fallback - default values
            return {
                "announcement_found": False,
                "winner": side_a  # Default to first side
            }

        # Parse the result
        result_data = parse_json_robustly(raw_result)

        # Extract and validate data
        self.announcement_found = bool(result_data.get("announcement_found", False))

        # Ensure winner is one of the valid sides
        winner = result_data.get("winner", side_a)
        if winner not in [side_a, side_b]:
            # If invalid winner, default to side_a
            self.winning_side = side_a
        else:
            self.winning_side = winner

        # Set resolved_price based on announcement_found (1 if found, 0 if not)
        self.resolved_price = u256(1 if self.announcement_found else 0)

        # Send resolution to EVM via bridge
        self._send_resolution_to_bridge()

    def _send_resolution_to_bridge(self):
        """Encode and send resolution result to EVM via BridgeSender."""
        # Determine if side_a won
        side_a_wins = (self.winning_side == self.side_a)
        is_undetermined = False
        timestamp = int(datetime.now().timestamp())
        tx_hash = bytes(32)  # Empty hash placeholder

        # Step 1: Encode resolution data: (address, bool, bool, uint256, bytes32, uint256, string)
        resolution_abi = [Address, bool, bool, u256, bytes, u256, str]
        resolution_encoder = genvm_eth.MethodEncoder("", resolution_abi, bool)
        resolution_data = resolution_encoder.encode_call([
            Address(self.market_id),  # bet address
            side_a_wins,
            is_undetermined,
            u256(timestamp),
            tx_hash,
            self.resolved_price,      # announcement found (1) or not (0)
            self.winning_side         # winning side name
        ])[4:]  # Remove method selector

        # Step 2: Wrap with target contract address: (address, bytes)
        # BetFactoryCOFI.processBridgeMessage expects: (address targetContract, bytes data)
        wrapper_abi = [Address, bytes]
        wrapper_encoder = genvm_eth.MethodEncoder("", wrapper_abi, bool)
        message_bytes = wrapper_encoder.encode_call([
            Address(self.market_id),  # targetContract (the bet address)
            resolution_data           # the resolution data
        ])[4:]  # Remove method selector

        # Send via BridgeSender
        bridge = gl.get_contract_at(self.bridge_sender)
        bridge.emit().send_message(
            self.target_chain_eid,
            self.target_contract,
            message_bytes
        )

    @gl.public.view
    def get_resolution_details(self) -> dict:
        return {
            "market_id": self.market_id,
            "market_title": self.market_title,
            "region": self.region,
            "side_a": self.side_a,
            "side_b": self.side_b,
            "announcement_found": self.announcement_found,
            "winning_side": self.winning_side,
            "resolution_url": self.resolution_url,
            "resolved_at": self.resolved_at
        }