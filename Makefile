REGISTRY := repo.gz.cvte.cn/docker-public
IMAGE    := $(REGISTRY)/hi-ops

.PHONY: build push

build:
	$(eval VERSION := $(filter-out $@, $(MAKECMDGOALS)))
	@if [ -z "$(VERSION)" ]; then echo "Usage: make build <version>  e.g. make build v0.0.1"; exit 1; fi
	docker buildx build --platform linux/amd64 -t $(IMAGE):$(VERSION) -t $(IMAGE):latest .

push:
	$(eval VERSION := $(filter-out $@, $(MAKECMDGOALS)))
	@if [ -z "$(VERSION)" ]; then echo "Usage: make push <version>  e.g. make push v0.0.1"; exit 1; fi
	docker push $(IMAGE):$(VERSION)
	docker push $(IMAGE):latest

%:
	@:
