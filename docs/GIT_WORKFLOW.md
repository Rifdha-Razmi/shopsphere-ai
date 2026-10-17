# Git & GitHub Workflow (PRD §18)

## Branches

```
main                         protected, always deployable
feature/project-setup
feature/auth
feature/product-search
feature/product-details
feature/cart
feature/checkout
feature/recommendations
feature/ai-assistant
feature/admin-dashboard
feature/testing-and-polish
```

Create each branch from `main`, commit with Conventional Commits, open a pull request, and merge once CI passes, so each phase is visible in `git log --graph`.

## Pushing to GitHub

```bash
git init -b main
git add -A && git commit -m "chore: initial project setup"
git remote add origin https://github.com/<you>/shopsphere-ai.git
git push -u origin main
git push origin --all          # pushes every feature/* branch too
```

On GitHub: **Settings → Branches → Add rule** for `main` (require a pull request + passing `CI` checks).

For ongoing work, open a pull request per feature branch using `.github/pull_request_template.md`, and track the PRD phases (PHASE-01 … PHASE-10) as GitHub Issues using the *Phase* issue template.

## Commit convention

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`, `perf:`, `style:` — e.g.

```
feat(recommendations): add price-based strategy
fix(cart): clamp quantity to variant stock
test(assistant): cover cheaper/better-rated refinements
```
