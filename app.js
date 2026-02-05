
// DOM Elements
const referencesToggle = document.getElementById('references-toggle');
const datasetToggle = document.getElementById('dataset-toggle');
const natureToggle = document.getElementById('nature-toggle');
const typeToggle = document.getElementById('type-toggle');
const natureConfigContainer = document.getElementById('nature-config-container');
const typeConfigContainer = document.getElementById('type-config-container');
const categoryToggle = document.getElementById('category-toggle');
const categoryConfigContainer = document.getElementById('category-config-container');
const systemPromptEl = document.getElementById('system-prompt-content');
const userPromptEl = document.getElementById('user-prompt-content');
const copySystemBtn = document.getElementById('copy-system');
const copyUserBtn = document.getElementById('copy-user');

// Data Models
const DEFAULT_NATURES = [
  { key: "functional", description: "Testing of functionalities", enabled: true },
  { key: "business", description: "Testing of business rules and processes", enabled: true },
  { key: "user", description: "Testing from the user perspective", enabled: true },
  { key: "non functional", description: "Testing of a system's usability and reliability", enabled: true },
  { key: "performance", description: "Testing response time and system capacity", enabled: true },
  { key: "security", description: "Testing of protection against vulnerabilities and unauthorized access", enabled: true },
  { key: "ATDD", description: "Acceptance criteria driven testing", enabled: true }
];

const DEFAULT_TYPES = [
  { key: "compliance", description: "Testing adherence to standards or regulations", enabled: true },
  { key: "correction", description: "Testing after a bug fix (to be used when the source of the requirement is set to “defect”)", enabled: true },
  { key: "evolution", description: "Testing of newly added functionalities", enabled: true },
  { key: "regression", description: "Testing that no existing functionality is broken", enabled: true },
  { key: "end-to-end", description: "Testing of the complete end-user flow", enabled: true },
  { key: "partner", description: "Integration testing with an external system", enabled: true }
];

const DEFAULT_CATEGORIES = [
  { key: "Functional", description: "Requirements related to system functionalities and features", enabled: true },
  { key: "Non-functional", description: "Requirements related to system qualities and constraints", enabled: true },
  { key: "Use case", description: "Requirements describing user interactions and scenarios", enabled: true },
  { key: "Business", description: "Requirements driven by business rules and objectives", enabled: true },
  { key: "Test requirement", description: "Requirements specifically defining testing needs", enabled: true },
  { key: "Ergonomic", description: "Requirements related to user experience and usability", enabled: true },
  { key: "Performance", description: "Requirements concerning response time and system capacity", enabled: true },
  { key: "Technical", description: "Requirements addressing technical implementation and architecture", enabled: true },
  { key: "User story", description: "Requirements expressed as user-focused narratives", enabled: true },
  { key: "Security", description: "Requirements for protection against vulnerabilities and unauthorized access", enabled: true },
  { key: "Undefined", description: "Requirements without a defined category (default)", enabled: true }
];

let natures = JSON.parse(JSON.stringify(DEFAULT_NATURES)); // Deep copy
let types = JSON.parse(JSON.stringify(DEFAULT_TYPES));     // Deep copy
let categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)); // Deep copy

// Prompt Parts - System
const SYSTEM_PROMPT_HEADER = `You are an expert in manual software testing. You are responsible for defining the test cases necessary to validate a specific requirement. These test cases must be written in English. Ensure to include test cases for error scenarios and invalid inputs where relevant.

You must provide the test cases in JSON format as an array with the following format:
  {
    "testCases": [
      {
        "name": "test case name",`;

const SYSTEM_PROMPT_JSON_MID = `
        "description": "high-level description of the test case",
        "prerequisites": "test case prerequisites",
        "testSteps": [
          {
            "action": "first action",
            "expectedResult": "expected result of the first action"
          },
          {
            "action": "second action",
            "expectedResult": "expected result of the second action"
          },
          ...
        ]
      },
      ...
    ]
  }

A test step can reference another by designating it as "first test step" or "test step 1", "second test step" or "test step 2"...
`;

const SYSTEM_PROMPT_DATASET = `
It is possible to parameterize actions and expected results using the syntax <parameter name>. In this case, the JSON must contain an additional "dataset" attribute that contains the values to use for the different test instantiations, for example:
  {
    "testCases": [
      {
        "name": "addition",
        "description": "addition test",
        "nature": "functional",
        "type": "evolution",
        "prerequisites": "",
        "testSteps": [
          {
            "action": "enter values <arg1> and <arg2>, then click on Add",
            "expectedResult": "the displayed total must be <total>"
          }
        ],
        "dataset": [
          {
            "arg1": 1,
            "arg2": 2,
            "arg3": 3
          },
          {
            "arg1": 1,
            "arg2": -2,
            "arg3": -1
          }
        ]
      },
      {
        "name": "subtraction",
        "description": "subtraction test",
        "prerequisites": "",
        "testSteps": [
          {
            "action": "enter values <arg1> and <arg2>, then click on Subtract",
            "expectedResult": "the displayed total must be <total>"
          }
        ],
        "dataset": [
          {
            "arg1": 1,
            "arg2": 2,
            "arg3": -1
          },
          {
            "arg1": 1,
            "arg2": -2,
            "arg3": 3
          }
        ]
      }
    ]
  }`;

const SYSTEM_PROMPT_FOOTER = `
Your response must contain nothing other than JSON! Do not use Markdown code blocks.`;

// Prompt Parts - User
const USER_PROMPT_HEADER = `## Requirement to be tested

{{#with requirement}}
The requirement is: "{{ name }}"

{{ description }}
`;

const USER_PROMPT_REF_LINE = `
Reference: {{reference}}`;

const USER_PROMPT_BODY_SUFFIX = `
{{/with}}

## Additional information


In order to understand the context of that requirement, you need to consider:

### Related requirements
{{#if providedRequirements}}
{{#each providedRequirements}}
- {{ inc @index }} - "{{ name }}"

{{description}}
`;

// Reuse REF_LINE for the related part as well

const USER_PROMPT_RELATED_SUFFIX = `
{{/each}}
{{else}}
No related requirements provided.
{{/if}}

### Related documents
{{#if providedDocuments}}
{{#each providedDocuments}}
- {{ name }} {{! The user can manually add some information about the document here }}
{{/each}}
{{else}}
No related documents provided.
{{/if}}


`;


// Logic

function renderListUI(container, dataList, updateFn) {
  container.innerHTML = '';
  dataList.forEach((itemData, index) => {
    const item = document.createElement('div');
    item.className = 'nature-item'; // Reusing style class

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = itemData.enabled;
    checkbox.addEventListener('change', (e) => {
      dataList[index].enabled = e.target.checked;
      updatePrompts();
      updateFn(); // Re-render to update input disabled state
    });

    const input = document.createElement('input');
    input.type = 'text';
    input.value = itemData.description;
    input.className = 'nature-input'; // Reusing style class
    input.placeholder = `Description for ${itemData.key}`;
    input.addEventListener('input', (e) => {
      dataList[index].description = e.target.value;
      updatePrompts();
    });

    if (!itemData.enabled) {
      input.disabled = true;
    }

    input.setAttribute('title', itemData.key);
    const keyLabel = document.createElement('span');
    keyLabel.innerText = itemData.key;
    keyLabel.style.minWidth = '100px';
    keyLabel.style.fontSize = '0.9em';
    keyLabel.style.color = 'var(--text-secondary)';

    item.appendChild(checkbox);
    item.appendChild(keyLabel);
    item.appendChild(input);
    container.appendChild(item);
  });
}

function renderNatureUI() {
  renderListUI(natureConfigContainer, natures, renderNatureUI);
}

function renderTypeUI() {
  renderListUI(typeConfigContainer, types, renderTypeUI);
}

function renderCategoryUI() {
  renderListUI(categoryConfigContainer, categories, renderCategoryUI);
}

function updatePrompts() {
  // --- 1. Build System Prompt ---
  let systemPrompt = SYSTEM_PROMPT_HEADER;

  // Inject Nature field in JSON if enabled
  if (natureToggle.checked) {
    systemPrompt += `\n        "nature": "test case nature",`;
  }
  // Inject Type field in JSON if enabled
  if (typeToggle.checked) {
    systemPrompt += `\n        "type": "test case type",`;
  }

  systemPrompt += SYSTEM_PROMPT_JSON_MID;

  // Inject Nature Explanation if enabled
  if (natureToggle.checked) {
    systemPrompt += `\nThe "nature" field must have one of the following values:\n`;
    const activeNatures = natures.filter(n => n.enabled);
    activeNatures.forEach(n => {
      systemPrompt += `- "${n.key}": ${n.description}\n`;
    });
  }

  // Inject Type Explanation if enabled
  if (typeToggle.checked) {
    systemPrompt += `\nThe "type" field must have one of the following values:\n`;
    const activeTypes = types.filter(t => t.enabled);
    activeTypes.forEach(t => {
      systemPrompt += `- "${t.key}": ${t.description}\n`;
    });
  }

  if (datasetToggle.checked) {
    systemPrompt += SYSTEM_PROMPT_DATASET;
  }
  systemPrompt += SYSTEM_PROMPT_FOOTER;

  systemPromptEl.innerText = systemPrompt.trim();


  // --- 2. Build User Prompt ---
  let userPrompt = USER_PROMPT_HEADER;

  if (referencesToggle.checked) {
    userPrompt += USER_PROMPT_REF_LINE;
  }

  // Inject Category/Nature for Main Requirement
  if (categoryToggle.checked) {
    userPrompt += `\nCategory: {{ category }}`;
  }
  if (natureToggle.checked) {
    userPrompt += `\nNature: {{ nature }}`;
  }
  userPrompt += '\n'; // Add newline before closing body

  userPrompt += USER_PROMPT_BODY_SUFFIX;

  if (referencesToggle.checked) {
    userPrompt += USER_PROMPT_REF_LINE;
  }

  // Inject Category/Nature for Related Requirements
  if (categoryToggle.checked) {
    userPrompt += `\nCategory: {{ category }}`;
  }
  if (natureToggle.checked) {
    userPrompt += `\nNature: {{ nature }}`;
  }
  userPrompt += '\n'; // Add newline

  userPrompt += USER_PROMPT_RELATED_SUFFIX;

  // Inject Category Explanation if enabled
  if (categoryToggle.checked) {
    userPrompt += `\n\n## Definition of the requirement categories\n`;
    userPrompt += `\nThe "category" field can have one of the following values:\n`;
    const activeCategories = categories.filter(c => c.enabled);
    activeCategories.forEach(c => {
      userPrompt += `- "${c.key}": ${c.description}\n`;
    });
  }

  userPromptEl.innerText = userPrompt.trim();


  // --- 3. UI Updates ---
  if (natureToggle.checked) {
    natureConfigContainer.classList.remove('hidden');
  } else {
    natureConfigContainer.classList.add('hidden');
  }

  if (typeToggle.checked) {
    typeConfigContainer.classList.remove('hidden');
  } else {
    typeConfigContainer.classList.add('hidden');
  }

  if (categoryToggle.checked) {
    categoryConfigContainer.classList.remove('hidden');
  } else {
    categoryConfigContainer.classList.add('hidden');
  }
}

function copyToClipboard(elementId) {
  const text = document.getElementById(elementId).innerText;
  navigator.clipboard.writeText(text).then(() => {
    console.log('Copied to clipboard');
  });
}

// Event Listeners
referencesToggle.addEventListener('change', updatePrompts);
datasetToggle.addEventListener('change', updatePrompts);
natureToggle.addEventListener('change', updatePrompts);
typeToggle.addEventListener('change', updatePrompts);
categoryToggle.addEventListener('change', updatePrompts);
copySystemBtn.addEventListener('click', () => copyToClipboard('system-prompt-content'));
copyUserBtn.addEventListener('click', () => copyToClipboard('user-prompt-content'));

// Initial Render
renderNatureUI();
renderTypeUI();
renderCategoryUI();
updatePrompts();
