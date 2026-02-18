# globaldex-action

> Official GitHub Action for [GlobalDex](https://globaldex.ai) — the AI Agent Readiness Index.

Automatically scan your deployed site for AI agent compatibility on every push, PR, or deployment. Checks 20 aspects across structure, metadata, accessibility, discoverability, and WebMCP support.

## Usage

```yaml
name: GlobalDex Scan
on: [push]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Scan for agent readiness
        uses: S-Borna/globaldex-action@v1
        with:
          url: https://your-site.com
          threshold: 50
```

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `url` | **Yes** | — | URL to scan |
| `threshold` | No | `0` | Minimum score (0-100). Fails step if below. |
| `api-key` | No | — | API key for higher rate limits |
| `api-url` | No | `https://globaldex.ai` | Custom API base URL |

## Outputs

| Output | Description |
|---|---|
| `score` | Agent-readiness score (0-100) |
| `grade` | Letter grade (A-F) |
| `has-webmcp` | Whether the site has WebMCP support |
| `checks-passed` | Number of checks passed |
| `checks-total` | Total number of checks |
| `result-json` | Full scan result as JSON |

## Examples

### Scan on deployment

```yaml
name: Post-Deploy Scan
on:
  deployment_status:
    types: [success]

jobs:
  scan:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - name: GlobalDex Scan
        uses: S-Borna/globaldex-action@v1
        with:
          url: ${{ github.event.deployment_status.target_url }}
          threshold: 60
```

### Use outputs in subsequent steps

```yaml
- name: Scan
  id: globaldex
  uses: S-Borna/globaldex-action@v1
  with:
    url: https://your-site.com

- name: Comment on PR
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: `## GlobalDex Score: ${{ steps.globaldex.outputs.score }}/100 (${{ steps.globaldex.outputs.grade }})`
      })
```

### Gate deployments

```yaml
- name: Check agent readiness
  uses: S-Borna/globaldex-action@v1
  with:
    url: https://staging.your-site.com
    threshold: 70  # Fails the workflow if score < 70
```

## How it works

1. Sends your URL to the GlobalDex API
2. Runs 20 automated checks across 5 categories
3. Returns a score (0-100) and detailed breakdown
4. Optionally fails the step if below threshold
5. Writes a Markdown summary to the GitHub Actions step summary

No dependencies. No code checkout required. Works with any deployed website.

## License

MIT
