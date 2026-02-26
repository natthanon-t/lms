package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

func generateAccessToken(user AuthUserRecord) (string, error) {
	token := jwt.New(jwt.SigningMethodHS256)
	claims := token.Claims.(jwt.MapClaims)
	claims["sub"] = strconv.FormatInt(user.ID, 10)
	claims["username"] = user.Username
	claims["role"] = user.Role
	claims["exp"] = time.Now().Add(time.Duration(appCfg.AccessTTL) * time.Minute).Unix()

	return token.SignedString([]byte(appCfg.JWTSecret))
}

func generateRefreshToken() (string, string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", "", err
	}
	raw := base64.RawURLEncoding.EncodeToString(buf)
	sum := sha256.Sum256([]byte(raw))
	return raw, hex.EncodeToString(sum[:]), nil
}

func hashRefreshToken(rawToken string) string {
	sum := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(sum[:])
}

func parseUserIDFromClaims(claims jwt.MapClaims) (int64, error) {
	rawSub, ok := claims["sub"]
	if !ok {
		return 0, errors.New("missing sub claim")
	}
	sub, ok := rawSub.(string)
	if !ok {
		return 0, errors.New("invalid sub claim")
	}
	sub = strings.TrimSpace(sub)
	return strconv.ParseInt(sub, 10, 64)
}
