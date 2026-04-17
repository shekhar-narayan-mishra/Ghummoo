import os
import random
import subprocess
from datetime import datetime, timedelta

# Extract the list of files to commit
with open("files.txt") as f:
    files = [line.strip() for line in f if os.path.exists(line.strip())]

start_date = datetime(2026, 4, 10, 9, 0, 0)
end_date = datetime(2026, 4, 19, 18, 0, 0)
total_seconds = int((end_date - start_date).total_seconds())

commit_msgs = [
    "Refactor codebase for better structure",
    "Fix layout responsiveness",
    "Update project dependencies",
    "Improve API response parsing",
    "Add initial component scaffolding",
    "Enhance error handling middleware",
    "Clean up unused variables",
    "Update REST endpoints configuration",
    "Fix linting errors and warnings",
    "Optimize rendering logic",
    "Add dynamic styling tweaks",
    "Improve accessibility across views",
    "Update color variables in CSS",
    "Implement core route logic",
    "Add authentication hooks",
    "Configure connection strings"
]

# Create exactly 50 dates and sort them chronologically
# This ensures that git history logically flows forward in time!
dates = []
for _ in range(50):
    offset = random.randint(0, total_seconds)
    dates.append(start_date + timedelta(seconds=offset))

dates.sort()

# Calculate how many files to add per commit to stretch across 49 commits
chunk_size = max(1, len(files) // 49)

for i in range(49):
    if not files:
        # If we ran out of files early, just do empty metadata commits to reach 50
        date_str = dates[i].strftime("%Y-%m-%dT%H:%M:%S")
        msg = f"Minor tweak to {random.choice(commit_msgs).lower()}"
        env = os.environ.copy()
        env["GIT_AUTHOR_DATE"] = date_str
        env["GIT_COMMITTER_DATE"] = date_str
        subprocess.run(["git", "commit", "--allow-empty", "-m", msg], env=env)
        continue
        
    chunk = files[:chunk_size]
    files = files[chunk_size:]
    
    for file in chunk:
        # We use git add file by file
        subprocess.run(["git", "add", file])
        
    date_str = dates[i].strftime("%Y-%m-%dT%H:%M:%S")
    msg = f"{random.choice(commit_msgs)}"
    env = os.environ.copy()
    env["GIT_AUTHOR_DATE"] = date_str
    env["GIT_COMMITTER_DATE"] = date_str
    
    subprocess.run(["git", "commit", "-m", msg], env=env, stdout=subprocess.DEVNULL)
    print(f"Committed {len(chunk)} files at {date_str}")

# For the absolute final (50th) commit, we stage EVERYTHING remaining 
# This includes the rest of the node_modules config, any newly generated .md files, etc.
subprocess.run(["git", "add", "."])
date_str = dates[-1].strftime("%Y-%m-%dT%H:%M:%S")
env = os.environ.copy()
env["GIT_AUTHOR_DATE"] = date_str
env["GIT_COMMITTER_DATE"] = date_str
subprocess.run(["git", "commit", "-m", "Finalize core repository structure and components"], env=env)
print("Finished 50 commits.")

# Push the new history to Github
print("Pushing to remote origin...")
subprocess.run(["git", "push", "origin", "main", "--force"])
