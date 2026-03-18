"""权限数据模型

This module defines the Pydantic models for the authorization system.
"""

from typing import Dict, List, Literal

from pydantic import BaseModel, Field


class UserPermissions(BaseModel):
    """用户权限配置

    Attributes:
        mcps: 允许使用的 MCP 列表，"*" 表示所有
        tools: 允许使用的工具列表，"*" 表示所有
        skills: 允许使用的技能列表，"*" 表示所有
    """

    mcps: List[str] = Field(default_factory=list, description="Allowed MCP servers")
    tools: List[str] = Field(default_factory=list, description="Allowed tools")
    skills: List[str] = Field(default_factory=list, description="Allowed skills")


class User(BaseModel):
    """用户配置

    Attributes:
        username: 用户名
        role: 用户角色（user 或 admin）
        agents: 用户拥有的 Agent ID 列表
        permissions: 用户权限配置
    """

    username: str = Field(..., description="Username")
    role: Literal["user", "admin"] = Field(default="user", description="User role")
    agents: List[str] = Field(default_factory=list, description="Agent IDs owned by user")
    permissions: UserPermissions = Field(
        default_factory=UserPermissions,
        description="User permissions"
    )


class AgentConfig(BaseModel):
    """Agent 配置

    Attributes:
        owner: Agent 所有者的 user_id
        shared_with: 共享给的用户 ID 列表
    """

    owner: str = Field(..., description="Owner user ID")
    shared_with: List[str] = Field(
        default_factory=list,
        description="User IDs this agent is shared with"
    )


class AuthzConfig(BaseModel):
    """权限系统配置

    Attributes:
        users: 用户配置字典，key 为 user_id
        agents: Agent 配置字典，key 为 agent_id
    """

    users: Dict[str, User] = Field(
        default_factory=dict,
        description="User configurations keyed by user_id"
    )
    agents: Dict[str, AgentConfig] = Field(
        default_factory=dict,
        description="Agent configurations keyed by agent_id"
    )
