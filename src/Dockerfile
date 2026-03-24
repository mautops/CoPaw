# CoPaw API image only. Default COPAW_PORT=8088. Build: make api
FROM python:3.11-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV WORKSPACE_DIR=/app \
  COPAW_WORKING_DIR=/app/working \
  COPAW_SECRET_DIR=/app/working.secret \
  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
  COPAW_RUNNING_IN_CONTAINER=1 \
  UV_INDEX_URL=https://mirrors.aliyun.com/pypi/simple \
  PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple \
  COPAW_PORT=8088

ARG COPAW_DISABLED_CHANNELS="imessage"
ENV COPAW_DISABLED_CHANNELS=${COPAW_DISABLED_CHANNELS}
ARG COPAW_ENABLED_CHANNELS=""
ENV COPAW_ENABLED_CHANNELS=${COPAW_ENABLED_CHANNELS}

ARG DEBIAN_FRONTEND=noninteractive

RUN set -eux; \
  if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
  sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources; \
  sed -i 's|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources; \
  fi; \
  if [ -f /etc/apt/sources.list ]; then \
  sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list; \
  sed -i 's|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list; \
  fi

RUN apt-get update && apt-get install -y --fix-missing \
  curl build-essential libssl-dev git \
  fonts-wqy-zenhei fonts-wqy-microhei \
  chromium chromium-sandbox \
  libx11-xcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxi6 libxtst6 \
  libnss3 libglib2.0-0 libdrm2 libgbm1 libasound2 fonts-liberation libu2f-udev \
  && rm -rf /var/lib/apt/lists/* && apt-get clean

RUN sed -i 's/^CHROMIUM_FLAGS=""/CHROMIUM_FLAGS="--no-sandbox"/' /usr/bin/chromium

WORKDIR ${WORKSPACE_DIR}

RUN uv venv "${WORKSPACE_DIR}/venv" --python /usr/local/bin/python
ENV PATH="/app/venv/bin:$PATH"

COPY pyproject.toml setup.py README.md ./
COPY src ./src
RUN uv pip install --no-cache -e ".[ollama]" && copaw init --defaults --accept-security

EXPOSE 8088
CMD ["sh", "-c", "exec copaw app --host 0.0.0.0 --port ${COPAW_PORT}"]
