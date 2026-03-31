"""
Configuration module for the UCM-to-Webex Calling dial plan migration scripts.

Reads Webex OAuth integration credentials exclusively from environment variables
(never from source code). Manages token acquisition and refresh via wxc-sdk.

REQUIRED ENVIRONMENT VARIABLES:
  TOKEN_INTEGRATION_CLIENT_ID      - Webex OAuth integration client ID
  TOKEN_INTEGRATION_CLIENT_SECRET  - Webex OAuth integration client secret
  TOKEN_INTEGRATION_CLIENT_SCOPES  - Space-separated OAuth scopes

SECURITY:
  Credentials are loaded from environment variables or a .env file via python-dotenv.
  OAuth access and refresh tokens are cached in config.yml only (not in environment
  variables or source code). The config.yml file must be excluded from source control.
"""
import json
import logging
import os
from typing import Optional, Union

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel
from wxc_sdk.common import RouteType
from wxc_sdk.integration import Integration
from wxc_sdk.tokens import Tokens

__all__ = ['DialplanConfig', 'Config']

load_dotenv()

log = logging.getLogger(__name__)


def build_integration() -> Integration:
    """
    Read Webex OAuth integration parameters from environment variables.

    :raises ValueError: if any required environment variable is missing
    :return: wxc_sdk.integration.Integration instance
    """
    client_id = os.getenv('TOKEN_INTEGRATION_CLIENT_ID')
    client_secret = os.getenv('TOKEN_INTEGRATION_CLIENT_SECRET')
    scopes = os.getenv('TOKEN_INTEGRATION_CLIENT_SCOPES')
    redirect_url = 'http://localhost:6001/redirect'
    if not all((client_id, client_secret, scopes)):
        raise ValueError(
            'TOKEN_INTEGRATION_CLIENT_ID, TOKEN_INTEGRATION_CLIENT_SECRET, and '
            'TOKEN_INTEGRATION_CLIENT_SCOPES must all be set in the environment or .env file.'
        )
    return Integration(client_id=client_id, client_secret=client_secret, scopes=scopes,
                       redirect_url=redirect_url)


class DialplanConfig(BaseModel):
    """Configuration for a single Webex Calling dial plan."""
    name: str
    route_type: RouteType
    route_choice: str
    catalogs: list[str]


class Config(BaseModel):
    """Top-level configuration for the dial plan provisioning scripts."""
    tokens: Optional[Union[str, Tokens]]
    dialplans: Optional[list[DialplanConfig]]
    yml_path: Optional[str]

    def json(self) -> str:
        return super().json(exclude={'yml_path'})

    @staticmethod
    def from_yml(path: str) -> 'Config':
        """
        Load configuration from a YAML file using yaml.safe_load (prevents
        arbitrary object deserialization per codeguard-0-xml-and-serialization).

        :param path: path to config.yml
        :return: Config instance with valid access token
        """
        with open(path, mode='r') as f:
            config_dict = yaml.safe_load(f)
        config: Config = Config.parse_obj(config_dict)
        config.yml_path = path
        if isinstance(config.tokens, str):
            config.tokens = Tokens(access_token=config.tokens)
        config.assert_access_token()
        return config

    def write(self):
        """Persist updated token back to config.yml."""
        data = json.loads(self.json())
        with open(self.yml_path, mode='w') as f:
            yaml.dump(data, f, default_flow_style=False)

    def assert_access_token(self):
        """Validate existing token or acquire a new one via OAuth flow."""
        if self.tokens and not self.tokens.refresh_token:
            return
        integration = build_integration()
        if self.tokens:
            tokens: Tokens
            changed = integration.validate_tokens(tokens=self.tokens)
            if not self.tokens.access_token:
                self.tokens = None
            elif changed:
                self.write()
        if not self.tokens:
            self.tokens = integration.get_tokens_from_oauth_flow()
            if self.tokens:
                self.write()
