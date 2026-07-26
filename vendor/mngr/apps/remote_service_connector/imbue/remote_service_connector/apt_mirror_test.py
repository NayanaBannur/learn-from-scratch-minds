import hashlib
import lzma

import pytest

from imbue.remote_service_connector.apt_mirror import AptMirrorCutRequest
from imbue.remote_service_connector.apt_mirror import AptMirrorInvalidTimestampError
from imbue.remote_service_connector.apt_mirror import AptMirrorNotCutError
from imbue.remote_service_connector.apt_mirror import AptMirrorObjectNotFoundError
from imbue.remote_service_connector.apt_mirror import AptMirrorService
from imbue.remote_service_connector.apt_mirror import AptMirrorUnsafePathError
from imbue.remote_service_connector.apt_mirror import AptMirrorWarmRequest
from imbue.remote_service_connector.apt_mirror import ReleaseFileEntry
from imbue.remote_service_connector.apt_mirror import by_hash_path_for_entry
from imbue.remote_service_connector.apt_mirror import dists_object_key
from imbue.remote_service_connector.apt_mirror import filter_index_entries_for_architectures
from imbue.remote_service_connector.apt_mirror import parse_packages_pool_paths
from imbue.remote_service_connector.apt_mirror import parse_release_sha256_entries
from imbue.remote_service_connector.apt_mirror import pool_cache_key
from imbue.remote_service_connector.apt_mirror import validate_safe_subpath
from imbue.remote_service_connector.apt_mirror import validate_snapshot_timestamp
from imbue.remote_service_connector.mock_apt_mirror_test import InMemoryAptMirrorStorage
from imbue.remote_service_connector.mock_apt_mirror_test import MappingUpstreamFetcher

TIMESTAMP = "20260725T000000Z"
SNAPSHOT_DEBIAN = f"https://snapshot.debian.org/archive/debian/{TIMESTAMP}"


def _make_service(
    storage: InMemoryAptMirrorStorage | None = None,
    fetcher: MappingUpstreamFetcher | None = None,
) -> AptMirrorService:
    return AptMirrorService(
        storage=storage if storage is not None else InMemoryAptMirrorStorage(),
        fetcher=fetcher if fetcher is not None else MappingUpstreamFetcher(),
    )


# ---------------------------------------------------------------------------
# Pure helpers


def test_parse_release_sha256_entries_reads_only_sha256_section() -> None:
    release_text = (
        "Suite: trixie\n"
        "MD5Sum:\n"
        " aaaa 100 main/binary-amd64/Packages\n"
        "SHA256:\n"
        " deadbeef 123 main/binary-amd64/Packages.xz\n"
        " cafebabe 456 main/Contents-amd64.gz\n"
        "Description: Debian\n"
    )
    entries = parse_release_sha256_entries(release_text)
    assert entries == [
        ReleaseFileEntry(path="main/binary-amd64/Packages.xz", sha256="deadbeef", size=123),
        ReleaseFileEntry(path="main/Contents-amd64.gz", sha256="cafebabe", size=456),
    ]


def test_filter_index_entries_keeps_wanted_arches_and_arch_independent_files() -> None:
    entries = [
        ReleaseFileEntry(path="main/binary-amd64/Packages.xz", sha256="a", size=1),
        ReleaseFileEntry(path="main/binary-arm64/Packages.xz", sha256="b", size=1),
        ReleaseFileEntry(path="main/binary-all/Packages.xz", sha256="c", size=1),
        ReleaseFileEntry(path="main/binary-i386/Packages.xz", sha256="d", size=1),
        ReleaseFileEntry(path="main/i18n/Translation-en.xz", sha256="e", size=1),
        ReleaseFileEntry(path="main/source/Sources.xz", sha256="f", size=1),
        ReleaseFileEntry(path="main/Contents-amd64.gz", sha256="g", size=1),
        ReleaseFileEntry(path="main/Contents-i386.gz", sha256="h", size=1),
        ReleaseFileEntry(path="main/binary-amd64/Packages.diff/Index", sha256="i", size=1),
        ReleaseFileEntry(path="main/debian-installer/binary-amd64/Packages.xz", sha256="j", size=1),
    ]
    filtered_paths = [e.path for e in filter_index_entries_for_architectures(entries, ("amd64", "arm64"))]
    assert filtered_paths == [
        "main/binary-amd64/Packages.xz",
        "main/binary-arm64/Packages.xz",
        "main/binary-all/Packages.xz",
        "main/i18n/Translation-en.xz",
        "main/Contents-amd64.gz",
    ]


def test_by_hash_path_sits_beside_the_named_index() -> None:
    entry = ReleaseFileEntry(path="main/binary-amd64/Packages.xz", sha256="deadbeef", size=1)
    assert by_hash_path_for_entry(entry) == "main/binary-amd64/by-hash/SHA256/deadbeef"


def test_parse_packages_pool_paths_decompresses_by_suffix() -> None:
    packages_text = "Package: foo\nFilename: pool/main/f/foo/foo_1.0_amd64.deb\n\nPackage: bar\nFilename: pool/main/b/bar/bar_2.0_amd64.deb\n"
    compressed = lzma.compress(packages_text.encode())
    assert parse_packages_pool_paths(compressed, "main/binary-amd64/Packages.xz") == [
        "pool/main/f/foo/foo_1.0_amd64.deb",
        "pool/main/b/bar/bar_2.0_amd64.deb",
    ]


def test_validate_safe_subpath_rejects_traversal_and_absolute_paths() -> None:
    for bad_path in ("../etc/passwd", "a/../../b", "/etc/passwd", "a//b", "a/./b", "", "a\\b"):
        with pytest.raises(AptMirrorUnsafePathError):
            validate_safe_subpath(bad_path)
    assert validate_safe_subpath("main/f/foo/foo_1.0_amd64.deb") == "main/f/foo/foo_1.0_amd64.deb"


def test_validate_snapshot_timestamp_enforces_format() -> None:
    assert validate_snapshot_timestamp(TIMESTAMP) == TIMESTAMP
    for bad_timestamp in ("20260725", "latest", "20260725T000000", "2026-07-25T00:00:00Z"):
        with pytest.raises(AptMirrorInvalidTimestampError):
            validate_snapshot_timestamp(bad_timestamp)


# ---------------------------------------------------------------------------
# Serving


def test_serve_dists_file_returns_cut_object_and_404s_uncut() -> None:
    storage = InMemoryAptMirrorStorage()
    storage.put_object(dists_object_key(TIMESTAMP, "debian", "trixie/InRelease"), b"signed-index")
    service = _make_service(storage=storage)
    assert service.serve_dists_file(TIMESTAMP, "debian", "trixie/InRelease") == b"signed-index"
    with pytest.raises(AptMirrorObjectNotFoundError):
        service.serve_dists_file(TIMESTAMP, "debian", "trixie/Missing")


def test_serve_pool_file_hits_cache_without_fetching() -> None:
    storage = InMemoryAptMirrorStorage()
    fetcher = MappingUpstreamFetcher()
    storage.put_object(pool_cache_key("debian", "main/f/foo/foo_1.0_amd64.deb"), b"deb-bytes")
    service = _make_service(storage=storage, fetcher=fetcher)
    assert service.serve_pool_file(TIMESTAMP, "debian", "main/f/foo/foo_1.0_amd64.deb") == b"deb-bytes"
    assert fetcher.fetched_urls == []


def test_serve_pool_file_reads_through_live_archive_and_caches() -> None:
    fetcher = MappingUpstreamFetcher()
    fetcher.responses_by_url["https://deb.debian.org/debian/pool/main/f/foo/foo_1.0_amd64.deb"] = b"live-deb"
    storage = InMemoryAptMirrorStorage()
    service = _make_service(storage=storage, fetcher=fetcher)
    assert service.serve_pool_file(TIMESTAMP, "debian", "main/f/foo/foo_1.0_amd64.deb") == b"live-deb"
    # Cached permanently: a second request never goes upstream again.
    assert storage.get_object(pool_cache_key("debian", "main/f/foo/foo_1.0_amd64.deb")) == b"live-deb"
    fetcher.fetched_urls.clear()
    assert service.serve_pool_file(TIMESTAMP, "debian", "main/f/foo/foo_1.0_amd64.deb") == b"live-deb"
    assert fetcher.fetched_urls == []


def test_serve_pool_file_falls_back_to_snapshot_for_superseded_files() -> None:
    fetcher = MappingUpstreamFetcher()
    fetcher.responses_by_url[f"{SNAPSHOT_DEBIAN}/pool/main/f/foo/foo_0.9_amd64.deb"] = b"old-deb"
    service = _make_service(fetcher=fetcher)
    assert service.serve_pool_file(TIMESTAMP, "debian", "main/f/foo/foo_0.9_amd64.deb") == b"old-deb"
    # Live archive was tried first, snapshot second.
    assert fetcher.fetched_urls == [
        "https://deb.debian.org/debian/pool/main/f/foo/foo_0.9_amd64.deb",
        f"{SNAPSHOT_DEBIAN}/pool/main/f/foo/foo_0.9_amd64.deb",
    ]


def test_serve_pool_file_missing_everywhere_raises() -> None:
    service = _make_service()
    with pytest.raises(AptMirrorObjectNotFoundError):
        service.serve_pool_file(TIMESTAMP, "debian", "main/f/foo/foo_9.9_amd64.deb")


# ---------------------------------------------------------------------------
# Cut


def _canned_suite(fetcher: MappingUpstreamFetcher, packages_text: str) -> bytes:
    """Wire a minimal single-suite archive at TIMESTAMP into the fetcher; returns the Packages.xz bytes."""
    packages_xz = lzma.compress(packages_text.encode())
    packages_sha = hashlib.sha256(packages_xz).hexdigest()
    release_text = f"Suite: trixie\nSHA256:\n {packages_sha} {len(packages_xz)} main/binary-amd64/Packages.xz\n"
    fetcher.responses_by_url[f"{SNAPSHOT_DEBIAN}/dists/trixie/InRelease"] = release_text.encode()
    fetcher.responses_by_url[f"{SNAPSHOT_DEBIAN}/dists/trixie/Release"] = release_text.encode()
    fetcher.responses_by_url[f"{SNAPSHOT_DEBIAN}/dists/trixie/Release.gpg"] = b"sig"
    fetcher.responses_by_url[f"{SNAPSHOT_DEBIAN}/dists/trixie/main/binary-amd64/Packages.xz"] = packages_xz
    return packages_xz


def _cut_request() -> AptMirrorCutRequest:
    return AptMirrorCutRequest(
        timestamp=TIMESTAMP,
        architectures=("amd64",),
        suites_by_archive={"debian": ("trixie",)},
    )


def test_cut_freezes_indexes_with_by_hash_aliases() -> None:
    storage = InMemoryAptMirrorStorage()
    fetcher = MappingUpstreamFetcher()
    packages_xz = _canned_suite(fetcher, "Package: foo\nFilename: pool/main/f/foo/foo_1.0_amd64.deb\n")
    service = _make_service(storage=storage, fetcher=fetcher)

    result = service.cut(_cut_request())

    assert result.missing_upstream_count == 0
    # InRelease + Release + Release.gpg + Packages.xz (named + by-hash count as one stored index).
    assert storage.get_object(dists_object_key(TIMESTAMP, "debian", "trixie/InRelease")) is not None
    stored_packages = storage.get_object(dists_object_key(TIMESTAMP, "debian", "trixie/main/binary-amd64/Packages.xz"))
    assert stored_packages == packages_xz
    packages_sha = hashlib.sha256(packages_xz).hexdigest()
    by_hash_key = dists_object_key(TIMESTAMP, "debian", f"trixie/main/binary-amd64/by-hash/SHA256/{packages_sha}")
    assert storage.get_object(by_hash_key) == packages_xz


def test_cut_is_idempotent() -> None:
    storage = InMemoryAptMirrorStorage()
    fetcher = MappingUpstreamFetcher()
    _canned_suite(fetcher, "Package: foo\nFilename: pool/main/f/foo/foo_1.0_amd64.deb\n")
    service = _make_service(storage=storage, fetcher=fetcher)

    first = service.cut(_cut_request())
    puts_after_first = storage.put_count
    second = service.cut(_cut_request())

    assert first.stored_index_count > 0
    assert second.stored_index_count == 0
    assert second.already_present_count > 0
    assert storage.put_count == puts_after_first


def test_cut_missing_in_release_raises() -> None:
    service = _make_service()
    with pytest.raises(AptMirrorObjectNotFoundError):
        service.cut(_cut_request())


def test_cut_rejects_unsafe_archive_name() -> None:
    """A malformed archive name in the request body raises before anything is fetched."""
    service = _make_service()
    request = AptMirrorCutRequest(
        timestamp=TIMESTAMP,
        architectures=("amd64",),
        suites_by_archive={"../evil": ("trixie",)},
    )
    with pytest.raises(AptMirrorUnsafePathError):
        service.cut(request)


# ---------------------------------------------------------------------------
# Warm


def test_warm_fetches_referenced_pool_files_and_reports_complete() -> None:
    storage = InMemoryAptMirrorStorage()
    fetcher = MappingUpstreamFetcher()
    _canned_suite(
        fetcher,
        "Package: foo\nFilename: pool/main/f/foo/foo_1.0_amd64.deb\n\n"
        "Package: bar\nFilename: pool/main/b/bar/bar_2.0_amd64.deb\n",
    )
    fetcher.responses_by_url["https://deb.debian.org/debian/pool/main/f/foo/foo_1.0_amd64.deb"] = b"foo-deb"
    fetcher.responses_by_url[f"{SNAPSHOT_DEBIAN}/pool/main/b/bar/bar_2.0_amd64.deb"] = b"bar-deb"
    service = _make_service(storage=storage, fetcher=fetcher)
    service.cut(_cut_request())

    result = service.warm(
        AptMirrorWarmRequest(
            timestamp=TIMESTAMP,
            architectures=("amd64",),
            suites_by_archive={"debian": ("trixie",)},
        )
    )

    assert result.is_complete
    assert result.fetched_count == 2
    assert result.missing_count == 0
    assert storage.get_object(pool_cache_key("debian", "main/f/foo/foo_1.0_amd64.deb")) == b"foo-deb"
    assert storage.get_object(pool_cache_key("debian", "main/b/bar/bar_2.0_amd64.deb")) == b"bar-deb"


def test_warm_skips_already_cached_files() -> None:
    storage = InMemoryAptMirrorStorage()
    fetcher = MappingUpstreamFetcher()
    _canned_suite(fetcher, "Package: foo\nFilename: pool/main/f/foo/foo_1.0_amd64.deb\n")
    storage.put_object(pool_cache_key("debian", "main/f/foo/foo_1.0_amd64.deb"), b"already")
    service = _make_service(storage=storage, fetcher=fetcher)
    service.cut(_cut_request())

    result = service.warm(
        AptMirrorWarmRequest(timestamp=TIMESTAMP, architectures=("amd64",), suites_by_archive={"debian": ("trixie",)})
    )

    assert result.is_complete
    assert result.already_cached_count == 1
    assert result.fetched_count == 0


def test_warm_respects_time_budget_and_reports_remaining() -> None:
    storage = InMemoryAptMirrorStorage()
    fetcher = MappingUpstreamFetcher()
    _canned_suite(
        fetcher,
        "Package: foo\nFilename: pool/main/f/foo/foo_1.0_amd64.deb\n\n"
        "Package: bar\nFilename: pool/main/b/bar/bar_2.0_amd64.deb\n",
    )
    service = _make_service(storage=storage, fetcher=fetcher)
    service.cut(_cut_request())

    result = service.warm(
        AptMirrorWarmRequest(
            timestamp=TIMESTAMP,
            architectures=("amd64",),
            suites_by_archive={"debian": ("trixie",)},
            time_budget_seconds=0.0,
        )
    )

    assert not result.is_complete
    assert result.remaining_count == 2
    assert result.examined_count == 0


def test_warm_before_cut_raises() -> None:
    service = _make_service()
    with pytest.raises(AptMirrorNotCutError):
        service.warm(
            AptMirrorWarmRequest(
                timestamp=TIMESTAMP, architectures=("amd64",), suites_by_archive={"debian": ("trixie",)}
            )
        )
