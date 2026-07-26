"""Snapshot-pinned apt mirror served from R2 with read-through to the Debian archives.

Serves frozen, timestamp-pinned apt universes to default-workspace-template
workspaces:

- ``GET /snap/<T>/<archive>/dists/...`` serves index files frozen verbatim at
  cut time (upstream Debian signatures intact -- workspaces verify with the
  stock debian-archive-keyring, no key custody on our side).
- ``GET /snap/<T>/<archive>/pool/...`` serves package files from a single
  shared R2 pool cache, reading through to the live archive (and to
  snapshot.debian.org at ``T`` for files already superseded upstream) on a
  cold miss. Pool paths are version-unique and immutable, so one cache is
  correct for every ``T``.
- ``POST /apt-mirror/cut`` (admin) freezes the full index set for a new ``T``.
- ``POST /apt-mirror/warm`` (admin) walks a cut ``T``'s Packages indexes and
  pre-fetches the referenced pool files into the cache; time-budgeted and
  re-runnable until it reports completeness.

Storage layout in the R2 bucket:

- ``snap/<T>/<archive>/dists/<suite>/...`` -- per-cut frozen indexes (small).
- ``pool/<archive>/pool/...`` -- the shared package cache, keyed by upstream
  path (grows only by changed packages between cuts).
"""

import gzip
import hashlib
import lzma
import os
import posixpath
import re
import time
from abc import ABC
from abc import abstractmethod
from functools import cache
from typing import Any
from typing import Final

import boto3
import httpx
from botocore.exceptions import ClientError
from fastapi import HTTPException
from loguru import logger
from pydantic import ConfigDict
from pydantic import Field
from tenacity import retry
from tenacity import retry_if_exception_type
from tenacity import stop_after_attempt
from tenacity import wait_exponential

from imbue.imbue_common.frozen_model import FrozenModel
from imbue.imbue_common.mutable_model import MutableModel
from imbue.imbue_common.pure import pure

# ---------------------------------------------------------------------------
# Errors


class AptMirrorError(Exception):
    """Base exception for apt mirror failures."""


class AptMirrorNotConfiguredError(AptMirrorError, RuntimeError):
    """Raised when the apt mirror env configuration is absent."""

    def __init__(self, missing_env_var: str) -> None:
        super().__init__(f"apt mirror is not configured: {missing_env_var} is unset")


class AptMirrorObjectNotFoundError(AptMirrorError, LookupError):
    """Raised when a requested object exists neither in the cache nor upstream."""

    def __init__(self, path: str) -> None:
        super().__init__(f"Object not found in mirror or upstream: {path}")


class AptMirrorUnsafePathError(AptMirrorError, ValueError):
    """Raised when a request path tries to escape the archive tree."""

    def __init__(self, path: str) -> None:
        super().__init__(f"Unsafe archive path: {path!r}")


class AptMirrorInvalidTimestampError(AptMirrorError, ValueError):
    """Raised when a snapshot timestamp does not match the snapshot.debian.org format."""

    def __init__(self, timestamp: str) -> None:
        super().__init__(f"Invalid snapshot timestamp {timestamp!r} (expected YYYYMMDDTHHMMSSZ)")


class AptMirrorChecksumMismatchError(AptMirrorError, RuntimeError):
    """Raised when a fetched index file does not match the Release-declared sha256."""

    def __init__(self, path: str, expected_sha256: str, actual_sha256: str) -> None:
        super().__init__(f"Checksum mismatch for {path}: expected {expected_sha256}, got {actual_sha256}")


class AptMirrorNotCutError(AptMirrorError, LookupError):
    """Raised when warm is requested for a timestamp that has not been cut."""

    def __init__(self, timestamp: str, missing_key: str) -> None:
        super().__init__(f"Timestamp {timestamp} has not been cut (missing {missing_key}); run cut first")


# ---------------------------------------------------------------------------
# Constants and env configuration

_TIMESTAMP_RE: Final[re.Pattern[str]] = re.compile(r"^\d{8}T\d{6}Z$")
_ARCHIVE_RE: Final[re.Pattern[str]] = re.compile(r"^[a-z][a-z0-9-]*$")

# Live archive bases read through on pool misses, keyed by archive name.
DEFAULT_UPSTREAM_BY_ARCHIVE: Final[dict[str, str]] = {
    "debian": "https://deb.debian.org/debian",
    "debian-security": "https://deb.debian.org/debian-security",
}

# snapshot.debian.org base; ``<base>/<archive>/<T>/`` is a full archive root
# frozen at ``T``. Used for cuts (authoritative index set at ``T``) and as the
# pool fallback for files already superseded on the live archive.
DEFAULT_SNAPSHOT_BASE: Final[str] = "https://snapshot.debian.org/archive"

DEFAULT_SUITES_BY_ARCHIVE: Final[dict[str, tuple[str, ...]]] = {
    "debian": ("trixie", "trixie-updates"),
    "debian-security": ("trixie-security",),
}
DEFAULT_ARCHITECTURES: Final[tuple[str, ...]] = ("amd64", "arm64")

_R2_ENDPOINT_ENV: Final[str] = "APT_MIRROR_R2_ENDPOINT"
_R2_BUCKET_ENV: Final[str] = "APT_MIRROR_R2_BUCKET"
_R2_ACCESS_KEY_ID_ENV: Final[str] = "APT_MIRROR_R2_ACCESS_KEY_ID"
_R2_SECRET_ACCESS_KEY_ENV: Final[str] = "APT_MIRROR_R2_SECRET_ACCESS_KEY"

# Index files under dists/ that are never frozen: source packages, installer
# images, and pdiff histories (apt falls back to the full index when pdiffs
# are absent, so omitting them is safe and keeps cuts small).
_EXCLUDED_INDEX_SEGMENTS: Final[tuple[str, ...]] = ("/source/", "/debian-installer/", "/installer-", ".diff/")


# ---------------------------------------------------------------------------
# Data types


class ReleaseFileEntry(FrozenModel):
    """One file row from a Release file's SHA256 section."""

    path: str = Field(description="Path relative to the dists/<suite>/ directory")
    sha256: str = Field(description="Hex sha256 the Release file declares for this file")
    size: int = Field(description="Size in bytes the Release file declares")


class AptMirrorCutRequest(FrozenModel):
    """Admin request to freeze the index set for a new snapshot timestamp."""

    timestamp: str = Field(description="snapshot.debian.org timestamp, e.g. 20260725T000000Z")
    architectures: tuple[str, ...] = Field(
        default=DEFAULT_ARCHITECTURES,
        description="Binary architectures whose indexes are frozen (plus arch-independent files)",
    )
    suites_by_archive: dict[str, tuple[str, ...]] = Field(
        default_factory=lambda: dict(DEFAULT_SUITES_BY_ARCHIVE),
        description="Suites to freeze, keyed by archive name",
    )


class AptMirrorCutResult(FrozenModel):
    """Outcome of a cut: how many index objects were stored or already present."""

    timestamp: str = Field(description="The cut snapshot timestamp")
    stored_index_count: int = Field(description="Index objects newly stored in the bucket")
    already_present_count: int = Field(description="Index objects that were already stored (idempotent re-cut)")
    missing_upstream_count: int = Field(description="Release-listed files snapshot.debian.org did not serve")


class AptMirrorWarmRequest(FrozenModel):
    """Admin request to pre-fetch a cut timestamp's pool files into the cache."""

    timestamp: str = Field(description="A previously-cut snapshot timestamp")
    architectures: tuple[str, ...] = Field(
        default=DEFAULT_ARCHITECTURES,
        description="Architectures whose Packages indexes are walked",
    )
    suites_by_archive: dict[str, tuple[str, ...]] = Field(
        default_factory=lambda: dict(DEFAULT_SUITES_BY_ARCHIVE),
        description="Suites whose Packages indexes are walked, keyed by archive name",
    )
    time_budget_seconds: float = Field(
        default=240.0,
        description="Wall-clock budget for this warm pass; re-run until is_complete",
    )


class AptMirrorWarmResult(FrozenModel):
    """Outcome of one warm pass; re-run warm until is_complete is true."""

    timestamp: str = Field(description="The warmed snapshot timestamp")
    examined_count: int = Field(description="Pool files examined this pass")
    fetched_count: int = Field(description="Pool files newly fetched into the cache")
    already_cached_count: int = Field(description="Pool files already in the cache")
    missing_count: int = Field(description="Pool files not found on any upstream")
    is_complete: bool = Field(description="Whether every referenced pool file has been examined")
    remaining_count: int = Field(description="Pool files not yet examined when the budget expired")


# ---------------------------------------------------------------------------
# Interfaces


class AptMirrorStorageInterface(MutableModel, ABC):
    """Object storage the mirror reads and writes (R2 in production)."""

    @abstractmethod
    def get_object(self, key: str) -> bytes | None:
        """Return the object's bytes, or None when the key does not exist."""

    @abstractmethod
    def put_object(self, key: str, data: bytes) -> None:
        """Store the object, overwriting any existing content."""

    @abstractmethod
    def has_object(self, key: str) -> bool:
        """Return whether the key exists without fetching its content."""


class UpstreamFetcherInterface(MutableModel, ABC):
    """HTTP fetcher for the Debian archives."""

    @abstractmethod
    def fetch(self, url: str) -> bytes | None:
        """Return the response body, or None on a definitive 404."""


# ---------------------------------------------------------------------------
# Implementations


class R2AptMirrorStorage(AptMirrorStorageInterface):
    """R2-backed storage via the S3 API."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    client: Any = Field(frozen=True, description="boto3 S3 client configured for the R2 endpoint")
    bucket: str = Field(frozen=True, description="R2 bucket name")

    def get_object(self, key: str) -> bytes | None:
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=key)
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") in ("NoSuchKey", "404"):
                return None
            raise
        return response["Body"].read()

    def put_object(self, key: str, data: bytes) -> None:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data)

    def has_object(self, key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") in ("NoSuchKey", "404"):
                return False
            raise
        return True


class HttpUpstreamFetcher(UpstreamFetcherInterface):
    """httpx-backed fetcher with retry/backoff on transient upstream failures.

    snapshot.debian.org in particular throttles with 503s; retries with
    exponential backoff ride those out, and a definitive 404 maps to None so
    callers can fall through to the next upstream.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    client: httpx.Client = Field(frozen=True, description="HTTP client used for upstream fetches")

    @retry(
        retry=retry_if_exception_type((httpx.TransportError, AptMirrorError)),
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=1, min=1, max=15),
        reraise=True,
    )
    def fetch(self, url: str) -> bytes | None:
        response = self.client.get(url, follow_redirects=True)
        if response.status_code == 404:
            return None
        if response.status_code >= 500:
            # Raised (and retried) rather than returned: a throttled upstream
            # must not masquerade as a missing file.
            raise AptMirrorError(f"Upstream {url} returned {response.status_code}")
        response.raise_for_status()
        return response.content


# ---------------------------------------------------------------------------
# Pure helpers


@pure
def validate_snapshot_timestamp(timestamp: str) -> str:
    if not _TIMESTAMP_RE.match(timestamp):
        raise AptMirrorInvalidTimestampError(timestamp)
    return timestamp


@pure
def validate_archive_name(archive: str) -> str:
    if not _ARCHIVE_RE.match(archive):
        raise AptMirrorUnsafePathError(archive)
    return archive


@pure
def validate_safe_subpath(subpath: str) -> str:
    """Reject paths that could escape the archive tree or alias other keys."""
    if not subpath or subpath.startswith("/") or "\\" in subpath:
        raise AptMirrorUnsafePathError(subpath)
    normalized = posixpath.normpath(subpath)
    if normalized != subpath or any(segment in ("..", ".", "") for segment in subpath.split("/")):
        raise AptMirrorUnsafePathError(subpath)
    return subpath


@pure
def parse_release_sha256_entries(release_text: str) -> list[ReleaseFileEntry]:
    """Parse the SHA256 section of a Release file into file entries."""
    entries: list[ReleaseFileEntry] = []
    is_in_sha256_section = False
    for line in release_text.splitlines():
        if not line.startswith(" "):
            is_in_sha256_section = line.strip() == "SHA256:"
            continue
        if not is_in_sha256_section:
            continue
        parts = line.split()
        if len(parts) != 3:
            continue
        sha256, size_str, path = parts
        if not size_str.isdigit():
            continue
        entries.append(ReleaseFileEntry(path=path, sha256=sha256, size=int(size_str)))
    return entries


@pure
def filter_index_entries_for_architectures(
    entries: list[ReleaseFileEntry],
    architectures: tuple[str, ...],
) -> list[ReleaseFileEntry]:
    """Keep the index files apt can request for the given binary architectures.

    Includes per-arch package indexes (binary-<arch> plus binary-all), Contents
    files, translations, and command-not-found indexes; excludes source
    indexes, installer images, and pdiff histories.
    """
    wanted_arches = tuple(architectures) + ("all",)
    filtered: list[ReleaseFileEntry] = []
    for entry in entries:
        if any(segment in f"/{entry.path}" for segment in _EXCLUDED_INDEX_SEGMENTS):
            continue
        is_arch_specific = "binary-" in entry.path or "Contents-" in entry.path or "Commands-" in entry.path
        if not is_arch_specific:
            filtered.append(entry)
            continue
        if any(
            f"binary-{arch}/" in entry.path or f"Contents-{arch}" in entry.path or f"Commands-{arch}" in entry.path
            for arch in wanted_arches
        ):
            filtered.append(entry)
    return filtered


@pure
def by_hash_path_for_entry(entry: ReleaseFileEntry) -> str:
    """The by-hash alias apt requests for an index when Acquire-By-Hash is on."""
    directory = posixpath.dirname(entry.path)
    prefix = f"{directory}/" if directory else ""
    return f"{prefix}by-hash/SHA256/{entry.sha256}"


@pure
def parse_packages_pool_paths(packages_data: bytes, packages_path: str) -> list[str]:
    """Extract the pool-relative Filename entries from a (compressed) Packages index."""
    if packages_path.endswith(".xz"):
        text = lzma.decompress(packages_data).decode("utf-8", errors="replace")
    elif packages_path.endswith(".gz"):
        text = gzip.decompress(packages_data).decode("utf-8", errors="replace")
    else:
        text = packages_data.decode("utf-8", errors="replace")
    pool_paths: list[str] = []
    for line in text.splitlines():
        if line.startswith("Filename: "):
            pool_paths.append(line[len("Filename: ") :].strip())
    return pool_paths


@pure
def dists_object_key(timestamp: str, archive: str, subpath: str) -> str:
    return f"snap/{timestamp}/{archive}/dists/{subpath}"


@pure
def pool_cache_key(archive: str, pool_subpath: str) -> str:
    return f"pool/{archive}/pool/{pool_subpath}"


# ---------------------------------------------------------------------------
# Service


class AptMirrorService(MutableModel):
    """Read-through apt mirror over object storage plus the Debian archives."""

    storage: AptMirrorStorageInterface = Field(frozen=True, description="Bucket the mirror serves from")
    fetcher: UpstreamFetcherInterface = Field(frozen=True, description="HTTP fetcher for upstream archives")
    upstream_by_archive: dict[str, str] = Field(
        frozen=True,
        description="Live archive base URL per archive name",
        default_factory=lambda: dict(DEFAULT_UPSTREAM_BY_ARCHIVE),
    )
    snapshot_base: str = Field(
        frozen=True,
        default=DEFAULT_SNAPSHOT_BASE,
        description="snapshot.debian.org archive base URL",
    )

    def serve_dists_file(self, timestamp: str, archive: str, subpath: str) -> bytes:
        """Serve a frozen index object. Raises AptMirrorObjectNotFoundError when not cut."""
        validate_snapshot_timestamp(timestamp)
        validate_archive_name(archive)
        validate_safe_subpath(subpath)
        data = self.storage.get_object(dists_object_key(timestamp, archive, subpath))
        if data is None:
            raise AptMirrorObjectNotFoundError(f"snap/{timestamp}/{archive}/dists/{subpath}")
        return data

    def serve_pool_file(self, timestamp: str, archive: str, subpath: str) -> bytes:
        """Serve a pool object from the shared cache, reading through on a miss.

        Pool paths are version-unique and immutable, so the cache is shared
        across timestamps; the timestamp only selects the snapshot fallback
        used when the live archive has already dropped the file.
        """
        validate_snapshot_timestamp(timestamp)
        validate_archive_name(archive)
        validate_safe_subpath(subpath)
        cache_key = pool_cache_key(archive, subpath)
        cached = self.storage.get_object(cache_key)
        if cached is not None:
            return cached
        fetched = self._fetch_pool_file_from_upstreams(timestamp, archive, subpath)
        self.storage.put_object(cache_key, fetched)
        return fetched

    def _fetch_pool_file_from_upstreams(self, timestamp: str, archive: str, subpath: str) -> bytes:
        upstream_base = self.upstream_by_archive.get(archive)
        if upstream_base is not None:
            live = self.fetcher.fetch(f"{upstream_base}/pool/{subpath}")
            if live is not None:
                return live
        snapshot_url = f"{self.snapshot_base}/{archive}/{timestamp}/pool/{subpath}"
        from_snapshot = self.fetcher.fetch(snapshot_url)
        if from_snapshot is None:
            raise AptMirrorObjectNotFoundError(f"{archive}/pool/{subpath}")
        return from_snapshot

    def cut(self, request: AptMirrorCutRequest) -> AptMirrorCutResult:
        """Freeze the index set for a timestamp into the bucket. Idempotent."""
        timestamp = validate_snapshot_timestamp(request.timestamp)
        stored_count = 0
        present_count = 0
        missing_count = 0
        for archive, suites in request.suites_by_archive.items():
            validate_archive_name(archive)
            for suite in suites:
                counts = self._cut_suite(timestamp, archive, suite, tuple(request.architectures))
                stored_count += counts[0]
                present_count += counts[1]
                missing_count += counts[2]
        return AptMirrorCutResult(
            timestamp=timestamp,
            stored_index_count=stored_count,
            already_present_count=present_count,
            missing_upstream_count=missing_count,
        )

    def _cut_suite(
        self,
        timestamp: str,
        archive: str,
        suite: str,
        architectures: tuple[str, ...],
    ) -> tuple[int, int, int]:
        """Freeze one suite's indexes; returns (stored, already_present, missing_upstream)."""
        snapshot_dists = f"{self.snapshot_base}/{archive}/{timestamp}/dists/{suite}"
        stored_count = 0
        present_count = 0
        missing_count = 0

        # The signed entry points come first: InRelease (inline-signed) is
        # mandatory; the detached Release/Release.gpg pair is stored when
        # present so older apt configurations keep working.
        release_data: bytes | None = None
        for name in ("InRelease", "Release", "Release.gpg"):
            data = self.fetcher.fetch(f"{snapshot_dists}/{name}")
            if data is None:
                if name == "InRelease":
                    raise AptMirrorObjectNotFoundError(f"{archive}/dists/{suite}/InRelease at {timestamp}")
                missing_count += 1
                continue
            if name == "Release":
                release_data = data
            key = dists_object_key(timestamp, archive, f"{suite}/{name}")
            if self.storage.has_object(key):
                present_count += 1
            else:
                self.storage.put_object(key, data)
                stored_count += 1

        # The InRelease body doubles as the Release manifest when the detached
        # Release file is absent (its clearsigned payload carries the same
        # SHA256 section, which the parser reads regardless of signature armor).
        manifest_text = (release_data if release_data is not None else b"").decode("utf-8", errors="replace")
        if release_data is None:
            in_release = self.storage.get_object(dists_object_key(timestamp, archive, f"{suite}/InRelease"))
            manifest_text = (in_release or b"").decode("utf-8", errors="replace")

        entries = filter_index_entries_for_architectures(parse_release_sha256_entries(manifest_text), architectures)
        for entry in entries:
            named_key = dists_object_key(timestamp, archive, f"{suite}/{entry.path}")
            by_hash_key = dists_object_key(timestamp, archive, f"{suite}/{by_hash_path_for_entry(entry)}")
            if self.storage.has_object(named_key) and self.storage.has_object(by_hash_key):
                present_count += 1
                continue
            data = self.fetcher.fetch(f"{snapshot_dists}/{entry.path}")
            if data is None:
                # Release files can list optional members the snapshot did not
                # capture; count and continue so one gap cannot block a cut.
                logger.warning("Release-listed index missing upstream: {}/{}/{}", archive, suite, entry.path)
                missing_count += 1
                continue
            actual_sha256 = hashlib.sha256(data).hexdigest()
            if actual_sha256 != entry.sha256:
                raise AptMirrorChecksumMismatchError(entry.path, entry.sha256, actual_sha256)
            self.storage.put_object(named_key, data)
            self.storage.put_object(by_hash_key, data)
            stored_count += 1
        return stored_count, present_count, missing_count

    def warm(self, request: AptMirrorWarmRequest) -> AptMirrorWarmResult:
        """Pre-fetch pool files referenced by a cut timestamp, within a time budget."""
        timestamp = validate_snapshot_timestamp(request.timestamp)
        deadline = time.monotonic() + request.time_budget_seconds
        pool_paths_by_archive = self._referenced_pool_paths(
            timestamp, dict(request.suites_by_archive), tuple(request.architectures)
        )

        examined_count = 0
        fetched_count = 0
        cached_count = 0
        missing_count = 0
        remaining_count = 0
        is_budget_exhausted = False
        for archive, pool_paths in pool_paths_by_archive.items():
            for pool_path in pool_paths:
                if is_budget_exhausted or time.monotonic() > deadline:
                    is_budget_exhausted = True
                    remaining_count += 1
                    continue
                examined_count += 1
                cache_key = pool_cache_key(archive, pool_path)
                if self.storage.has_object(cache_key):
                    cached_count += 1
                    continue
                try:
                    data = self._fetch_pool_file_from_upstreams(timestamp, archive, pool_path)
                except AptMirrorObjectNotFoundError:
                    logger.warning("Pool file missing on all upstreams: {}/pool/{}", archive, pool_path)
                    missing_count += 1
                    continue
                self.storage.put_object(cache_key, data)
                fetched_count += 1
        return AptMirrorWarmResult(
            timestamp=timestamp,
            examined_count=examined_count,
            fetched_count=fetched_count,
            already_cached_count=cached_count,
            missing_count=missing_count,
            is_complete=not is_budget_exhausted,
            remaining_count=remaining_count,
        )

    def _referenced_pool_paths(
        self,
        timestamp: str,
        suites_by_archive: dict[str, tuple[str, ...]],
        architectures: tuple[str, ...],
    ) -> dict[str, list[str]]:
        """Collect the deduplicated pool paths referenced by the cut Packages indexes.

        Pool paths come from the pool/ tree exactly as Packages ``Filename:``
        fields state them, i.e. prefixed with ``pool/``; the prefix is stripped
        to match the serve route, which receives the path after ``pool/``.
        """
        pool_paths_by_archive: dict[str, list[str]] = {}
        for archive, suites in suites_by_archive.items():
            validate_archive_name(archive)
            seen: set[str] = set()
            ordered_paths: list[str] = []
            for suite in suites:
                for arch in architectures:
                    for component in ("main", "contrib", "non-free", "non-free-firmware"):
                        packages_subpath = f"{suite}/{component}/binary-{arch}/Packages.xz"
                        data = self.storage.get_object(dists_object_key(timestamp, archive, packages_subpath))
                        if data is None:
                            if component == "main":
                                raise AptMirrorNotCutError(
                                    timestamp, dists_object_key(timestamp, archive, packages_subpath)
                                )
                            continue
                        for filename in parse_packages_pool_paths(data, packages_subpath):
                            if not filename.startswith("pool/"):
                                continue
                            pool_subpath = filename[len("pool/") :]
                            if pool_subpath not in seen:
                                seen.add(pool_subpath)
                                ordered_paths.append(pool_subpath)
            pool_paths_by_archive[archive] = ordered_paths
        return pool_paths_by_archive


# ---------------------------------------------------------------------------
# FastAPI wiring


@cache
def _get_apt_mirror_service() -> AptMirrorService:
    """Build the singleton service from the environment, or raise 503 when unconfigured."""
    endpoint = os.environ.get(_R2_ENDPOINT_ENV, "")
    bucket = os.environ.get(_R2_BUCKET_ENV, "")
    access_key_id = os.environ.get(_R2_ACCESS_KEY_ID_ENV, "")
    secret_access_key = os.environ.get(_R2_SECRET_ACCESS_KEY_ENV, "")
    for env_var, value in (
        (_R2_ENDPOINT_ENV, endpoint),
        (_R2_BUCKET_ENV, bucket),
        (_R2_ACCESS_KEY_ID_ENV, access_key_id),
        (_R2_SECRET_ACCESS_KEY_ENV, secret_access_key),
    ):
        if not value:
            raise AptMirrorNotConfiguredError(env_var)
    s3_client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        region_name="auto",
    )
    return AptMirrorService(
        storage=R2AptMirrorStorage(client=s3_client, bucket=bucket),
        fetcher=HttpUpstreamFetcher(client=httpx.Client(timeout=60.0)),
    )


def get_apt_mirror_service_or_http_503() -> AptMirrorService:
    """The configured singleton service, or HTTP 503 when the env config is absent."""
    try:
        return _get_apt_mirror_service()
    except AptMirrorNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e


# Media type for every mirror response: apt treats bodies as opaque bytes and
# verifies them against the signed indexes itself.
APT_MIRROR_MEDIA_TYPE: Final[str] = "application/octet-stream"

# Pool objects are immutable by construction (version-unique paths), so
# long-lived caching is always correct.
APT_MIRROR_POOL_CACHE_CONTROL: Final[str] = "public, max-age=31536000, immutable"
