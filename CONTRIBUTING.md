# Contributing to Multi Grep Replacer

Thank you for your interest in contributing to Multi Grep Replacer! We welcome contributions from the community and are excited to see what you'll bring to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Contributing Process](#contributing-process)
5. [Coding Guidelines](#coding-guidelines)
6. [Pull Request Guidelines](#pull-request-guidelines)
7. [Issue Guidelines](#issue-guidelines)
8. [Community and Support](#community-and-support)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@multigrepreplacer.com](mailto:conduct@multigrepreplacer.com).

## Getting Started

### Ways to Contribute

We appreciate all forms of contribution:

- 🐛 **Bug reports** - Help us identify and fix issues
- 💡 **Feature requests** - Suggest new functionality
- 📖 **Documentation** - Improve guides, examples, and API docs
- 🌐 **Translations** - Add support for more languages
- 💻 **Code contributions** - Fix bugs, add features, improve performance
- 🧪 **Testing** - Help test new features and releases
- 💬 **Community support** - Help other users in discussions

### Areas Where We Need Help

Current priority areas:
- **Performance optimization** - Help us make it even faster
- **Accessibility improvements** - Make the app usable for everyone
- **Platform-specific enhancements** - Native integrations for each OS
- **Documentation translations** - Non-English documentation
- **Testing coverage** - More comprehensive test suites

## Development Setup

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Git** for version control
- **Code editor** (VS Code recommended)

### Setup Instructions

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub, then:
   git clone https://github.com/sarap422/multi-grep-replacer.git
   cd multi-grep-replacer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up development environment**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Install recommended VS Code extensions
   code --install-extension esbenp.prettier-vscode
   code --install-extension dbaeumer.vscode-eslint
   ```

4. **Verify setup**
   ```bash
   # Run linting
   npm run lint
   
   # Run tests
   npm test
   
   # Start development server
   npm start
   ```

### Development Workflow

1. **Create a branch** for your feature/fix:
   ```bash
   git checkout -b feature/my-new-feature
   # or
   git checkout -b fix/issue-123
   ```

2. **Make your changes** following our [coding guidelines](#coding-guidelines)

3. **Test your changes**:
   ```bash
   npm test
   npm run lint
   npm start # Manual testing
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat(ui): add dark mode toggle button"
   ```

5. **Push and create Pull Request**:
   ```bash
   git push origin feature/my-new-feature
   # Then create PR on GitHub
   ```

## Contributing Process

### Before You Start

1. **Check existing issues** - Look for existing bug reports or feature requests
2. **Discuss major changes** - Open an issue to discuss significant changes before starting
3. **Read the docs** - Familiarize yourself with the [Developer Guide](docs/developer-guide.md)

### Development Process

1. **Planning Phase**
   - Review requirements thoroughly
   - Break down work into manageable tasks
   - Consider performance and security implications

2. **Implementation Phase**
   - Follow established patterns in the codebase
   - Write tests alongside your code
   - Document any new APIs or complex logic

3. **Testing Phase**
   - Test your changes manually
   - Ensure all automated tests pass
   - Test on different platforms if possible

4. **Review Phase**
   - Self-review your code before submitting
   - Address feedback promptly and thoughtfully
   - Be open to suggestions and improvements

## Coding Guidelines

### Code Style

We use ESLint and Prettier for consistent code formatting:

```javascript
// .eslintrc.js configuration is enforced
// Prettier formatting is applied automatically
```

### JavaScript Standards

- **ES6+ features** - Use modern JavaScript features
- **Async/await** - Prefer over promises and callbacks
- **Error handling** - Always handle errors appropriately
- **Performance** - Consider performance implications

### File Organization

```
src/
├── main/           # Main process (Node.js)
├── renderer/       # Renderer process (UI)
└── preload/        # Preload scripts (Security bridge)
```

### Naming Conventions

```javascript
// Classes: PascalCase
class FileOperations {}

// Functions and variables: camelCase
function processFiles() {}
const targetDirectory = '';

// Constants: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Files: kebab-case
file-operations.js
config-manager.js
```

### Documentation Standards

- **JSDoc comments** for all public APIs
- **README updates** for new features
- **Inline comments** for complex logic
- **Type definitions** where helpful

Example:
```javascript
/**
 * Processes multiple files with replacement rules
 * @param {string[]} filePaths - Array of file paths to process
 * @param {ReplacementRule[]} rules - Array of replacement rules
 * @param {ProcessingOptions} options - Processing configuration
 * @returns {Promise<ReplacementResult>} Processing results
 * @throws {ProcessingError} When file operations fail
 */
async function processFiles(filePaths, rules, options) {
  // Implementation
}
```

### Testing Guidelines

- **Unit tests** for individual functions
- **Integration tests** for component interactions
- **E2E tests** for user workflows
- **Performance tests** for critical paths

```javascript
// Test structure example
describe('FileOperations', () => {
  describe('findFiles', () => {
    test('should find all files in directory', async () => {
      // Test implementation
    });
    
    test('should filter by extensions', async () => {
      // Test implementation
    });
  });
});
```

### Performance Considerations

- **Memory efficiency** - Avoid memory leaks
- **Processing speed** - Optimize hot paths
- **UI responsiveness** - Keep UI responsive during operations
- **Resource usage** - Monitor CPU and memory usage

### Security Guidelines

- **Input validation** - Validate all external inputs
- **File permissions** - Check permissions before operations
- **Error disclosure** - Don't expose sensitive information in errors
- **Dependencies** - Keep dependencies up to date

## Pull Request Guidelines

### Before Submitting

- [ ] Tests pass locally: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Manual testing completed
- [ ] Documentation updated if needed
- [ ] CHANGELOG.md updated for user-facing changes

### PR Requirements

#### Title Format
```
type(scope): description

Examples:
feat(ui): add dark mode support
fix(engine): resolve memory leak in file processing
docs(api): update configuration file specification
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring without functionality changes
- `test` - Test additions or improvements
- `chore` - Maintenance tasks

#### Description Template
```markdown
## Summary
Brief description of what this PR does.

## Changes Made
- List of specific changes
- Use bullet points
- Be concise but complete

## Testing
Describe how you tested these changes:
- Unit tests added/updated
- Manual testing performed
- Platforms tested

## Screenshots (if UI changes)
Include before/after screenshots for UI changes.

## Breaking Changes
List any breaking changes and migration steps.

## Related Issues
- Closes #123
- Related to #456
```

### Review Process

1. **Automated checks** - All CI checks must pass
2. **Code review** - At least one maintainer review required
3. **Testing** - Changes tested on multiple platforms
4. **Documentation** - Documentation review for user-facing changes

### After Approval

- **Squash commits** if requested
- **Update branch** if needed
- **Address final feedback**

## Issue Guidelines

### Bug Reports

Use the bug report template and include:

- **Clear title** - Describe the issue briefly
- **Steps to reproduce** - Detailed reproduction steps
- **Expected behavior** - What should happen
- **Actual behavior** - What actually happens
- **Environment** - OS, app version, system specs
- **Screenshots/logs** - Visual evidence or error logs

### Feature Requests

Use the feature request template and include:

- **Problem description** - What problem does this solve?
- **Proposed solution** - How should it work?
- **Alternatives considered** - Other approaches considered
- **Use cases** - Real-world examples
- **Implementation notes** - Technical considerations

### Issue Labeling

We use labels to categorize issues:

- **Type**: `bug`, `feature`, `documentation`, `question`
- **Priority**: `critical`, `high`, `medium`, `low`
- **Status**: `needs-triage`, `in-progress`, `blocked`
- **Area**: `ui`, `performance`, `security`, `build`

## Community and Support

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and community chat
- **Discord** - Real-time community support
- **Email** - [contribute@multigrepreplacer.com](mailto:contribute@multigrepreplacer.com)

### Getting Help

- **Documentation** - Check [docs/](docs/) first
- **Search existing issues** - Your question might already be answered
- **Ask in discussions** - Community members can help
- **Join Discord** - Real-time help from maintainers and community

### Becoming a Maintainer

Regular contributors may be invited to become maintainers. Maintainers:

- **Review pull requests** - Help evaluate contributions
- **Triage issues** - Help organize and prioritize issues
- **Guide development** - Help shape project direction
- **Mentor contributors** - Help new contributors get started

#### Maintainer Responsibilities

- **Timely reviews** - Respond to PRs and issues promptly
- **Quality standards** - Maintain code and documentation quality
- **Community building** - Foster a welcoming community
- **Project vision** - Help maintain project direction

## Recognition

We believe in recognizing contributions:

- **Contributors file** - All contributors listed in CONTRIBUTORS.md
- **Release notes** - Contributors mentioned in release notes
- **Social media** - Contributions highlighted on social platforms
- **Swag** - Stickers and swag for significant contributors

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **Major (1.0.0)** - Breaking changes
- **Minor (1.1.0)** - New features, backwards compatible
- **Patch (1.0.1)** - Bug fixes, backwards compatible

### Release Schedule

- **Major releases** - Every 6-12 months
- **Minor releases** - Every 1-2 months
- **Patch releases** - As needed for critical fixes

### Beta Testing

- **Beta channel** - Early access to new features
- **Release candidates** - Pre-release testing
- **Community testing** - Help test before release

---

## Thank You!

Thank you for taking the time to contribute to Multi Grep Replacer! Every contribution, no matter how small, helps make the project better for everyone.

### Questions?

If you have any questions about contributing, feel free to:
- Open a [GitHub Discussion](https://github.com/sarap422/multi-grep-replacer/discussions)
- Join our [Discord community](https://discord.gg/multigrepreplacer)
- Email us at [contribute@multigrepreplacer.com](mailto:contribute@multigrepreplacer.com)

Happy coding! 🚀