package server_test

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"
)

func TestWebDAVRoutes(t *testing.T) {
	app := fiber.New(fiber.Config{
		RequestMethods: append(fiber.DefaultMethods, "PROPFIND", "PROPPATCH", "LOCK", "UNLOCK"),
	})

	webdavMethods := []string{
		fiber.MethodGet,
		fiber.MethodHead,
		fiber.MethodPost,
		fiber.MethodPut,
		fiber.MethodOptions,
		"PROPFIND",
		"PROPPATCH",
		"LOCK",
		"UNLOCK",
	}

	app.Add(webdavMethods, "/api/v1/dav/:token/:filename", func(c fiber.Ctx) error {
		return c.SendString("OK " + c.Method())
	})
	app.Add(webdavMethods, "/api/v1/dav/:token", func(c fiber.Ctx) error {
		return c.SendString("OK " + c.Method())
	})
	app.Add(webdavMethods, "/api/v1/dav", func(c fiber.Ctx) error {
		return c.SendString("OK " + c.Method())
	})

	methods := []string{"OPTIONS", "PROPFIND", "LOCK", "UNLOCK", "GET", "PUT"}
	for _, m := range methods {
		req := httptest.NewRequest(m, "/api/v1/dav/test-token/sample.docx", strings.NewReader("test"))
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("method %s failed: %v", m, err)
		}
		if resp.StatusCode != 200 {
			t.Errorf("method %s expected 200, got %d", m, resp.StatusCode)
		}
	}
}
