---
name: claude-skills-ja-articles
description: Retrieve and display Japanese articles about Claude Skills. This skill should be used when users want to learn about Claude Skills through Japanese documentation, tutorials, and news articles. It provides curated resources from official docs, Zenn, note, Qiita, and other Japanese platforms.
---

# Claude Skills Japanese Articles

## Overview

This skill provides access to curated Japanese articles about Claude Skills, including official documentation, tutorials, and news articles from various platforms. It helps users discover and learn about Claude Skills through Japanese-language resources.

## When to Use This Skill

Use this skill when:
- Users ask for Japanese resources about Claude Skills
- Users want to learn about Claude Skills in Japanese
- Users need links to Japanese tutorials or documentation
- Users request articles from specific platforms (Zenn, note, Qiita, etc.)
- Users want to export article data in JSON format

## Core Capabilities

### 1. Retrieve All Articles

Display all 10 curated Japanese articles about Claude Skills with complete metadata including title, URL, platform, author, and description.

**Usage:**
```python
from claude_skills_ja_articles import ClaudeSkillsJapaneseArticles

skills = ClaudeSkillsJapaneseArticles()
all_articles = skills.get_all_articles()
```

### 2. Get Official Documentation

Retrieve the official Claude Skills documentation in Japanese.

**Usage:**
```python
official_docs = skills.get_official_docs()
# Returns: Agent Skills - Claude Docs (Japanese)
```

### 3. Filter Tutorial Articles

Extract articles that focus on tutorials, how-to guides, and practical usage examples.

**Usage:**
```python
tutorials = skills.get_tutorial_articles()
# Returns articles containing keywords: 入門, 使ってみた, 使い方, 解説
```

### 4. Search by Platform

Filter articles by specific platforms like Zenn, note, Qiita, Yahoo News, etc.

**Usage:**
```python
zenn_articles = skills.get_article_by_platform("Zenn")
note_articles = skills.get_article_by_platform("note")
qiita_articles = skills.get_article_by_platform("Qiita")
```

### 5. Export to JSON

Export all article data to a JSON file for backup or integration with other tools.

**Usage:**
```python
skills.export_to_json("output_filename.json")
```

### 6. Display Formatted Output

Generate a formatted markdown display of all articles with complete metadata.

**Usage:**
```python
formatted_text = skills.display_articles()
print(formatted_text)
```

## Available Articles

The skill includes 10 curated articles:

**Official Documentation:**
- Agent Skills - Claude Docs (Japanese official documentation)

**Platform Coverage:**
- Zenn (1 article)
- note (2 articles)
- Qiita (1 article)
- Yahoo News / CNET Japan (1 article)
- 窓の杜 (1 article)
- ドクセル (1 article)
- ITmedia (1 article)
- SHIFT AI TIMES (1 article)

## Resources

### scripts/

The skill includes Python scripts for article retrieval and management:

- **claude_skills_ja_articles.py** - Main module with ClaudeSkillsJapaneseArticles class
- **example.py** - Usage examples demonstrating all capabilities

Run the main script directly:
```bash
python3 scripts/claude_skills_ja_articles.py
```

Run usage examples:
```bash
python3 scripts/example.py
```

### references/

- **articles_list.md** - Complete reference of all articles with descriptions

## Quick Start Examples

**Example 1: Show all articles**
```python
skills = ClaudeSkillsJapaneseArticles()
print(skills.display_articles())
```

**Example 2: Get official docs only**
```python
skills = ClaudeSkillsJapaneseArticles()
official = skills.get_official_docs()
print(f"Official: {official['url']}")
```

**Example 3: Find tutorials**
```python
skills = ClaudeSkillsJapaneseArticles()
for tutorial in skills.get_tutorial_articles():
    print(f"- {tutorial['title']}")
    print(f"  {tutorial['url']}")
```

**Example 4: Platform-specific search**
```python
skills = ClaudeSkillsJapaneseArticles()
for platform in ["Zenn", "note", "Qiita"]:
    articles = skills.get_article_by_platform(platform)
    print(f"{platform}: {len(articles)} articles")
```

## Output Formats

All methods return data as Python dictionaries with the following structure:

```python
{
    "title": "Article title",
    "url": "https://...",
    "platform": "Platform name",
    "author": "Author name (optional)",
    "description": "Article description"
}
```

The `export_to_json()` method creates a JSON file with all articles in this format.
