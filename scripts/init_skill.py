#!/usr/bin/env python3
"""
Skill Initialization Script

This script initializes a new Claude Code skill with a standard directory structure
and template files.

Usage:
    init_skill.py <skill-name> [--path PATH]

Arguments:
    skill-name: Name of the skill to create (required)
    --path: Optional path where the skill should be created (default: current directory)

Example:
    init_skill.py my-skill-name --path /home/claude/my-skill-name
"""

import os
import sys
import argparse
from pathlib import Path
from typing import Optional


def create_skill_structure(skill_name: str, base_path: Optional[str] = None) -> None:
    """
    Create the directory structure and template files for a new skill.

    Args:
        skill_name: Name of the skill
        base_path: Optional base path where the skill should be created
    """
    # Determine the skill directory path
    if base_path:
        skill_dir = Path(base_path)
    else:
        skill_dir = Path.cwd() / skill_name

    # Create the main skill directory
    skill_dir.mkdir(parents=True, exist_ok=True)
    print(f"✓ Created skill directory: {skill_dir}")

    # Create subdirectories
    directories = [
        'src',
        'tests',
        'docs',
        'examples'
    ]

    for directory in directories:
        dir_path = skill_dir / directory
        dir_path.mkdir(exist_ok=True)
        print(f"✓ Created directory: {directory}/")

    # Create README.md
    readme_content = f"""# {skill_name}

## Description

A brief description of what this skill does.

## Installation

```bash
# Add installation instructions here
```

## Usage

```bash
# Add usage examples here
```

## Features

- Feature 1
- Feature 2
- Feature 3

## Configuration

Describe any configuration options here.

## Examples

See the `examples/` directory for usage examples.

## Testing

```bash
# Add testing instructions here
```

## License

MIT
"""

    readme_path = skill_dir / "README.md"
    readme_path.write_text(readme_content)
    print(f"✓ Created README.md")

    # Create skill.json metadata file
    skill_json_content = f"""{{
  "name": "{skill_name}",
  "version": "0.1.0",
  "description": "Description of {skill_name}",
  "author": "",
  "license": "MIT",
  "main": "src/main.py",
  "dependencies": {{}}
}}
"""

    skill_json_path = skill_dir / "skill.json"
    skill_json_path.write_text(skill_json_content)
    print(f"✓ Created skill.json")

    # Create main.py
    main_py_content = f'''"""
Main entry point for {skill_name} skill.
"""

def main():
    """
    Main function for the skill.
    """
    print("Hello from {skill_name}!")
    # Add your skill logic here

if __name__ == "__main__":
    main()
'''

    main_py_path = skill_dir / "src" / "main.py"
    main_py_path.write_text(main_py_content)
    print(f"✓ Created src/main.py")

    # Create __init__.py
    init_py_path = skill_dir / "src" / "__init__.py"
    init_py_path.write_text(f'"""\\n{skill_name} skill package.\\n"""\\n')
    print(f"✓ Created src/__init__.py")

    # Create .gitignore
    gitignore_content = """# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Testing
.pytest_cache/
.coverage
htmlcov/

# Logs
*.log
"""

    gitignore_path = skill_dir / ".gitignore"
    gitignore_path.write_text(gitignore_content)
    print(f"✓ Created .gitignore")

    # Create example test file
    test_content = f'''"""
Test suite for {skill_name}.
"""

import unittest
from src.main import main


class Test{skill_name.replace("-", "_").title()}(unittest.TestCase):
    """Test cases for {skill_name}."""

    def test_main(self):
        """Test the main function."""
        # Add your tests here
        self.assertTrue(True)


if __name__ == "__main__":
    unittest.main()
'''

    test_path = skill_dir / "tests" / "test_main.py"
    test_path.write_text(test_content)
    print(f"✓ Created tests/test_main.py")

    # Create tests __init__.py
    test_init_path = skill_dir / "tests" / "__init__.py"
    test_init_path.write_text("")
    print(f"✓ Created tests/__init__.py")

    # Create example file
    example_content = f"""# Example Usage of {skill_name}

This directory contains example usage of the {skill_name} skill.

## Basic Example

```python
from src.main import main

main()
```

Add more examples as needed.
"""

    example_path = skill_dir / "examples" / "example.md"
    example_path.write_text(example_content)
    print(f"✓ Created examples/example.md")

    # Create docs file
    docs_content = f"""# {skill_name} Documentation

## Overview

Detailed documentation for {skill_name}.

## API Reference

### main()

Main function for the skill.

**Returns:**
- None

**Example:**
```python
from src.main import main
main()
```

## Advanced Usage

Add advanced usage documentation here.
"""

    docs_path = skill_dir / "docs" / "api.md"
    docs_path.write_text(docs_content)
    print(f"✓ Created docs/api.md")

    print(f"\n✅ Skill '{skill_name}' initialized successfully at: {skill_dir}")
    print(f"\nNext steps:")
    print(f"  1. cd {skill_dir}")
    print(f"  2. Edit src/main.py to implement your skill logic")
    print(f"  3. Update README.md with your skill's documentation")
    print(f"  4. Add tests in tests/test_main.py")


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description="Initialize a new Claude Code skill with standard structure",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s my-skill
  %(prog)s my-skill-name --path /home/claude/my-skill-name
  %(prog)s data-processor --path ./skills/data-processor
        """
    )

    parser.add_argument(
        'skill_name',
        type=str,
        help='Name of the skill to create'
    )

    parser.add_argument(
        '--path',
        type=str,
        default=None,
        help='Path where the skill should be created (default: current directory/skill_name)'
    )

    args = parser.parse_args()

    try:
        create_skill_structure(args.skill_name, args.path)
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
