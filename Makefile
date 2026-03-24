.DEFAULT_GOAL := build

# Force image OS/arch (e.g. build arm64 Mac images runnable on amd64 k8s)
DOCKER_PLATFORM ?= linux/amd64

# API image: make api TAG=v0.0.1  -> copaw:v0.0.1
# Full name: IMAGE_TAG=registry.io/copaw:v0.0.1 make api
IMAGE_NAME ?= copaw
TAG ?=
IMAGE_TAG ?= $(if $(TAG),$(IMAGE_NAME):$(TAG),$(IMAGE_NAME):local)

# next-console image: make console TAG=v0.0.1  -> copaw-console:v0.0.1
NEXT_IMAGE_NAME ?= copaw-console
NEXT_TAG ?= $(TAG)
NEXT_IMAGE_TAG ?= $(if $(NEXT_TAG),$(NEXT_IMAGE_NAME):$(NEXT_TAG),$(NEXT_IMAGE_NAME):local)

.PHONY: build api console

# Backend (API) + frontend (next-console) container images
build: api console

api:
	docker build --platform $(DOCKER_PLATFORM) -f src/Dockerfile -t $(IMAGE_TAG) .

console:
	docker build --platform $(DOCKER_PLATFORM) -f next-console/Dockerfile -t $(NEXT_IMAGE_TAG) next-console
