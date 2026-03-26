# CLI Token Integration Guide

本文档说明如何在 Shell CLI 中集成 CLI Token 解密功能。

## 概述

服务器会将 Keycloak JWT token 加密后传递给 Shell 执行环境。CLI 工具需要解密这个 token 才能获取用户信息。

## 加密算法

**Fernet (AES-128-CBC + HMAC-SHA256)**

- 标准、公开的对称加密算法
- Go 有官方支持的库: `github.com/fernet/fernet-go`
- 加密后的 token 是 base64 字符串，可以安全放入环境变量

## 环境变量

| 变量名 | 来源 | 说明 |
|--------|------|------|
| `CLI_ACCESS_TOKEN` | Shell 执行环境 | 加密后的 token，由服务器注入 |
| `CLI_TOKEN_ENCRYPTION_KEY` | 硬编码到 CLI 二进制 | 44 字符的 base64 密钥 |
| `CLI_TOKEN_TTL` | 硬编码到 CLI 二进制 | Token 有效期（秒），默认 180 |

## API 接口

### GET /api/auth/cli-token

获取加密的 CLI token（需要 Keycloak 认证）。

**响应:**

```json
{
  "encrypted_token": "gAAAAABpxNnUM8nRl0PvWGg6GMHMmOLBFcbfBirs1RWzTsA8QrtfqhvkqJVt...",
  "token_ttl": 180,
  "keycloak_issuer": "https://keycloak.example.com/realms/your-realm",
  "keycloak_audience": "your-client-id"
}
```

**注意:** `encryption_key` 不会通过 API 返回，必须通过安全渠道获取并硬编码。

## Go 实现

### 1. 安装依赖

```bash
go get github.com/fernet/fernet-go
```

### 2. 解密代码示例

```go
package clitoken

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/fernet/fernet-go"
)

// 硬编码配置 - 构建时注入
var (
	// 44 字符的 base64 Fernet 密钥
	encryptionKey = "YOUR_ENCRYPTION_KEY_HERE"
	// Token 有效期（秒）
	tokenTTL = 180
)

// Config CLI token 配置
type Config struct {
	EncryptedToken   string
	EncryptionKey    string
	TokenTTL         int
	KeycloakIssuer   string
	KeycloakAudience string
}

// DecodedToken 解密后的 token 信息
type DecodedToken struct {
	JWT       string
	ExpiresAt time.Time
}

// Decrypt 解密 CLI_ACCESS_TOKEN
func Decrypt(encryptedToken string) (string, error) {
	if encryptedToken == "" {
		return "", errors.New("empty token")
	}

	key, err := fernet.DecodeKey(encryptionKey)
	if err != nil {
		return "", fmt.Errorf("invalid encryption key: %w", err)
	}

	ttl := time.Duration(tokenTTL) * time.Second
	decrypted := fernet.VerifyAndDecrypt(
		[]byte(encryptedToken),
		ttl,
		[]*fernet.Key{key},
	)

	if decrypted == nil {
		return "", errors.New("token expired or invalid signature")
	}

	return string(decrypted), nil
}

// DecryptFromEnv 从环境变量 CLI_ACCESS_TOKEN 解密
func DecryptFromEnv() (string, error) {
	encrypted := os.Getenv("CLI_ACCESS_TOKEN")
	if encrypted == "" {
		return "", errors.New("CLI_ACCESS_TOKEN not set")
	}
	return Decrypt(encrypted)
}

// ParseJWT 解析 JWT payload（不验证签名，仅提取信息）
// 注意：解密后的 JWT 仍需通过 Keycloak JWKS 验证
func ParseJWT(jwt string) (map[string]interface{}, error) {
	parts := strings.Split(jwt, ".")
	if len(parts) != 3 {
		return nil, errors.New("invalid JWT format")
	}

	// Decode payload (second part)
	payload := parts[1]
	// Add padding if needed
	switch len(payload) % 4 {
	case 2:
		payload += "=="
	case 3:
		payload += "="
	}

	decoded, err := fernet.Base64DecodeString(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to decode payload: %w", err)
	}

	var claims map[string]interface{}
	if err := json.Unmarshal(decoded, &claims); err != nil {
		return nil, fmt.Errorf("failed to parse claims: %w", err)
	}

	return claims, nil
}

// GetUserID 从 JWT claims 中提取用户标识
func GetUserID(claims map[string]interface{}) string {
	// 尝试常见的用户标识字段
	for _, field := range []string{"preferred_username", "email", "sub"} {
		if v, ok := claims[field]; ok {
			if s, ok := v.(string); ok && s != "" {
				return s
			}
		}
	}
	return ""
}
```

### 3. 使用示例

```go
package main

import (
	"fmt"
	"log"

	"your-project/clitoken"
)

func main() {
	// 从环境变量解密 token
	jwt, err := clitoken.DecryptFromEnv()
	if err != nil {
		log.Fatalf("Failed to decrypt token: %v", err)
	}

	fmt.Printf("Decrypted JWT: %s\n", jwt)

	// 解析 JWT claims（不验证签名）
	claims, err := clitoken.ParseJWT(jwt)
	if err != nil {
		log.Fatalf("Failed to parse JWT: %v", err)
	}

	userID := clitoken.GetUserID(claims)
	fmt.Printf("User ID: %s\n", userID)

	// TODO: 使用 Keycloak JWKS 验证 JWT 签名
	// 参考: github.com/MicahParks/keyfunc
}
```

### 4. 构建时注入密钥

**方式一：使用 ldflags**

```bash
#!/bin/bash

# 从服务器获取密钥（需要管理员权限）
KEY=$(cat /path/to/secret/cli_token_key.txt)

go build -ldflags "-X main.encryptionKey=$KEY" -o cli ./cmd/cli
```

**方式二：代码生成**

```go
//go:generate go run gen_key.go -key-file /path/to/key -output key.go
```

**方式三：构建脚本替换**

```bash
#!/bin/bash
KEY=$(cat /etc/wisecore/cli_token_key.txt)
sed "s/YOUR_ENCRYPTION_KEY_HERE/$KEY/g" clitoken/key_template.go > clitoken/key_generated.go
go build -o cli ./cmd/cli
rm clitoken/key_generated.go
```

## Keycloak JWT 验证

解密后的 JWT 仍需通过 Keycloak JWKS 验证签名。推荐库：

- `github.com/MicahParks/keyfunc` - JWKS 支持
- `github.com/golang-jwt/jwt/v5` - JWT 解析

```go
import (
	"github.com/MicahParks/keyfunc"
	"github.com/golang-jwt/jwt/v5"
)

func verifyJWTWithJWKS(jwtStr string, issuer string) (jwt.MapClaims, error) {
	// 获取 JWKS
	jwksURL := fmt.Sprintf("%s/protocol/openid-connect/certs", issuer)
	jwks, err := keyfunc.Get(jwksURL, keyfunc.Options{})
	if err != nil {
		return nil, err
	}

	// 解析并验证
	token, err := jwt.Parse(jwtStr, jwks.Keyfunc)
	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
```

## 安全模型

```
┌─────────────────────────────────────────────────────────────┐
│                         服务器                               │
│  ┌─────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │Keycloak │───▶│ JWT Token    │───▶│ Fernet Encrypt  │    │
│  │  Auth   │    │ (base64)     │    │ (key + TTL)     │    │
│  └─────────┘    └──────────────┘    └────────┬────────┘    │
└──────────────────────────────────────────────│──────────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │  CLI_ACCESS_TOKEN   │
                                    │  (encrypted blob)   │
                                    └──────────┬──────────┘
                                               │
                    ┌──────────────────────────┴───────────────────────┐
                    │                   Shell 环境                     │
                    │  用户可见: 仅 CLI_ACCESS_TOKEN (加密后的字符串)  │
                    │  用户不可见: encryption key                      │
                    └──────────────────────────┬───────────────────────┘
                                               │
                                               ▼
┌───────────────────────────────────────────────────────────────────────┐
│                          CLI 二进制文件                                │
│  ┌──────────────────────┐    ┌────────────────┐    ┌──────────────┐  │
│  │ CLI_ACCESS_TOKEN     │───▶│ Fernet Decrypt │───▶│ JWT Token    │  │
│  │ (from env)           │    │ (hardcoded key)│    │ (verified)   │  │
│  └──────────────────────┘    └────────────────┘    └──────────────┘  │
│                                                                      │
│  Hardcoded: encryptionKey, tokenTTL                                 │
└───────────────────────────────────────────────────────────────────────┘
```

## 密钥管理

### 获取密钥

密钥存储在服务器的 `SECRET_DIR/cli_token_key.txt` 文件中。

**方式一：直接读取文件**
```bash
# 登录服务器
ssh admin@server
sudo cat /var/lib/wisecore/secrets/cli_token_key.txt
```

**方式二：调用 Python 模块**
```bash
python -c "from wisecore.app.token_crypto import get_encryption_key_for_cli; print(get_encryption_key_for_cli())"
```

### 密钥轮换

1. 生成新密钥：`python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
2. 更新环境变量或密钥文件
3. 重启服务
4. 重新构建 CLI 二进制文件

**注意：** 密钥轮换后，旧的加密 token 将无法解密，用户需要重新获取 token。

## 配置项

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `CLI_TOKEN_ENCRYPTION_KEY` | 自动生成 | Fernet 密钥 |
| `CLI_TOKEN_TTL` | 180 | Token 有效期（秒），默认 3 分钟 |

## 测试

```bash
# 获取加密 token
TOKEN=$(curl -H "Authorization: Bearer $KEYCLOAK_TOKEN" \
  http://localhost:8000/api/auth/cli-token | jq -r '.encrypted_token')

# 设置环境变量
export CLI_ACCESS_TOKEN="$TOKEN"

# 运行 CLI
./cli whoami
```

## 相关文件

- 后端加密模块: `src/wisecore/app/token_crypto.py`
- 后端 API 端点: `src/wisecore/app/routers/auth.py`
- 前端组件: `next-console/components/layout/user-profile-menu.tsx`