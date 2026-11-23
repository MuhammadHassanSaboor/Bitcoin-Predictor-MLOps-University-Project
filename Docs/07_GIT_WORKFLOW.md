# 07 · Git & GitHub Workflow

How the two of us work on one repository without breaking each other's code.

## Branches

| Branch | Owner | Contains |
|---|---|---|
| `main` | both (via Pull Requests only) | The final, working project |
| `hassan-saboor/data-ml-api-ui-docker-cicd` | Hassan | Data, ML model, Flask API, React UI, Docker, CI/CD |
| `mudassar-zulfiqar/etl-kubeflow-k8s` (suggested name) | Mudassar | Airflow DAG, Kubeflow pipeline, Kubernetes manifests, load test |

Nobody pushes directly to `main`. Work goes into your own branch and is merged with a **Pull Request (PR)**.

```
main ──────────────●────────────────────●──────────▶
                  ↗ (PR #1 merge)       ↗ (PR #2 merge)
hassan-… ──●──●──●                     │
                                        │
mudassar-… ─────────────●──●──●──●─────┘
```

## Everyday commands

```powershell
git checkout main
git pull                                   # get the latest main
git checkout -b <your-branch-name>         # first time only
# ... work ...
git status                                 # what changed?
git add .
git commit -m "Add Airflow DAG with 4 tasks"
git push -u origin <your-branch-name>      # first push; later just `git push`
```

## Opening a Pull Request (on github.com)

1. Open the repository page. GitHub shows a yellow bar: **"<branch> had recent pushes → Compare & pull request"**. Click it.
2. Base: `main` ← Compare: your branch.
3. Write a title (e.g. *"Data, ML model, Flask API, React UI, Docker & CI/CD"*) and a short description.
4. Click **Create pull request**.
5. Wait for the **CI/CD checks** (GitHub Actions) to turn green ✔.
6. Click **Merge pull request → Confirm merge**.
7. Merging into `main` triggers the CD job, which pushes the Docker images to Docker Hub.

## Starting your branch after a merge (Mudassar)

```powershell
git checkout main
git pull
git checkout -b mudassar-zulfiqar/etl-kubeflow-k8s
```

## Rules

1. Only edit the folders you own (see [ROADMAP.md](ROADMAP.md)). That way there are almost no merge conflicts.
2. Run `black .`, `flake8 .` and `pytest` before pushing. CI runs the same checks.
3. Never commit secrets: `.env`, passwords, tokens and kubeconfig files are listed in `.gitignore`.
   Passwords for CI live in **GitHub → Settings → Secrets and variables → Actions**.
4. Write short commit messages that say *what* changed ("Add /reload endpoint", not "update").

## Making sure commits show your name

GitHub shows the author based on the e-mail in your git config:

```powershell
git config --global user.name  "Your Name"
git config --global user.email "the-email-on-your-github-account@example.com"
```
