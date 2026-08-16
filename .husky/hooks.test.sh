#!/bin/sh
# Behaviour tests for .husky/pre-commit and .husky/pre-push.
#
# Run:  sh .husky/hooks.test.sh
#
# NOT wired into CI. Doing so would be guard #77, and the 90-day freeze declared on
# 2026-08-16 forbids new guards — see reference/core/control-center/adoption/.
# Wiring it is a decision for the maintainer, recorded in the pending inventory.
#
# WHY IT RUNS IN A THROWAWAY CLONE WITH A LOCAL BARE ORIGIN
# The defect under test is "the hook pushes something you did not ask for". A test
# for that has to let the push happen and then look, so it must not be able to reach
# a real remote.
# Hook behaviour tests, run in a throwaway clone with a LOCAL bare origin so that a
# hook that wrongly decides to push cannot reach github. That containment is the point:
# the defect under test is "it pushes something you did not ask for".
set -u

# The checkout under test. Defaults to this repository; override to run the same
# suite against another revision's hooks (which is how the fix was proven: against
# the pre-fix hooks, five of these fail).
SRC="${EVOLITH_HOOKS_SRC:-$(cd "$(dirname "$0")/.." && pwd)}"
LAB="$(mktemp -d)"
PASS=0; FAIL=0

ok()   { PASS=$((PASS+1)); echo "  PASS  $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL  $1"; echo "        $2"; }

# --- a bare origin, and a working clone with develop + main + a feature branch ---
git init --bare -q "$LAB/origin.git"
git init -q "$LAB/work"
cd "$LAB/work" || exit 1
git remote add origin "$LAB/origin.git"
git config user.email dev@example.com
git config user.name  Dev
mkdir -p .harness/scripts/ci .husky
# stub out every node script the hooks call, so this tests CONTROL FLOW, not the harness
printf 'process.exit(0)\n' > .harness/scripts/knowledge-okf-precommit-guard.mjs
printf 'process.exit(0)\n' > .harness/scripts/ci/02-optimize-repo.mjs
printf 'process.exit(0)\n' > .harness/scripts/sync-project-board.mjs
printf 'process.exit(0)\n' > .harness/scripts/generate-executive-summary.mjs
printf 'process.exit(0)\n' > .harness/scripts/sync-wiki.mjs
printf 'process.exit(0)\n' > .harness/scripts/ci-runner.mjs
cp "$SRC/.husky/pre-push" .husky/pre-push
cp "$SRC/.husky/pre-commit" .husky/pre-commit
echo seed > seed.txt
git add -A >/dev/null
git commit -q -m "chore: seed" --no-verify
git branch -M develop
git push -q origin develop
git checkout -q -b main && git push -q origin main
git checkout -q develop

# LOCAL DEVELOP IS PUT AHEAD OF ORIGIN ON PURPOSE, AND IT IS THE WHOLE EXPERIMENT.
# First version of this harness left them level, so the old hook's `git push origin
# develop` moved nothing and every hijack test passed against the BROKEN hook. A
# hijack is only observable if there is something to hijack.
echo ahead >> seed.txt && git add -A && git commit -q -m "chore: develop is ahead" --no-verify

git checkout -q -b feature/mine
echo x >> seed.txt && git add -A && git commit -q -m "feat: work" --no-verify
git push -q origin feature/mine

DEVELOP_BEFORE=$(git --git-dir="$LAB/origin.git" rev-parse develop)
DEVELOP_LOCAL=$(git rev-parse develop)
if [ "$DEVELOP_BEFORE" = "$DEVELOP_LOCAL" ]; then
  echo "FATAL: develop is not ahead of origin — every hijack test would be vacuous."
  exit 1
fi

NONOWNER_CFG="$LAB/gitconfig-nonowner"
OWNER_CFG="$LAB/gitconfig-owner"
: > "$NONOWNER_CFG"
printf '[evolith]\n\towner = true\n' > "$OWNER_CFG"

intent() { echo "$1" > "$(git rev-parse --git-dir)/EVOLITH_PUSH_TARGET"; }

run_prepush() { # $1=config $2=stdin-line
  printf '%s\n' "$2" | GIT_CONFIG_GLOBAL="$1" sh .husky/pre-push origin "$LAB/origin.git" 2>&1
  echo "rc=$?"
}

echo "=== pre-push ==="

# 1. THE BUG: owner, intent=develop, pushing a FEATURE branch. Must not touch develop.
intent develop
OUT=$(run_prepush "$OWNER_CFG" "refs/heads/feature/mine $(git rev-parse HEAD) refs/heads/feature/mine 0000000000000000000000000000000000000000")
AFTER=$(git --git-dir="$LAB/origin.git" rev-parse develop)
case "$OUT" in *"rc=0"*) R=0 ;; *) R=1 ;; esac
if [ "$R" = 0 ] && [ "$AFTER" = "$DEVELOP_BEFORE" ]; then
  ok "owner pushing a feature branch does NOT dispatch (develop untouched)"
else
  bad "owner pushing a feature branch" "rc/out: $OUT ; develop $DEVELOP_BEFORE -> $AFTER"
fi

# 2. Non-owner is never touched, even with a develop intent and a develop push.
intent develop
OUT=$(run_prepush "$NONOWNER_CFG" "refs/heads/develop $(git rev-parse develop) refs/heads/develop $DEVELOP_BEFORE")
AFTER=$(git --git-dir="$LAB/origin.git" rev-parse develop)
case "$OUT" in *"rc=0"*) R=0 ;; *) R=1 ;; esac
if [ "$R" = 0 ] && [ "$AFTER" = "$DEVELOP_BEFORE" ]; then
  ok "non-owner push is never hijacked, even on develop"
else
  bad "non-owner push" "rc/out: $OUT"
fi

# 3. Non-owner: stale intent files are cleaned up rather than left to fire later.
intent main
run_prepush "$NONOWNER_CFG" "refs/heads/feature/mine $(git rev-parse HEAD) refs/heads/feature/mine 0000" >/dev/null
if [ ! -f "$(git rev-parse --git-dir)/EVOLITH_PUSH_TARGET" ]; then
  ok "non-owner run clears the stale push intent"
else
  bad "non-owner intent cleanup" "EVOLITH_PUSH_TARGET still present"
fi

# 4. A branch DELETION must never dispatch — the local ref arrives as `(delete)`.
intent develop
OUT=$(run_prepush "$OWNER_CFG" "(delete) 0000000000000000000000000000000000000000 refs/heads/feature/mine $(git rev-parse HEAD)")
AFTER=$(git --git-dir="$LAB/origin.git" rev-parse develop)
case "$OUT" in *"rc=0"*) R=0 ;; *) R=1 ;; esac
if [ "$R" = 0 ] && [ "$AFTER" = "$DEVELOP_BEFORE" ]; then
  ok "a branch deletion does NOT dispatch"
else
  bad "branch deletion" "rc/out: $OUT ; develop $DEVELOP_BEFORE -> $AFTER"
fi

# 5. Empty stdin (nothing to push) must exit clean, not trip `set -e`.
intent develop
OUT=$(printf '' | GIT_CONFIG_GLOBAL="$OWNER_CFG" sh .husky/pre-push origin "$LAB/origin.git" 2>&1; echo "rc=$?")
case "$OUT" in *"rc=0"*) ok "empty stdin exits 0" ;; *) bad "empty stdin" "$OUT" ;; esac

# 6. A tag push must not dispatch.
intent develop
OUT=$(run_prepush "$OWNER_CFG" "refs/tags/v9.9.9 $(git rev-parse HEAD) refs/tags/v9.9.9 0000")
case "$OUT" in *"rc=0"*) ok "a tag push does NOT dispatch" ;; *) bad "tag push" "$OUT" ;; esac

# 7. Owner, intent=none, pushing develop: still no dispatch.
intent none
OUT=$(run_prepush "$OWNER_CFG" "refs/heads/develop $(git rev-parse develop) refs/heads/develop $DEVELOP_BEFORE")
case "$OUT" in *"No push requested"*) ok "owner with intent=none is a no-op" ;; *) bad "intent=none" "$OUT" ;; esac

echo ""
echo "=== pre-commit ==="

# 8. Non-owner, no TTY, no env: must COMMIT (exit 0), not be rejected.
echo y >> seed.txt && git add -A
OUT=$(GIT_CONFIG_GLOBAL="$NONOWNER_CFG" sh .husky/pre-commit < /dev/null 2>&1; echo "rc=$?")
case "$OUT" in *"rc=0"*) ok "non-owner, no TTY, no env vars: commit allowed" ;; *) bad "non-owner no-TTY" "$OUT" ;; esac

# 9. ...and it records NO push intent, so pre-push has nothing to act on.
if [ ! -f "$(git rev-parse --git-dir)/EVOLITH_PUSH_TARGET" ]; then
  ok "non-owner pre-commit records no push intent"
else
  bad "non-owner intent" "EVOLITH_PUSH_TARGET was written: $(cat "$(git rev-parse --git-dir)/EVOLITH_PUSH_TARGET")"
fi

# 10. Owner, no TTY, env vars honoured (the path this session has been using).
OUT=$(EVOLITH_CI_MODE=skip EVOLITH_PUSH_TARGET=develop GIT_CONFIG_GLOBAL="$OWNER_CFG" sh .husky/pre-commit < /dev/null 2>&1; echo "rc=$?")
if echo "$OUT" | grep -q "rc=0" && [ -f "$(git rev-parse --git-dir)/EVOLITH_PUSH_TARGET" ]; then
  ok "owner, no TTY: env vars still honoured and intent recorded"
else
  bad "owner no-TTY" "$OUT"
fi


# 11. THE POSITIVE CASE, AND IT HAS TO BE OBSERVABLE.
#     First attempt at this test passed VACUOUSLY: test 8 left staged changes, the
#     `git checkout develop` failed, the probe commit landed on feature/mine, and the
#     assertion `origin/develop == local develop` was already TRUE before the push.
#     It asserted a push that never had to happen. Now the tree is cleaned first and
#     develop is put genuinely AHEAD of origin, so only a real push can satisfy it.
git reset -q --hard
git checkout -q develop
BEFORE_11=$(git --git-dir="$LAB/origin.git" rev-parse develop)
DEV_LOCAL=$(git rev-parse develop)
if [ "$DEV_LOCAL" = "$BEFORE_11" ]; then
  bad "test 11 setup" "develop is not ahead of origin — the assertion would be vacuous"
else
  intent develop
  OUT=$(run_prepush "$OWNER_CFG" "refs/heads/develop $DEV_LOCAL refs/heads/develop $BEFORE_11")
  PUSHED=$(git --git-dir="$LAB/origin.git" rev-parse develop)
  if echo "$OUT" | grep -q "PUSH TO DEVELOP" && [ "$PUSHED" = "$DEV_LOCAL" ] && [ "$PUSHED" != "$BEFORE_11" ]; then
    ok "owner pushing develop with intent=develop STILL dispatches and really pushes"
  else
    bad "owner develop dispatch" "out: $OUT ; origin $BEFORE_11 -> $PUSHED expected $DEV_LOCAL"
  fi
fi
git checkout -q feature/mine

echo ""
echo "(origin/develop legitimately advanced in test 11)"
echo "PASS=$PASS FAIL=$FAIL"
cd /; rm -rf "$LAB"
[ "$FAIL" = 0 ]
