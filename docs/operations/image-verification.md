# Verify release-candidate images

Verify every image by digest before deployment. A tag alone is insufficient because tags can be moved outside the normal workflow unless registry policy prevents it.

## Prerequisites

Install:

- Docker with registry access;
- Cosign 3.x;
- GitHub CLI with attestation support.

Authenticate to GHCR with an account or token that has read access to the package. Public packages can be verified without registry credentials where the client permits it.

```sh
echo "$GHCR_TOKEN" | docker login ghcr.io --username USERNAME --password-stdin
```

Do not put tokens on the command line or in shell history. `GHCR_TOKEN` needs only `read:packages` for private packages.

## Obtain the immutable reference

Download the `release-candidate-<image>-<candidate>` artifact from the workflow run. Separate artifacts are produced for `api` and `web`. First verify `SHA256SUMS-<image>.txt`, then inspect `evidence-<image>.md` and `image-<image>.txt`. The image file contains a reference such as:

```text
ghcr.io/example/learnspace-api@sha256:0123456789abcdef...
```

Alternatively, resolve a tag and independently record the digest:

```sh
docker buildx imagetools inspect ghcr.io/example/learnspace-api:0.3.0-rc.1
```

Compare that digest with the workflow summary, `evidence-<image>.md`, and `image-<image>.txt`. Stop if they differ. The candidate workflow is restricted to `refs/heads/main`; therefore normal evidence uses `SOURCE_REF=refs/heads/main`.

The examples below use:

```sh
IMAGE=ghcr.io/example/learnspace-api@sha256:0123456789abcdef...
REPOSITORY=example/learnspace
SOURCE_REF=refs/heads/main
```

Replace all example values. Keep the `@sha256:` portion in every verification and deployment command.

## 1. Verify the Cosign signature

The expected certificate identity is the repository's release-candidate workflow at the source ref used to dispatch it:

```sh
cosign verify \
  --certificate-identity "https://github.com/example/learnspace/.github/workflows/release-candidate-images.yml@$SOURCE_REF" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  "$IMAGE"
```

A valid result proves that GitHub Actions OIDC issued the signing identity for that exact workflow/ref and that the signature covers the requested digest. Review the displayed certificate identity and digest; do not use `--certificate-identity-regexp '.*'` or disable transparency-log checks.

## 2. Verify GitHub build provenance

Authenticate `gh` to read repository attestations, then constrain verification to the repository and signer workflow:

```sh
gh auth login

gh attestation verify "oci://$IMAGE" \
  --repo "$REPOSITORY" \
  --signer-workflow "$REPOSITORY/.github/workflows/release-candidate-images.yml" \
  --source-ref "$SOURCE_REF"
```

This command verifies SLSA provenance by default. For registry-hosted bundles when GitHub API lookup is unavailable, add `--bundle-from-oci` while authenticated to GHCR.

Inspect detailed provenance when required:

```sh
gh attestation verify "oci://$IMAGE" \
  --repo "$REPOSITORY" \
  --signer-workflow "$REPOSITORY/.github/workflows/release-candidate-images.yml" \
  --format json
```

Confirm that the subject digest is the requested image, the source repository is expected, and the source digest matches the approved commit.

## 3. Inspect the SBOM

Start with the tab-separated `packages-<image>.txt` inventory from the workflow artifact. It is intended for quick human review. Use the SPDX JSON file for structured review and archival:

```sh
column -t -s $'\t' packages-api.txt
jq '.name, .packages[] | {name, versionInfo, supplier}' sbom-api.spdx.json
```

Review `vulnerabilities-<image>.txt` as evidence that the exact pushed digest passed the critical vulnerability gate. The artifact also contains `sbom-<image>.sigstore.json` and `provenance-<image>.sigstore.json`, which are the retained GitHub attestation bundles. Treat them as supporting evidence; still perform online verification against GitHub and GHCR when those services are available.

You can also discover OCI referrers attached to the image:

```sh
cosign tree "$IMAGE"
```

Review at least:

- base operating-system packages and versions;
- Node.js/npm packages included in the final image;
- unexpected package managers, shells, compilers, or debugging tools;
- license or vulnerability concerns relevant to the deployment environment.

The migration target is built and scanned for critical vulnerabilities by `.github/workflows/security.yml`, but this repository-side P7-004 workflow publishes, signs, and attests only the API and web runtime images.

## 4. Pull and deploy by digest

After all checks pass:

```sh
docker pull "$IMAGE"
docker image inspect "$IMAGE" --format '{{json .RepoDigests}}'
```

Configure Compose, Komodo, or another orchestrator with the complete digest reference. Record both verified digests, candidate identifier, source commit, verifier, and verification time in deployment evidence.

## Failure handling

Do not deploy when:

- the tag resolves to a different digest than recorded evidence;
- Cosign reports no matching signature, identity, issuer, or transparency-log entry;
- GitHub provenance does not match the repository, workflow, ref, or approved commit;
- the downloaded evidence fails its `SHA256SUMS-<image>.txt` check;
- the SBOM, package inventory, or vulnerability report is missing or materially inconsistent with the expected image role;
- the digest has been revoked by a security or incident record.

A failed check should be investigated against the original workflow run. Do not work around verification with weaker identity regular expressions, tag-only pulls, `--insecure-ignore-tlog`, or unsigned replacement images.
