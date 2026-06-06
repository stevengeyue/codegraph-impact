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
      - uses: actions/setup-node@v6
        with:
          node-version: 22
      - run: npx github:stevengeyue/codegraph-impact --base origin/${{ github.base_ref }} --pr-comment > impact-comment.md
      - uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: impact-comment.md

If you already have `.codegraph-impact/impact.json`, the helper script can still render a comment:

```bash
node scripts/github-pr-comment.mjs > impact-comment.md
```
