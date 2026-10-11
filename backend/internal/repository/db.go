// Package repository berisi lapisan akses data PocketBase.
package repository

import (
	"github.com/kemenag-baritoutara/betang-kemenag/internal/pocketbase"
)

// Repos mengumpulkan seluruh repository dalam satu struct agar mudah
// di-inject ke lapisan service.
type Repos struct {
	Bidang   *BidangRepo
	Folder   *FolderRepo
	File     *FileRepo
	Trash    *TrashRepo
	Settings *SettingsRepo
	User     *UserRepo
	Pusdatin *PusdatinRepo
	Storage  *StorageRepo

	PB *pocketbase.Client
}

// New membuat seluruh repository dari client PocketBase.
func New(pb *pocketbase.Client) *Repos {
	return &Repos{
		Bidang:   NewBidangRepo(pb),
		Folder:   NewFolderRepo(pb),
		File:     NewFileRepo(pb),
		Trash:    NewTrashRepo(pb),
		Settings: NewSettingsRepo(pb),
		User:     NewUserRepo(pb),
		Pusdatin: NewPusdatinRepo(pb),
		Storage:  NewStorageRepo(pb),
		PB:       pb,
	}
}
