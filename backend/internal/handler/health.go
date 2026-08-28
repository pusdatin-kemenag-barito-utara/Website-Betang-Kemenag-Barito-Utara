package handler

import (
	"context"
	"runtime"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
)

// HealthHandler menyediakan endpoint health check komprehensif untuk Docker, Coolify, dan Uptime Kuma.
type HealthHandler struct {
	startedAt time.Time
	pool      *pgxpool.Pool
}

// NewHealthHandler membuat handler health check dengan koneksi pool database.
func NewHealthHandler(pool *pgxpool.Pool) *HealthHandler {
	return &HealthHandler{
		startedAt: time.Now(),
		pool:      pool,
	}
}

// Check mengembalikan status kesehatan mendalam (Database, Memori, Uptime).
func (h *HealthHandler) Check(c fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.Context(), 2*time.Second)
	defer cancel()

	dbStatus := "up"
	dbError := ""
	dbLatencyMs := float64(0)

	if h.pool != nil {
		start := time.Now()
		if err := h.pool.Ping(ctx); err != nil {
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
		"uptime":      time.Since(h.startedAt).String(),
		"uptime_sec":  int64(time.Since(h.startedAt).Seconds()),
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
		"environment": "production",
		"version":     "2.0.0-enterprise",
		"database": fiber.Map{
			"status":     dbStatus,
			"latency_ms": dbLatencyMs,
			"error":      dbError,
			"pool_stats": fiber.Map{
				"total_conns": h.pool.Stat().TotalConns(),
				"idle_conns":  h.pool.Stat().IdleConns(),
			},
		},
		"system": fiber.Map{
			"go_version": runtime.Version(),
			"goroutines": runtime.NumGoroutine(),
			"memory_mb":  float64(m.Alloc) / 1024 / 1024,
		},
	}

	return c.Status(httpStatus).JSON(fiber.Map{
		"success": isHealthy,
		"data":    data,
	})
}