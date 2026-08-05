"""Tiny JSON-over-HTTPS helper used by all the network providers.

Only ``urllib`` (stdlib) is used so the assistant layer has no hard
dependency on any SDK; API drift between vendors is confined to this module
and the per-vendor request/response builders.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

import config

from ai_assist.providers.base import ProviderError


def post_json(
    url: str,
    payload: dict[str, Any],
    headers: dict[str, str],
    timeout: float = config.ASSIST_TIMEOUT,
) -> dict[str, Any]:
    """POST a JSON payload and return the parsed JSON response.

    Raises :class:`ProviderError` on HTTP errors, connection failures,
    timeouts or non-JSON responses.
    """
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url, data=data, headers=headers, method="POST"
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:300]
        raise ProviderError(f"HTTP {exc.code} from {url}: {detail}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise ProviderError(f"Request to {url} failed: {exc}") from exc
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise ProviderError(f"Non-JSON response from {url}") from exc
