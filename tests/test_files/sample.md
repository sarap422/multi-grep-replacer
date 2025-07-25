# Test Markdown File

This is a test markdown file containing various patterns that should be replaced by Multi Grep Replacer.

## CSS Class References

The application uses several CSS classes:

- `.old-class` - Used for legacy styling
- `.is-plain` - Simple, clean styling
- `.is-ghost` - Semi-transparent elements

### Code Examples

Here's an example of HTML with old-class:

```html
<div class="old-class">
    <p class="is-plain">Content here</p>
    <button class="is-ghost">Action</button>
</div>
```

JavaScript code example:

```javascript
var oldVariable = 'test value';

function processOldClass() {
    console.log('Processing old-class elements');
    return oldVariable;
}

const element = document.querySelector('.old-class');
if (element.classList.contains('is-plain')) {
    element.style.display = 'block';
}
```

CSS example:

```css
.old-class {
    color: red;
    font-weight: bold;
}

.is-plain {
    background: white;
    border: 1px solid #ccc;
}

.is-ghost {
    opacity: 0.5;
}
```

## Variables and Constants

The codebase contains several variables that might need renaming:

- `oldVariable` - Main data variable
- `OLD_CONSTANT` - Configuration constant
- `oldTemporaryVar` - Temporary storage

## API References

API endpoints that reference old patterns:

- `GET /api/v1/old-class` - Retrieve old-class data
- `POST /api/v1/is-plain` - Update is-plain settings
- `DELETE /api/v1/oldVariable` - Remove oldVariable data

## Documentation Notes

**Important**: When updating from old-class to new patterns, ensure:

1. All references to `oldVariable` are updated
2. CSS selectors for `.old-class` are replaced
3. JavaScript event handlers for `is-plain` elements are maintained
4. The `is-ghost` behavior remains consistent

## Inline References

In the middle of sentences, we might reference old-class styling or mention that oldVariable should be updated. The is-plain design pattern and is-ghost interactions are also important to maintain.

### Lists with Old Patterns

1. Update old-class to new-class
2. Rename oldVariable to newVariable  
3. Modify is-plain to is-solid
4. Change is-ghost to is-ghosted

- [ ] Replace old-class references
- [ ] Update oldVariable assignments
- [x] Document is-plain usage
- [ ] Test is-ghost behavior

## Links and References

For more information about old-class patterns, see the [old-class documentation](./old-class-guide.md).

The oldVariable implementation details are in [variables.md](./variables.md).

---

*This file contains test patterns for oldVariable, old-class, is-plain, and is-ghost replacements.*