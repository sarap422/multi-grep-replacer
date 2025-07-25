/**
 * JavaScript Test File for Multi Grep Replacer
 * Contains various patterns that should be replaced during testing
 */

// Variable declarations with old patterns
var oldVariable = 'test value';
const OLD_CONSTANT = 'constant value';
let oldTemporaryVar = null;

// Function definitions
function processOldClass() {
    console.log('Processing old-class elements');
    return oldVariable;
}

function handleIsPlain(element) {
    if (element.classList.contains('is-plain')) {
        element.style.background = 'white';
    }
    return oldVariable;
}

// Class definition with old patterns
class OldClassName {
    constructor() {
        this.oldVariable = 'class property';
        this.isPlainMode = false;
        this.isGhostEnabled = true;
    }
    
    processOldClass() {
        console.log(`Processing: ${this.oldVariable}`);
        return this.oldVariable;
    }
    
    toggleIsPlain() {
        this.isPlainMode = !this.isPlainMode;
        console.log('is-plain mode:', this.isPlainMode);
    }
}

// Object literals with old patterns
const configObject = {
    oldVariable: 'object value',
    isPlainConfig: true,
    isGhostConfig: false,
    oldClassSelector: '.old-class',
    
    processOldClass: function() {
        return this.oldVariable;
    }
};

// DOM manipulation with old classes
document.addEventListener('DOMContentLoaded', function() {
    const oldClassElements = document.querySelectorAll('.old-class');
    const isPlainElements = document.querySelectorAll('.is-plain');
    const isGhostElements = document.querySelectorAll('.is-ghost');
    
    oldClassElements.forEach(element => {
        element.addEventListener('click', processOldClass);
    });
    
    // Event handling with old variable
    function handleClick(event) {
        console.log('Clicked:', oldVariable);
        if (event.target.classList.contains('old-class')) {
            event.target.style.backgroundColor = 'lightblue';
        }
    }
});

// Arrow functions with old patterns
const processOldClassArrow = () => {
    return oldVariable + ' processed';
};

const handleIsPlainArrow = (element) => {
    if (element.dataset.type === 'is-plain') {
        console.log('Processing is-plain element');
    }
};

// Template literals with old patterns
const templateString = `
    <div class="old-class">
        <span class="is-plain">${oldVariable}</span>
        <button class="is-ghost">Click me</button>
    </div>
`;

// Regular expressions with old patterns
const oldClassRegex = /old-class/g;
const isPlainRegex = /is-plain/gi;
const oldVariablePattern = new RegExp(oldVariable, 'g');

// API endpoints with old patterns
const apiEndpoints = {
    getOldClass: '/api/v1/old-class',
    updateIsPlain: '/api/v1/is-plain',
    deleteOldVariable: `/api/v1/data/${oldVariable}`
};

// Comments with old patterns
// TODO: Replace old-class with new-class
// FIXME: oldVariable should be renamed
/* 
 * Multi-line comment mentioning:
 * - old-class styling
 * - is-plain layout
 * - oldVariable handling
 */

// Export statements
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        oldVariable,
        OldClassName,
        processOldClass,
        handleIsPlain,
        configObject
    };
}