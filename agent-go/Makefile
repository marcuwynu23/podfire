.PHONY: build run test clean

build:
	go build -o podfire-agent ./...

run:
	go run .

test:
	go test -count=1 ./...

clean:
	go clean
	rm -f podfire-agent
