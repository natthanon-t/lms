package api

import "backend/internal/config"

type Handler struct {
	cfg config.AppConfig
}

func NewHandler(cfg config.AppConfig) *Handler {
	return &Handler{cfg: cfg}
}
