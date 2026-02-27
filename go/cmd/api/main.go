package main

import (
	"backend/internal/server"
	"log"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	if err := server.Start(); err != nil {
		log.Fatal(err)
	}
}
