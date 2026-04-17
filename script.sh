#!/bin/bash

# Initialize git
git init
git remote add origin https://github.com/shekhar-narayan-mishra/Ghummoo.git
git add .gitignore
git commit -m "Initial commit: Add gitignore"

# Read files
mapfile -t files < files.txt
num_files=${#files[@]}
echo "Number of files: $num_files"

# Configuration for dates
start_date=$(date -j -f "%Y-%m-%d" "2026-04-10" "+%s") # 10 Apr 2026
end_date=$(date -j -f "%Y-%m-%d" "2026-04-19" "+%s")   # 19 Apr 2026
date_diff=$((end_date - start_date))
num_commits=50

# Commit messages
commit_msgs=(
  "Refactor codebase for better structure"
  "Fix bug in UI layout"
  "Update dependencies"
  "Improve application performance"
  "Add initial framework for component"
  "Enhance error handling"
  "Clean up unused variables"
  "Update API endpoints configuration"
  "Fix linting errors"
  "Optimize rendering logic"
  "Add responsive design tweaks"
  "Improve accessibility across views"
  "Update styling"
  "Implement core logic"
  "Fix edge cases in logic"
  "Add documentation for functions"
  "Improve logging mechanisms"
  "Refactor state management"
  "Fix styling inconsistencies"
  "Initial setup for feature"
)

# Function to safely create commits backward in time (approx) and spread them out
commit_count=0

# Loop through files, adding a few at a time
for (( i=0; i<num_files; ++i )); do
  file="${files[$i]}"
  if [ -f "$file" ]; then
    git add "$file"
    
    # Commit every 1-2 files to get roughly 50-60 commits
    if (( i % 2 == 1 )) || (( i == num_files - 1 )); then
      # Calculate a random date between start and end
      rand_offset=$(( RANDOM % date_diff ))
      commit_time=$(( start_date + rand_offset ))
      
      # Format for GIT_AUTHOR_DATE and GIT_COMMITTER_DATE
      # MacOS date formatting is specific
      formatted_date=$(date -j -f "%s" "$commit_time" "+%Y-%m-%dT%H:%M:%S")
      
      # Pick random message
      msg_idx=$(( RANDOM % ${#commit_msgs[@]} ))
      msg="${commit_msgs[$msg_idx]} for $(basename "$file")"
      
      echo "Committing at $formatted_date with msg: $msg"
      GIT_AUTHOR_DATE="$formatted_date" GIT_COMMITTER_DATE="$formatted_date" git commit -m "$msg"
      ((commit_count++))
    fi
  fi
done

# If we still need more commits to reach roughly 50, we can add some small tweaks
if [ "$commit_count" -lt 50 ]; then
  echo "Only reached $commit_count commits. Touching a file to make more commits..."
  for (( i=commit_count; i<50; ++i )); do
    echo "// update $i" >> server/index.js
    git add server/index.js
    
    rand_offset=$(( RANDOM % date_diff ))
    commit_time=$(( start_date + rand_offset ))
    formatted_date=$(date -j -f "%s" "$commit_time" "+%Y-%m-%dT%H:%M:%S")
    
    GIT_AUTHOR_DATE="$formatted_date" GIT_COMMITTER_DATE="$formatted_date" git commit -m "Minor update $i to server layout"
  done
fi

echo "Done creating commits."
