# GitHub Action PR Comment

`codegraph-impact` can generate a Markdown PR summary directly:

```yaml
name: Impact

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  impact:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: stevengeyue/codegraph-impact@main
        id: impact
        with:
          base: ${{ github.event.pull_request.base.sha }}
          pr-comment: "true"
      - uses: marocchino/sticky-pull-request-comment@v2
        with:
          message: ${{ steps.impact.outputs.comment }}
```

To use the CLI directly instead of the composite action:

```yaml
name: Impact Comment

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  impact:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v6
        with:
          node-version: 22
      - run: npx github:stevengeyue/codegraph-impact --base origin/${{ github.base_ref }} --pr-comment > impact-comment.md
      - uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: impact-comment.md
```

If you already have `.codegraph-impact/impact.json`, the helper script can still render a comment:

```bash
node scripts/github-pr-comment.mjs > impact-comment.md
```
