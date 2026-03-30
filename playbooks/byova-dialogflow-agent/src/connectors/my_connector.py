# src/connectors/my_connector.py
from .i_vendor_connector import IVendorConnector

class MyConnector(IVendorConnector):
    def __init__(self, config):
        self.config = config
        self.agents = config.get("agents", ["My Agent"])
    
    def start_conversation(self, conversation_id, request_data):
        return self.create_session_start_response(
            conversation_id, 
            text="Hello from my connector!"
        )
    
    def send_message(self, conversation_id, message_data):
        yield self.create_response(
            conversation_id,
            message_type="agent_response",
            text="Got your message!",
            response_type="final"
        )
    
    def end_conversation(self, conversation_id, message_data=None):
        """End the conversation"""
        pass
    
    def get_available_agents(self):
        """Return list of available agent IDs"""
        return self.agents
    
    def convert_wxcc_to_vendor(self, grpc_data):
        """Convert WxCC format to vendor format"""
        return grpc_data
    
    def convert_vendor_to_wxcc(self, vendor_data):
        """Convert vendor format to WxCC format"""
        return vendor_data