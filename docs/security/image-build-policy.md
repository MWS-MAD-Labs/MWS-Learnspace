# Image build and release-candidate policy

This policy applies to the Learnspace API and web runtime release-candidate images. The database migration target is built and scanned by `.github/workflows/security.yml`, but P7-004 does not publish it as a release-candidate package.

## Trusted build path

Release-candidate images are produced only by a manual run of `.github/workflows/release-candidate-images.yml` from a reviewed repository ref. The workflow:

1. validates a candidate identifier in the form `N.N.N-rc.N`;
2. builds each of the API `runtime` and web `runtime` Docker targets exactly once with Buildx;
3. pushes a new candidate tag to GHCR using the workflow-scoped `GITHUB_TOKEN` and captures the resulting immutable digest;
4. scans that exact pushed digest and fails before signing if Trivy finds a critical OS or library vulnerability;
5. records BuildKit SBOM and provenance attestations without rebuilding the image;
6. generates a downloadable SPDX JSON SBOM and tab-separated package inventory from that digest;
7. publishes GitHub SBOM and provenance attestations and retains their Sigstore bundles;
8. signs each immutable image digest through Sigstore keyless signing using GitHub Actions OIDC;
9. verifies the signature and GitHub provenance before retaining release evidence.

No long-lived registry or signing key is required. The job receives only `contents: read`, `packages: write`, `id-token: write`, and `attestations: write` permissions.

## Image names and immutability

The workflow publishes these packages under the repository owner:

- `ghcr.io/<owner>/learnspace-api`
- `ghcr.io/<owner>/learnspace-web`

Each run creates one human-readable release-candidate tag, such as `0.3.0-rc.1`. The workflow refuses to run if that package tag already exists. GHCR administrators should additionally enable immutable tags or equivalent package protection when available.

Tags are discovery metadata, not deployment identities. Deployment configuration, approvals, evidence, and rollback records must use the returned digest form:

```text
ghcr.io/<owner>/learnspace-api@sha256:<digest>
```

Never deploy `latest`, a branch tag, or an RC tag without resolving and recording its digest first.

## Release gates

Before dispatching a candidate build:

- required CI and `.github/workflows/security.yml` checks must pass for the selected commit;
- no unexpired critical scanner finding may remain without an approved exception;
- the selected ref must be protected and reviewed;
- the candidate identifier must be new for both packages.

The workflow's successful signature and provenance verification is a publication gate, not a replacement for application tests. A candidate that fails verification must not be deployed even if image pushes succeeded.

## Build inputs and reproducibility

Dockerfiles, lockfiles, base-image references, and the complete Git commit are build inputs. Dependabot monitors npm, GitHub Actions, and Docker base images. Maintainers should review base-image changes with the same care as application dependencies.

The workflow records `org.opencontainers.image.source`, `org.opencontainers.image.revision`, and `org.opencontainers.image.version` labels. Build provenance identifies the source workflow and commit. Exact byte-for-byte reproduction is not guaranteed when Dockerfile base images are referenced by mutable tags; the resulting Learnspace digest and its attestations remain the deployment authority.

## Retention and promotion

The workflow retains, per image, an SPDX JSON SBOM, human-readable package inventory and vulnerability report, immutable image reference, evidence summary, checksums, signature/provenance verification output, and Sigstore attestation bundles for 90 days. GHCR stores the image, signature, and OCI attestations according to package retention settings.

Promotion must preserve the digest. If a release tag is later added, it must point to the already verified candidate digest rather than rebuilding from source. Automated stable publishing and channel tags are outside this release-candidate policy.

## Failure and revocation

If a published candidate is found to be unsafe:

1. stop deployment and rollback to a previously verified digest;
2. mark the digest as revoked in operational records and private incident tracking;
3. remove mutable tags that could lead operators to it when package policy permits;
4. do not reuse its candidate identifier;
5. remediate and publish a new candidate with a new digest.

Deleting a signature or tag does not make already pulled image content disappear. Operators must deny the revoked digest explicitly where deployment tooling supports it.
