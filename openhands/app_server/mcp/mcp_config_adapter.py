"""Compatibility boundary for SDK MCP settings.

OpenHands stores MCP servers through the SDK settings DataModel. SDK 1.30 used
FastMCP's ``{"mcpServers": ...}`` wrapper; software-agent-sdk#3964 makes the
DataModel field the native ``dict[str, MCPServer]`` server map. Keep that shape
decision out of app-server business logic.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any, cast

from fastmcp.mcp_config import MCPConfig as FastMCPConfig
from pydantic import BaseModel

try:
    from openhands.sdk.mcp.config import (
        MCPServer as NativeMCPServer,
    )
    from openhands.sdk.mcp.config import (
        dump_mcp_config as dump_native_mcp_config,
    )
except ImportError:  # SDK < software-agent-sdk#3964
    NativeMCPServer = None  # type: ignore[assignment]
    dump_native_mcp_config = None  # type: ignore[assignment]


def native_mcp_config_supported() -> bool:
    return NativeMCPServer is not None


def mcp_config_server_map(value: Any) -> dict[str, Any]:
    """Return a name-keyed MCP server map from either SDK settings shape."""
    if not value:
        return {}

    servers: Any
    if isinstance(value, FastMCPConfig):
        servers = value.mcpServers
    elif isinstance(value, Mapping):
        servers = value.get('mcpServers') if 'mcpServers' in value else value
    else:
        servers = getattr(value, 'mcpServers', None)

    return dict(servers) if isinstance(servers, Mapping) else {}


def _dump_server(server: Any) -> Any:
    if isinstance(server, BaseModel):
        return server.model_dump(mode='json', exclude_none=True, exclude_defaults=True)
    return server


def normalize_mcp_config_payload(value: Any) -> Any:
    """Normalize an incoming settings payload for the installed SDK version."""
    if value is None:
        return None
    if native_mcp_config_supported():
        return {
            name: _dump_server(server)
            for name, server in mcp_config_server_map(value).items()
        }
    if isinstance(value, FastMCPConfig):
        return value.model_dump(mode='json', exclude_none=True, exclude_defaults=True)
    if isinstance(value, Mapping) and 'mcpServers' not in value:
        return {'mcpServers': dict(value)}
    return value


def replace_mcp_config_in_agent_settings_dump(
    agent_settings_dump: dict[str, Any], value: Any
) -> None:
    """Replace ``mcp_config`` in a dumped agent-settings object."""
    if value is None and native_mcp_config_supported():
        agent_settings_dump.pop('mcp_config', None)
        return
    agent_settings_dump['mcp_config'] = normalize_mcp_config_payload(value)


def make_remote_mcp_server(url: str, headers: dict[str, str]) -> Any:
    """Create a remote MCP server value for the installed SDK settings model."""
    if NativeMCPServer is not None:
        return NativeMCPServer(url=url, headers=headers)
    return {'url': url, 'headers': headers}


def settings_mcp_config_value(mcp_servers: Mapping[str, Any] | None) -> Any:
    """Value suitable for ``OpenHandsAgentSettings.mcp_config``."""
    if not mcp_servers:
        return {} if native_mcp_config_supported() else None
    if native_mcp_config_supported():
        return dict(mcp_servers)
    return FastMCPConfig(
        mcpServers={name: _dump_server(server) for name, server in mcp_servers.items()}
    )


def dump_mcp_config_for_log(mcp_servers: Mapping[str, Any]) -> dict[str, Any]:
    if native_mcp_config_supported() and dump_native_mcp_config is not None:
        try:
            return dump_native_mcp_config(
                cast(Any, mcp_servers),
                context={'expose_secrets': True},
            )
        except Exception:
            pass
    return {name: _dump_server(server) for name, server in mcp_servers.items()}
