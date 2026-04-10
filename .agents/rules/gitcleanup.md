---
trigger: always_on
---

# Repository Cleanup --  "clean up the repository", "clean up repo"

When I say "clean up the repository", or "clean up repo", open the terminal and execute:
`git branch --merged | egrep -v "(^\*|main|epic)" | xargs git branch -d`

Then tell me how many branches were deleted.
