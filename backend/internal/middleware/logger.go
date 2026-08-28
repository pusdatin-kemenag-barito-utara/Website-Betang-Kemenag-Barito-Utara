package middleware

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v3"
)

// RequestLogger mencatat setiap permintaan masuk dengan status, waktu eksekusi (latency), metode, path, dan detail error jika ada.
func RequestLogger() fiber.Handler {
	return func(c fiber.Ctx) error {
		start := time.Now()
		path := c.OriginalURL()
		if path == "" {
			path = c.Path()
		}
		method := c.Method()

		// Jalankan handler berikutnya
		err := c.Next()

		latency := time.Since(start)
		status := c.Response().StatusCode()

		// Kode warna ANSI untuk status HTTP
		statusColor := "\033[32m" // Hijau (2xx)
		if status >= 300 && status < 400 {
			statusColor = "\033[36m" // Cyan (3xx)
		} else if status >= 400 && status < 500 {
			statusColor = "\033[33m" // Kuning (4xx)
		} else if status >= 500 {
			statusColor = "\033[31m" // Merah (5xx)
		}
		resetColor := "\033[0m"

		// Format kecepatan eksekusi (latency)
		var latencyStr string
		if latency < time.Millisecond {
			latencyStr = fmt.Sprintf("%6d µs", latency.Microseconds())
		} else {
			latencyStr = fmt.Sprintf("%6.2f ms", float64(latency.Microseconds())/1000.0)
		}

		timeStr := time.Now().Format("15:04:05")

		if err != nil {
			fmt.Printf("[Backend API] %s | %s%3d%s | %s | %-7s %s -> \033[31mError: %v\033[0m\n",
				timeStr, statusColor, status, resetColor, latencyStr, method, path, err)
		} else {
			fmt.Printf("[Backend API] %s | %s%3d%s | %s | %-7s %s\n",
				timeStr, statusColor, status, resetColor, latencyStr, method, path)
		}

		return err
	}
}
