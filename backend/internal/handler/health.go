package handler

import (
	"context"
	"runtime"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/pocketbase"
)

// HealthHandler menyediakan endpoint health check komprehensif untuk Docker, Coolify, dan Uptime Kuma.
type HealthHandler struct {
	startedAt time.Time
	pb        *pocketbase.Client
}

// NewHealthHandler membuat handler health check dengan koneksi PocketBase.
func NewHealthHandler(pb *pocketbase.Client) *HealthHandler {
	return &HealthHandler{
		startedAt: time.Now(),
		pb:        pb,
	}
}

// Check mengembalikan status kesehatan mendalam (Database PocketBase, Memori, Uptime).
func (h *HealthHandler) Check(c fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.Context(), 3*time.Second)
	defer cancel()

	dbStatus := "up"
	dbError := ""
	dbLatencyMs := float64(0)

	if h.pb != nil {
		start := time.Now()
		if err := h.pb.Ping(ctx); err != nil {
			dbStatus = "down"
			dbError = err.Error()
		} else {
			dbLatencyMs = float64(time.Since(start).Microseconds()) / 1000.0
		}
	} else {
		dbStatus = "unconfigured"
	}

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	isHealthy := dbStatus == "up" || dbStatus == "unconfigured"
	httpStatus := fiber.StatusOK
	statusText := "healthy"

	if !isHealthy {
		httpStatus = fiber.StatusServiceUnavailable
		statusText = "unhealthy"
	}

	data := fiber.Map{
		"status":      statusText,
		"service":     "SI BETANG (E-Arsip) API",
		"version":     "1.0.0",
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
		"uptime_sec":  int64(time.Since(h.startedAt).Seconds()),
		"database": fiber.Map{
			"engine":     "PocketBase",
			"status":     dbStatus,
			"latency_ms": dbLatencyMs,
		},
		"system": fiber.Map{
			"goroutines":   runtime.NumGoroutine(),
			"alloc_mb":     float64(m.Alloc) / 1024 / 1024,
			"total_sys_mb": float64(m.Sys) / 1024 / 1024,
			"num_gc":       m.NumGC,
		},
	}

	if dbError != "" {
		data["database"].(fiber.Map)["error"] = dbError
	}

	return c.Status(httpStatus).JSON(data)
}