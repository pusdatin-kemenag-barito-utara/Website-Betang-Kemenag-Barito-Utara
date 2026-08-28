package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

// MaintenanceService memeriksa status aplikasi dari sistem pusdatin.
type MaintenanceService struct {
	pusdatinURL string
	appID       string
	client      *http.Client
}

// MaintenanceStatus adalah hasil pengecekan status dari pusdatin.
type MaintenanceStatus struct {
	Status string `json:"status"`
	URL    string `json:"url"`
}

// NewMaintenanceService membuat service status maintenance.
func NewMaintenanceService(pusdatinURL, appID string) *MaintenanceService {
	return &MaintenanceService{
		pusdatinURL: pusdatinURL,
		appID:       appID,
		client:      &http.Client{Timeout: 5 * time.Second},
	}
}

// Status mengambil status aplikasi dari pusdatin.
// Status "maintenance" menandakan aplikasi sedang dalam perawatan.
func (s *MaintenanceService) Status(ctx context.Context) (*MaintenanceStatus, error) {
	url := fmt.Sprintf("%s/api/public/apps/%s/status", s.pusdatinURL, s.appID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, errors.New("layanan pusdatin tidak dapat dijangkau")
	}
	defer resp.Body.Close()

	var payload struct {
		Data struct {
			Status string `json:"status"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, errors.New("respon pusdatin tidak valid")
	}

	return &MaintenanceStatus{
		Status: payload.Data.Status,
		URL:    fmt.Sprintf("%s/maintenance?app=Si+Betang+(E-Arsip)", s.pusdatinURL),
	}, nil
}