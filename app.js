
// DOM Elements
const datasetToggle = document.getElementById('dataset-toggle');
const natureToggle = document.getElementById('nature-toggle');
const natureConfigContainer = document.getElementById('nature-config-container');
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

let natures = JSON.parse(JSON.stringify(DEFAULT_NATURES)); // Deep copy to manage state

// Prompt Parts
const SYSTEM_PROMPT_HEADER = `You are an expert in manual software testing. You are responsible for defining the test cases necessary to validate a specific requirement. These test cases must be written in English. Ensure to include test cases for error scenarios and invalid inputs where relevant.

You must provide the test cases in JSON format as an array with the following format:
  {
    "testCases": [
      {
        "name": "test case name",`;

// We will inject "nature": "test case nature", here if enabled

const SYSTEM_PROMPT_JSON_MID = `
        "type": "test case type",
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

// Nature explanation block will be inserted here

const SYSTEM_PROMPT_TYPES = `
The "type" field must have one of the following values:
- "compliance": Testing adherence to standards or regulations
- "correction": Testing after a bug fix (to be used when the source of the requirement is set to “defect”)
- "evolution": Testing of newly added functionalities
- "regression": Testing that no existing functionality is broken
- "end-to-end": Testing of the complete end-user flow
- "partner": Integration testing with an external system
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
            "index": 0,
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

const USER_PROMPT_TEMPLATE = `## Requirement to be tested

{{#with requirement}}
The requirement is: "{{ name }}"

{{ description }}

Reference: {{reference}}
Category: {{ category }}
Nature: {{ nature }}
{{/with}}

## Additional information

In order to understand the context of that requirement, you need to consider:

### Related requirements
{{#if providedRequirements}}
{{#each providedRequirements}}
- {{ inc @index }} - "{{ name }}"

{{description}}

Reference: {{reference}}
Category: {{ category }}
Nature: {{ nature }}

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

function renderNatureUI() {
  natureConfigContainer.innerHTML = '';
  natures.forEach((nature, index) => {
    const item = document.createElement('div');
    item.className = 'nature-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = nature.enabled;
    checkbox.addEventListener('change', (e) => {
      natures[index].enabled = e.target.checked;
      updatePrompts();
      renderNatureUI(); // Re-render to update input disabled state
    });

    const input = document.createElement('input');
    input.type = 'text';
    input.value = nature.description;
    input.className = 'nature-input';
    input.placeholder = `Description for ${nature.key}`;
    input.addEventListener('input', (e) => {
      natures[index].description = e.target.value;
      updatePrompts();
    });

    if (!nature.enabled) {
      input.disabled = true;
    }

    // Label for checkbox is implicit by structure, but we can add a tooltip or better UI if needed. 
    // For now, let's put the key as a label or placeholder.
    // Actually, let's prepend the key to the input or make it part of the placeholder
    input.setAttribute('title', nature.key);
    // Let's add a small label for the key
    const keyLabel = document.createElement('span');
    keyLabel.innerText = nature.key;
    keyLabel.style.minWidth = '100px';
    keyLabel.style.fontSize = '0.9em';
    keyLabel.style.color = 'var(--text-secondary)';

    item.appendChild(checkbox);
    item.appendChild(keyLabel);
    item.appendChild(input);
    natureConfigContainer.appendChild(item);
  });
}

function updatePrompts() {
  // 1. Build System Prompt
  let systemPrompt = SYSTEM_PROMPT_HEADER;

  // Inject Nature field in JSON if enabled
  if (natureToggle.checked) {
    systemPrompt += `\n        "nature": "test case nature",`;
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

  systemPrompt += SYSTEM_PROMPT_TYPES;

  if (datasetToggle.checked) {
    // Note: The dataset example also contains "nature": "functional". 
    // Technically if nature is disabled globally, we might want to remove it from the example too,
    // but the example is static text. For now, we leave the example as is, assuming it shows a "full" capability.
    systemPrompt += SYSTEM_PROMPT_DATASET;
  }
  systemPrompt += SYSTEM_PROMPT_FOOTER;

  systemPromptEl.innerText = systemPrompt.trim();

  // 2. Build User Prompt (Static for now)
  userPromptEl.innerText = USER_PROMPT_TEMPLATE.trim();

  // UI Updates
  if (natureToggle.checked) {
    natureConfigContainer.classList.remove('hidden');
  } else {
    natureConfigContainer.classList.add('hidden');
  }
}

function copyToClipboard(elementId) {
  const text = document.getElementById(elementId).innerText;
  navigator.clipboard.writeText(text).then(() => {
    console.log('Copied to clipboard');
  });
}

// Event Listeners
datasetToggle.addEventListener('change', updatePrompts);
natureToggle.addEventListener('change', updatePrompts);
copySystemBtn.addEventListener('click', () => copyToClipboard('system-prompt-content'));
copyUserBtn.addEventListener('click', () => copyToClipboard('user-prompt-content'));

// Initial Render
renderNatureUI();
updatePrompts();
